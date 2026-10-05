---
name: thesis-chapter
description: "Draft or revise one thesis chapter from the outline, the research question record, the reading notes, and the results, applying the academic-writing skill section by section and finishing with citation verification and a humanize pass, so a chapter arrives structured, traceable, and free of invented references. Use when a chapter is due, when starting a chapter from an approved outline, or when a draft chapter needs a full revision pass."
argument-hint: "<chapter number or file> [--revise] [--length WORDS]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git:*), Bash(ls:*), Bash(find:*), Bash(wc:*), Bash(texcount:*), Bash(pandoc:*), Bash(curl:*)
model: inherit
---

## Context

Target: `$ARGUMENTS`

**Chapters present:**

!`ls chapters 2>/dev/null || ls *.tex *.md 2>/dev/null | head -20 || echo "(no chapters directory)"`

**Research question record (head):**

!`head -40 research/QUESTION.md 2>/dev/null || echo "(no research/QUESTION.md; run research-question first)"`

**Notes available:**

!`ls research/notes 2>/dev/null | wc -l | xargs -I{} echo "{} notes in research/notes/"`

**Bibliography:**

!`ls *.bib references/*.bib 2>/dev/null | head -3 || echo "(no .bib found)"`

## Task

Produce or revise the chapter named in the arguments. A chapter is written once, in full, from an agreed outline; it is not written in fragments across sessions, because the argument has to hold across sections.

### Step 1: Establish the inputs

- Resolve the target to a file (`chapters/04-results.tex`, `chapters/04-results.md`, or a new file following the existing naming). With `--revise`, read the current chapter in full first.
- Read `research/QUESTION.md`; identify which research questions this chapter serves.
- Read the outline for the chapter (a comment block at the top of the file, `research/OUTLINE.md`, or the proposal's chapter plan). If there is no outline, write one as a list of claims, one per intended paragraph, show it, and stop for agreement before drafting.
- Read every note in `research/notes/` marked relevant to this chapter, and any results files or tables it must present.

### Step 2: Draft or revise

Apply `academic-writing` for the section types in this chapter. Constraints:

- Every paragraph starts with its claim.
- Every citation is a key that exists in the `.bib`; the `citation-guard` hook reports misses as you write. Never add a key that is not in the file; leave `[[CITE: what is needed]]` for the student.
- Every number comes from a results file or a note, with its source in a comment (`% from results/latency.csv row 12` or `<!-- ... -->`).
- Figures and tables are referenced by label before they appear; missing ones are placeholders `[[FIG: what it should show]]` so `research-figures` can produce them.
- Match the document's format: LaTeX (`\section`, `\cite`, `\cref`) or Pandoc Markdown (`#`, `[@key]`, `@fig:x`).
- With `--length`, aim within 10% of the target; otherwise use the chapter plan's target or the department norm.
- With `--revise`, keep the student's sentences where they work; change structure and wording only where the section rules require it, and list what changed.

### Step 3: Verify

1. Run `citation-verifier` Level 1 on the file (keys exist); report any misses.
2. Run `humanize` in file mode with the academic exemptions.
3. Word count (`texcount -inc file.tex` or `pandoc file.md -t plain | wc -w`).

### Step 4: Report

- Path written, word count against target.
- Research questions addressed and where.
- All `[[FILL]]`, `[[CITE]]`, and `[[FIG]]` placeholders with line numbers.
- Suggested next: `thesis-reviewer` on the chapter, then `/research-log`.
