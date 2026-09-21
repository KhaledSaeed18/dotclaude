---
name: commit
description: "Create one well-formed commit from the current changes using the git-commit skill's rules: inspect the diff, honour the repo's commitlint and hooks, stage only understood files explicitly, write a conventional message whose body says why, and confirm before committing. Never pushes. Use when a piece of work is ready to be recorded in history, or when asked to commit."
argument-hint: "[scope, ticket, or a hint about what to commit]"
allowed-tools: Read, Grep, Glob, Bash(git:*)
model: inherit
---

## Context

Hint: `$ARGUMENTS`

**Status:**

!`git status --short 2>/dev/null | head -40`

**Branch and recent style:**

!`git branch --show-current 2>/dev/null; git log --oneline -8 2>/dev/null`

**Staged and unstaged summary:**

!`git diff --staged --stat 2>/dev/null | tail -5; echo '---'; git diff --stat 2>/dev/null | tail -5`

## Task

Apply the `git-commit` skill end to end for exactly one commit. In short:

1. Read the actual diffs (`git diff`, `git diff --staged`). Do not commit what you have not read.
2. Find and obey the repo's rules: commitlint config, pre-commit or husky hooks, CONTRIBUTING, the message style visible in the log above.
3. If the changes contain more than one logical unit, propose the split and commit only the first unit (or the one the hint names); say what remains.
4. Stage files explicitly by path. Never `git add -A` or `git add .`. Never stage generated output, secrets, or dependencies; flag anything untracked that should be ignored.
5. Write the message: conventional type and scope matching the repo's convention, subject in the imperative under 72 characters, a body that explains why and what a reviewer needs to know. No AI or co-author mentions of any kind.
6. Show the file list and the full message, then ask for a yes before running `git commit`. If a hook fails, fix the cause and retry; never `--no-verify`.
7. Report the commit hash and subject. Do not push; that is `/pr` or an explicit request.

If there is nothing to commit, say so and stop.
