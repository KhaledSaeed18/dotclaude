---
name: gitignore
description: Generate or repair a .gitignore tailored to the project's actual stacks, frameworks, OS, and editors, and untrack files that are already committed but should be ignored. Flags secrets/build/dependency files that slipped into the repo. Use when creating, fixing, or auditing .gitignore.
argument-hint: "(optional) stack/framework to target, or 'audit'"
---

Produce a `.gitignore` that fits *this* repo (driven by the stacks actually present, not a generic blob) and fix the common failure where a pattern is added but the file is already tracked, so Git keeps it anyway.

## Hard rules: never break these

- **Never ignore source.** Ignore dependencies, build output, caches, logs, secrets, and local cruft, never the code or config the project needs to build.
- **Adding a pattern does not untrack a tracked file.** `.gitignore` only affects *untracked* files. Already-committed files need `git rm --cached` (Step 5) to stop being tracked.
- **Preserve existing intent.** Don't wipe a hand-tuned `.gitignore`; merge, dedupe, and organize. Keep custom and negation (`!`) rules unless they're clearly wrong.
- **Treat tracked secrets as an incident.** A committed `.env`, key, or credential is already in history; adding it to `.gitignore` and `rm --cached` stops *future* tracking but does **not** remove it from past commits. Flag it loudly and point to history-rewrite tooling (`git filter-repo`, BFG) and secret rotation.
- **Confirm before `git rm --cached`.** It changes what's tracked and lands in the next commit.

## Step 1: Detect the stacks

Scan the repo for what's actually in use rather than guessing:

- **Manifests → ecosystem:** `package.json` (Node), `Cargo.toml` (Rust), `pyproject.toml`/`requirements.txt`/`Pipfile` (Python), `go.mod` (Go), `pom.xml`/`build.gradle` (Java/Kotlin), `Gemfile` (Ruby), `composer.json` (PHP), `*.csproj`/`*.sln` (.NET), `pubspec.yaml` (Dart/Flutter), `mix.exs` (Elixir).
- **Frameworks** (they add their own build/cache dirs): Next.js (`.next/`), Nuxt (`.nuxt/`), Astro, SvelteKit, Vite (`dist/`), Angular, Django (`*.sqlite3`, `staticfiles/`), Rails, Terraform (`.terraform/`), etc.
- **OS files:** macOS (`.DS_Store`), Windows (`Thumbs.db`, `Desktop.ini`), Linux (`*~`).
- **Editors/IDEs:** `.vscode/`, `.idea/`, `*.swp`, `.fleet/`; these typically belong in a *global* gitignore, but include locally if the team standardizes there.
- **Tooling:** test coverage (`coverage/`, `.nyc_output/`), env files (`.env*`), local caches (`.cache/`, `.turbo/`, `__pycache__/`).

## Step 2: Audit what's already tracked

- Read the current `.gitignore`(s); there may be nested ones in subdirectories.
- Find files that are tracked but shouldn't be: compare `git ls-files` against the patterns you intend (look especially for `node_modules/`, `dist/`/`build/`, `target/`, `__pycache__/`, `*.log`, `.env*`, key material `*.pem`/`*.key`/`id_rsa`).
- `git status --ignored` shows what's currently ignored vs. not.
- Anything sensitive already tracked → escalate per the hard rules.

## Step 3: Build the patterns

Compose sections per detected stack. Cover, for each:

- **Dependencies**: `node_modules/`, `vendor/`, `target/`, `.venv/`, `Pods/`.
- **Build output**: `dist/`, `build/`, `out/`, `*.pyc`/`__pycache__/`, `*.class`, `bin/`, `obj/`.
- **Env & secrets**: `.env`, `.env.*` (but **keep** `!.env.example`), `*.pem`, `*.key`, `*.p12`, `credentials.json`.
- **Logs & caches**: `*.log`, `.cache/`, `.turbo/`, `.gradle/`, `.pytest_cache/`.
- **Coverage**: `coverage/`, `.nyc_output/`, `htmlcov/`.
- **OS / editor**: per Step 1.

Use the canonical templates as reference (GitHub's `github/gitignore`, gitignore.io / Toptal generator) but tailor; don't dump every language. Prefer anchored, specific patterns (`/dist/` for a root-only dir) over broad ones that may catch wanted files.

## Step 4: Write / repair the file

- Group with section comments (`# Dependencies`, `# Build output`, `# Env & secrets`, …) for maintainability.
- Deduplicate and remove contradictions; keep legitimate custom and `!` negation rules.
- Don't over-ignore: if a glob would swallow a needed file (e.g. a committed `config/*.json`), add a negation (`!config/required.json`) or tighten the pattern.
- Layer correctly: root `.gitignore` for repo-wide rules; nested `.gitignore` only where a subtree needs its own; suggest a personal **global** gitignore (`core.excludesFile`) for editor/OS noise rather than imposing it on the repo.

## Step 5: Untrack already-committed files (with confirmation)

Editing `.gitignore` won't stop tracking files Git already knows about. For each such file/dir, after confirming:

```
git rm -r --cached path/to/thing      # removes from tracking, keeps it on disk
```

Then it stays on disk but drops out of the repo on the next commit. For tracked secrets, also flag history rewrite + credential rotation; `rm --cached` alone leaves them in every past commit.

## Step 6: Verify

- `git status --ignored`: intended files now show as ignored; nothing wanted is being ignored.
- `git check-ignore -v <path>`: explains which rule matches a given path (great for debugging surprises).
- Confirm source and required config still appear in `git status`/`git ls-files`.

Report the stacks detected, what got newly ignored or untracked, and any secrets/artifacts that need follow-up beyond `.gitignore`.
