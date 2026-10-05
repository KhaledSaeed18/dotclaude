#!/usr/bin/env bash
# Installs or updates the ops tooling on the server. Run as root from a copy
# of this directory; ops/ship.sh does that from a workstation.
#
# Idempotent: scripts, schedules and the log policy are replaced on every
# run; configuration in /etc is created from the examples only when missing
# and never overwritten.
set -euo pipefail

SRC="$(dirname "$(readlink -f "$0")")"
PREFIX=/usr/local/lib/app-ops

[ "$(id -u)" = 0 ] || { echo "Run as root." >&2; exit 1; }
for tool in age curl docker git jq openssl; do
    command -v "$tool" > /dev/null || { echo "Missing required tool: $tool" >&2; exit 1; }
done

install -d -m 700 "$PREFIX" "$PREFIX/backup" "$PREFIX/health" "$PREFIX/lib"
install -m 700 "$SRC/backup/backup.sh" "$PREFIX/backup/"
install -m 600 "$SRC/backup/fingerprint.sql" "$SRC/backup/snapshot.sql" "$PREFIX/backup/"
install -m 700 "$SRC/health/health-check.sh" "$PREFIX/health/"
install -m 600 "$SRC/lib/alert.sh" "$PREFIX/lib/"

install -m 644 "$SRC/backup/backup.cron" /etc/cron.d/app-backup
install -m 644 "$SRC/health/health-check.cron" /etc/cron.d/app-health-check
install -m 644 "$SRC/health/ops.logrotate" /etc/logrotate.d/app-ops

if [ ! -f /etc/app-health.env ]; then
    install -m 600 "$SRC/health/health.env.example" /etc/app-health.env
    echo "Created /etc/app-health.env: set RESOURCES, DOMAINS, READINESS_URL and ALERT_WEBHOOK_URL."
fi
if [ ! -f /etc/app-backup.env ]; then
    install -m 600 "$SRC/backup/backup.env.example" /etc/app-backup.env
    echo "Created /etc/app-backup.env: set the database names and AGE_RECIPIENT before the first backup."
fi
# Before a release the pipeline takes a local-only backup into its own
# directory, so deploys never crowd out nightly backups or push offsite.
if [ ! -f /etc/app-backup-predeploy.env ]; then
    sed -e 's|^BACKUP_DIR=.*|BACKUP_DIR=/var/backups/app-db/predeploy|' \
        -e 's|^KEEP_LOCAL=.*|KEEP_LOCAL=10|' \
        -e 's|^OFFSITE_REMOTE=.*|OFFSITE_REMOTE=|' \
        /etc/app-backup.env > /etc/app-backup-predeploy.env
    chmod 600 /etc/app-backup-predeploy.env
    echo "Created /etc/app-backup-predeploy.env from /etc/app-backup.env."
fi

logrotate -d /etc/logrotate.d/app-ops > /dev/null 2>&1 || { echo "logrotate rejected /etc/logrotate.d/app-ops" >&2; exit 1; }
"$PREFIX/health/health-check.sh"
echo "Installed to $PREFIX. Health check: $(tail -1 /var/log/app-health.log)"
