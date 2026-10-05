---
name: dependency-upgrade
description: "Upgrade dependencies without breaking the project: audit what is outdated and why it matters (security, EOL, features), read the changelogs and migration guides for each major, upgrade in ordered small batches with the test suite and typecheck run after each, apply codemods where they exist, handle lockfile and peer-dependency conflicts, and leave a record of what changed and what was deferred. Use when a security advisory lands, when a runtime or framework reaches end of life, when a dependabot queue has piled up, or when an upgrade attempt broke the build."
argument-hint: "(optional) the package(s) or the goal: security, a major version, everything)"
---

Upgrades fail when they are done all at once and diagnosed all at once. The discipline is: know what changed, change one thing, run the tests, commit, repeat. A day of small green steps beats a week of bisecting a red branch.

## Step 1: inventory

- `npm outdated` / `pnpm outdated` / `pip list --outdated` / `cargo outdated` / `go list -m -u all`, plus the audit: `npm audit`, `pip-audit`, `cargo audit`, `govulncheck`.
- For each candidate: current, latest, is it a major bump, does an advisory apply, is the current version EOL, does it block another upgrade (e.g. the test runner must move before the framework can).
- Classify: **security** (do first, minimal version that fixes), **blocking** (needed for another upgrade), **major** (needs reading), **minor/patch** (batchable).

Write the plan as a table before touching anything; get agreement if the list is long or a major touches the framework.

## Step 2: prepare

- Green baseline: full test suite, typecheck, lint, and build pass on the current commit; record timings.
- A branch per major upgrade; one branch for the minor/patch batch.
- Read, for each major: the release notes for every skipped major, the migration guide, the codemods offered, and the peer dependency changes. Note breaking changes that touch this codebase (grep for the removed APIs).

## Step 3: minor and patch batch

Update them together (`pnpm update` within ranges, `pip install -U` for the batch), run the gate, commit as one change. If it goes red, bisect the batch by halving.

## Step 4: majors, one at a time

For each, in dependency order (tooling first: TypeScript, test runner, bundler; then libraries; then the framework):

1. Bump the one package (and its peers that must move with it).
2. Run codemods if the project offers them (`npx @next/codemod`, `npx react-codemod`, `django-upgrade`, `pyupgrade`, `cargo fix --edition`).
3. Typecheck first: it lists the removed and changed APIs faster than tests do.
4. Fix compile errors by following the migration guide, not by casting or suppressing.
5. Run the tests; fix behaviour changes the guide predicted; investigate any it did not.
6. Run the app or the smoke path once by hand where tests are thin.
7. Commit with the version range and the changes made in the body.

Lockfile conflicts: regenerate from the manifest (`pnpm install --no-frozen-lockfile` on the branch, then commit) rather than hand-merging. Peer warnings: satisfy them or pin with a documented override (`pnpm.overrides`, `resolutions`), with a comment naming the reason and the removal condition.

## Step 5: runtime and language upgrades

Node, Python, Java, Go versions: update the engine field, `.nvmrc`/`.tool-versions`/`pyproject` requires-python, the Dockerfile base, and CI matrices together; run the full suite on the new version; check native modules and C extensions rebuild. Keep the old version in the CI matrix for one release when consumers may lag.

## Step 6: record

In the PR body or `docs/upgrades/<date>.md`: the table from step 1 with the outcome per row (upgraded to X, deferred because Y, blocked by Z), the codemods run, the behaviour changes noticed, and the overrides added with their removal condition. Deferred items become issues.

## Automation afterwards

Dependabot or Renovate with grouped minor/patch updates weekly, majors as separate PRs, security updates immediately, and the lockfile maintained. A queue that is merged weekly never becomes a migration project.

## Rules

- Never upgrade and refactor in the same commit.
- Never silence a type error or a deprecation warning to make an upgrade pass; the warning is the migration guide pointing at the line.
- A failed major upgrade is reverted cleanly (`git revert` or drop the branch), the blocker written down, and the rest of the plan continues.
