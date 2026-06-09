<div align="center">
  <img src=".github/assets/banner.png" alt="dotclaude" />
</div>

<div align="center">
  <a href="https://docs.claude.com/en/docs/claude-code"><img src="https://shieldcn.dev/badge/Claude%20Code-extensions-D97757.svg?logo=claude&variant=branded&animate=shimmer" alt="Claude Code extensions" /></a>
</div>

<div align="center">
<!-- badges:start -->
  <a href="#skills"><img src="https://shieldcn.dev/badge/Skills-27-2563eb.svg?split=true&logo=ri:RiSparkling2Fill" alt="27 skills" /></a>
  <a href="#agents"><img src="https://shieldcn.dev/badge/Agents-2-7c3aed.svg?split=true&logo=ri:RiRobot2Fill" alt="2 agents" /></a>
  <a href="#commands"><img src="https://shieldcn.dev/badge/Commands-1-0891b2.svg?split=true&logo=ri:RiTerminalBoxFill" alt="1 command" /></a>
  <a href="#hooks"><img src="https://shieldcn.dev/badge/Hooks-2-db2777.svg?split=true&logo=ri:RiPlugFill" alt="2 hooks" /></a>
<!-- badges:end -->
</div>

<br />

My personal collection of [Claude Code](https://docs.claude.com/en/docs/claude-code) extensions, distributed as a [shadcn GitHub registry](https://ui.shadcn.com/docs/registry/github).

Items install into the **current project** under `.claude/`, so run the install command from your project root. (shadcn writes into the project you run it in; its `~` means "project root", not your home directory, so a skill lands in `<project>/.claude/skills/<name>/`.)

## Skills, agents, commands, and hooks

If you are new to Claude Code extensions, here is what each kind is and when you would reach for it. They differ mainly in **who or what sets them off**.

- **Skill.** A reusable procedure Claude loads on its own when your request matches what the skill is for. You do not have to ask for it by name. Reach for a skill when you keep repeating the same multi-step task and want Claude to just know how to do it well (for example, writing a good commit or scanning for leaked secrets).
- **Agent.** A specialist Claude can hand a whole side task to, working in its own separate context and handing back just the result. Reach for an agent when a job would otherwise flood the main conversation with noise, like deep web research or a focused code review.
- **Command.** A shortcut you trigger yourself by typing `/name`. Reach for a command when you want to kick something off deliberately, on your timing, rather than leaving it to Claude to decide.
- **Hook.** A script that runs automatically on an event in Claude Code, such as before a tool runs or when a session ends. Reach for a hook when you want something to happen every single time, with no model judgment involved, like logging or a safety check.

The table under [What installs where](#what-installs-where) shows where each one lands on disk and what triggers it.

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
| [code-review-response](skills/engineering/code-review-response/) | Process code-review feedback with technical rigour — understand each point, check it against the actual codebase, and respond with reasoning or implementation rather than reflexive agreement. Use when you receive review comments (from a human, the code-reviewer agent, or any reviewer) and are about to act on them, especially if any feedback seems unclear or wrong. | `npx shadcn@latest add KhaledSaeed18/dotclaude/code-review-response` |
| [create-agent](skills/engineering/create-agent/) | Author a new subagent for this repository end to end by scaffolding it with pnpm new, curating its tool allowlist, setting model, color, and memory in frontmatter, then writing a focused system prompt and regenerating the registry. Use when creating, scaffolding, or reviewing an agent or subagent in this repo. | `npx shadcn@latest add KhaledSaeed18/dotclaude/create-agent` |
| [create-command](skills/engineering/create-command/) | Author a new slash command for this repository end to end by scaffolding it with pnpm new, writing the frontmatter and argument handling, drafting the prompt body, then regenerating the registry. Use when creating, scaffolding, or reviewing a slash command in this repo. | `npx shadcn@latest add KhaledSaeed18/dotclaude/create-command` |
| [create-hook](skills/engineering/create-hook/) | Author a new Claude Code hook for this repository end to end by scaffolding it with pnpm new, writing the hook script and its settings.json wiring, documenting activation in HOOK.md, then regenerating the registry. Use when creating, scaffolding, or reviewing a hook in this repo. | `npx shadcn@latest add KhaledSaeed18/dotclaude/create-hook` |
| [create-skill](skills/engineering/create-skill/) | Author a new skill for this repository end to end by choosing its category, writing trigger-friendly frontmatter, structuring the SKILL.md, splitting reference material into companion files, then regenerating the registry and README catalog. Use when creating, scaffolding, restructuring, or reviewing a skill in this repo. | `npx shadcn@latest add KhaledSaeed18/dotclaude/create-skill` |
| [executing-plans](skills/engineering/executing-plans/) | Execute a written implementation plan task by task, reviewing it critically first, following each step exactly, running every verification, and stopping to ask rather than guessing when blocked. Use when you have a plan document (such as one from the writing-plans skill) and need to implement it in this session. | `npx shadcn@latest add KhaledSaeed18/dotclaude/executing-plans` |
| [explain-codebase](skills/engineering/explain-codebase/) | Onboard to an unfamiliar codebase by mapping its architecture, entry points, and data flow. Use when starting work in a new or unknown repository and you need a navigable mental model fast. | `npx shadcn@latest add KhaledSaeed18/dotclaude/explain-codebase` |
| [grill-with-docs](skills/engineering/grill-with-docs/) | Stress-test a plan against the project's existing domain model by challenging terminology, surfacing contradictions with code, and updating CONTEXT.md and ADRs inline as decisions crystallise. | `npx shadcn@latest add KhaledSaeed18/dotclaude/grill-with-docs` |
| [parallel-agents](skills/engineering/parallel-agents/) | Fan independent work out to multiple subagents that run concurrently, each with a focused scope and self-contained instructions, then review and integrate their results. Use when you face two or more genuinely independent tasks — separate failing test files, unrelated bugs, distinct subsystems — that share no state and don't depend on each other's order. | `npx shadcn@latest add KhaledSaeed18/dotclaude/parallel-agents` |
| [systematic-debugging](skills/engineering/systematic-debugging/) | Debug a bug, test failure, crash, or unexpected behaviour by finding the root cause before changing anything, instead of guessing at fixes. Works in any language or stack. Use when something is broken, a test is failing, behaviour is wrong, or a previous fix didn't hold. | `npx shadcn@latest add KhaledSaeed18/dotclaude/systematic-debugging` |
| [test-driven-development](skills/engineering/test-driven-development/) | Implement a feature or bugfix test-first using the red-green-refactor cycle — write a failing test, watch it fail, write the minimal code to pass, then clean up. Works in any language or test runner. Use when building new behaviour or fixing a bug and you want the test to actually prove the code works. | `npx shadcn@latest add KhaledSaeed18/dotclaude/test-driven-development` |
| [verify-completion](skills/engineering/verify-completion/) | Gate every "it works / it's fixed / tests pass / done" claim behind fresh evidence — run the actual verifying command, read its output, and only then state the result. Use before committing, opening a PR, marking a task complete, handing off to or trusting a subagent, or otherwise asserting that work succeeded. | `npx shadcn@latest add KhaledSaeed18/dotclaude/verify-completion` |
| [writing-plans](skills/engineering/writing-plans/) | Turn a spec or set of requirements into a detailed, task-by-task implementation plan an engineer (or a subagent) can execute without further context. Breaks work into bite-sized steps with exact file paths, real code, and verification commands. Use before starting a multi-step build, once you know what you're building. | `npx shadcn@latest add KhaledSaeed18/dotclaude/writing-plans` |

#### Productivity

| Skill | Description | Install |
| --- | --- | --- |
| [brainstorming](skills/productivity/brainstorming/) | Turn a rough idea into a fully formed, written design through collaborative dialogue — exploring intent, requirements, and trade-offs one question at a time, then proposing approaches and capturing the agreed design in a spec before any code is written. Use at the start of any creative or feature work, when the idea isn't yet concrete enough to plan or build. | `npx shadcn@latest add KhaledSaeed18/dotclaude/brainstorming` |
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
| [finish-branch](skills/version-control/finish-branch/) | Wrap up a completed development branch by verifying tests pass, detecting the workspace state, then presenting clear merge / PR / keep / discard options and executing the chosen one safely — including correct worktree and branch cleanup. Use when implementation is done, tests should be green, and you need to integrate or put away the work. | `npx shadcn@latest add KhaledSaeed18/dotclaude/finish-branch` |
| [git-commit](skills/version-control/git-commit/) | Commit work the right way by gathering full repo state, respecting the project's commitlint/pre-commit/branch rules, staging only understood files, and writing a conventional-commit message whose body explains why. Use when committing, branching, or pushing changes. | `npx shadcn@latest add KhaledSaeed18/dotclaude/git-commit` |
| [git-undo](skills/version-control/git-undo/) | Recover safely from Git mistakes such as discard, unstage, amend, reset, revert, restore lost commits via reflog, recover deleted branches, and fix bad rebases. Chooses the least-destructive fix and protects against data loss. Use when something in Git went wrong and needs undoing. | `npx shadcn@latest add KhaledSaeed18/dotclaude/git-undo` |
| [git-worktrees](skills/version-control/git-worktrees/) | Set up an isolated workspace for feature work so the current branch and working tree stay untouched — detecting existing isolation first, preferring the platform's native worktree tooling, and falling back to git worktrees only when nothing native exists. Use before starting feature work that needs isolation, or before executing an implementation plan. | `npx shadcn@latest add KhaledSaeed18/dotclaude/git-worktrees` |
| [gitignore](skills/version-control/gitignore/) | Generate or repair a .gitignore tailored to the project's actual stacks, frameworks, OS, and editors, and untrack files that are already committed but should be ignored. Flags secrets/build/dependency files that slipped into the repo. Use when creating, fixing, or auditing .gitignore. | `npx shadcn@latest add KhaledSaeed18/dotclaude/gitignore` |
| [merge-conflict](skills/version-control/merge-conflict/) | Resolve Git merge, rebase, cherry-pick, revert, and stash conflicts safely by understanding both sides and the operation in progress before integrating, then verifying the result builds and passes tests. Use when a merge/rebase/cherry-pick stops with conflicts or "needs merge". | `npx shadcn@latest add KhaledSaeed18/dotclaude/merge-conflict` |
| [pr-description](skills/version-control/pr-description/) | Generate a clear, reviewer-friendly pull-request description from a diff, covering what changed, why, risk, and how it was tested. Use when opening a pull request or writing/improving a PR body. | `npx shadcn@latest add KhaledSaeed18/dotclaude/pr-description` |
| [release-tag](skills/version-control/release-tag/) | Cut a release by determining the SemVer bump from history, updating version files across any stack, refreshing the changelog, creating an annotated (optionally signed) Git tag, and pushing the release safely after pre-flight checks. Use when tagging a version, bumping the version, or preparing a release. | `npx shadcn@latest add KhaledSaeed18/dotclaude/release-tag` |

### Agents

#### Engineering

| Agent | Description | Install |
| --- | --- | --- |
| [code-reviewer](agents/engineering/code-reviewer/) | Expert reviewer for a code change (a diff, a staged set, a branch, or named files). Reviews for correctness, security, and maintainability across JavaScript/TypeScript stacks including React, Next.js, Node, Express, and NestJS. Use proactively after writing or modifying code, before opening a pull request, or when the user asks for a code review, a second pair of eyes, or feedback on a change. | `npx shadcn@latest add KhaledSaeed18/dotclaude/code-reviewer` |

#### Research

| Agent | Description | Install |
| --- | --- | --- |
| [deep-research](agents/research/deep-research/) | In-depth research agent for topics that need comprehensive, multi-source investigation with citations. Use when the user asks to research a topic thoroughly, gather and synthesize information from across the web, compare approaches or options, fact-check a claim against primary sources, or produce a sourced writeup or literature scan. For example, "research the current state of WebGPU adoption", "compare Postgres vs SQLite for an offline-first app, with sources", or "what does the evidence say about X, and where do experts disagree?" | `npx shadcn@latest add KhaledSaeed18/dotclaude/deep-research` |

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

#### Security

| Hook | Description | Install |
| --- | --- | --- |
| [command-guard](hooks/security/command-guard/) | A PreToolUse hook that blocks catastrophic Bash commands before they run (recursive force deletes of the filesystem root or home, fork bombs, writing to or formatting raw disk devices, recursive chmod 777 on root, and force-pushes to main or master), returning a clear reason. Use to add a deterministic safety net against destructive shell commands. | `npx shadcn@latest add KhaledSaeed18/dotclaude/command-guard` |

<!-- catalog:end -->

## License

[MIT](LICENSE) © Khaled Saeed

### Attributions

Some skills in this project were created from scratch, while others were inspired by, adapted from, or built upon work from the open-source community. Credit and thanks to the following resources:

| Source | Link |
|--------|------|
| Matt Pocock's Skills | [mattpocock/skills](https://github.com/mattpocock/skills) |
| Obra's Superpowers | [obra/superpowers](https://github.com/obra/superpowers) |
