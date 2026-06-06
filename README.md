<div align="center">
  <img src=".github/assets/banner.png" alt="dotclaude" width="720" />
</div>

<br />

My personal collection of [Claude Code](https://docs.claude.com/en/docs/claude-code) extensions, distributed as a [shadcn GitHub registry](https://ui.shadcn.com/docs/registry/github).

Items install into the **current project** under `.claude/`, so run the install command from your project root. (shadcn writes into the project you run it in — its `~` means "project root", not your home directory — so a skill lands in `<project>/.claude/skills/<name>/`.)

## Install

Install any item with the shadcn CLI:

```bash
npx shadcn@latest add KhaledSaeed18/dotclaude/<item>
```

For example, run this from your project root and the `handoff` skill lands in `.claude/skills/handoff/`:

```bash
npx shadcn@latest add KhaledSaeed18/dotclaude/handoff
```

Want a skill available globally (in every project)? Install it into a project as above and copy it across:

```bash
cp -R .claude/skills/handoff ~/.claude/skills/
```

Skills that bundle companion files (like `grill-with-docs`) install a `docs/` subdirectory alongside `SKILL.md` — the same `cp -R` command handles that automatically.

## Catalog

The table below is generated from each skill's `SKILL.md` — run `pnpm gen` after adding or editing a skill.

<!-- skills:start -->

### Engineering

| Skill | Description | Install |
| --- | --- | --- |
| [explain-codebase](skills/engineering/explain-codebase/) | Onboard to an unfamiliar codebase by mapping its architecture, entry points, and data flow. Use when starting work in a new or unknown repository and you need a navigable mental model fast. | `npx shadcn@latest add KhaledSaeed18/dotclaude/explain-codebase` |
| [grill-with-docs](skills/engineering/grill-with-docs/) | Stress-test a plan against the project's existing domain model — challenges terminology, surfaces contradictions with code, and updates CONTEXT.md and ADRs inline as decisions crystallise. | `npx shadcn@latest add KhaledSaeed18/dotclaude/grill-with-docs` |

### Productivity

| Skill | Description | Install |
| --- | --- | --- |
| [grill-me](skills/productivity/grill-me/) | Relentlessly stress-test a plan, design, architecture, idea, or strategy until all critical decisions are resolved. | `npx shadcn@latest add KhaledSaeed18/dotclaude/grill-me` |
| [handoff](skills/productivity/handoff/) | Compact the current conversation into a handoff document for another agent to pick up. | `npx shadcn@latest add KhaledSaeed18/dotclaude/handoff` |
| [pr-description](skills/productivity/pr-description/) | Generate a clear, reviewer-friendly pull-request description from a diff — covering what changed, why, risk, and how it was tested. Use when opening a pull request or writing/improving a PR body. | `npx shadcn@latest add KhaledSaeed18/dotclaude/pr-description` |

### Security

| Skill | Description | Install |
| --- | --- | --- |
| [dependency-audit](skills/security/dependency-audit/) | Audit a project's dependencies for outdated and vulnerable packages and surface breaking-change notes for upgrades. Works with any ecosystem — npm/pnpm/yarn, pip/Poetry/uv, Cargo, Go modules, Maven/Gradle, Bundler, Composer, and others. | `npx shadcn@latest add KhaledSaeed18/dotclaude/dependency-audit` |
| [secret-scan](skills/security/secret-scan/) | Scan code or a diff for hardcoded secrets — API keys, tokens, passwords, private keys, and other exposed credentials — before they get committed or shipped. Use before committing, during review, or when auditing a repository. | `npx shadcn@latest add KhaledSaeed18/dotclaude/secret-scan` |

### Version Control

| Skill | Description | Install |
| --- | --- | --- |
| [changelog](skills/version-control/changelog/) | Generate a changelog or release notes from Git history — grouped by change type, written in user-facing language, with issue/PR links and breaking changes called out. Conventional-Commits aware and Keep a Changelog formatted; respects any existing CHANGELOG or tooling. Use when preparing release notes or updating CHANGELOG.md. | `npx shadcn@latest add KhaledSaeed18/dotclaude/changelog` |
| [git-commit](skills/version-control/git-commit/) | Commit work the right way — gather full repo state, respect the project's commitlint/pre-commit/branch rules, stage only understood files, and write a conventional-commit message whose body explains why. Use when committing, branching, or pushing changes. | `npx shadcn@latest add KhaledSaeed18/dotclaude/git-commit` |
| [git-undo](skills/version-control/git-undo/) | Recover safely from Git mistakes — discard, unstage, amend, reset, revert, restore lost commits via reflog, recover deleted branches, and fix bad rebases. Chooses the least-destructive fix and protects against data loss. Use when something in Git went wrong and needs undoing. | `npx shadcn@latest add KhaledSaeed18/dotclaude/git-undo` |
| [gitignore](skills/version-control/gitignore/) | Generate or repair a .gitignore tailored to the project's actual stacks, frameworks, OS, and editors — and untrack files that are already committed but should be ignored. Flags secrets/build/dependency files that slipped into the repo. Use when creating, fixing, or auditing .gitignore. | `npx shadcn@latest add KhaledSaeed18/dotclaude/gitignore` |
| [merge-conflict](skills/version-control/merge-conflict/) | Resolve Git merge, rebase, cherry-pick, revert, and stash conflicts safely — by understanding both sides and the operation in progress before integrating, then verifying the result builds and passes tests. Use when a merge/rebase/cherry-pick stops with conflicts or "needs merge". | `npx shadcn@latest add KhaledSaeed18/dotclaude/merge-conflict` |
| [release-tag](skills/version-control/release-tag/) | Cut a release — determine the SemVer bump from history, update version files across any stack, refresh the changelog, create an annotated (optionally signed) Git tag, and push the release safely after pre-flight checks. Use when tagging a version, bumping the version, or preparing a release. | `npx shadcn@latest add KhaledSaeed18/dotclaude/release-tag` |

<!-- skills:end -->

## Adding a skill

Create `skills/<category>/<name>/SKILL.md`, then run `pnpm gen` (regenerates the registry files and this catalog) and `pnpm validate`.

The **category is the folder** the skill lives in (e.g. `skills/security/secret-scan/`) — that's the single source of truth, so there's no field to set in the manifest, and the catalog above groups skills by it automatically. Recategorising a skill is a `git mv` into another category folder. Skills always install to a flat `.claude/skills/<name>/`, so the category organises this repo only — it never appears in the install path.

## How it works

The single source of truth for each item is its folder location (`skills/<category>/<name>/`) plus the manifest's frontmatter. `scripts/gen.ts` derives the shadcn registry files (`registry.json` at the root and one per item, with the folder's category recorded in each item's `categories`) and the catalog above; `scripts/validate.ts` checks the manifests and layout, then delegates structural checks to `shadcn registry validate`. CI runs both on every pull request.

## License

[MIT](LICENSE) © Khaled Saeed
