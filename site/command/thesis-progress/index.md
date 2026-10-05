---
name: thesis-progress
description: "Report where the thesis stands in numbers: word count per chapter against the plan, placeholders left ([[FILL]], [[CITE]], [[FIG]]), citation health (cited keys, undefined keys, unverifiable entries), notes read versus reading list, open items in the research log, and days to the next deadline. Use at the start of a working session, before a supervisor meeting, or whenever the answer to how far along am I is a guess."
argument-hint: "[--deadline YYYY-MM-DD] [--target-words N]"
allowed-tools: Read, Glob, Grep, Bash(git:*), Bash(ls:*), Bash(find:*), Bash(wc:*), Bash(grep:*), Bash(date:*), Bash(texcount:*), Bash(pandoc:*)
model: inherit
---

## Context

Options: `$ARGUMENTS`

Today: !`date +%Y-%m-%d`

**Chapter files:**

!`ls chapters/*.tex chapters/*.md 2>/dev/null || echo "(no chapters directory)"`

**Raw word counts (markup included; refine below):**

!`wc -w chapters/*.tex chapters/*.md 2>/dev/null | tail -20`

**Placeholders:**

!`grep -rn --include='*.tex' --include='*.md' -E '\[\[(FILL|CITE|FIG|TODO)[^]]*\]\]' chapters 2>/dev/null | wc -l | xargs -I{} echo "{} placeholders"`

**Reading:**

!`echo "notes: $(ls research/notes 2>/dev/null | wc -l | tr -d ' '), reading list entries: $(grep -c '^## ' research/reading-list.md 2>/dev/null || echo 0)"`

**Research log:**

!`grep -c '^## ' RESEARCH_LOG.md 2>/dev/null | xargs -I{} echo "{} entries"; awk '/^### Open/{f=1;next} /^###|^## /{f=0} f' RESEARCH_LOG.md 2>/dev/null | head -10`

**Recent activity:**

!`git log --since='14 days ago' --format='  %ad %s' --date=short 2>/dev/null | head -15`

## Task

Produce a one-screen status report. Numbers, not adjectives.

### Word counts

Use `texcount -inc -total -brief` for LaTeX or `pandoc file -t plain | wc -w` for Markdown so markup is excluded. Compare each chapter against its target from the chapter plan (proposal, `research/OUTLINE.md`, or `--target-words` split evenly). Show a table: chapter, words, target, percent, placeholders.

### Citation health

Count unique cite keys across chapters, keys not in the `.bib`, and `.bib` entries with no `doi`/`eprint`/`url`. If `research/citation-report.md` exists, show its date and totals; if it is older than the newest chapter edit, say a rerun of `citation-verifier` is due.

### Reading

Notes written versus reading-list entries; list entries with no note as the reading backlog (cap at 10).

### Open items

The "Open" bullets from the last three log entries, with the age of each (from the entry date). Anything older than 14 days is flagged for the supervisor.

### Time

Days to `--deadline` (or a deadline found in the proposal or `research/QUESTION.md`). Words remaining divided by days remaining gives the required daily rate; state it, and compare with the actual rate from git history over the last 14 days (words added per day, from `git diff --shortstat`).

### Output

```
# Thesis progress, 2026-09-21

| Chapter | Words | Target | % | Placeholders |
| --- | --- | --- | --- | --- |
| 01 Introduction | 2,140 | 3,000 | 71 | 2 |
...
| Total | 14,230 | 30,000 | 47 | 11 |

Citations: 84 keys cited, 2 undefined (ghost2024, lee2022b), 3 unverifiable. Last verifier run: 2026-09-14 (rerun due).
Reading: 31 notes / 44 on the list; backlog: ...
Open items: 3, oldest 19 days (dataset licence) → raise with supervisor.
Deadline 2026-12-15: 85 days. Need 185 words/day; last 14 days averaged 310/day.

Next: ...
```

End with the two or three actions the numbers point to.
