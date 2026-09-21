---
name: git-guard
description: A PreToolUse hook for Bash that blocks git operations which destroy work or bypass review, with a reason Claude can act on. Stops force-pushes and deletions of protected branches (main, master, develop, or a configured list with globs), commit --no-verify, git clean -f, stash drop and clear, and hard resets, checkouts, or restores that would discard uncommitted changes. Splits compound commands so nothing hides behind a prefix. Use when Claude has git access and a mistake would cost shared history or uncommitted work.
---

# git-guard

A Claude Code hook that guards the git footguns `command-guard` does not cover. It is not about catastrophic shell commands (that is `command-guard` and `smart-approve`); it is about the ordinary git operations that quietly lose work or route around the review process.

## What it blocks

| Operation | Condition | Why |
| --- | --- | --- |
| `git push --force` / `-f` / `--force-with-lease` / `+refspec` | target (or current) branch is protected | rewrites shared history |
| `git push --delete <branch>` / `git push origin :<branch>` | branch is protected | deletes the branch remotely |
| `git branch -D` / `-d <branch>` | branch is protected | deletes the branch locally |
| `git commit --no-verify` / `-n` | always (configurable) | skips the project's own pre-commit hooks |
| `git reset --hard`, `git checkout .`, `git restore .` | working tree has uncommitted changes | discards work irreversibly |
| `git clean -f` | always | deletes untracked files |
| `git stash drop` / `clear` | always | discards stashed work |

Protected branches default to `main`, `master`, and `develop`. Patterns may contain `*` (`release/*`). Compound commands (`&&`, `||`, `;`, `|`) are split and each part is checked; quoted strings are respected, so `echo "git push --force"` passes.

The block message names the operation and the safer alternative (feature branch and PR, stash first, `git clean -n`).

## Files

| File | Purpose |
| --- | --- |
| `git-guard.mjs` | The hook script. |
| `HOOK.md` | This file. |

## Activate it (required manual step)

Add this to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/git-guard/git-guard.mjs\""
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
echo '{"tool_name":"Bash","tool_input":{"command":"git push --force origin main"},"cwd":"'$PWD'"}' \
  | node .claude/hooks/git-guard/git-guard.mjs; echo "exit=$?"
```

Exit `2` with `git-guard blocked:` on stderr means it is active.

## Tune it

```json
{
  "gitGuard": {
    "protectedBranches": ["main", "master", "develop", "release/*"],
    "allowNoVerify": false,
    "allowForcePush": false
  }
}
```

`allowForcePush: true` disables the force-push rule only; deletions and the other rules still apply.

> Hooks run arbitrary commands on your machine with your credentials whenever their event fires. Read any hook script (including this one) before enabling it.
