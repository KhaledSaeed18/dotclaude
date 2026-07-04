---
name: precompact-saver
description: A PreCompact hook that snapshots the full session transcript to .claude/compact-backups/ right before Claude Code compacts the context, so exact instructions, tool output, and decisions survive after the summary drops them. Keeps the newest ten snapshots and prunes the rest. Use when long sessions get compacted and you need a reliable record of what was said before the summary.
---

# precompact-saver

A Claude Code hook that preserves the complete conversation transcript at the moment before compaction. Compaction replaces detail with a summary; when a decision, exact instruction, or piece of tool output from earlier matters later, the snapshot has it verbatim.

- **Snapshots on every compaction**, automatic or manual (`/compact`).
- **Bounded storage:** keeps the newest 10 snapshots per project and prunes older ones.
- **Fails open.** Any error exits `0` and compaction proceeds normally.
- **Zero dependencies.** Node standard library only (`node >= 18`).

## Files

| File | Purpose |
| --- | --- |
| `precompact-saver.mjs` | The hook script. Copies the transcript, prunes old snapshots. |
| `HOOK.md` | This file. |

After `npx shadcn@latest add KhaledSaeed18/dotclaude/precompact-saver`, both land in `.claude/hooks/precompact-saver/`.

## Activate it (required manual step)

Add this to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/precompact-saver/precompact-saver.mjs\""
          }
        ]
      }
    ]
  }
}
```

Installing the `precompact-saver` plugin from the dotclaude marketplace wires this automatically.

## Output

Snapshots are JSONL transcripts at:

```
<project>/.claude/compact-backups/precompact-<timestamp>-<session>.jsonl
```

Ask Claude to search one when you need something compaction dropped, e.g. "check the latest file in .claude/compact-backups for the exact migration command we agreed on".

## Keep snapshots out of Git

Transcripts contain your full conversation and tool output. Add to `.gitignore`:

```
.claude/compact-backups/
```

## Tune it

- **Retention:** change the `KEEP_LAST` constant (default 10).

> Hooks run arbitrary commands on your machine with your credentials whenever their event fires. Read any hook script (including this one) before enabling it.
