---
name: merge-conflict
description: Resolve Git merge, rebase, cherry-pick, revert, and stash conflicts safely — by understanding both sides and the operation in progress before integrating, then verifying the result builds and passes tests. Use when a merge/rebase/cherry-pick stops with conflicts or "needs merge".
argument-hint: "(optional) files to focus on, or 'abort'"
---

Resolve conflicts by integrating the *intent* of both sides — never by blindly picking one or deleting code you don't understand. Work from the actual conflict, the operation that produced it, and the history behind each side.

## Hard rules — never break these

- **Understand before you resolve.** Read what each side was trying to do (the commits, the surrounding code) before editing a single marker. A "resolved" conflict that drops one side's intent is a silent bug, not a fix.
- **Never reflexively accept `--ours` or `--theirs`.** Whole-file side-picking is almost always wrong and discards real work. Resolve hunk by hunk.
- **Know which side is which** — it flips by operation. In a `merge`, *ours* = the branch you're on, *theirs* = the branch being merged. In a `rebase`, it's **reversed**: *ours* = the branch you're replaying onto (upstream), *theirs* = your commits being replayed. Confirm before using either.
- **Verify after resolving.** The merge succeeding means the markers are gone, not that the code is correct. Build, lint, and run tests before you consider it done.
- **Don't commit a half-resolved or unverified state**, and confirm before finalizing (`commit` / `--continue`) or aborting.
- **When in doubt, it's safe to bail.** Conflicts are recoverable — `git merge --abort` / `git rebase --abort` / `git cherry-pick --abort` returns you to where you started. Prefer that over guessing.

## Step 1 — Identify the operation in progress

The right "continue" and "abort" commands depend on what's running. Check first:

- `git status` — it names the operation ("You have unmerged paths", "interactive rebase in progress", "cherry-pick in progress", etc.) and lists conflicted files.
- Operation → continue / abort:
  - **merge** → `git merge --continue` / `git merge --abort`
  - **rebase** → `git rebase --continue` / `git rebase --abort` (or `--skip` to drop the current commit)
  - **cherry-pick** → `git cherry-pick --continue` / `--abort`
  - **revert** → `git revert --continue` / `--abort`
  - **stash pop** → resolve, then the stash stays in the list until you `git stash drop`

If the user just wants out, abort with the matching command and stop.

## Step 2 — Gather context on both sides

- List only the conflicted files: `git diff --name-only --diff-filter=U`.
- Understand each branch's intent: `git log --oneline --left-right --merge` shows the diverging commits touching conflicted files; `git log -p --merge -- <file>` shows their changes.
- See the common ancestor to judge what each side actually changed: enable 3-way view with `git config merge.conflictstyle zdiff3` (or inspect `git show :1:<file>` = base, `:2:` = ours, `:3:` = theirs).
- For a big or risky resolution, snapshot first: `git branch backup/pre-merge` or `git stash` the unrelated work.

## Step 3 — Read each conflict

Conflict markers:

```
<<<<<<< ours            ← your side (per Step 1's mapping)
...
||||||| base            ← common ancestor (only in diff3/zdiff3 style)
...
=======
...
>>>>>>> theirs          ← incoming side
```

For each hunk, ask: what did *base → ours* change, and what did *base → theirs* change? The correct resolution usually keeps **both** intents. Side-picking is only right when the two changes are genuinely the same edit or one truly supersedes the other.

## Step 4 — Resolve

- Edit the file to the correct integrated result and remove all markers (`<<<<<<<`, `|||||||`, `=======`, `>>>>>>>`).
- Watch for **semantic conflicts** — code that merges cleanly with no markers but is logically broken (a function renamed on one side and newly called on the other, duplicated imports, two sides adding the same key). These won't show as conflicts; you have to reason about them.
- For pure add/delete or generated-file conflicts where one side is authoritative, targeted `git checkout --ours/--theirs -- <file>` is acceptable — but only when you've confirmed the other side has nothing to contribute.
- Heavy conflicts: `git mergetool` opens your configured visual tool. Consider enabling `git rerere` so Git remembers resolutions and replays them on repeated rebases.

## Step 5 — Verify

Before marking anything resolved:

- Re-read each resolved file top to bottom — not just the conflict regions.
- Build / compile, run the linter and formatter, and run the relevant tests. A clean merge that fails the suite is not resolved.

## Step 6 — Finalize (with confirmation)

1. Stage each resolved file explicitly: `git add <file>` (this is what marks it resolved).
2. Confirm there are no remaining unmerged paths: `git status`.
3. With the user's go-ahead, finalize using the operation's continue command from Step 1 (or `git commit` for a plain merge — keep the default merge message; never add AI/co-author trailers).
4. Report what was resolved per file and how each notable conflict was decided, so the resolution is reviewable.
