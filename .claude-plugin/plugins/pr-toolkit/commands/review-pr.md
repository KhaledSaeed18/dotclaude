---
name: review-pr
description: "Review a pull request or the current branch with four specialist agents in parallel (code-reviewer for correctness and security, silent-failure-hunter, test-gap-analyzer, type-design-reviewer), then merge their findings into one severity-ranked review with file:line anchors and no duplicates, optionally posted to the PR with gh. Use when a PR is ready for review, before requesting human review, or when a branch needs a thorough second opinion in one pass."
argument-hint: "[PR number or branch] [--post]"
allowed-tools: Read, Grep, Glob, Bash(git:*), Bash(gh:*), Agent
model: inherit
---

## Context

Target: `$ARGUMENTS` (a PR number, a branch, or empty for the current branch; `--post` posts the result as a PR comment)

**Current branch and merge base:**

!`git branch --show-current 2>/dev/null; git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null`

**Change summary:**

!`git diff --stat $(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null)...HEAD 2>/dev/null | tail -20`

## Task

### Step 1: Resolve the target

- A number: `gh pr view <n> --json headRefName,baseRefName,title,body,url` then `gh pr checkout <n>` if not already on it. The diff is `base...head`.
- A branch name: check it out (or use a worktree if the tree is dirty) and diff against its merge base with the default branch.
- Nothing: the current branch against its merge base.

Read the PR description or the last commits for intent. If the diff is empty, say so and stop.

### Step 2: Fan out

Launch these four agents **in parallel**, each with the same scope (the diff range and the intent), and let each work in its own context:

1. `code-reviewer`: correctness, security, maintainability, stack-specific issues.
2. `silent-failure-hunter`: swallowed errors, ignored results, wrong statuses.
3. `test-gap-analyzer`: behaviours with no asserting test, as test specs.
4. `type-design-reviewer`: types that permit invalid states, boundary casts.

Give each the explicit diff command (`git diff <base>...HEAD`) and the PR title and body, and tell each to return its standard report.

### Step 3: Merge

Combine the four reports into one review:

- **Deduplicate.** The same `file:line` reported by two agents becomes one finding that credits the stronger analysis.
- **Rank** Critical, High, Medium, Low across all sources. Silent failures with data-loss scenarios and security findings are Critical or High regardless of which agent found them.
- **Keep the evidence.** Every finding keeps its `file:line`, scenario, and fix.
- **Cap the noise.** At most 15 findings in the body; summarise the rest in one line each under "Also noted".
- **Verdict** in the first line: approve, approve with nits, request changes; and one sentence why.

### Step 4: Deliver

Print the merged review. With `--post`, also post it as a single PR comment:

```bash
gh pr comment <n> --body-file <(cat <<'REVIEW'
...
REVIEW
)
```

Never approve or request changes through the GitHub review API; the human reviewer owns that decision. Never edit code as part of this command.

### Format

```
## Review: <PR title> (<n> files, +a/-b)

**Verdict:** request changes. One silent data-loss path and no tests for the new error branch.

### Critical
- `src/jobs/sync.ts:74` ...

### High
...

### Test gaps (top 3)
1. ...

### Also noted
- ...
```

## Inspired by

The role and scope follow the pr-review-toolkit plugin's /review-pr command in Anthropic's [claude-code](https://github.com/anthropics/claude-code/tree/main/plugins/pr-review-toolkit) repository. That repository is not open-licensed, so nothing is copied from it; every line here was written for this registry.
