# Hook events and the script contract

A hook binds a script to a Claude Code lifecycle event through `settings.json`. This file covers the events you'll target most, how to register one, what the script receives, and how its exit code and output steer Claude Code.

## Common events

The events a hook in this repo will usually target (the full set is larger):

| Event              | Fires when                              | Matcher                  |
| ------------------ | --------------------------------------- | ------------------------ |
| `SessionStart`     | A session begins or resumes             | `startup`/`resume`/`clear`/`compact` |
| `UserPromptSubmit` | The user submits a prompt, before work  | none                     |
| `PreToolUse`       | Before a tool executes                  | tool names (e.g. `Bash`) |
| `PostToolUse`      | After a tool call succeeds              | tool names               |
| `Stop`             | Claude finishes responding              | none                     |
| `SubagentStop`     | A subagent finishes                     | agent types              |
| `PreCompact`       | Before context compaction               | `manual`/`auto`          |
| `SessionEnd`       | The session terminates                  | end reasons              |

A **matcher** narrows when the hook runs. For tool events it matches tool names (`"Bash"`, `"Write"`, `"*"` for all). Events marked "none" run on every occurrence.

## Registering a command hook in settings.json

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/<name>/<name>.mjs\"",
            "timeout": 600
          }
        ]
      }
    ]
  }
}
```

`hooks` maps each event name to an array of `{ matcher, hooks: [...] }` groups; each entry is a handler. For a command handler, `type` is `"command"` and `command` is the shell line. `timeout` (seconds) is optional. Use `${CLAUDE_PROJECT_DIR}` so the path resolves no matter the working directory; it is also exported as an env var to the script.

## What the script receives (stdin)

Claude Code pipes a JSON object to the script's stdin:

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/directory",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "rm -rf /tmp/build" }
}
```

Common fields appear on every event (`session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`); the rest are event-specific (`tool_name` and `tool_input` for tool events, `prompt` for `UserPromptSubmit`, and so on).

## Exit codes

| Exit | Meaning                                                                                              |
| ---- | --------------------------------------------------------------------------------------------------- |
| `0`  | Success. stdout is logged for most events; for `UserPromptSubmit` and `SessionStart` it is injected as context Claude can see. JSON output (below) is read only on exit `0`. |
| `2`  | Blocking error. stdout/JSON ignored; stderr is fed back to Claude. The effect depends on the event: `PreToolUse` blocks the tool, `UserPromptSubmit` rejects the prompt, and so on. |
| other | Non-blocking error. A notice and the first stderr line are shown; execution continues. |

A safe, observe-only hook does its work, swallows any error, and exits `0` so it can never disrupt the session.

## JSON output for finer control (exit 0)

Print a single valid JSON object to stdout (no other stdout text) to steer behavior:

```json
{
  "continue": false,
  "stopReason": "Build failed",
  "systemMessage": "Warning shown to the user",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Destructive command blocked",
    "additionalContext": "Extra info passed to Claude"
  }
}
```

- `continue: false` stops Claude entirely and takes precedence over event-specific decisions.
- `decision: "block"` blocks on events that support top-level blocking (`UserPromptSubmit`, `Stop`, and similar).
- `hookSpecificOutput` carries event-specific control plus `additionalContext`.
- `systemMessage` surfaces a warning to the user.

## Example: block a tool, otherwise stay out of the way

```bash
#!/bin/bash
command=$(jq -r '.tool_input.command' < /dev/stdin)
if [[ "$command" == rm* ]]; then
  echo "Blocked: rm commands are not allowed" >&2
  exit 2   # blocking error: the tool call is prevented
fi
exit 0     # no decision: normal flow continues
```
