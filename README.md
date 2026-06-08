<div align="center">
  <img src=".github/assets/banner.png" alt="dotclaude" />
</div>

<br />

My personal collection of [Claude Code](https://docs.claude.com/en/docs/claude-code) extensions, distributed as a [shadcn GitHub registry](https://ui.shadcn.com/docs/registry/github).

Items install into the **current project** under `.claude/`, so run the install command from your project root. (shadcn writes into the project you run it in; its `~` means "project root", not your home directory, so a skill lands in `<project>/.claude/skills/<name>/`.)

## Install

Install any item with the shadcn CLI:

```bash
npx shadcn@latest add KhaledSaeed18/dotclaude/<item>
```

For example, run this from your project root and the `handoff` skill lands in `.claude/skills/handoff/`:

```bash
npx shadcn@latest add KhaledSaeed18/dotclaude/handoff
```

### What installs where

Each item installs under `.claude/`, by type:

| Type | Installs to | Triggered by |
| --- | --- | --- |
| Skills | `.claude/skills/<name>/` | Claude, automatically, when the description matches the task |
| Agents | `.claude/agents/<name>.md` | Claude delegating to the subagent, or you invoking it |
| Commands | `.claude/commands/<name>.md` | You, by typing `/<name>` |
| Hooks | `.claude/hooks/<name>/` | A `settings.json` event you wire up (see below) |

**Hooks need one extra step.** shadcn copies the hook's script and its `HOOK.md`, but it can't edit your `settings.json`. After installing a hook, open its `HOOK.md` and add the documented block to `.claude/settings.json` to activate it.

Want an item available globally (in every project)? Install it into a project as above and copy it into your home config — folders for skills and hooks, single files for agents and commands:

```bash
cp -R .claude/skills/handoff ~/.claude/skills/        # skills & hooks: folders
cp .claude/agents/code-reviewer.md ~/.claude/agents/  # agents & commands: single files
```

Skills and hooks that bundle companion files install them in the same folder, and the `cp -R` above carries them across automatically.

## Catalog

The catalog below lists every item in this repository, grouped by type and then category.

<!-- catalog:start -->

### Skills

#### Engineering

| Skill | Description | Install |
| --- | --- | --- |
| [create-skill](skills/engineering/create-skill/) | Author a new skill for this repository end to end by choosing its category, writing trigger-friendly frontmatter, structuring the SKILL.md, splitting reference material into companion files, then regenerating the registry and README catalog. Use when creating, scaffolding, restructuring, or reviewing a skill in this repo. | `npx shadcn@latest add KhaledSaeed18/dotclaude/create-skill` |
| [explain-codebase](skills/engineering/explain-codebase/) | Onboard to an unfamiliar codebase by mapping its architecture, entry points, and data flow. Use when starting work in a new or unknown repository and you need a navigable mental model fast. | `npx shadcn@latest add KhaledSaeed18/dotclaude/explain-codebase` |
| [grill-with-docs](skills/engineering/grill-with-docs/) | Stress-test a plan against the project's existing domain model by challenging terminology, surfacing contradictions with code, and updating CONTEXT.md and ADRs inline as decisions crystallise. | `npx shadcn@latest add KhaledSaeed18/dotclaude/grill-with-docs` |

#### Productivity

| Skill | Description | Install |
| --- | --- | --- |
| [grill-me](skills/productivity/grill-me/) | Relentlessly stress-test a plan, design, architecture, idea, or strategy until all critical decisions are resolved. | `npx shadcn@latest add KhaledSaeed18/dotclaude/grill-me` |
| [handoff](skills/productivity/handoff/) | Compact the current conversation into a handoff document for another agent to pick up. | `npx shadcn@latest add KhaledSaeed18/dotclaude/handoff` |

#### Security

| Skill | Description | Install |
| --- | --- | --- |
| [dependency-audit](skills/security/dependency-audit/) | Audit a project's dependencies for outdated and vulnerable packages and surface breaking-change notes for upgrades. Works with any ecosystem, including npm/pnpm/yarn, pip/Poetry/uv, Cargo, Go modules, Maven/Gradle, Bundler, Composer, and others. | `npx shadcn@latest add KhaledSaeed18/dotclaude/dependency-audit` |
| [secret-scan](skills/security/secret-scan/) | Scan code or a diff for hardcoded secrets (API keys, tokens, passwords, private keys, and other exposed credentials) before they get committed or shipped. Use before committing, during review, or when auditing a repository. | `npx shadcn@latest add KhaledSaeed18/dotclaude/secret-scan` |

#### Version Control

| Skill | Description | Install |
| --- | --- | --- |
| [changelog](skills/version-control/changelog/) | Generate a changelog or release notes from Git history, grouped by change type, written in user-facing language, with issue/PR links and breaking changes called out. Conventional-Commits aware and Keep a Changelog formatted; respects any existing CHANGELOG or tooling. Use when preparing release notes or updating CHANGELOG.md. | `npx shadcn@latest add KhaledSaeed18/dotclaude/changelog` |
| [git-commit](skills/version-control/git-commit/) | Commit work the right way by gathering full repo state, respecting the project's commitlint/pre-commit/branch rules, staging only understood files, and writing a conventional-commit message whose body explains why. Use when committing, branching, or pushing changes. | `npx shadcn@latest add KhaledSaeed18/dotclaude/git-commit` |
| [git-undo](skills/version-control/git-undo/) | Recover safely from Git mistakes such as discard, unstage, amend, reset, revert, restore lost commits via reflog, recover deleted branches, and fix bad rebases. Chooses the least-destructive fix and protects against data loss. Use when something in Git went wrong and needs undoing. | `npx shadcn@latest add KhaledSaeed18/dotclaude/git-undo` |
| [gitignore](skills/version-control/gitignore/) | Generate or repair a .gitignore tailored to the project's actual stacks, frameworks, OS, and editors, and untrack files that are already committed but should be ignored. Flags secrets/build/dependency files that slipped into the repo. Use when creating, fixing, or auditing .gitignore. | `npx shadcn@latest add KhaledSaeed18/dotclaude/gitignore` |
| [merge-conflict](skills/version-control/merge-conflict/) | Resolve Git merge, rebase, cherry-pick, revert, and stash conflicts safely by understanding both sides and the operation in progress before integrating, then verifying the result builds and passes tests. Use when a merge/rebase/cherry-pick stops with conflicts or "needs merge". | `npx shadcn@latest add KhaledSaeed18/dotclaude/merge-conflict` |
| [pr-description](skills/version-control/pr-description/) | Generate a clear, reviewer-friendly pull-request description from a diff, covering what changed, why, risk, and how it was tested. Use when opening a pull request or writing/improving a PR body. | `npx shadcn@latest add KhaledSaeed18/dotclaude/pr-description` |
| [release-tag](skills/version-control/release-tag/) | Cut a release by determining the SemVer bump from history, updating version files across any stack, refreshing the changelog, creating an annotated (optionally signed) Git tag, and pushing the release safely after pre-flight checks. Use when tagging a version, bumping the version, or preparing a release. | `npx shadcn@latest add KhaledSaeed18/dotclaude/release-tag` |

### Agents

#### Engineering

| Agent | Description | Install |
| --- | --- | --- |
| [code-reviewer](agents/engineering/code-reviewer/) | Expert reviewer for a code change (a diff, a staged set, a branch, or named files). Reviews for correctness, security, and maintainability across JavaScript/TypeScript stacks including React, Next.js, Node, Express, and NestJS. Use proactively after writing or modifying code, before opening a pull request, or when the user asks for a code review, a second pair of eyes, or feedback on a change. | `npx shadcn@latest add KhaledSaeed18/dotclaude/code-reviewer` |

### Commands

#### Testing

| Command | Description | Install |
| --- | --- | --- |
| [write-tests](commands/testing/write-tests/) | Generate a focused, production-quality test suite for a source file, detecting the project's existing test runner and conventions. | `npx shadcn@latest add KhaledSaeed18/dotclaude/write-tests` |

### Hooks

#### Observability

| Hook | Description | Install |
| --- | --- | --- |
| [tool-call-logger](hooks/observability/tool-call-logger/) | A PreToolUse/PostToolUse hook that appends one JSON line per tool call (tool name, inputs, and response) to a local log file, with secret redaction and payload truncation. Use to audit, debug, or observe exactly what Claude Code did during a session. | `npx shadcn@latest add KhaledSaeed18/dotclaude/tool-call-logger` |

<!-- catalog:end -->

## License

[MIT](LICENSE) © Khaled Saeed

### Attributions

Some skills in this project were created from scratch, while others were inspired by, adapted from, or built upon work from the open-source community. Credit and thanks to the following resources:

| Source | Link |
|--------|------|
| Matt Pocock's Skills | [mattpocock/skills](https://github.com/mattpocock/skills) |
