---
name: weekly-review
description: "Produce a weekly review from the evidence in the repository and the workspace: commits and pull requests merged or open, issues closed and opened, decisions logged, research log entries, action items done and overdue, and what stalled, then a short plan for next week; written to a dated file so reviews accumulate. Use at the end of a working week, before a one-on-one or a status update, or when the week felt busy and it is unclear what got done."
argument-hint: "[--since YYYY-MM-DD] [--author NAME]"
allowed-tools: Read, Write, Glob, Grep, Bash(git:*), Bash(gh:*), Bash(date:*), Bash(ls:*)
model: inherit
---

## Context

Options: `$ARGUMENTS`

Today: !`date +%Y-%m-%d`  |  Week start: !`date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d`

**Commits this week (all branches):**

!`git log --all --since='7 days ago' --format='  %ad %h %s (%an)' --date=short 2>/dev/null | head -40`

**Pull requests touched this week:**

!`gh pr list --state all --search "updated:>=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d)" --json number,title,state,mergedAt,author --jq '.[] | "  #\(.number) [\(.state)] \(.title)"' 2>/dev/null | head -20`

**Issues closed this week:**

!`gh issue list --state closed --search "closed:>=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d)" --json number,title --jq '.[] | "  #\(.number) \(.title)"' 2>/dev/null | head -20`

**Decision log and research log entries this week:**

!`grep -h "^- $(date +%Y-%m)" DECISIONS.md docs/DECISIONS.md 2>/dev/null | tail -10; grep -c "^## $(date +%Y-%m)" RESEARCH_LOG.md 2>/dev/null | xargs -I{} echo "{} research log entries this month"`

**Previous review's plan:**

!`f=$(ls reviews/*.md docs/reviews/*.md 2>/dev/null | sort | tail -1); [ -n "$f" ] && awk '/^## Next week/{f=1;next} /^## /{f=0} f' "$f" | head -15 || echo "(no previous review)"`

## Task

Write `reviews/<week-end-date>.md` (or the existing reviews directory). Use `--since` to change the window and `--author` to filter commits to one person in a shared repo.

### Structure

```markdown
# Week ending 2026-09-21

## Done
- Shipped: PR #45 workflow-hooks (merged Tue). Evidence: link.
- ...
Grouped by theme, each with its evidence (commit, PR, issue, file). Nothing without evidence.

## Against last week's plan
| Planned | Outcome |
| Finish thesis chapter 2 outline | done (research/OUTLINE.md) |
| Run n=30 sweep | not started; blocked on GPU quota |

## Decisions
- From DECISIONS.md and meeting notes this week, one line each.

## Stalled or overdue
- Action items past due (from meeting notes, the research log's Open section, open PRs with no activity for 5+ days).

## Numbers
Commits, PRs merged, issues closed, notes written, words added to chapters (if a thesis is present, from git diff --shortstat on chapters/).

## Next week
- Three to five outcomes, each with a definition of done and, where useful, a day.
```

### Rules

- Evidence for everything; the review is a record, not a feeling. If the week has little evidence, say so; that is also information.
- Carry over unfinished plan items explicitly with their age.
- Keep it under a page. Detail links out.
- End the reply with the three headline items and the file path. Offer `supervisor-update` or `email-draft` if the review feeds a status message.
