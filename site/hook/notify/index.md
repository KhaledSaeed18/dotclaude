---
name: notify
description: A Notification hook that turns Claude Code notifications into native desktop notifications (macOS osascript, Linux notify-send), so long-running sessions can be left in the background and still get your attention when Claude needs input. Message text is sanitized before reaching the OS tool. Use when you run long agent sessions and miss the moments they stop to ask something.
---

# notify

A Claude Code hook that surfaces Claude Code's notifications (permission requests, idle prompts, attention needed) as native desktop notifications. Start a long task, switch away, and get pinged when Claude actually needs you.

- **macOS:** uses the built-in `osascript` `display notification`; no setup.
- **Linux:** uses `notify-send` (libnotify); silently does nothing if it is not installed.
- **Injection-safe:** the notification text is stripped of quotes, backslashes, and control characters before being passed to the OS tool, so message content cannot escape into the command.
- **Fails open.** Any error exits `0`; a broken notifier can never affect the session.
- **Zero dependencies.** Node standard library only (`node >= 18`).

## Files

| File | Purpose |
| --- | --- |
| `notify.mjs` | The hook script. Sanitizes the message and raises the notification. |
| `HOOK.md` | This file. |

After `npx shadcn@latest add KhaledSaeed18/dotclaude/notify`, both land in `.claude/hooks/notify/`.

## Activate it (required manual step)

Add this to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/notify/notify.mjs\""
          }
        ]
      }
    ]
  }
}
```

Installing the `notify` plugin from the dotclaude marketplace wires this automatically.

## Verify it

```bash
echo '{"hook_event_name":"Notification","message":"Claude is waiting for your input"}' \
  | node .claude/hooks/notify/notify.mjs
# A desktop notification titled "Claude Code" should appear.
```

## Tune it

- **Title:** edit the `TITLE` constant.
- **Length cap:** messages truncate at 200 characters; adjust `MAX_LEN`.
- **Sound (macOS):** append `sound name "Glass"` inside the `display notification` string in the script.

> Hooks run arbitrary commands on your machine with your credentials whenever their event fires. Read any hook script (including this one) before enabling it.
