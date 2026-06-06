---
name: git-commit
description: Commit work the right way — gather full repo state, respect the project's commitlint/pre-commit/branch rules, stage only understood files, and write a conventional-commit message whose body explains why. Use when committing, branching, or pushing changes.
argument-hint: "(optional) ticket/issue ref, scope, or what to commit"
---

Turn a set of changes into a clean, conventional commit (and push, if asked). Work from the actual repo state and the project's own rules — never from assumptions about what the change "probably" is.

## Hard rules — never break these

- **No co-authors, ever.** Never add a `Co-Authored-By:` trailer. Never mention Claude, Claude Code, or any AI in a commit message, body, or branch name. The message must read as if a human engineer wrote it.
- **Commit only when asked.** Do not commit mid-task, opportunistically, or "to be safe." Wait for an explicit instruction to commit. One commit per request unless the user asks for more.
- **Confirm before `git commit` and `git push`.** State exactly what you're about to commit (files + message) or push (branch + remote) and get a yes first. These are not reversible-for-free; treat them as outward-facing.
- **Never `git add -A` or `git add .`.** Stage files explicitly by path, and only files you've inspected and understood.
- **Never commit ignored or generated content.** No `node_modules`, build output, `.env`/secrets/keys, lockfile churn you didn't intend, or generated artifacts (plans, reports, analyses, summaries, scratch notes). Source-code changes only — anything else needs an explicit ask.

## Step 1 — Gather full context

Build a complete picture before touching anything. Run these (read-only) and actually read the output:

- `git status` — what's modified, staged, untracked.
- `git diff` (unstaged) and `git diff --staged` (staged) — the actual changes, line by line.
- `git branch --show-current` and `git branch -a` — where you are and what exists.
- `git log --oneline -15` — the repo's established message and scope style; match it.
- `git status --ignored` — confirm nothing sensitive or generated is sneaking in, and that `.gitignore` already covers `node_modules`, build dirs, env files, etc.

If something is untracked that *should* be ignored (secrets, env, build output, dependencies), flag it and suggest a `.gitignore` entry rather than committing it.

## Step 2 — Discover and honor the project's rules

Repos enforce their own conventions; find and obey them before writing anything:

- **Commit-message linting** — look for `commitlint.config.{js,cjs,mjs,ts}`, `.commitlintrc*`, a `commitlint` key in `package.json`, or equivalents in other ecosystems. Read the allowed types/scopes and subject limits and conform exactly.
- **Pre-commit / hooks** — check `.pre-commit-config.yaml`, `.husky/`, `.git/hooks/`, `lefthook.yml`, or framework equivalents. The commit must pass these. Don't bypass with `--no-verify`; if a hook fails, fix the cause (formatting, lint, tests) and report it.
- **Branch-name rules** — some repos lint branch names too (in commitlint config, hooks, or CONTRIBUTING). Conform.
- **Contributor docs** — skim `CONTRIBUTING*` and any PR/commit template for additional expectations.

When the repo's rules conflict with the defaults below, the repo wins.

## Step 3 — Stage logically

- Group **related** changes into one commit; split **unrelated** changes into separate commits. A commit should be one coherent idea.
- Stage by explicit path (`git add path/to/file`), reviewing each. Use `git add -p` to split mixed files into logical hunks.
- Leave out incidental churn, debug leftovers, and anything from the "never commit" list.

## Step 4 — Branch (when needed)

If the work doesn't belong on the current branch (e.g. you're on `main`/`master` or a release branch), create one off the up-to-date main branch. Naming convention:

| Prefix      | When to use                                     |
| ----------- | ----------------------------------------------- |
| `feat/`     | New feature                                     |
| `fix/`      | Bug fix                                         |
| `chore/`    | Maintenance, dependencies, config               |
| `docs/`     | Documentation only                              |
| `refactor/` | Code change that isn't a fix or feature         |
| `test/`     | Adding or updating tests                        |

Use short, kebab-case descriptions: `feat/task-dependency-api`, `fix/refresh-token-expiry`, `docs/update-contributing`, `chore/upgrade-prisma`. Honor any stricter rule found in Step 2.

## Step 5 — Write the commit message

**Subject line** — `type(scope): summary`

- Use a Conventional Commits type: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert` (or whatever the repo's commitlint permits).
- Scope is optional but helps: `feat(auth): …`.
- Imperative mood, lowercase after the colon, no trailing period. Keep it **≤ 72 characters** (aim for ~50).
- Mark breaking changes with `!`: `feat(api)!: drop v1 token endpoint`.

**Body — explain *why*, not *what*.** The diff already shows what changed; the body exists for future code archaeology. Wrap at ~72 columns. Cover, in prose:

- **Why this change was needed** — the motivation, the trigger, the constraint.
- **The problem it solves** — the business or technical pain being addressed.
- Include a terse *what* only when the change is non-obvious from the diff.

**Footer**

- Reference tickets/issues exactly as the project does. Inline in the subject when natural — `fix(auth): handle token expiry (#42)` — and/or as footers: `Closes #42`, `Refs JIRA-1234`, `ClickUp: CU-abc`.
- If the user mentions any Jira/issue/ClickUp/tracker ID, it **must** appear in the commit.
- Breaking changes get a `BREAKING CHANGE: <description>` footer.

Template (adapt, don't pad with empty sections):

```
type(scope): concise imperative subject (#123)

Why: the motivation or constraint that prompted this change, and the
problem it solves — written for someone reading `git blame` in a year.

[Only if non-obvious] What: the key technical move that makes it work.

Closes #123
```

## Step 6 — Commit and push (with confirmation)

1. Show the user the staged files and the exact message, and confirm.
2. On approval, commit. Pass multiline messages with repeated `-m` flags or a heredoc — **never** embed an AI/co-author trailer.
3. Let pre-commit hooks run. If they reformat or fail, surface it, fix the cause, and re-stage — don't `--no-verify`.
4. Push only when explicitly asked, and confirm the branch and remote first. If the branch is new, set upstream (`git push -u origin <branch>`).

Report what landed: the commit hash/subject and, if pushed, where.
