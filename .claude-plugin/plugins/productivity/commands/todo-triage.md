---
name: todo-triage
description: Inventory every TODO, FIXME, HACK, and XXX comment in the codebase, enrich each with age and author from git blame, classify them into actionable buckets (bug risk, missing feature, cleanup, obsolete), and produce a prioritized triage table with recommended dispositions. Pass a path to limit the scan to a directory. Use when technical-debt comments have accumulated and nobody knows which ones still matter.
argument-hint: "[path]"
allowed-tools: Read, Grep, Glob, Bash(git:*)
model: inherit
---

## Context

Scope (optional, defaults to the whole repository): `$ARGUMENTS`

**Marker counts:**

!`grep -rInE "(TODO|FIXME|HACK|XXX)[:( ]" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build . 2>/dev/null | wc -l`

## Task

Turn stale debt comments into decisions. Every marker gets exactly one disposition: fix now, ticket it, keep with a better comment, or delete.

### Step 1: Collect

```bash
grep -rInE "(TODO|FIXME|HACK|XXX)[:( ]" --exclude-dir=node_modules --exclude-dir=.git \
  --exclude-dir=dist --exclude-dir=build .
```

Replace the trailing `.` with the scope path when `$ARGUMENTS` names one. For each hit, capture file, line, marker type, and the comment text. If there are more than ~60, group obviously identical/boilerplate ones and triage the groups.

### Step 2: Enrich with history

For each marker (or group representative), get age and author:

```bash
git blame -L <line>,<line> --porcelain -- <file> | head -3
```

Age matters: a three-year-old TODO next to code that has since been rewritten is usually obsolete; a two-week-old FIXME by the current author is usually real. Read enough surrounding code to judge whether the comment still describes reality.

### Step 3: Classify

Sort every marker into exactly one bucket:

- **Bug risk** - the comment describes incorrect or unsafe behavior that is still present (FIXME on a race, HACK around validation). These are latent defects wearing a comment as a disguise.
- **Missing feature / follow-up** - real work someone deferred; still relevant.
- **Cleanup** - refactors, naming, dead-code notes; valid but low urgency.
- **Obsolete** - the surrounding code changed, the feature shipped, the dependency was replaced; the comment is noise now.

### Step 4: Report

Produce one table, ordered bug risk first, then by age within each bucket:

```
| # | Marker | Location | Age | Author | Comment (condensed) | Bucket | Recommendation |
```

Recommendations are specific: "fix now (5-line change, suggest doing it in this session)", "file an issue titled ...", "delete the comment, superseded by <commit/feature>", "rewrite the comment to say what is actually blocked on". Close with the totals per bucket and offer the two follow-ups you can do immediately: fix the quick bug-risk items, and delete the obsolete comments in one commit.

Do not change any code during triage; the deliverable is the table and the offer.
