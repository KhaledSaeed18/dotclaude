---
name: create-hook
description: Author a new Claude Code hook for this repository end to end by scaffolding it with pnpm new, writing the hook script and its settings.json wiring, documenting activation in HOOK.md, then regenerating the registry. Use when creating, scaffolding, or reviewing a hook in this repo.
argument-hint: "(optional) the hook's purpose, the event it targets, or category"
---

Create a hook: a script Claude Code runs on a lifecycle event (before a tool, after a prompt, on stop, and so on). Make it do one deterministic thing, fail safe, and ship with documentation a user can paste into `settings.json`. Then regenerate the derived files and validate.

Source layout is `hooks/<category>/<name>/HOOK.md` plus the script. Hooks are **folder-layout**: the whole folder installs to `.claude/hooks/<name>/`, so the script and any helpers ride along. The **category is the folder**; `registry.json` and the README catalog are *generated* by `pnpm gen`. Never hand-edit generated files.

Hooks differ from skills, agents, and commands in one critical way: **they are configuration, not a loadable file.** The shadcn installer copies the script and `HOOK.md` but cannot edit a user's `settings.json`. So `HOOK.md` must document the exact settings block to add, and the hook is inert until the user adds it.

## Hard rules: never break these

- **Fail safe and non-blocking by default.** Unless the hook's job is to block, swallow its own errors and exit `0` so it can never interrupt or break a tool call or session. Exit `2` *only* when blocking is the intended behavior for that event.
- **`HOOK.md` must document activation.** Include the precise `settings.json` block, the event, the matcher, and the command line. Without it the hook does nothing after install.
- **Be safe with data.** Hooks see tool inputs and outputs. Redact secret-looking fields and truncate large payloads before logging or sending anything.
- **Zero or pinned dependencies.** Prefer the language's standard library so the script runs anywhere it lands. State the runtime requirement.
- **`name` is globally unique and equals the folder name**, kebab-case.
- **Never hand-write `registry.json` or the README catalog.** Run `pnpm gen`.
- **No AI/co-author mentions** anywhere in the hook or its output.

## Step 1: Define the hook

- **The one thing it does**, in a sentence.
- **The event** it fires on and whether it needs a **matcher** (for example `PreToolUse` matched to `Bash`). Event list, matcher support, and the input/exit-code contract: [reference/events.md](./reference/events.md).
- **Blocking or observing.** Does it just record/notify (exit `0`), or veto an action (exit `2` on the right event)?

## Step 2: Scaffold it

From the repo root:

```
pnpm new --type hook --category <category> --name <name> --description "<what it does>"
```

Current hook category: `observability`. Reuse it or add a new folder if justified. The scaffolder creates the folder and a `HOOK.md` stub and regenerates the registry; you then add the script.

## Step 3: Write the hook script

Add the script alongside `HOOK.md` (for example `<name>.mjs` or `<name>.sh`). Contract, in brief (full detail in [reference/events.md](./reference/events.md)):

- The event payload arrives as **JSON on stdin** (`hook_event_name`, `tool_name`, `tool_input`, `cwd`, and event-specific fields).
- **Exit `0`** = success. For most events stdout is logged; for `UserPromptSubmit` / `SessionStart` stdout is injected as context.
- **Exit `2`** = blocking error: stderr is fed back and the action is prevented (where the event supports it).
- For finer control, exit `0` and print a **JSON object** to stdout (`continue`, `decision`, `hookSpecificOutput`, `systemMessage`).
- Reference the script path with **`${CLAUDE_PROJECT_DIR}`** so it resolves regardless of working directory.

## Step 4: Write HOOK.md

`HOOK.md` is the manifest and the documentation. Cover:

1. Frontmatter `name` + `description` (the description is the catalog/registry text).
2. What the hook does, its safety properties (non-blocking, redaction), and its runtime requirement.
3. A **Files** table (script + `HOOK.md`).
4. An **Activate it** section with the exact `settings.json` block to paste, calling out that the installer cannot do this step. Use `${CLAUDE_PROJECT_DIR}` in the command path. See the existing `tool-call-logger` hook for the established shape.

## Step 5: Regenerate and validate

```
pnpm gen
pnpm validate
```

Fix the source files if validation complains; never patch generated output.

## Step 6: Review against the bar

- The hook does its one job and, unless it's meant to block, can never break a tool call (errors swallowed, exits `0`).
- `HOOK.md` documents the exact `settings.json` block, event, and matcher.
- Secret-looking data is redacted; large payloads truncated.
- `pnpm validate` passes and the README catalog shows the new row.

Report the hook's path, category, the event it targets, and the validation result. Leave committing to the user.
