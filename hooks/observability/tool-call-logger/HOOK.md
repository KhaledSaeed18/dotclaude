---
name: tool-call-logger
description: A PreToolUse/PostToolUse hook that appends one JSON line per tool call (tool name, inputs, and response) to a local log file, with secret redaction and payload truncation. Use to audit, debug, or observe exactly what Claude Code did during a session.
---

# tool-call-logger

A Claude Code hook that records every tool call to a JSONL file so you can audit, debug, or analyse what happened in a session. It runs as a `command` hook: Claude Code pipes the tool event to the script on stdin, and the script appends one sanitized line per call.

- **Non-blocking:** swallows every error and always exits `0`, so it can never interrupt or fail a tool call.
- **Zero dependencies:** Node standard library only (`node >= 18`).
- **Safe by default:** redacts secret-looking keys (`token`, `password`, `apiKey`, `authorization`, …) and truncates oversized fields.

## Files

| File | Purpose |
| --- | --- |
| `log-tool-calls.mjs` | The hook script. Reads the event from stdin, appends a record. |
| `HOOK.md` | This file. |

After `npx shadcn@latest add KhaledSaeed18/dotclaude/tool-call-logger`, both land in `.claude/hooks/tool-call-logger/`.

## Activate it (required manual step)

The installer copies the files but **cannot** edit your `settings.json` — hooks are configuration, not loadable files, so you wire it up once by hand. Add this to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/tool-call-logger/log-tool-calls.mjs\""
          }
        ]
      }
    ]
  }
}
```

- `matcher: "*"` logs every tool. Narrow it to specific tools with a regex, e.g. `"Edit|Write|Bash"`.
- `$CLAUDE_PROJECT_DIR` is set by Claude Code to the project root, so the path resolves no matter the working directory. If you installed the script globally under `~/.claude/`, point the command there instead.
- **`PostToolUse`** captures the tool input **and** its response. To log the *intent* before a tool runs (no response yet), add the same block under **`PreToolUse`** — the script handles both events. Wiring both gives you a before/after trail.

Run `/hooks` in Claude Code (or restart the session) to load the change. For safety, Claude Code captures a snapshot of hooks at startup, so external edits aren't applied mid-session until you review them via `/hooks`.

## Output

Records are appended as JSON Lines (one object per line) to:

```
$CLAUDE_PROJECT_DIR/.claude/logs/tool-calls.jsonl
```

Each line:

```json
{
  "ts": "2026-06-08T12:34:56.789Z",
  "event": "PostToolUse",
  "session_id": "abc123",
  "cwd": "/path/to/project",
  "tool_name": "Bash",
  "tool_input": { "command": "git status", "description": "Show working tree status" },
  "tool_response": { "stdout": "…", "stderr": "", "interrupted": false }
}
```

Read it back with standard tools — e.g. the last 20 Bash calls:

```bash
grep '"tool_name":"Bash"' .claude/logs/tool-calls.jsonl | tail -20 | jq .
```

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `CLAUDE_TOOL_LOG` | `$CLAUDE_PROJECT_DIR/.claude/logs/tool-calls.jsonl` | Override the log path (absolute, or relative to cwd). |
| `CLAUDE_TOOL_LOG_MAXLEN` | `2000` | Max characters per string field before truncation. |

Set them in the hook command if you want, e.g.:

```json
"command": "CLAUDE_TOOL_LOG=/tmp/claude-tools.jsonl node \"$CLAUDE_PROJECT_DIR/.claude/hooks/tool-call-logger/log-tool-calls.mjs\""
```

## Keep logs out of Git

The log can grow quickly and may contain repo paths or snippets. Add it to `.gitignore`:

```
.claude/logs/
```

## Troubleshooting

- **No file appears.** Confirm the hook is registered (`/hooks`), that `node` is on PATH, and that the `command` path is correct. The script fails silently by design, so test it directly:
  ```bash
  echo '{"hook_event_name":"PostToolUse","tool_name":"Bash","tool_input":{"command":"ls"},"tool_response":{"stdout":"ok"}}' \
    | node .claude/hooks/tool-call-logger/log-tool-calls.mjs
  cat .claude/logs/tool-calls.jsonl
  ```
- **A value shows `[redacted]`.** That key matched the secret pattern — expected. Adjust the `SECRET_KEY` regex in the script if it's over-eager for your data.
- **Lines are cut with `…(+N chars)`.** Raise `CLAUDE_TOOL_LOG_MAXLEN`.

> Hooks run arbitrary commands on your machine with your credentials whenever their event fires. Read any hook script (including this one) before enabling it, and only register hooks you trust.
