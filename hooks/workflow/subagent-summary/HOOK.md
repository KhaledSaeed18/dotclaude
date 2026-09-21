---
name: subagent-summary
description: A SubagentStop hook that appends one JSON line per finished subagent to a project log (timestamp, session, agent id, and the first 300 characters of its final report), giving delegated and parallel work an audit trail. Use when sessions fan work out to subagents and you want to see afterwards what each one did and reported.
---

# subagent-summary

A Claude Code hook that records every subagent's completion. Delegation is where sessions become hard to follow: a `parallel-agents` fan-out or a `deep-research` hand-off runs in its own context, and only the final report comes back. This hook keeps a durable, one-line-per-agent record so you can reconstruct what happened.

Each line in `.claude/subagents.log`:

```json
{"ts":"2026-09-21T10:00:00.000Z","session":"…","agent":"…","summary":"Found 3 issues in auth.ts…"}
```

The summary is the last assistant message from the subagent's transcript when Claude Code provides `agent_transcript_path`, whitespace-collapsed and capped; otherwise it is empty and the line still records that the agent finished.

Add the log file to `.gitignore`. It is created on first use and stays inside the project.

## Files

| File | Purpose |
| --- | --- |
| `subagent-summary.mjs` | The hook script. |
| `HOOK.md` | This file. |

## Activate it (required manual step)

Add this to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/subagent-summary/subagent-summary.mjs\""
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
echo '{"hook_event_name":"SubagentStop","cwd":"'$PWD'","session_id":"s","agent_id":"a"}' \
  | node .claude/hooks/subagent-summary/subagent-summary.mjs
tail -1 .claude/subagents.log
```

## Tune it

```json
{
  "subagentSummary": {
    "logFile": ".claude/subagents.log",
    "maxSummaryChars": 300
  }
}
```

`logFile` is relative to the project root and must stay inside it.

> Hooks run arbitrary commands on your machine with your credentials whenever their event fires. Read any hook script (including this one) before enabling it.
