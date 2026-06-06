---
name: release-tag
description: Cut a release — determine the SemVer bump from history, update version files across any stack, refresh the changelog, create an annotated (optionally signed) Git tag, and push the release safely after pre-flight checks. Use when tagging a version, bumping the version, or preparing a release.
argument-hint: "(optional) explicit version (e.g. 1.4.0) or bump level (major|minor|patch)"
---

Take the repo from "ready" to a clean, tagged, pushed release. Releases are outward-facing and effectively irreversible once published — so every step is gated by pre-flight checks and explicit confirmation.

## Hard rules — never break these

- **Never release a dirty or unverified tree.** Working tree clean, on the correct branch, up to date with the remote, and tests/CI green — all true before tagging.
- **Tags are immutable once published.** Never move or overwrite a pushed tag; if a release is wrong, cut a new patch version. Force-retagging breaks everyone who already pulled.
- **Follow SemVer honestly.** The bump must reflect what actually changed (see Step 2), not a convenient number.
- **Confirm before the commit, the tag, and the push** — these are the irreversible, outward-facing actions.
- **No AI/co-author trailers** in the release commit or tag message.
- **Publishing is downstream.** Tagging ≠ publishing to a registry. Don't run `npm publish` / `cargo publish` / etc. unless explicitly asked — most pipelines publish from CI on tag.

## Step 1 — Pre-flight

- `git status` → clean tree (or stash/commit deliberate changes first).
- On the release branch (usually `main`/`master` or a `release/*` branch) and synced: `git fetch && git status` shows up to date.
- Latest tag and history since it: `git describe --tags --abbrev=0`.
- Tests, linters, and build pass locally; CI on the release commit is green.

## Step 2 — Determine the version

Derive the SemVer bump from the commits since the last tag:

- **MAJOR** — any breaking change (`!` marker, `BREAKING CHANGE:` footer, removed/incompatible API).
- **MINOR** — new backward-compatible features (`feat`).
- **PATCH** — backward-compatible fixes only (`fix`, `perf`).
- Pre-1.0: minor/patch carry the instability caveat; respect the project's stated policy.
- Honor pre-release / build identifiers if used (`1.4.0-rc.1`, `+build.5`) and any explicit version the user gives.

## Step 3 — Bump the version files (stack-aware)

Update wherever the canonical version lives — detect by the manifests present:

| Stack            | Where / how                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| Node / npm       | `package.json` (+ workspace pkgs); `npm version <v> --no-git-tag-version`.|
| Rust             | `Cargo.toml` `[package] version` (+ `Cargo.lock`)                         |
| Python           | `pyproject.toml`, `setup.py`/`setup.cfg`, or `__version__`/`_version.py`  |
| Go               | usually tag-driven (no file); else a `version` const / `VERSION`          |
| Java             | `pom.xml` `<version>`, or `gradle.properties`/`build.gradle`              |
| .NET             | `*.csproj` `<Version>`, `Directory.Build.props`                           |
| PHP              | `composer.json` `version` (often omitted in favor of tags)                |
| Ruby             | `*.gemspec` / `lib/<gem>/version.rb`                                      |
| Generic          | a top-level `VERSION` file                                                |

Keep lockfiles consistent. **Monorepos:** prefer the configured tool (changesets, Lerna, Nx release, Turborepo) and per-package versioning over hand edits. Use the native bump command when one exists, but suppress its auto-tag/commit so the steps below stay explicit and controlled.

## Step 4 — Update the changelog

Refresh `CHANGELOG.md`/release notes for this version (delegate to the **changelog** skill if available): move `[Unreleased]` items under the new `## [X.Y.Z] - <date>` heading, call out breaking changes and migration steps.

## Step 5 — Commit, then tag (with confirmation)

1. Stage only the version + changelog files (explicit paths — never `git add -A`), and confirm.
2. Release commit: `chore(release): vX.Y.Z` (or the repo's convention).
3. Annotated, optionally signed tag — never lightweight:
   - `git tag -a vX.Y.Z -m "Release vX.Y.Z"` (add `-s` to sign if the project signs releases).
   - Match the existing tag prefix style (`v1.4.0` vs `1.4.0` — check `git tag`).
4. Sanity-check: `git show vX.Y.Z` points at the release commit and the message is right.

## Step 6 — Push (with confirmation)

1. Confirm branch + tag + remote.
2. Push the commit and the tag: `git push origin <branch>` then `git push origin vX.Y.Z` (or `--follow-tags`). Avoid `git push --tags` (it pushes *all* tags).
3. If CI builds/publishes/creates the release from the tag, say so and let it run; don't duplicate the publish manually.

Report the released version, the tag, the commit it points to, and what (if anything) downstream automation will now do.
