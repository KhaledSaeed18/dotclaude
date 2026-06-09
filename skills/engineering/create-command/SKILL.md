---
name: create-command
description: Author a new slash command for this repository end to end by scaffolding it with pnpm new, writing the frontmatter and argument handling, drafting the prompt body, then regenerating the registry. Use when creating, scaffolding, or reviewing a slash command in this repo.
argument-hint: "(optional) the command's purpose, proposed name, or category"
---

Create a slash command: a prompt the user invokes by typing `/<name>`. Make it do one well-scoped action, accept its arguments cleanly, and read like a tight instruction set. Then regenerate the derived files and validate.

Source layout is `commands/<category>/<name>/COMMAND.md`. Commands are **file-layout**: the folder must contain only `COMMAND.md`, because it installs as the single file `.claude/commands/<name>.md`. The `/<name>` the user types comes from that filename. The **category is the folder**; `registry.json` and the README catalog are *generated* by `pnpm gen`. Never hand-edit generated files.

## Hard rules: never break these

- **One command, one action.** A command is something the user deliberately triggers (`/write-tests`, `/deploy`). Keep it to a single, well-scoped job.
- **File layout: only `COMMAND.md`.** No companion files; `pnpm gen` rejects extras because the command installs as one file.
- **Gate side effects.** If the command commits, pushes, deploys, deletes, or sends anything, state exactly what will happen and confirm before doing it. Consider `disable-model-invocation: true` so only the user can fire it.
- **`name` is globally unique and equals the folder name**, kebab-case.
- **Never hand-write `registry.json` or the README catalog.** Run `pnpm gen`.
- **No AI/co-author mentions** anywhere in the command or its output.

## Step 1: Define the command

- **The one action** it performs, in a sentence.
- **The arguments** it takes, if any, and what each means.
- **Who invokes it.** User-only (set `disable-model-invocation: true`) for anything with side effects or timing you want to control; both you and Claude for safe, read-only helpers.

## Step 2: Scaffold it

From the repo root:

```
pnpm new --type command --category <category> --name <name> --description "<what it does>"
```

Current command category: `testing`. Reuse it or add a new folder if a different family is justified. The scaffolder enforces kebab-case and global name uniqueness and regenerates the registry.

## Step 3: Write the frontmatter

Required: `name`, `description`. Useful optional fields:

| Field                      | Purpose                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `argument-hint`            | Autocomplete hint for expected args, e.g. `[file]` or `[issue-number] [format]`. Omit if none.   |
| `allowed-tools`            | Tools the command may use without a permission prompt while active. Space/comma string or list.  |
| `disable-model-invocation` | `true` so only the user can run it (Claude won't auto-trigger). Use for side-effecting commands.  |
| `model`                    | Pin a model for this command. Defaults to the session model.                                     |

Write `description` third person, leading with the action; avoid a `: ` (it is YAML).

## Step 4: Write the body with arguments

The markdown body is the prompt that runs when the command is invoked. Address the agent, imperative. Wire in input:

- **`$ARGUMENTS`** expands to everything the user typed after the command.
- **`$1`, `$2`, …** expand to positional arguments.
- A leading **`!`** line runs a shell command and inlines its output (needs `allowed-tools`), e.g. ``!`git diff --stat` `` to ground the prompt in live state.
- **`@path/to/file`** pulls a file's contents into the prompt.

If the command takes arguments but the body omits `$ARGUMENTS`, Claude Code appends what the user typed automatically, but referencing it explicitly reads better.

## Step 5: Regenerate and validate

```
pnpm gen
pnpm validate
```

Fix the source `COMMAND.md` if validation complains; never patch generated output.

## Step 6: Review against the bar

- Invoking `/<name>` does the one action cleanly, with arguments handled.
- Side effects are gated and, where appropriate, `disable-model-invocation: true` is set.
- The folder contains only `COMMAND.md`.
- `pnpm validate` passes and the README catalog shows the new row.

Report the command's path, category, how it's invoked, and the validation result. Leave committing to the user.
