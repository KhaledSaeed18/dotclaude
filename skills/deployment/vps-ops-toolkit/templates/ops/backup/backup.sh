#!/usr/bin/env bash
# Full-fidelity, verified backup of a Postgres database that runs as a
# Coolify resource.
#
# Coolify's scheduled S3 backups cover routine restores but omit privileges
# and roles. This script keeps the complete copy: a custom-format dump plus
# the role definitions, taken from one snapshot, restored into a throwaway
# Postgres and compared row for row before it is kept, then encrypted to an
# age recipient whose private key never touches this server. Copies live in
# BACKUP_DIR and optionally in a private git repository whose history is
# replaced by a single commit on every push, so the repo never grows.
set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
# shellcheck source=../lib/alert.sh
source "$SCRIPT_DIR/../lib/alert.sh"
CONFIG="${BACKUP_CONFIG:-/etc/app-backup.env}"
# shellcheck source=/dev/null
source "$CONFIG"
: "${DB_RESOURCE_NAME:?}" "${PG_ROLE:?}" "${PG_DATABASE:?}" "${AGE_RECIPIENT:?}"
: "${BACKUP_DIR:?}" "${VERIFY_IMAGE:?}"
BACKUP_PREFIX="${BACKUP_PREFIX:-db_}"
KEEP_LOCAL="${KEEP_LOCAL:-14}"
KEEP_OFFSITE="${KEEP_OFFSITE:-14}"

STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
NAME="${BACKUP_PREFIX}${STAMP}"
WORK="$(mktemp -d)"
VERIFY_CONTAINER="backup-verify-$$"

log() { echo "[$(date -u +%H:%M:%S)] $*" >&2; }

STEP="starting"

# One alert per failed run, naming the step that failed.
on_failure() {
    [ -z "${ALERTED:-}" ] || return 0
    ALERTED=1
    log "FAILED during $STEP (line $1)"
    send_alert critical "Database backup failed" \
        "The restore-verified backup did not complete. Nothing was kept from this run." \
        "Failed step" "$STEP (line $1)" \
        "Run" "$NAME" \
        "Log" "/var/log/app-backup.log on the server" || true
}

# -v matters: the postgres image declares its data directory a volume, so
# without it every run would leave a full restored copy of the database.
cleanup() {
    docker rm -f -v "$VERIFY_CONTAINER" >/dev/null 2>&1 || true
    rm -rf "$WORK"
}

trap cleanup EXIT
trap 'on_failure "$LINENO"' ERR

# Coolify names containers after resource UUIDs, so the database is found by
# its labels. Exactly one match is required: never guess which one to dump.
find_database() {
    local ids count
    ids="$(docker ps -q \
        --filter "label=coolify.resourceName=$DB_RESOURCE_NAME" \
        --filter label=coolify.type=database)"
    count="$(printf '%s' "$ids" | grep -c . || true)"
    if [ "$count" -ne 1 ]; then
        log "expected one running container for $DB_RESOURCE_NAME, found $count"
        return 1
    fi
    DB_CONTAINER="$ids"
}

take_snapshot() {
    local db="$1"
    docker cp "$SCRIPT_DIR/fingerprint.sql" "$db:/tmp/fingerprint.sql"
    docker cp "$SCRIPT_DIR/snapshot.sql" "$db:/tmp/snapshot.sql"
    docker exec -e PGUSER="$PG_ROLE" -e PGDATABASE="$PG_DATABASE" "$db" \
        psql -tA -F '|' -f /tmp/snapshot.sql >/dev/null
    docker cp "$db:/tmp/backup.dump" "$WORK/database.dump"
    docker cp "$db:/tmp/backup.fingerprint" "$WORK/fingerprint.txt"
    docker exec "$db" rm -f /tmp/backup.dump /tmp/backup.fingerprint \
        /tmp/fingerprint.sql /tmp/snapshot.sql
    docker exec "$db" pg_dumpall -U "$PG_ROLE" --roles-only > "$WORK/roles.sql"
}

wait_until_ready() {
    # TCP readiness only succeeds after the image's init phase, which listens
    # on the unix socket alone.
    for _ in $(seq 1 60); do
        if docker exec "$VERIFY_CONTAINER" pg_isready -h 127.0.0.1 \
            -U "$PG_ROLE" -d "$PG_DATABASE" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done
    log "verification database never became ready"
    return 1
}

# The bootstrap role already exists in a fresh container with its own password.
restore_roles() {
    grep -vE "^(CREATE ROLE $PG_ROLE;|ALTER ROLE $PG_ROLE WITH )" "$WORK/roles.sql" \
        | docker exec -i "$VERIFY_CONTAINER" \
            psql -U "$PG_ROLE" -d postgres -v ON_ERROR_STOP=1 -q
}

verify_restore() {
    docker run -d --name "$VERIFY_CONTAINER" --network none \
        -e POSTGRES_USER="$PG_ROLE" -e POSTGRES_PASSWORD=verify \
        -e POSTGRES_DB="$PG_DATABASE" "$VERIFY_IMAGE" >/dev/null
    wait_until_ready
    restore_roles
    docker exec -i "$VERIFY_CONTAINER" pg_restore -U "$PG_ROLE" -d "$PG_DATABASE" \
        --exit-on-error --single-transaction < "$WORK/database.dump"
    docker cp "$SCRIPT_DIR/fingerprint.sql" "$VERIFY_CONTAINER:/tmp/fingerprint.sql"
    docker exec "$VERIFY_CONTAINER" psql -U "$PG_ROLE" -d "$PG_DATABASE" \
        -v ON_ERROR_STOP=1 -tA -F '|' -f /tmp/fingerprint.sql > "$WORK/restored.txt"
    if ! diff -q "$WORK/fingerprint.txt" "$WORK/restored.txt" >/dev/null; then
        log "restored data does not match the snapshot:"
        diff "$WORK/fingerprint.txt" "$WORK/restored.txt" | head -20
        return 1
    fi
    log "restore verified: $(awk -F'|' '!/^seq:/ { t++; r += $2 }
        END { printf "%d tables, %d rows identical", t, r }' "$WORK/fingerprint.txt")"
}

seal() {
    mkdir -p "$BACKUP_DIR"
    tar -C "$WORK" -cf - database.dump roles.sql fingerprint.txt \
        | age -r "$AGE_RECIPIENT" > "$BACKUP_DIR/$NAME.tar.age"
    (cd "$BACKUP_DIR" && sha256sum "$NAME.tar.age" > "$NAME.tar.age.sha256")
}

# Names sort by date, so everything but the newest KEEP backups goes.
prune() {
    local dir="$1" keep="$2" old
    find "$dir" -maxdepth 1 -type f -name "${BACKUP_PREFIX}*" ! -name '*.sha256' -printf '%f\n' \
        | sort | head -n "-$keep" | while read -r old; do
            rm -f "$dir/$old" "$dir/$old.sha256"
        done
}

# One commit holding only the current files, force-pushed, so deleted backups
# leave no history behind and the repo stays the size of KEEP_OFFSITE files.
push_offsite() {
    local repo="$OFFSITE_DIR"
    export GIT_SSH_COMMAND="ssh -i $OFFSITE_SSH_KEY -o IdentitiesOnly=yes"
    [ -d "$repo/.git" ] || git clone -q "$OFFSITE_REMOTE" "$repo"
    cp "$BACKUP_DIR/$NAME.tar.age" "$BACKUP_DIR/$NAME.tar.age.sha256" "$repo/"
    prune "$repo" "$KEEP_OFFSITE"
    git -C "$repo" checkout -q --orphan snapshot
    git -C "$repo" add -A
    git -C "$repo" -c user.name=backup -c user.email=backup@localhost \
        commit -q -m "backups as of $STAMP"
    git -C "$repo" branch -q -M snapshot main
    git -C "$repo" push -q --force origin main
    git -C "$repo" reflog expire --expire=now --all
    git -C "$repo" gc -q --prune=now
}

main() {
    log "backup $NAME starting"
    STEP="finding the database container"
    find_database
    STEP="taking the snapshot"
    take_snapshot "$DB_CONTAINER"
    STEP="verifying the restore"
    verify_restore
    STEP="encrypting the backup"
    seal
    prune "$BACKUP_DIR" "$KEEP_LOCAL"
    log "sealed $BACKUP_DIR/$NAME.tar.age ($(du -h "$BACKUP_DIR/$NAME.tar.age" | cut -f1))"
    if [ -n "${OFFSITE_REMOTE:-}" ]; then
        STEP="pushing the offsite copy"
        push_offsite
        log "offsite copy pushed"
    fi
    log "backup $NAME done"
}

main "$@"
