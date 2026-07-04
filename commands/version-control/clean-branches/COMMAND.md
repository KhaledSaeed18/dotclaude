---
name: clean-branches
description: List local Git branches that have been fully merged or are stale and delete them safely after showing what would be removed. Protects main, master, develop, and the currently checked-out branch. Pass --dry-run to preview without deleting anything. Distinct from the finish-branch skill, which closes a single active in-progress branch; this cleans up accumulated merged branches across the whole repository. Use when local branches have accumulated and need safe cleanup.
argument-hint: "[--dry-run]"
allowed-tools: Bash(git:*)
model: inherit
---

## Context

Options: `$ARGUMENTS`

**Current branch and remotes:**

!`git branch --show-current 2>/dev/null`

!`git remote -v 2>/dev/null | head -4`

## Task

Identify merged and stale local branches and remove them, after presenting a clear list of what will be deleted and why.

### Step 1: Gather branch state

```bash
# All local branches with their last commit date and whether they are merged into main/master
git branch -v --merged main 2>/dev/null || git branch -v --merged master 2>/dev/null
```

```bash
# Branches with no corresponding remote-tracking ref (orphaned after remote deletion)
git branch -vv | grep ": gone]"
```

```bash
# All local branches with last commit date, sorted oldest first
git for-each-ref --sort=committerdate refs/heads/ \
  --format="%(committerdate:short)  %(refname:short)  %(upstream:track)"
```

### Step 2: Classify branches for deletion

Candidates for deletion are branches that meet one or more of these criteria:

1. **Fully merged:** the branch tip is reachable from `main` or `master` (shown by `git branch --merged`).
2. **Remote gone:** the tracking remote branch was deleted (shown by `": gone]"` in `git branch -vv`).
3. **Stale and inactive:** last commit is more than 90 days old and the branch has no open remote counterpart.

**Protected branches - never delete:**
- `main`, `master`, `develop`, `dev`, `staging`, `production`
- The currently checked-out branch
- Any branch with uncommitted changes (this cannot happen for local branches, but note it as a constraint)

Build two lists:
- **Safe to delete:** merged or remote-gone branches that are not protected.
- **Needs review:** stale branches that are not merged and whose remote still exists (present these for manual decision, do not auto-delete).

### Step 3: Confirm and act

Present the lists clearly before deleting anything:

```
Branches to delete (merged or remote-gone):
  feature/old-login     last commit: 2024-11-03  [merged into main]
  fix/typo-in-readme    last commit: 2025-01-14  [remote: gone]

Branches for manual review (stale, not merged):
  experiment/new-nav    last commit: 2024-09-12  [remote still exists]
```

If `$ARGUMENTS` contains `--dry-run`, stop here and print the lists without deleting anything.

Otherwise, ask: "Delete the N branches above? (yes/no)" and wait for confirmation before proceeding.

On confirmation, delete each safe branch:

```bash
git branch -d <branch-name>   # for merged branches (safe delete, errors if not merged)
git branch -D <branch-name>   # for remote-gone branches (force delete, only after showing the user)
```

Use `-d` (safe) for merged branches. Use `-D` (force) only for branches confirmed as remote-gone, and log each one explicitly.

### Step 4: Report

After deletion, report:
- How many branches were deleted
- Whether any deletion failed and why
- Any branches in the "needs review" list that the user should decide on manually

Optionally offer: `git remote prune origin` to also clean up stale remote-tracking refs if any were found.
