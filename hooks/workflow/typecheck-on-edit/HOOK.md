---
name: typecheck-on-edit
description: A PostToolUse hook that type-checks the project after Claude edits a TypeScript, Python, or Go file and returns the errors as context immediately, listing the edited file's errors first. Uses only the project's own tsc, pyright or mypy, or go vet, and stays silent when none applies. Use to catch type errors in the same step as the edit that caused them instead of at the end of the session.
---

# typecheck-on-edit

A Claude Code hook that pairs with `format-on-edit`: after each edit it runs the type checker the project already has and, when errors exist, adds them to Claude's context so the next action is the fix.

- **TypeScript**: finds the nearest `tsconfig.json` above the edited file and runs the project's own `node_modules/.bin/tsc --noEmit` against it. Never a network fetch.
- **Python**: `pyright` from `node_modules/.bin` or on `PATH`, else `mypy`, on the edited file.
- **Go**: `go vet` on the file's package.
- **Edited file first.** Errors in the file Claude just touched lead the list; errors elsewhere (callers it broke) follow, up to 25 lines.
- **Context, not a block.** The edit already happened; the hook informs rather than rejects.
- **Fails open.** No checker, a crash, or a 60-second timeout means silence and exit `0`.

## Files

| File | Purpose |
| --- | --- |
| `typecheck-on-edit.mjs` | The hook script. |
| `HOOK.md` | This file. |

## Activate it (required manual step)

Add this to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/typecheck-on-edit/typecheck-on-edit.mjs\"",
            "timeout": 90
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
printf 'export const n: number = "x";\n' > src/bad.ts
echo '{"tool_name":"Edit","tool_input":{"file_path":"'$PWD'/src/bad.ts"},"cwd":"'$PWD'"}' \
  | node .claude/hooks/typecheck-on-edit/typecheck-on-edit.mjs
```

You should see a JSON object whose `additionalContext` lists the TS2322 error.

## Tune it

```json
{
  "typecheckOnEdit": {
    "enabled": true,
    "timeoutMs": 60000,
    "maxLines": 25
  }
}
```

On a large TypeScript project a full `tsc --noEmit` can take longer than the default cap; raise `timeoutMs` (and the settings.json `timeout`) or use project references so the nearest `tsconfig.json` is a small one.

> Hooks run arbitrary commands on your machine with your credentials whenever their event fires. Read any hook script (including this one) before enabling it.
