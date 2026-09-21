---
name: pr
description: "Take the current branch from uncommitted work to an open pull request: commit outstanding changes with the git-commit rules if asked, push with upstream tracking, write the PR title and body with the pr-description skill from the full branch diff, link the issue, and open it with gh against the right base. Confirms before pushing and before creating. Use when a branch is ready for review or when asked to open a PR."
argument-hint: "[--draft] [--base BRANCH] [issue number or title hint]"
allowed-tools: Read, Grep, Glob, Bash(git:*), Bash(gh:*)
model: inherit
---

## Context

Options: `$ARGUMENTS`

**Branch, upstream, and default base:**

!`git branch --show-current 2>/dev/null; git rev-parse --abbrev-ref @{upstream} 2>/dev/null || echo "(no upstream)"; gh repo view --json defaultBranchRef --jq .defaultBranchRef.name 2>/dev/null`

**Uncommitted:**

!`git status --short 2>/dev/null | head -20`

**Commits on this branch:**

!`git log --oneline $(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null)..HEAD 2>/dev/null`

**Existing PR for this branch:**

!`gh pr view --json number,url,state 2>/dev/null || echo "(none)"`

## Task

1. **Refuse on a protected branch.** If the current branch is the default branch (or `main`/`master`/`develop`), stop and ask for a feature branch; do not create one silently.
2. **If a PR already exists**, print its URL and offer to update the body instead of creating a duplicate.
3. **Uncommitted changes**: if any, ask whether to commit them first. If yes, apply the `git-commit` skill for one commit (explicit staging, repo rules, no AI mentions). If no, proceed with what is committed and say the working tree still has changes.
4. **Push** with `git push -u origin <branch>` after confirming the branch and remote. A rejected push (non-fast-forward) is reported, never forced.
5. **Write the PR** with the `pr-description` skill from `git diff <base>...HEAD` and the commit messages: a title under 70 characters in the repo's convention, and a body with what changed, why, risk, and how it was tested. If a PR template exists (`.github/pull_request_template.md`), fill its sections instead. If the arguments include an issue number, add `Closes #<n>`.
6. **Show** the title, body, base, and draft status, then ask for a yes before `gh pr create --base <base> --title ... --body-file ...` (`--draft` when asked). Base defaults to the repo's default branch.
7. **Report** the PR URL. Do not enable auto-merge, request reviewers, or add labels unless asked.
