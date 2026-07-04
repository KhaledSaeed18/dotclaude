---
name: git-undo
description: Recover safely from Git mistakes such as discard, unstage, amend, reset, revert, restore lost commits via reflog, recover deleted branches, and fix bad rebases. Chooses the least-destructive fix and protects against data loss. Use when something in Git went wrong and needs undoing.
argument-hint: "(optional) what went wrong, e.g. 'committed to main', 'lost my commits'"
---

Undo the mistake with the *least-destructive* tool that fits, after establishing two facts that change everything: has the work been **committed**, and has it been **pushed/shared**. Get those wrong and you either lose work or rewrite history other people depend on.

## Hard rules: never break these

- **Diagnose before acting.** Establish: committed or not? pushed or not? on a shared branch? Run `git status`, `git log --oneline -10`, and `git reflog -20` first. The fix depends entirely on the answers.
- **Never rewrite published history casually.** For anything already pushed to a shared branch, undo *forward* with `git revert`; do not `reset`/`rebase`/`commit --amend` and force-push unless the user explicitly owns the consequences and coordinates with collaborators.
- **Take a safety net before any destructive op.** Before `reset --hard`, a force-push, or a history rewrite, snapshot the current tip: `git branch backup/<desc>` or `git tag backup/<desc>`. Reflog usually saves you, but a branch is free insurance.
- **`--hard` and `clean` destroy uncommitted work irrecoverably.** Reflog only recovers *committed* states. Spell out exactly what will be lost and confirm before running them.
- **Confirm before any destructive or shared-history command**: `reset --hard`, `clean -fd`, `push --force*`, history rewrites. Prefer `push --force-with-lease` over `--force` when a rewrite is genuinely required.

## Step 1: Diagnose

- `git status`: staged vs unstaged vs untracked; any operation in progress.
- `git log --oneline --graph -15`: recent commits and branch shape.
- `git reflog -25`: the time machine, every position `HEAD` has held, even "lost" ones. This is how you recover almost anything committed.
- Determine **shared or local**: has the affected commit/branch been pushed? `git status` (ahead/behind), `git branch -r --contains <sha>`.

## Step 2: Pick the fix

Match the situation to the safest tool:

**Uncommitted work**
- Discard changes in a file → `git restore <file>` (was `git checkout -- <file>`).
- Unstage but keep changes → `git restore --staged <file>` (was `git reset HEAD <file>`).
- Set aside without losing → `git stash push -m "<note>"`; bring back with `git stash pop`.
- Remove untracked files → `git clean -nd` (dry run first!), then `git clean -fd` once confirmed.

**The last commit (not yet pushed)**
- Wrong message → `git commit --amend`.
- Forgot a file → stage it, then `git commit --amend --no-edit`.
- Undo the commit, keep changes staged → `git reset --soft HEAD~1`.
- Undo the commit, keep changes unstaged → `git reset --mixed HEAD~1` (default).
- Undo the commit and discard changes → `git reset --hard HEAD~1` (destructive; safety net first).

**Already pushed / shared branch**
- Undo a commit safely → `git revert <sha>` (creates an inverse commit; history stays intact). Revert a merge with `-m 1`.

**Wrong-branch / structural mistakes**
- Committed to the wrong branch → create the right branch from here (`git branch feature`), then `git reset --hard origin/<wrong-branch>` on the original (safety net first); or `git cherry-pick` the commits onto the right branch and drop them from the wrong one.
- Need an old version of one file → `git restore --source=<sha> -- <file>`.

**Recovering things that look lost**
- Hard reset / branch deletion / bad amend → find the old SHA in `git reflog`, then `git branch recovered <sha>` or `git reset --hard <sha>`.
- Botched rebase/merge → `git reset --hard ORIG_HEAD` returns to the pre-operation tip.
- Deleted branch with no reflog entry → `git fsck --lost-found` lists dangling commits.
- Dropped a stash → `git fsck --no-reflog | grep commit`, or recover from `git reflog stash`.

## Step 3: Safety net (before anything destructive)

Snapshot the current tip so the operation is reversible regardless of outcome:

```
git branch backup/before-undo        # or: git tag backup/before-undo
```

Note the current `HEAD` SHA too. This costs nothing and turns "irreversible" into "recoverable."

## Step 4: Execute (with confirmation)

1. State plainly: what command runs, what it changes, and **what (if anything) is lost forever**.
2. For destructive or shared-history operations, get an explicit yes. For force-pushes, use `--force-with-lease` and confirm no one else's work is being overwritten.
3. Run it.

## Step 5: Verify

- `git status` and `git log --oneline -5` to confirm the tree and history are what you intended.
- Confirm recovered work is present (file contents, expected commits).
- Note the safety branch/tag you created; remove it once the user confirms the recovery is good.
