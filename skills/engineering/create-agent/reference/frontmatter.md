# Agent frontmatter reference

The YAML frontmatter at the top of `AGENT.md` configures the subagent. Only `name` and `description` are required; everything else has a default. `pnpm gen` consumes `name`, `description`, and optional `title`; `pnpm validate` additionally checks the *values* of the constrained fields below, so a bad `color`, `memory`, or `model` fails before it ever ships.

## Fields

| Field             | Required | Purpose                                                                                                   |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `name`            | yes      | Unique identifier, kebab-case. Must equal the folder name. Also the install filename and shadcn item.     |
| `description`     | yes      | The delegation trigger: what the agent does and when to use it. See "description" below.                  |
| `title`           | no       | Human display name. Defaults to title-cased `name` (`deep-research` becomes "Deep Research").             |
| `tools`           | no       | The tool allowlist. Inherits all tools if omitted. Comma string or YAML list. Curate this down.           |
| `disallowedTools` | no       | Tools to remove from the inherited or specified set.                                                      |
| `model`           | no       | `sonnet`, `opus`, `haiku`, `inherit`, or a full id like `claude-opus-4-8`. Defaults to `inherit`.         |
| `color`           | no       | UI accent in the task list and transcript. One of the eight colors below.                                 |
| `memory`          | no       | Persistent memory scope for cross-session learning: `user`, `project`, or `local`.                        |
| `effort`          | no       | Reasoning effort while the agent runs: `low`, `medium`, `high`, `xhigh`, `max`. Overrides session effort. |
| `permissionMode`  | no       | `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, or `plan`.                              |
| `isolation`       | no       | Set to `worktree` to run the agent in a temporary git worktree.                                           |
| `background`      | no       | `true` to always run this agent as a background task. Default `false`.                                     |
| `maxTurns`        | no       | Cap on agentic turns before the agent stops.                                                              |

## Valid values

- **`color`**: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`. Purely cosmetic; pick a distinct one so you can tell which agent is running.
- **`memory`**: `user` (shared across all projects, best for general strategy and preferences), `project` (scoped to one repo, best for codebase-specific patterns), `local`.
- **`model`**: an alias (`sonnet` / `opus` / `haiku`), `inherit`, or a full model id.
- **`effort`**: `low` / `medium` / `high` / `xhigh` / `max`, where available for the model.

## `description`: write it to get delegated to

This string decides whether the main agent ever hands work to this subagent. Pattern that works:

> `<What it does, third person, leading with the action>, <scope/value>. Use when <the situations that should route here>.`

- **Third person, present tense**, lead with the capability, end with a concrete **"Use when …"**.
- **Name the real situations.** The more specific the triggers, the more reliably it gets delegated to and the less it fires on the wrong tasks.
- **Avoid a colon** (`: `) in the value: it is YAML and an unquoted colon-space reads as a mapping. Use a comma, "by", or "including".

## Curating tools

A subagent's value is its constraint. Start from the role and add only what it needs:

- A **research** agent: `WebSearch`, `WebFetch`, `Read`, `Write`, `Edit`, `Grep`, `Glob`. No `Bash` (no code to run).
- A **read-only reviewer**: `Read`, `Grep`, `Glob`, `Bash` (for `git diff`). No `Write`/`Edit`, so it cannot mutate the tree.

Ignore "give it everything" lists. Omitting a tool is a feature: it keeps the agent on task and its context clean.

## File-layout rule

Agents install as a single file (`.claude/agents/<name>.md`), so the source folder must contain **only `AGENT.md`**. `pnpm gen` errors if it finds anything else. Anything the agent needs to know belongs in its system prompt, not a companion file (that is a skill feature, not an agent one).
