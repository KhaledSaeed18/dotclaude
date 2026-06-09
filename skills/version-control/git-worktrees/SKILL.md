---
name: git-worktrees
description: Set up an isolated workspace for feature work so the current branch and working tree stay untouched — detecting existing isolation first, preferring the platform's native worktree tooling, and falling back to git worktrees only when nothing native exists. Use before starting feature work that needs isolation, or before executing an implementation plan.
---

Make sure the work happens somewhere isolated, without fighting whatever isolation the environment already provides. The order matters: detect what you're already in, prefer native tooling, and only reach for raw `git worktree` as a last resort. Creating a worktree on top of an environment that already gave you one produces phantom state the harness can't see or clean up.

## Step 0: Detect existing isolation first

Before creating anything, check whether you're already isolated.

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

If `GIT_DIR != GIT_COMMON`, you're likely already in a linked worktree — **but** the same is true inside a git submodule, so rule that out first:

```bash
git rev-parse --show-superproject-working-tree 2>/dev/null
```

If that prints a path, you're in a submodule: treat it as a normal repo. Otherwise, `GIT_DIR != GIT_COMMON` means you're already in a worktree — skip creation and go straight to setup (Step 3). Report it: "Already in an isolated workspace at `<path>` on branch `<name>`" (or note a detached HEAD, which will need a branch created at finish time).

If `GIT_DIR == GIT_COMMON` (or you're in a submodule), you're in a normal checkout. Unless the user has already stated a worktree preference, ask before creating one:

> "Want me to set up an isolated worktree? It keeps your current branch untouched while I work."

Honor an existing stated preference without re-asking. If the user declines, work in place and skip to Step 3.

## Step 1: Create the isolated workspace

Two mechanisms, tried in this order.

### 1a. Native worktree tooling (preferred)

Do you already have a native way to create a worktree — a tool named something like `EnterWorktree` or `WorktreeCreate`, a `/worktree` command, a `--worktree` flag? If so, use it and skip to Step 3. Native tools handle placement, branch creation, and cleanup themselves; using raw `git worktree add` alongside them creates state the harness can't track. Only fall through to 1b if no native tool exists.

### 1b. Git worktree fallback

Only if there's no native tool. Pick the directory by this priority — an explicit user preference always wins over what's on disk:

1. A worktree directory the user already specified in their instructions.
2. An existing project-local directory: `.worktrees/` (preferred) or `worktrees/`. If both exist, `.worktrees/` wins.
3. Otherwise, default to `.worktrees/` at the repo root.

For any project-local directory, **verify it's git-ignored before creating the worktree** — otherwise the worktree's contents get tracked:

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

If it isn't ignored, add it to `.gitignore` and commit that change first. Then create the worktree on a new branch and move into it:

```bash
git worktree add "$path/$BRANCH_NAME" -b "$BRANCH_NAME"
cd "$path/$BRANCH_NAME"
```

If `git worktree add` fails on a permission/sandbox error, tell the user the sandbox blocked it and that you're working in the current directory instead, then continue in place.

## Step 3: Project setup

Auto-detect the stack and install dependencies — for example `npm install` (or `pnpm`/`yarn`) for `package.json`, `cargo build` for `Cargo.toml`, `pip install -r requirements.txt` / `poetry install` for Python, `go mod download` for `go.mod`. Skip if there's nothing to install.

## Step 4: Verify a clean baseline

Run the project's tests so you know the workspace starts green:

```bash
# project-appropriate: npm test / cargo test / pytest / go test ./...
```

If they fail, report the failures and ask whether to proceed or investigate first — a dirty baseline makes it impossible to tell your new bugs from pre-existing ones. If they pass, report ready: worktree path, branch, and that the baseline is green.

## Common mistakes

- **Fighting the harness** — running `git worktree add` when native isolation already exists. Step 0 and Step 1a exist to prevent this; it's the single most common error.
- **Skipping detection** — creating a worktree nested inside one you're already in. Always run Step 0 first.
- **Skipping the ignore check** — project-local worktree contents end up tracked and pollute `git status`. Always `git check-ignore` first.
- **Assuming the directory** — guess and you violate the project's convention. Follow the priority order.
- **Proceeding on a failing baseline** — you lose the ability to attribute failures. Report and ask.
