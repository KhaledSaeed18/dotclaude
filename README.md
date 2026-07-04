<div align="center">
  <img src=".github/assets/banner.png" alt="dotclaude" />
</div>

<div align="center">
  <a href="https://docs.claude.com/en/docs/claude-code"><img src="https://shieldcn.dev/badge/Claude%20Code-extensions-D97757.svg?logo=claude&variant=branded&animate=shimmer" alt="Claude Code extensions" /></a>
</div>

<div align="center">
  <a href="#as-claude-code-plugins-recommended"><img src="https://shieldcn.dev/badge/Plugin%20Marketplace-%2Fplugin%20marketplace%20add-D97757.svg?split=true&logo=claude" alt="Install via the Claude Code plugin marketplace" /></a>
  <a href="#with-the-shadcn-cli-single-items"><img src="https://shieldcn.dev/badge/shadcn%20Registry-npx%20shadcn%20add-18181b.svg?split=true&logo=shadcnui" alt="Install via the shadcn CLI" /></a>
</div>

<div align="center">
<!-- badges:start -->
  <a href="#skills"><img src="https://shieldcn.dev/badge/Skills-38-2563eb.svg?split=true&logo=ri:RiSparkling2Fill" alt="38 skills" /></a>
  <a href="#agents"><img src="https://shieldcn.dev/badge/Agents-8-7c3aed.svg?split=true&logo=ri:RiRobot2Fill" alt="8 agents" /></a>
  <a href="#commands"><img src="https://shieldcn.dev/badge/Commands-6-0891b2.svg?split=true&logo=ri:RiTerminalBoxFill" alt="6 commands" /></a>
  <a href="#hooks"><img src="https://shieldcn.dev/badge/Hooks-8-db2777.svg?split=true&logo=ri:RiPlugFill" alt="8 hooks" /></a>
  <a href="#as-claude-code-plugins-recommended"><img src="https://shieldcn.dev/badge/Plugins-11-059669.svg?split=true&logo=ri:RiPuzzle2Fill" alt="11 plugins" /></a>
<!-- badges:end -->
</div>

<div align="center">
  <a href="https://github.com/KhaledSaeed18/dotclaude/actions/workflows/validate.yml"><img src="https://shieldcn.dev/github/KhaledSaeed18/dotclaude/ci.svg?workflow=validate.yml&label=validate&split=true&logo=githubactions" alt="validate workflow status" /></a>
  <a href="https://github.com/KhaledSaeed18/dotclaude/actions/workflows/security.yml"><img src="https://shieldcn.dev/github/KhaledSaeed18/dotclaude/ci.svg?workflow=security.yml&label=security&split=true&logo=githubactions" alt="security workflow status" /></a>
  <a href="https://github.com/KhaledSaeed18/dotclaude/stargazers"><img src="https://shieldcn.dev/github/KhaledSaeed18/dotclaude/stars.svg?split=true&logo=github&color=f59e0b" alt="GitHub stars" /></a>
  <a href="LICENSE"><img src="https://shieldcn.dev/github/KhaledSaeed18/dotclaude/license.svg?split=true&logo=ri:RiScales3Fill&color=64748b" alt="MIT license" /></a>
  <a href="https://github.com/KhaledSaeed18/dotclaude"><img src="https://shieldcn.dev/views/repo/KhaledSaeed18/dotclaude.svg?split=true&logo=ri:RiEyeFill&color=0ea5e9" alt="repository views" /></a>
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

There are two ways to get these items: **plugins** (bundles, managed by Claude Code, hooks pre-wired) or the **shadcn CLI** (one item at a time, copied into your project).

### As Claude Code plugins (recommended)

Add the marketplace once, then install any bundle:

```
/plugin marketplace add KhaledSaeed18/dotclaude
/plugin install security@dotclaude
```

A good starter set is **engineering + git + security-hooks** — the daily workflow skills, the branch lifecycle, and the deterministic guardrails. From a terminal you can install all three in one line (the CLI takes one plugin per call):

```bash
for p in engineering git security-hooks; do claude plugin install "$p@dotclaude"; done
```

Prefer browsing? After adding the marketplace, open `/plugin` and pick from the **Discover** tab — no typing needed.

Plugins update with the repo (`/plugin marketplace update dotclaude`), namespace their commands (`/security:security-audit`), and — unlike the shadcn route — **hook plugins activate immediately**, with no manual `settings.json` editing.

<!-- plugins:start -->

| Plugin | What you get | Install |
| --- | --- | --- |
| **engineering** | Engineering workflow skills and review agents: planning, test-driven development, systematic debugging, code review, completion verification, and performance work. (15 skills, 6 agents, 1 command) | `/plugin install engineering@dotclaude` |
| **security** | Security review toolkit: OWASP-aligned code review, dependency and secret auditing skills, a security-auditor agent, and a full-codebase /security-audit command. (3 skills, 1 agent, 1 command) | `/plugin install security@dotclaude` |
| **security-hooks** | Deterministic guardrails, active immediately after install: a compound-command deny list, sensitive-file protection, and prompt-injection screening. (3 hooks) | `/plugin install security-hooks@dotclaude` |
| **git** | Version-control skills for the whole branch lifecycle: committing, worktrees, merge conflicts, undo/recovery, PR descriptions, changelogs, releases, and branch cleanup. (9 skills, 1 command) | `/plugin install git@dotclaude` |
| **productivity** | Session productivity skills: collaborative brainstorming, plan stress-testing, session handoff documents, and a /prime command that loads project context. (5 skills, 2 commands) | `/plugin install productivity@dotclaude` |
| **testing** | Testing toolkit: browser-based end-to-end verification with Playwright and a /write-tests command that generates a suite matching project conventions. (2 skills, 1 command) | `/plugin install testing@dotclaude` |
| **research** | A deep-research subagent for multi-source investigation with citations: comparisons, fact-checking, and sourced writeups. (1 agent) | `/plugin install research@dotclaude` |
| **format-on-edit** | Automation hook that runs the project's own formatter (Biome, Prettier, gofmt, rustfmt, or ruff) on every file Claude edits, so changes land already formatted. (1 hook) | `/plugin install format-on-edit@dotclaude` |
| **notify** | Desktop notifications for Claude Code: surfaces permission requests and attention prompts as native macOS/Linux notifications so long sessions can run in the background. (1 hook) | `/plugin install notify@dotclaude` |
| **precompact-saver** | Context-preservation hook that snapshots the full session transcript before every compaction, keeping the newest ten snapshots per project. (1 hook) | `/plugin install precompact-saver@dotclaude` |
| **tool-call-logger** | Observability hook that appends one sanitized JSON line per tool call to a local log, with secret redaction and payload truncation. (1 hook) | `/plugin install tool-call-logger@dotclaude` |

<!-- plugins:end -->

The four `create-*` authoring skills are intentionally not in any plugin; they exist to author items for this repository and install via shadcn only.

### With the shadcn CLI (single items)

Install any single item with the shadcn CLI:

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
| [adversarial-reviewer](skills/engineering/adversarial-reviewer/) | Review code through three hostile personas - the Saboteur, the New Hire, and the Security Auditor - each required to find at least one issue. Use when a standard review feels too comfortable, when code is going into a critical path, when a previous review missed bugs that later surfaced, or when you want coverage across correctness, clarity, and security in a single pass. | `npx shadcn@latest add KhaledSaeed18/dotclaude/adversarial-reviewer` |
| [api-design-review](skills/engineering/api-design-review/) | Review an API contract (REST or GraphQL) before or while it is implemented, checking resource naming, HTTP semantics, status codes, error shape, pagination, versioning, idempotency, and backward compatibility, and producing concrete revisions rather than abstract advice. Use when designing new endpoints, changing an existing API's surface, or reviewing a PR that adds or modifies API routes. | `npx shadcn@latest add KhaledSaeed18/dotclaude/api-design-review` |
| [code-review-response](skills/engineering/code-review-response/) | Process code-review feedback with technical rigour — understand each point, check it against the actual codebase, and respond with reasoning or implementation rather than reflexive agreement. Use when you receive review comments (from a human, the code-reviewer agent, or any reviewer) and are about to act on them, especially if any feedback seems unclear or wrong. | `npx shadcn@latest add KhaledSaeed18/dotclaude/code-review-response` |
| [create-agent](skills/engineering/create-agent/) | Author a new subagent for this repository end to end by scaffolding it with pnpm new, curating its tool allowlist, setting model, color, and memory in frontmatter, then writing a focused system prompt and regenerating the registry. Use when creating, scaffolding, or reviewing an agent or subagent in this repo. | `npx shadcn@latest add KhaledSaeed18/dotclaude/create-agent` |
| [create-command](skills/engineering/create-command/) | Author a new slash command for this repository end to end by scaffolding it with pnpm new, writing the frontmatter and argument handling, drafting the prompt body, then regenerating the registry. Use when creating, scaffolding, or reviewing a slash command in this repo. | `npx shadcn@latest add KhaledSaeed18/dotclaude/create-command` |
| [create-hook](skills/engineering/create-hook/) | Author a new Claude Code hook for this repository end to end by scaffolding it with pnpm new, writing the hook script and its settings.json wiring, documenting activation in HOOK.md, then regenerating the registry. Use when creating, scaffolding, or reviewing a hook in this repo. | `npx shadcn@latest add KhaledSaeed18/dotclaude/create-hook` |
| [create-skill](skills/engineering/create-skill/) | Author a new skill for this repository end to end by choosing its category, writing trigger-friendly frontmatter, structuring the SKILL.md, splitting reference material into companion files, then regenerating the registry and README catalog. Use when creating, scaffolding, restructuring, or reviewing a skill in this repo. | `npx shadcn@latest add KhaledSaeed18/dotclaude/create-skill` |
| [db-migration-safety](skills/engineering/db-migration-safety/) | Review or write a database schema migration with production safety as the bar, checking lock behavior, table rewrites, backfill strategy, deploy-order compatibility (expand-contract), index creation, and rollback, for Postgres, MySQL, and common ORMs' migration tools. Use when adding or reviewing a migration, renaming or dropping columns, adding constraints or indexes to large tables, or planning a backfill. | `npx shadcn@latest add KhaledSaeed18/dotclaude/db-migration-safety` |
| [executing-plans](skills/engineering/executing-plans/) | Execute a written implementation plan task by task, reviewing it critically first, following each step exactly, running every verification, and stopping to ask rather than guessing when blocked. Use when you have a plan document (such as one from the writing-plans skill) and need to implement it in this session. | `npx shadcn@latest add KhaledSaeed18/dotclaude/executing-plans` |
| [explain-codebase](skills/engineering/explain-codebase/) | Onboard to an unfamiliar codebase by mapping its architecture, entry points, and data flow. Use when starting work in a new or unknown repository and you need a navigable mental model fast. | `npx shadcn@latest add KhaledSaeed18/dotclaude/explain-codebase` |
| [fix-ci](skills/engineering/fix-ci/) | Diagnose and fix a failing CI run by pulling the actual failure logs (gh run view --log-failed), reproducing the failure locally, fixing the root cause rather than the symptom, and verifying green before and after pushing. Use when a GitHub Actions run is red, a PR check is failing, or CI passes locally but fails remotely. | `npx shadcn@latest add KhaledSaeed18/dotclaude/fix-ci` |
| [grill-with-docs](skills/engineering/grill-with-docs/) | Stress-test a plan against the project's existing domain model by challenging terminology, surfacing contradictions with code, and updating CONTEXT.md and ADRs inline as decisions crystallise. | `npx shadcn@latest add KhaledSaeed18/dotclaude/grill-with-docs` |
| [parallel-agents](skills/engineering/parallel-agents/) | Fan independent work out to multiple subagents that run concurrently, each with a focused scope and self-contained instructions, then review and integrate their results. Use when you face two or more genuinely independent tasks — separate failing test files, unrelated bugs, distinct subsystems — that share no state and don't depend on each other's order. | `npx shadcn@latest add KhaledSaeed18/dotclaude/parallel-agents` |
| [performance-optimization](skills/engineering/performance-optimization/) | Optimize a performance problem by profiling to find the real bottleneck before changing anything, making one targeted change, and verifying both the improvement and that correctness did not degrade. Use when a feature is measurably slow, a page load or API response exceeds a budget, a query is taking too long, or a user reports sluggishness. Do not use to pre-optimize code that has not been measured to be slow. | `npx shadcn@latest add KhaledSaeed18/dotclaude/performance-optimization` |
| [solid-principles](skills/engineering/solid-principles/) | Apply the SOLID principles as design diagnostics when writing, reviewing, or refactoring code with classes, modules, or service boundaries - detecting god classes, fragile hierarchies, fat interfaces, and hard-wired dependencies, and prescribing the smallest structural fix. Treats SOLID as a smell detector, not a ceremony to impose. Use when designing a new module or class, reviewing object-oriented code, untangling a class that keeps changing for unrelated reasons, or deciding where an abstraction belongs. | `npx shadcn@latest add KhaledSaeed18/dotclaude/solid-principles` |
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
| [issue-writer](skills/productivity/issue-writer/) | Turn a rough bug report, idea, or complaint into a well-formed, actionable issue - investigating the codebase first to add reproduction steps, expected vs actual behaviour, suspected location, and acceptance criteria - then filing it with gh or emitting paste-ready markdown. Use when the user says "file an issue for this", "write this up", describes a bug in passing that should be tracked, or wants a feature request made concrete. | `npx shadcn@latest add KhaledSaeed18/dotclaude/issue-writer` |
| [standup-summary](skills/productivity/standup-summary/) | Generate a standup or weekly-review update from actual work evidence - commits, branches, PRs, and issues across one or more repositories - grouped into done / in progress / blocked / next, written in plain human sentences rather than commit-message-speak. Use when preparing a daily standup, a weekly review, a sprint update, or answering "what did I work on this week". | `npx shadcn@latest add KhaledSaeed18/dotclaude/standup-summary` |

#### Security

| Skill | Description | Install |
| --- | --- | --- |
| [dependency-audit](skills/security/dependency-audit/) | Audit a project's dependencies for outdated and vulnerable packages and surface breaking-change notes for upgrades. Works with any ecosystem, including npm/pnpm/yarn, pip/Poetry/uv, Cargo, Go modules, Maven/Gradle, Bundler, Composer, and others. | `npx shadcn@latest add KhaledSaeed18/dotclaude/dependency-audit` |
| [owasp-security](skills/security/owasp-security/) | Review code being written or modified against the OWASP Top 10:2025 and ASVS secure-coding requirements, catching vulnerability classes before they ship. Works in any language or stack. Use when writing authentication or authorization logic, handling user input, adding API endpoints, choosing cryptographic operations, processing file uploads, or making any change that touches a trust boundary. Complements secret-scan (which finds credentials) and dependency-audit (which checks packages) with line-level vulnerability review. | `npx shadcn@latest add KhaledSaeed18/dotclaude/owasp-security` |
| [secret-scan](skills/security/secret-scan/) | Scan code or a diff for hardcoded secrets (API keys, tokens, passwords, private keys, and other exposed credentials) before they get committed or shipped. Use before committing, during review, or when auditing a repository. | `npx shadcn@latest add KhaledSaeed18/dotclaude/secret-scan` |

#### Testing

| Skill | Description | Install |
| --- | --- | --- |
| [accessibility-audit](skills/testing/accessibility-audit/) | Audit UI code or a running page against WCAG 2.2 AA, covering semantics, keyboard access, focus management, labels, contrast, ARIA misuse, and motion, verifying in a real browser with axe-core when one is available and by code review when not. Produces findings ranked by user impact with concrete fixes. Use when building or reviewing UI components, before shipping user-facing pages, or when accessibility compliance is required. | `npx shadcn@latest add KhaledSaeed18/dotclaude/accessibility-audit` |
| [webapp-testing](skills/testing/webapp-testing/) | Verify a web application works correctly in a real browser using Playwright. Covers page navigation, form submission, user interactions, console error detection, screenshot capture, and responsive layout checking. Use when you need to confirm a UI feature actually works end-to-end, catch regressions after a change, verify a form flow completes, or check that the page is free of console errors. Requires Node.js; installs Playwright if not already present. | `npx shadcn@latest add KhaledSaeed18/dotclaude/webapp-testing` |

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
| [architect-reviewer](agents/engineering/architect-reviewer/) | Use this agent when you need a design-level architecture review of a module, a proposed change, or an entire codebase. Evaluates module boundaries, coupling and cohesion, layering violations, scalability risk, and structural decisions that will become expensive to undo. Complements code-reviewer, which focuses on line-level correctness, by operating at the design level on shapes and relationships of components rather than individual functions. Use when designing a new service, refactoring a large module, evaluating a cross-cutting change, or when you want a second opinion on structural decisions before they harden. | `npx shadcn@latest add KhaledSaeed18/dotclaude/architect-reviewer` |
| [code-reviewer](agents/engineering/code-reviewer/) | Expert reviewer for a code change (a diff, a staged set, a branch, or named files). Reviews for correctness, security, and maintainability across JavaScript/TypeScript stacks including React, Next.js, Node, Express, and NestJS. Use proactively after writing or modifying code, before opening a pull request, or when the user asks for a code review, a second pair of eyes, or feedback on a change. | `npx shadcn@latest add KhaledSaeed18/dotclaude/code-reviewer` |
| [debugger](agents/engineering/debugger/) | Use this agent when you need to diagnose a bug, test failure, crash, or unexpected behavior through systematic root-cause analysis. Gathers evidence, forms and tests hypotheses, and delivers a confirmed root cause with a targeted fix recommendation. Does not guess or apply speculative patches. Use when a fix attempt has failed, when the bug is intermittent, when a stack trace needs tracing end-to-end, or when you want a second opinion on what is actually broken before touching code. | `npx shadcn@latest add KhaledSaeed18/dotclaude/debugger` |
| [docs-writer](agents/engineering/docs-writer/) | Use this agent when you need documentation written or updated from the code itself - READMEs, API references, guides, architecture overviews, or upgrade notes. Reads the actual implementation before writing a word, so the docs match what the code does rather than what anyone remembers it doing, and flags found doc-vs-code contradictions instead of papering over them. Use after a feature lands without docs, when a README has drifted from reality, when onboarding docs are missing, or when public API changes need reference updates. | `npx shadcn@latest add KhaledSaeed18/dotclaude/docs-writer` |
| [error-detective](agents/engineering/error-detective/) | Use this agent when you need to correlate errors, stack traces, and log entries across multiple services or files to find the root cause of an incident, a mysterious recurring error, or a failure that spans more than one component. Searches log files, cross-references timestamps, traces request IDs across service boundaries, and surfaces the originating cause rather than the downstream symptom. Distinct from the debugger agent, which traces bugs in source code; this agent works from runtime artifacts (logs, traces, crash dumps) and is most useful when the failure is happening in production or a staging environment where you cannot step through the code. | `npx shadcn@latest add KhaledSaeed18/dotclaude/error-detective` |
| [performance-engineer](agents/engineering/performance-engineer/) | Use this agent when you need to investigate, measure, and resolve a performance problem end-to-end. Profiles the running system, identifies the actual bottleneck with numbers, designs or runs load tests, recommends targeted changes, and verifies the improvement is real. Use for slow API responses, high CPU or memory usage, database query latency, build-time regressions, or when preparing a service for increased load. Distinct from the performance-optimization skill, which provides the methodology; this agent can execute profiling tools, analyze their output, and iterate through the full measure-change-verify cycle. | `npx shadcn@latest add KhaledSaeed18/dotclaude/performance-engineer` |

#### Research

| Agent | Description | Install |
| --- | --- | --- |
| [deep-research](agents/research/deep-research/) | In-depth research agent for topics that need comprehensive, multi-source investigation with citations. Use when the user asks to research a topic thoroughly, gather and synthesize information from across the web, compare approaches or options, fact-check a claim against primary sources, or produce a sourced writeup or literature scan. For example, "research the current state of WebGPU adoption", "compare Postgres vs SQLite for an offline-first app, with sources", or "what does the evidence say about X, and where do experts disagree?" | `npx shadcn@latest add KhaledSaeed18/dotclaude/deep-research` |

#### Security

| Agent | Description | Install |
| --- | --- | --- |
| [security-auditor](agents/security/security-auditor/) | Use this agent when you need a comprehensive security audit of a codebase, module, API surface, or pull request. Covers OWASP Top 10:2025, authentication and authorization logic, secret handling, input validation, dependency vulnerabilities, and supply-chain risk. Reports findings and concrete remediation steps without modifying code. Use before a production release, after adding auth or payment flows, when onboarding a new dependency, or when a security review is required before merge. | `npx shadcn@latest add KhaledSaeed18/dotclaude/security-auditor` |

### Commands

#### Engineering

| Command | Description | Install |
| --- | --- | --- |
| [explain-code](commands/engineering/explain-code/) | Walk through a file, function, class, or module and explain what it does, how it works, and why it is structured the way it is. Suited for onboarding onto unfamiliar code, understanding a complex algorithm, or preparing to modify something you have not read before. Pass a file path or a symbol name as the argument. | `npx shadcn@latest add KhaledSaeed18/dotclaude/explain-code` |

#### Productivity

| Command | Description | Install |
| --- | --- | --- |
| [prime](commands/productivity/prime/) | Load project context into the session by reading key files and recent history. Primes the model with package metadata, architecture notes, recent commits, and directory structure so it can give better answers immediately. Use at the start of a session when switching to an unfamiliar repository or after a long break from a project. | `npx shadcn@latest add KhaledSaeed18/dotclaude/prime` |
| [todo-triage](commands/productivity/todo-triage/) | Inventory every TODO, FIXME, HACK, and XXX comment in the codebase, enrich each with age and author from git blame, classify them into actionable buckets (bug risk, missing feature, cleanup, obsolete), and produce a prioritized triage table with recommended dispositions. Pass a path to limit the scan to a directory. Use when technical-debt comments have accumulated and nobody knows which ones still matter. | `npx shadcn@latest add KhaledSaeed18/dotclaude/todo-triage` |

#### Security

| Command | Description | Install |
| --- | --- | --- |
| [security-audit](commands/security/security-audit/) | Run a full-codebase security audit covering OWASP Top 10:2025 vulnerability classes, authentication and authorization logic, secret handling, input validation, dependency CVEs, and supply-chain risk. Broader than the secret-scan skill, which scans a single diff. Produces a structured findings report ranked by severity. Pass a path to limit the audit to a specific module or directory. | `npx shadcn@latest add KhaledSaeed18/dotclaude/security-audit` |

#### Testing

| Command | Description | Install |
| --- | --- | --- |
| [write-tests](commands/testing/write-tests/) | Generate a focused, production-quality test suite for a source file, detecting the project's existing test runner and conventions. | `npx shadcn@latest add KhaledSaeed18/dotclaude/write-tests` |

#### Version Control

| Command | Description | Install |
| --- | --- | --- |
| [clean-branches](commands/version-control/clean-branches/) | List local Git branches that have been fully merged or are stale and delete them safely after showing what would be removed. Protects main, master, develop, and the currently checked-out branch. Pass --dry-run to preview without deleting anything. Distinct from the finish-branch skill, which closes a single active in-progress branch; this cleans up accumulated merged branches across the whole repository. | `npx shadcn@latest add KhaledSaeed18/dotclaude/clean-branches` |

### Hooks

#### Automation

| Hook | Description | Install |
| --- | --- | --- |
| [format-on-edit](hooks/automation/format-on-edit/) | A PostToolUse hook that runs the project's own formatter (Biome, Prettier, gofmt, rustfmt, or ruff) on each file Claude Code edits or writes, so every change lands already formatted. Detects the formatter from project config, uses only locally installed binaries, and does nothing when no formatter applies. Use to eliminate style drift and formatting-only diffs from agent sessions. | `npx shadcn@latest add KhaledSaeed18/dotclaude/format-on-edit` |
| [notify](hooks/automation/notify/) | A Notification hook that turns Claude Code notifications into native desktop notifications (macOS osascript, Linux notify-send), so long-running sessions can be left in the background and still get your attention when Claude needs input. Message text is sanitized before reaching the OS tool. Use when you run long agent sessions and miss the moments they stop to ask something. | `npx shadcn@latest add KhaledSaeed18/dotclaude/notify` |

#### Context

| Hook | Description | Install |
| --- | --- | --- |
| [precompact-saver](hooks/context/precompact-saver/) | A PreCompact hook that snapshots the full session transcript to .claude/compact-backups/ right before Claude Code compacts the context, so exact instructions, tool output, and decisions survive after the summary drops them. Keeps the newest ten snapshots and prunes the rest. Use when long sessions get compacted and you need a reliable record of what was said before the summary. | `npx shadcn@latest add KhaledSaeed18/dotclaude/precompact-saver` |

#### Observability

| Hook | Description | Install |
| --- | --- | --- |
| [tool-call-logger](hooks/observability/tool-call-logger/) | A PreToolUse/PostToolUse hook that appends one JSON line per tool call (tool name, inputs, and response) to a local log file, with secret redaction and payload truncation. Use to audit, debug, or observe exactly what Claude Code did during a session. | `npx shadcn@latest add KhaledSaeed18/dotclaude/tool-call-logger` |

#### Security

| Hook | Description | Install |
| --- | --- | --- |
| [command-guard](hooks/security/command-guard/) | A PreToolUse hook that blocks catastrophic Bash commands before they run (recursive force deletes of the filesystem root or home, fork bombs, writing to or formatting raw disk devices, recursive chmod 777 on root, and force-pushes to main or master), returning a clear reason. Use to add a deterministic safety net against destructive shell commands. | `npx shadcn@latest add KhaledSaeed18/dotclaude/command-guard` |
| [injection-guard](hooks/security/injection-guard/) | A UserPromptSubmit hook that scans incoming prompts for prompt-injection and jailbreak patterns (instruction overrides, system-prompt extraction attempts, role reassignments, DAN/developer-mode activations) before Claude processes them. Use to add a deterministic pre-Claude safety layer against injection attacks. | `npx shadcn@latest add KhaledSaeed18/dotclaude/injection-guard` |
| [sensitive-file-guard](hooks/security/sensitive-file-guard/) | A PreToolUse hook that blocks Read, Edit, Write, and Bash operations that target sensitive files (.env, credentials, SSH private keys, certificates, secrets, AWS config, netrc, and similar). Use to prevent Claude from autonomously reading or exfiltrating credential files. | `npx shadcn@latest add KhaledSaeed18/dotclaude/sensitive-file-guard` |
| [smart-approve](hooks/security/smart-approve/) | A PreToolUse hook that decomposes compound Bash commands (&&, \|\|, ;, \|, $(), backticks) into their component sub-commands and checks each one independently against a deny list, closing the chain-smuggling gap where a dangerous operation is embedded inside a safe-looking command chain. Use to upgrade command-guard with compound-command awareness. | `npx shadcn@latest add KhaledSaeed18/dotclaude/smart-approve` |

<!-- catalog:end -->

## Contributing

Contributions are welcome — new items, fixes to existing ones, or tooling improvements. Every item is scaffolded with `pnpm new` and validated in CI; see [CONTRIBUTING.md](CONTRIBUTING.md) for the layout, conventions, and dev workflow, and [SECURITY.md](SECURITY.md) for how to report a vulnerability privately.

## License

[MIT](LICENSE) © Khaled Saeed

### Attributions

Some items in this project were created from scratch, while others were inspired by, adapted from, or built upon work from the open-source community. Credit and thanks to the following resources:

| Source | Link | Items inspired by |
|--------|------|-------------------|
| Matt Pocock's Skills | [mattpocock/skills](https://github.com/mattpocock/skills) | skills |
| Obra's Superpowers | [obra/superpowers](https://github.com/obra/superpowers) | skills |
| Anthropic's Skills | [anthropics/skills](https://github.com/anthropics/skills) | webapp-testing |
| Addy Osmani's Agent Skills | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | performance-optimization |
| Alirezarezvani's Claude Skills | [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) | adversarial-reviewer |
| Agamm's Claude Code OWASP | [agamm/claude-code-owasp](https://github.com/agamm/claude-code-owasp) | owasp-security |
| QdHenry's Claude Command Suite | [qdhenry/Claude-Command-Suite](https://github.com/qdhenry/Claude-Command-Suite) | prime, explain-code, security-audit, clean-branches |
| VoltAgent's Subagents | [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | debugger, security-auditor, architect-reviewer, performance-engineer, error-detective |
| Wshobson's Agents | [wshobson/agents](https://github.com/wshobson/agents) | debugger, security-auditor, architect-reviewer, performance-engineer, error-detective |
| Disler's Hooks Mastery | [disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery) | sensitive-file-guard, injection-guard |
| Rohitg00's Toolkit (via liberzon/claude-hooks) | [rohitg00/awesome-claude-code-toolkit](https://github.com/rohitg00/awesome-claude-code-toolkit) | smart-approve |
