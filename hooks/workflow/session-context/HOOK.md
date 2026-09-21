---
name: session-context
description: A SessionStart hook that orients every new session before the first prompt by injecting the current branch, ahead/behind status, uncommitted files, the last few commits, and any HANDOFF.md left by a previous session as context. Reads only; writes nothing. Use when sessions keep starting cold, re-discovering repo state, or missing a handoff document that was written for them.
---

# session-context

A Claude Code hook that runs when a session starts (new, resumed, cleared, or after compaction) and hands Claude a short situation report so its first action is informed rather than exploratory.

What it reports:

- **Branch** and, when there is an upstream, how far ahead or behind it is.
- **Uncommitted changes** as `git status --porcelain` lines, first ten plus a count.
- **Recent commits**, three by default.
- **Handoff document** (`HANDOFF.md` by default, the file the `handoff` skill writes), capped at 4000 characters.

Output is emitted as `additionalContext`, so it enters Claude's context without appearing as a user message. Outside a git repository the git sections are skipped; with nothing to say, the hook says nothing.

## Files

| File | Purpose |
| --- | --- |
| `session-context.mjs` | The hook script. |
| `HOOK.md` | This file. |

## Activate it (required manual step)

Add this to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-context/session-context.mjs\""
          }
        ]
      }
    ]
  }
}
```

Installing the `workflow-hooks` plugin from the dotclaude marketplace wires this automatically.

## Verify it

```bash
echo '{"hook_event_name":"SessionStart","cwd":"'$PWD'"}' \
  | node .claude/hooks/session-context/session-context.mjs
```

You should see a JSON object whose `additionalContext` starts with `Session context`.

## Tune it

Optional settings in `<project>/.claude/dotclaude.json`:

```json
{
  "sessionContext": {
    "commits": 3,
    "handoffFile": "HANDOFF.md",
    "maxHandoffChars": 4000
  }
}
```

Set `commits` to `0` to drop the commit list. `handoffFile` is relative to the project root and must stay inside it.

> Hooks run arbitrary commands on your machine with your credentials whenever their event fires. Read any hook script (including this one) before enabling it.
