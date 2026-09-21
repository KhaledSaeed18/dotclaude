---
name: research-log
description: "Append a dated entry to the thesis research log (RESEARCH_LOG.md) recording what was read, done, decided, and what comes next, pulling the day's evidence from git history, new reading notes, and the conversation, so progress is never reconstructed from memory before a supervisor meeting. Use at the end of a working session, after a decision, or when asked what happened this week."
argument-hint: "[free text for the entry, or nothing to build it from today's activity]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git:*), Bash(ls:*), Bash(find:*), Bash(date:*)
model: inherit
---

## Context

Today: !`date +%Y-%m-%d`

**Notes added or changed in the last 7 days:**

!`find research/notes -name '*.md' -mtime -7 2>/dev/null | sort || echo "(no research/notes directory)"`

**Commits in the last 7 days:**

!`git log --since='7 days ago' --format='  %ad %s' --date=short 2>/dev/null || echo "(not a git repository)"`

**Working tree:**

!`git status --short 2>/dev/null | head -20`

**Last log entry:**

!`awk '/^## /{n++} n==1' RESEARCH_LOG.md 2>/dev/null | head -40 || echo "(no RESEARCH_LOG.md yet)"`

## Task

Append one entry to `RESEARCH_LOG.md` (create it with a `# Research log` heading if absent). Entries are newest-first, so insert after the title, before the previous entry.

Arguments, if any: `$ARGUMENTS`. Treat them as the student's own summary and fold them in verbatim under the right headings; do not rephrase their words.

### Entry format

```markdown
## 2026-09-21

### Read
- smith2023feedback: one line on what it contributed to the thesis (from the note's "Relation to this thesis").

### Did
- What was built, run, analysed, or written, with paths or commit hashes.

### Decided
- Decisions made, each with the reason and what it rules out. Link to research/QUESTION.md or a note where relevant.

### Open
- Questions for the supervisor, blockers, things that need data or approval.

### Next
- The two or three concrete next actions.
```

### Rules

- Every bullet must be traceable: a note file, a commit, a path, or something the student said in this session. Do not infer activity from silence.
- Omit a heading with nothing under it rather than writing "nothing".
- Keep "Decided" honest: a decision reversed later is recorded as a new decision, not edited out.
- If the "Open" list has items older than two entries, say so in the reply; those need a supervisor.
- After writing, print the new entry and the count of entries in the log.
