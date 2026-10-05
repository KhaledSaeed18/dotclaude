#!/usr/bin/env bash
# Host health check for a Coolify VPS, run by cron every five minutes.
#
# Every run logs each check. An alert goes out only when the set of problems
# changes: it lists what is new, what is still failing and what recovered,
# red for a critical problem and amber for a warning, and a final green alert
# when everything passes again. Settings, all optional: /etc/app-health.env.
set -uo pipefail

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
# shellcheck source=../lib/alert.sh
source "$SCRIPT_DIR/../lib/alert.sh"

CONFIG="${HEALTH_CONFIG:-/etc/app-health.env}"
# shellcheck source=/dev/null
[ -f "$CONFIG" ] && source "$CONFIG"

# Coolify resource names (label coolify.resourceName) that must be running.
RESOURCES="${RESOURCES:-}"
COOLIFY_CONTAINERS="${COOLIFY_CONTAINERS:-coolify coolify-db coolify-redis coolify-realtime coolify-proxy}"
SERVICES="${SERVICES:-docker ufw fail2ban cron}"
# Domains whose certificate must verify and stay valid.
DOMAINS="${DOMAINS:-}"
READINESS_URL="${READINESS_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/app-db}"
BACKUP_PREFIX="${BACKUP_PREFIX:-db_}"
OFFSITE_DIR="${OFFSITE_DIR:-/var/backups/app-offsite}"
BACKUP_MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-30}"
DISK_WARN_PERCENT="${DISK_WARN_PERCENT:-85}"
DISK_CRITICAL_PERCENT="${DISK_CRITICAL_PERCENT:-95}"
MEMORY_WARN_MB="${MEMORY_WARN_MB:-512}"
CERT_WARN_DAYS="${CERT_WARN_DAYS:-14}"
STATE_DIR="${STATE_DIR:-/var/lib/app-health}"
LOG_FILE="${LOG_FILE:-/var/log/app-health.log}"

# Each entry is "<critical|warning>|<text>".
PROBLEMS=()
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

log() { echo "$NOW $*" >> "$LOG_FILE"; }
critical() { PROBLEMS+=("critical|$1"); log "PROBLEM critical $1"; }
warning() { PROBLEMS+=("warning|$1"); log "PROBLEM warning $1"; }
ok() { log "OK $1"; }

hours_since() { echo $(( ($(date +%s) - $1) / 3600 )); }

check_services() {
    local service
    for service in $SERVICES; do
        if systemctl is-active --quiet "$service"; then ok "service $service"; else critical "service $service is not active"; fi
    done
}

# Coolify names containers after resource UUIDs, so resources are found by
# label. A missing container is as much a problem as an unhealthy one.
check_resources() {
    local name id health unhealthy
    for name in $RESOURCES; do
        id="$(docker ps -q --filter "label=coolify.resourceName=$name" | head -1)"
        if [ -z "$id" ]; then critical "$name is not running"; continue; fi
        health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id")"
        if [ "$health" = healthy ] || [ "$health" = none ]; then ok "$name $health"; else critical "$name is $health"; fi
    done
    for name in $COOLIFY_CONTAINERS; do
        health="$(docker inspect -f '{{.State.Status}}/{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null || echo missing)"
        case "$health" in
            running/healthy|running/none) ok "$name $health" ;;
            *) critical "$name is $health" ;;
        esac
    done
    unhealthy="$(docker ps --filter health=unhealthy --format '{{.Names}}' | paste -sd, -)"
    if [ -n "$unhealthy" ]; then critical "unhealthy containers: $unhealthy"; else ok "no unhealthy containers"; fi
}

check_capacity() {
    local disk available
    disk="$(df -P / | awk 'NR==2 { gsub(/%/, "", $5); print $5 }')"
    if [ "$disk" -ge "$DISK_CRITICAL_PERCENT" ]; then critical "disk ${disk}% used"
    elif [ "$disk" -ge "$DISK_WARN_PERCENT" ]; then warning "disk ${disk}% used"
    else ok "disk ${disk}%"; fi
    available="$(awk '/^MemAvailable:/ { print int($2 / 1024) }' /proc/meminfo)"
    if [ "$available" -lt "$MEMORY_WARN_MB" ]; then warning "only ${available} MB memory available"; else ok "memory ${available} MB available"; fi
}

check_backups() {
    local latest age
    [ -d "$BACKUP_DIR" ] || return 0
    latest="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "${BACKUP_PREFIX}*.tar.age" -printf '%T@\n' 2>/dev/null | sort -nr | head -1)"
    if [ -z "$latest" ]; then
        critical "no verified backup in $BACKUP_DIR"
    else
        age="$(hours_since "${latest%.*}")"
        if [ "$age" -gt "$BACKUP_MAX_AGE_HOURS" ]; then critical "latest verified backup is ${age}h old"; else ok "latest backup ${age}h old"; fi
    fi
    if [ -d "$OFFSITE_DIR/.git" ]; then
        age="$(hours_since "$(git -C "$OFFSITE_DIR" log -1 --format=%ct 2>/dev/null || echo 0)")"
        if [ "$age" -gt "$BACKUP_MAX_AGE_HOURS" ]; then critical "offsite backup push is ${age}h old"; else ok "offsite push ${age}h old"; fi
    fi
}

# The proxy answers a name it has no certificate for with its own
# self-signed default, so a readable expiry date proves nothing. The served
# chain must verify against the system trust store and be issued for the name.
check_certificates() {
    local domain served expiry days
    for domain in $DOMAINS; do
        if ! served="$(echo | openssl s_client -connect 127.0.0.1:443 -servername "$domain" \
            -verify_hostname "$domain" -verify_return_error 2>/dev/null)"; then
            critical "certificate served for $domain does not verify for that name"
            continue
        fi
        expiry="$(openssl x509 -noout -enddate <<< "$served" 2>/dev/null | cut -d= -f2)"
        days=$(( ($(date -d "$expiry" +%s) - $(date +%s)) / 86400 ))
        if [ "$days" -lt "$CERT_WARN_DAYS" ]; then warning "certificate for $domain expires in ${days} days"; else ok "certificate $domain valid ${days}d"; fi
    done
}

check_readiness() {
    local code
    [ -n "$READINESS_URL" ] || return 0
    code="$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$READINESS_URL")"
    if [ "$code" = 200 ]; then ok "readiness 200"; else critical "readiness returned $code"; fi
}

check_reboot() {
    if [ -f /var/run/reboot-required ]; then warning "a reboot is required to finish OS updates"; else ok "no reboot pending"; fi
}

texts() { cut -d'|' -f2-; }

# Lines of the first sorted list that are not in the second.
only_in() { comm -23 <(printf '%s\n' "$1" | sed '/^$/d') <(printf '%s\n' "$2" | sed '/^$/d'); }

notify_problems() {
    local current="$1" previous="$2" since="$3"
    local severity=warning title="Server warning"
    local -a new still resolved fields=()
    grep -q '^critical|' <<< "$current" && { severity=critical; title="Server problem"; }
    mapfile -t new < <(only_in "$current" "$previous" | texts)
    mapfile -t still < <(comm -12 <(printf '%s\n' "$current") <(printf '%s\n' "$previous") | sed '/^$/d' | texts)
    mapfile -t resolved < <(only_in "$previous" "$current" | texts)
    [ "${#new[@]}" -gt 0 ] && fields+=("New" "$(alert_list "${new[@]}")")
    [ "${#still[@]}" -gt 0 ] && fields+=("Still failing" "$(alert_list "${still[@]}")")
    [ "${#resolved[@]}" -gt 0 ] && fields+=("Resolved" "$(alert_list "${resolved[@]}")")
    fields+=("Since" "<t:${since}:R>")
    send_alert "$severity" "$title" \
        "$(grep -c . <<< "$current") check(s) failing on the server." "${fields[@]}"
}

notify_recovered() {
    local previous="$1" since="$2" minutes=$(( ($(date +%s) - $2) / 60 ))
    local -a resolved
    mapfile -t resolved < <(printf '%s\n' "$previous" | sed '/^$/d' | texts)
    send_alert resolved "All checks passing" \
        "The server recovered after ${minutes} minute(s)." \
        "Resolved" "$(alert_list "${resolved[@]}")" "Started" "<t:${since}:f>"
}

report() {
    local current previous="" since result
    mkdir -p "$STATE_DIR"
    current="$(printf '%s\n' "${PROBLEMS[@]+"${PROBLEMS[@]}"}" | sed '/^$/d' | sort)"
    [ -f "$STATE_DIR/problems" ] && previous="$(cat "$STATE_DIR/problems")"
    since="$(cat "$STATE_DIR/since" 2>/dev/null || date +%s)"
    if [ "$current" != "$previous" ]; then
        if [ -n "$current" ]; then
            [ -z "$previous" ] && since="$(date +%s)"
            notify_problems "$current" "$previous" "$since"
        else
            notify_recovered "$previous" "$since"
        fi
        result=$?
        case "$result" in
            0) log "ALERT sent" ;;
            2) log "ALERT not sent: no webhook configured" ;;
            *) log "ALERT delivery failed" ;;
        esac
        printf '%s' "$current" > "$STATE_DIR/problems"
        if [ -n "$current" ]; then echo "$since" > "$STATE_DIR/since"; else rm -f "$STATE_DIR/since"; fi
    fi
    log "RESULT ${#PROBLEMS[@]} problem(s)"
}

main() {
    check_services
    check_resources
    check_capacity
    check_backups
    check_certificates
    check_readiness
    check_reboot
    report
}

main "$@"
