---
name: finish-branch
description: Wrap up a completed development branch by verifying tests pass, detecting the workspace state, then presenting clear merge / PR / keep / discard options and executing the chosen one safely — including correct worktree and branch cleanup. Use when implementation is done, tests should be green, and you need to integrate or put away the work.
---

Bring a finished branch to a clean conclusion: confirm the work actually passes, figure out what kind of workspace you're in, offer the user a small set of concrete options, and carry out their choice without losing anything. The shape is always the same — verify, detect, present, execute, clean up.

## Step 1: Verify tests before offering anything

Run the project's full test suite (`npm test` / `cargo test` / `pytest` / `go test ./...` as appropriate). If anything fails, stop here — show the failures and say the work can't be merged or turned into a PR until they pass. Don't present the options menu over a red suite. (The `verify-completion` skill is the standard: run it, read the output, then proceed.)

## Step 2: Detect the workspace state

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

- `GIT_DIR == GIT_COMMON` — a normal repo checkout; no worktree to clean up.
- `GIT_DIR != GIT_COMMON`, on a named branch — a linked worktree; cleanup depends on who created it (Step 5).
- `GIT_DIR != GIT_COMMON`, detached HEAD — externally managed; offer the reduced menu and don't clean up.

Also determine the base branch the work split from:

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

If it's ambiguous, ask: "This branch came off `main` — correct?"

## Step 3: Present the options

For a normal repo or a named-branch worktree, present exactly these four, with no extra explanation:

```
Implementation complete. What would you like to do?

1. Merge back into <base> locally
2. Push and open a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

For a detached HEAD, present the reduced three (no local merge): push as a new branch and open a PR / keep as-is / discard.

## Step 4: Execute the choice

**1 — Merge locally.** From the main repo root (not inside the worktree), check out the base, pull, and merge the feature branch. Re-run the tests on the merged result. Only after the merge succeeds and tests pass: clean up the worktree (Step 5), then `git branch -d <feature>`.

**2 — Push and open a PR.** `git push -u origin <feature>`, then `gh pr create` with a short summary and a test-plan checklist. **Do not clean up the worktree** — the user needs it alive to act on PR feedback.

**3 — Keep as-is.** Report the branch name and, if applicable, the preserved worktree path. No cleanup.

**4 — Discard.** Confirm first, listing exactly what will be permanently deleted (branch, its commits, the worktree path), and require the user to type `discard` before doing anything. Only then, from the main repo root, clean up the worktree (Step 5) and `git branch -D <feature>`.

## Step 5: Clean up the workspace (options 1 and 4 only)

Options 2 and 3 always preserve the worktree. For 1 and 4:

```bash
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

- If `GIT_DIR == GIT_COMMON`, it's a normal repo — nothing to remove.
- If the worktree lives under `.worktrees/` or `worktrees/` (i.e. something this workflow created), you own its cleanup. From the main repo root: `git worktree remove "$WORKTREE_PATH"` then `git worktree prune`.
- Otherwise the harness owns the workspace — **don't remove it**. If your platform has a workspace-exit tool, use it; otherwise leave it in place.

Always `cd` to the main repo root before `git worktree remove` — running it from inside the worktree being removed fails. And always remove the worktree *before* deleting the branch, since the worktree still references it.

## Red flags

- Presenting options over failing tests, or merging without re-verifying tests on the merged result.
- Deleting work without a typed confirmation, or force-pushing without an explicit request.
- Cleaning up the worktree for option 2 (the user still needs it).
- Removing a worktree you didn't create, or running `git worktree remove` from inside it.
- Deleting the branch before removing its worktree.
