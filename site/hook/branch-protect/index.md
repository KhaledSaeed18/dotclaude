---
name: branch-protect
description: A UserPromptSubmit hook that, once per session, tells Claude the checkout is on a protected branch (main, master, develop, or a configured list) so it creates a feature branch before editing or committing. Advisory context only; it never blocks. Use alongside git-guard when work keeps landing directly on main because nobody branched first.
---

# branch-protect

A Claude Code hook that adds one line of context the first time a prompt is submitted while the checkout is on a protected branch:

> Note from the branch-protect hook: this checkout is on the protected branch "main". Before committing or editing files, create a feature branch (`git switch -c <name>`) unless the user explicitly asked to work on main.

It says this once per session per branch (tracked by a marker in the temp directory keyed on the session id), so it does not nag. Switching to another protected branch mid-session triggers it again. The hard stops for force-pushing to or deleting the branch live in `git-guard`; this hook only nudges the workflow earlier, before there is anything to push.

## Files

| File | Purpose |
| --- | --- |
| `branch-protect.mjs` | The hook script. |
| `HOOK.md` | This file. |

## Activate it (required manual step)

Add this to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/branch-protect/branch-protect.mjs\""
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
git switch main
echo '{"hook_event_name":"UserPromptSubmit","cwd":"'$PWD'","session_id":"test"}' \
  | node .claude/hooks/branch-protect/branch-protect.mjs
```

The note prints once; run it again with the same `session_id` and it prints nothing.

## Tune it

```json
{
  "branchProtect": {
    "protectedBranches": ["main", "master", "develop"],
    "oncePerSession": true
  }
}
```

> Hooks run arbitrary commands on your machine with your credentials whenever their event fires. Read any hook script (including this one) before enabling it.
