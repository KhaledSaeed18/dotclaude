# shellcheck shell=bash
# Discord alerts shared by the ops scripts. Each alert is one embed: a colour
# by severity, a title, a description and optional fields. The message text
# carries the title too, because phone notifications show only the text.
#
# Callers set ALERT_WEBHOOK_URL. send_alert returns 2 when it is not set, 1
# when delivery failed, and 0 when Discord accepted the message.

ALERT_COLOR_CRITICAL=15026765
ALERT_COLOR_WARNING=16098597
ALERT_COLOR_RESOLVED=3187820

# Discord rejects longer values; cut them instead of losing the alert.
ALERT_TITLE_MAX=256
ALERT_DESCRIPTION_MAX=4000
ALERT_FIELD_MAX=1024

# send_alert <critical|warning|resolved> <title> <description> [<field name> <field value>]...
send_alert() {
    local severity="$1" title="$2" description="$3" color fields='[]'
    shift 3
    [ -n "${ALERT_WEBHOOK_URL:-}" ] || return 2
    case "$severity" in
        critical) color="$ALERT_COLOR_CRITICAL" ;;
        warning) color="$ALERT_COLOR_WARNING" ;;
        *) color="$ALERT_COLOR_RESOLVED" ;;
    esac
    while [ "$#" -ge 2 ]; do
        fields="$(jq -c --arg name "$1" --arg value "${2:0:$ALERT_FIELD_MAX}" \
            '. + [{name: $name, value: $value, inline: false}]' <<< "$fields")"
        shift 2
    done
    jq -n \
        --arg title "${title:0:$ALERT_TITLE_MAX}" \
        --arg description "${description:0:$ALERT_DESCRIPTION_MAX}" \
        --argjson color "$color" \
        --argjson fields "$fields" \
        --arg host "$(hostname)" \
        --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '{content: $title,
          embeds: [{title: $title, description: $description, color: $color,
                    fields: $fields, footer: {text: $host}, timestamp: $timestamp}]}' \
        | curl -fsS --max-time 15 -H 'Content-Type: application/json' \
            --data @- "$ALERT_WEBHOOK_URL" > /dev/null || return 1
}

# Bullet list of the given lines, for an embed description or field.
alert_list() {
    local line
    for line in "$@"; do printf -- '- %s\n' "$line"; done
}
