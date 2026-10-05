---
name: supervisor-update
description: "Turn the research log and recent work into a concise supervisor update or meeting agenda: progress since the last meeting with evidence, decisions taken and their reasons, results with numbers, blockers with the specific help needed, and the next steps with dates, in under a page. Use before a supervisor meeting, when asked for a progress email, or at a milestone."
argument-hint: "(optional) since when, the meeting date, and email or agenda format"
---

Supervisors read updates between other things. The update's job is to let them help in the ten minutes they have: what moved, what is stuck, what decision they need to make. Everything else is noise.

## Sources

1. `RESEARCH_LOG.md` entries since the last meeting (or the period asked for). The log is the evidence; if it is thin, say so and ask the student what happened.
2. Git history for the period (`git log --since`), new files under `research/notes/`, changed chapters.
3. The last update or meeting notes, to answer what was promised.

## Structure

```
Subject: Thesis update, 21 Sep 2026

Since 7 Sep:
- Read 6 papers on X (notes in research/notes/); the gap holds: none evaluates Y in setting Z.
- Built the data pipeline (commit a1b2c3d); 412 sessions collected, 9 discarded for missing labels.
- First results: variant B reduces latency 23% (n=10, SD 4%) at all sizes, table attached.

Decided:
- Dropped baseline C: its code does not run on our data format and reimplementing costs two weeks. Comparing against A and D only.

Need from you:
- Is a 23% reduction with n=10 enough for RQ2, or should I run n=30 (adds three days)?
- Ethics amendment for the follow-up survey: can you sign the form (attached) by Thursday?

Next two weeks:
- Run the n=30 sweep if agreed (by 28 Sep).
- Draft results chapter section 4.2 (by 3 Oct).
- Literature synthesis outline for chapter 2 (by 5 Oct).

Open questions carried over: 1 (dataset licence; waiting on the provider since 30 Aug).
```

## Rules

- Under 250 words for an email; under one page for an agenda.
- Every progress bullet has evidence: a path, a commit, a number, a note. No "worked on the literature review".
- Decisions include the reason and what they rule out, so the supervisor can object now, not at the defence.
- "Need from you" is the most important section and comes before "Next"; each item is a question or a concrete action with a date.
- Carry over open items until they are resolved, with their age; a supervisor sees a stuck item precisely because it keeps appearing.
- Match the department's register: formal salutation or not, first name or title, as in previous correspondence.
- Attach or link, never paste, tables and figures.
- Run `humanize` before sending.

Write to `research/updates/YYYY-MM-DD.md` and return the text. Log the update itself as a `/research-log` entry if the student agrees.
