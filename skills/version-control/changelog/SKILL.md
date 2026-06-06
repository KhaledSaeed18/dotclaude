---
name: changelog
description: Generate a changelog or release notes from Git history — grouped by change type, written in user-facing language, with issue/PR links and breaking changes called out. Conventional-Commits aware and Keep a Changelog formatted; respects any existing CHANGELOG or tooling. Use when preparing release notes or updating CHANGELOG.md.
argument-hint: "(optional) version, or a ref range like v1.2.0..HEAD"
---

Produce a changelog from what actually shipped — the commits, merged PRs, and references between two points in history. Write it for the people who *read* releases (users, integrators), not as a raw `git log` dump.

## Hard rules — never break these

- **Base it on real history, never invent.** Every entry must trace to a commit, PR, or issue. No speculative or aspirational items.
- **Match the existing format.** If `CHANGELOG.md` or a changelog tool already exists, follow its structure, headings, and conventions exactly. Don't impose a new style on an established file.
- **Never rewrite already-released sections.** Add the new version on top; leave shipped entries untouched.
- **Write for humans.** Translate commits into user-facing outcomes. Drop pure-noise commits (formatting, CI tweaks, internal refactors) unless they affect users.
- **Surface breaking changes prominently** — they're the entries most likely to ruin someone's day if missed.

## Step 1 — Determine the range

- Last release to now: `git describe --tags --abbrev=0` gives the latest tag; the range is `<lastTag>..HEAD`.
- Between two releases: `<olderTag>..<newerTag>`.
- First release ever: use the full history (no lower bound).
- Honor an explicit range or version the user passed.

## Step 2 — Gather the raw material

- Commits in range: `git log <range> --no-merges --pretty=format:'%H %s'` (and `%b` for bodies, to catch `BREAKING CHANGE:` footers).
- Merge commits / PR numbers: `git log <range> --merges` and `(#123)` references in subjects.
- Parse Conventional Commit prefixes (`feat`, `fix`, `perf`, `refactor`, `docs`, etc.), scopes, the `!` breaking marker, and issue/ticket references (`#123`, `JIRA-456`, `CU-abc`).
- Capture authors if the project credits contributors.

## Step 3 — Detect the project's convention

Look before you write — adopt what's already in use:

- An existing `CHANGELOG.md` / `CHANGES`/`HISTORY` file → mirror its format (most follow **[Keep a Changelog](https://keepachangelog.com)**).
- Tooling config that owns the changelog, e.g. `conventional-changelog`/`standard-version`, `release-please`, **changesets** (`.changeset/`), **git-cliff** (`cliff.toml`), `towncrier` (`newsfragments/`), `auto`, `semantic-release`. If one is configured, prefer driving *it* over hand-writing, and explain how to run it.

## Step 4 — Categorize

Default to Keep a Changelog sections, mapping Conventional Commits onto them:

| Section          | Sourced from                                  |
| ---------------- | --------------------------------------------- |
| **Added**        | `feat`                                        |
| **Changed**      | `refactor`, `perf`, behavior-changing updates |
| **Deprecated**   | commits marking something deprecated          |
| **Removed**      | removals                                      |
| **Fixed**        | `fix`                                         |
| **Security**     | security fixes (CVE/advisory references)      |

List **Breaking changes** in their own prominent block (from `!` markers and `BREAKING CHANGE:` footers), with the migration path. Omit `chore`, `ci`, `build`, `style`, and `test` unless user-visible.

## Step 5 — Write the entries

- One concise, imperative, user-facing line per change — describe the outcome, not the diff.
- Link references: `... (#123)`, ticket IDs, or commit short-SHAs per the project's style.
- Deduplicate (squash-merge plus follow-up commits often describe the same change) and merge related items.
- Order sections by reader impact: Breaking → Added → Changed → Fixed → the rest.

## Step 6 — Assemble and place

- Head the section with the version and ISO date: `## [1.4.0] - 2025-06-06`. Use `## [Unreleased]` if the version isn't cut yet.
- **Prepend** under any existing `[Unreleased]`/top of file; never disturb prior releases.
- Maintain comparison links at the bottom if the file uses them (`[1.4.0]: https://…/compare/v1.3.0...v1.4.0`).
- If a changelog tool owns the file, generate through it instead of editing by hand, and show the command used.

Report the version, the range covered, and any commits you deliberately excluded as noise, so the result is auditable.
