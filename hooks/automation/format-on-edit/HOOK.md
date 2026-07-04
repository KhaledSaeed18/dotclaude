---
name: format-on-edit
description: A PostToolUse hook that runs the project's own formatter (Biome, Prettier, gofmt, rustfmt, or ruff) on each file Claude Code edits or writes, so every change lands already formatted. Detects the formatter from project config, uses only locally installed binaries, and does nothing when no formatter applies. Use to eliminate style drift and formatting-only diffs from agent sessions.
---

# format-on-edit

A Claude Code hook that formats each file immediately after Claude edits or writes it, using whatever formatter the project itself has configured. No more "run the formatter" follow-ups or formatting-only cleanup commits at the end of a session.

- **Project-driven detection.** Formats with Biome when `biome.json`/`biome.jsonc` is present, otherwise Prettier when a Prettier config (or a `prettier` key in `package.json`) is present. Go, Rust, and Python files use `gofmt`, `rustfmt`, and `ruff format` respectively (`ruff` only when the project configures it).
- **Local binaries only.** JS-family formatters run from the project's `node_modules/.bin`; the hook never does a network `npx` fetch. If the binary is not installed, it silently does nothing.
- **One file per event.** Only the file Claude just touched is formatted, never the whole tree.
- **Fails open.** A missing, crashing, or hanging formatter (15-second cap) can never break the edit; the hook always exits `0`.
- **Zero dependencies.** Node standard library only (`node >= 18`).

## Files

| File | Purpose |
| --- | --- |
| `format-on-edit.mjs` | The hook script. Detects the formatter, formats the edited file. |
| `HOOK.md` | This file. |

After `npx shadcn@latest add KhaledSaeed18/dotclaude/format-on-edit`, both land in `.claude/hooks/format-on-edit/`.

## Activate it (required manual step)

Add this to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/format-on-edit/format-on-edit.mjs\""
          }
        ]
      }
    ]
  }
}
```

Installing the `format-on-edit` plugin from the dotclaude marketplace wires this automatically.

## Verify it

```bash
# In a project with a Prettier or Biome config: write a mangled file, pipe the event, check it reformats
printf 'const   x=1\n' > src/messy.ts
echo '{"tool_name":"Write","tool_input":{"file_path":"'$PWD'/src/messy.ts"}}' \
  | node .claude/hooks/format-on-edit/format-on-edit.mjs
cat src/messy.ts
```

## Tune it

- **Add a formatter:** extend `formatFile()` in the script with your tool; keep the pattern of detecting project config first and capping the run with a timeout.
- **Restrict file types:** edit the `BIOME_EXTS` / `PRETTIER_EXTS` sets.
- **Formatter precedence:** when both Biome and Prettier configs exist, Biome wins; reorder the checks in `formatFile()` to prefer Prettier.

> Hooks run arbitrary commands on your machine with your credentials whenever their event fires. Read any hook script (including this one) before enabling it.
