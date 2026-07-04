# Contributing

Thanks for your interest in adding to this registry. It distributes four kinds of Claude Code extension: **skills**, **agents**, **commands**, and **hooks**. This guide covers how the repo is structured, how to add an item, and the conventions every item follows.

## Prerequisites

- Node.js `>= 20`
- [pnpm](https://pnpm.io) (the repo pins a version via `packageManager`)

```bash
pnpm install
```

## The one rule: source vs generated

Every item lives at `<type>/<category>/<name>/<MANIFEST>`. From that location plus the manifest's frontmatter, `pnpm gen` derives **everything else**:

- each item's `registry.json`
- the root `registry.json`
- the README catalog, the count badges, and the plugins table
- `.claude-plugin/marketplace.json` (the Claude Code plugin marketplace) and the renamed command copies under `.claude-plugin/commands/`

**Never hand-edit a `registry.json`, the marketplace file, anything under `.claude-plugin/`, the README catalog, or the badge numbers.** They are generated. Edit the source manifest and run `pnpm gen`; `pnpm gen:check` fails CI if anything is stale.

**Plugin membership is category-driven.** The `PLUGINS` list in `scripts/gen.ts` maps category folders to marketplace plugins (for example, everything under `skills/version-control/` ships in the `git` plugin). Add an item to a selected category and it joins that plugin on the next `pnpm gen`; only a genuinely new bundle needs a `PLUGINS` edit. Hook plugins wire their scripts inline via `${CLAUDE_PLUGIN_ROOT}`, so they activate on install with no manual `settings.json` step.

## Add an item in one command

The scaffolder creates the folder, writes a convention-matching stub, and regenerates the derived files:

```bash
pnpm new --type agent --category research --name my-agent \
         --description "What it does. Use when ..."
```

Run `pnpm new` with no flags for a fully interactive prompt, or pass only some flags and it asks for the rest. Then edit the stub manifest and run `pnpm validate`.

If you'd rather have Claude Code drive it, this repo ships authoring skills that walk the whole process per type:

| Type    | Authoring skill  |
| ------- | ---------------- |
| Skill   | `create-skill`   |
| Agent   | `create-agent`   |
| Command | `create-command` |
| Hook    | `create-hook`    |

## The four item types

| Type    | Source folder              | Manifest      | Layout | Installs to                      | Triggered by                                   |
| ------- | -------------------------- | ------------- | ------ | -------------------------------- | ---------------------------------------------- |
| Skill   | `skills/<category>/<name>/`   | `SKILL.md`    | folder | `.claude/skills/<name>/`         | Claude, automatically, when the description matches |
| Agent   | `agents/<category>/<name>/`   | `AGENT.md`    | file   | `.claude/agents/<name>.md`       | Claude delegating to the subagent              |
| Command | `commands/<category>/<name>/` | `COMMAND.md`  | file   | `.claude/commands/<name>.md`     | You, by typing `/<name>`                        |
| Hook    | `hooks/<category>/<name>/`     | `HOOK.md`     | folder | `.claude/hooks/<name>/`          | A `settings.json` event you wire up            |

- **Folder layout** (skills, hooks): the whole folder is bundled, so companion files (reference docs, templates, scripts) ride along. Reference them with relative links.
- **File layout** (agents, commands): the folder must contain **only** the manifest, because the item installs as a single file. `pnpm gen` rejects extras.

## Conventions

**Naming.** Item `name` and `category` are kebab-case (`merge-conflict`, `version-control`). The `name` must equal the folder name and be **globally unique across all four types**, since skills, agents, and commands install to flat directories where a collision would clobber.

**Categories.** Reuse an existing category folder unless a genuinely new family is justified. The category is just the folder an item lives in (there is no `category` field), so the current set is whatever `ls skills agents commands hooks` shows — at the time of writing: `engineering`, `productivity`, `research`, `security`, `testing`, `version-control`, and `observability`, in varying combinations per type. Recategorizing later is just a `git mv` plus `pnpm gen`.

**Frontmatter.** `name` and `description` are always required. The `description` is load-bearing: it decides when a skill loads or an agent is delegated to. Write it third person, lead with the action, and end with an explicit **"Use when ..."** clause. Avoid a `: ` inside the value (it is YAML). Optional fields by type:

- **Skills**: `title`, `argument-hint`.
- **Agents**: `tools`, `model`, `color`, `memory`, `effort`, and more. `pnpm validate` checks the *values* (a bad color, memory scope, or model alias fails). See the `create-agent` skill's frontmatter reference.
- **Commands**: `argument-hint`, `allowed-tools`, `disable-model-invocation`, `model`.
- **Hooks**: documented in `HOOK.md`; a hook is configuration, so `HOOK.md` must spell out the `settings.json` block to activate it.

**Voice.** Match the existing items: address the agent in the second person, imperative; lead with the principle, then the mechanics; be concrete; no filler. Do not mention Claude, AI, or co-authorship anywhere in an item or its output.

## Dev workflow

| Command           | What it does                                                            |
| ----------------- | ----------------------------------------------------------------------- |
| `pnpm new`        | Scaffold a new item and regenerate.                                     |
| `pnpm gen`        | Write all derived files (registry + README catalog + badges).           |
| `pnpm gen:check`  | Fail if any generated file is stale. Runs in CI.                        |
| `pnpm validate`   | Check frontmatter values and layout, then `shadcn registry validate`.   |
| `pnpm test`       | Run the Vitest suite for the generator and validator.                   |
| `pnpm typecheck`  | `tsc --noEmit`.                                                         |
| `pnpm lint`       | `biome check .`.                                                        |
| `pnpm format`     | `biome format --write .`.                                               |

## Before you open a pull request

Run the same checks CI runs:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm gen:check && pnpm validate
```

Then confirm:

- The item earns its place (a reusable, multi-step procedure with judgment, not a one-liner).
- The `description` would trigger on the intended phrasings without over-triggering.
- File-layout items contain only their manifest; folder-layout companions are linked.
- The README catalog shows your item under the right category and the badge count is correct (both regenerated, not hand-edited).
- No em dashes and no AI/co-author mentions.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `chore:`, `ci:`), matching the existing history. Leave the actual commit to your own workflow.

## Continuous integration

Two workflows run on every pull request:

- **validate** ([.github/workflows/validate.yml](.github/workflows/validate.yml)): typecheck, lint, test, `gen:check`, and registry validation.
- **security** ([.github/workflows/security.yml](.github/workflows/security.yml)): secret scanning and a dependency audit, plus a weekly scheduled run.

## Trying an item locally

Install any item into a test project with the shadcn CLI and exercise it before proposing it:

```bash
npx shadcn@latest add KhaledSaeed18/dotclaude/<name>
```

See the [README](README.md) for how each type installs and, for hooks, the extra `settings.json` step.
