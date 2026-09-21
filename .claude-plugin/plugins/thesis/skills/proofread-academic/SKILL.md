---
name: proofread-academic
description: "Proofread a thesis chapter or paper against a checklist of the errors examiners and reviewers actually flag: structure and signposting, undefined acronyms, notation and terminology consistency, figure and table references, numbers and statistics reporting (n, variance, p, effect sizes), citation placement, tense and voice by section, and mechanical issues, producing a findings list with locations and fixes rather than a rewritten file. Use before sending a draft to a supervisor, before submission, or after merging chapters written weeks apart."
argument-hint: "the file or directory to proofread; optionally the style guide or a list of defined acronyms"
---

Read as the examiner reads, with a pen. This skill produces findings, not a rewrite: the student stays the author, and every change is theirs to make. Report locations as `file:line` (or section and paragraph for Word exports).

## Pass 1: structure

- Does the introduction state the research questions verbatim, and does the conclusion answer each in order?
- Does every chapter open with what it covers and close with what it established?
- Read only the first sentence of every paragraph: is it the claim? Does the sequence make an argument?
- Are headings parallel in form and specific (not "Results" for three chapters in a row)?
- Is anything promised ("Section 4.3 discusses") that does not exist?

## Pass 2: consistency

- **Terms**: one name per concept. Build the list as you read; flag every synonym pair ("model" and "system" for the same thing) with both locations.
- **Acronyms**: defined at first use, then used consistently; not defined twice; not defined in the abstract and never used again. List every acronym with its first definition.
- **Notation**: each symbol means one thing thesis-wide; vectors, sets, and scalars typeset consistently; units consistent (ms throughout, not ms then s).
- **Names**: the proposed system, datasets, and baselines named identically everywhere, including figures and tables.
- **Tense and voice** per section (past for method and prior work, present for results and truths), and one first-person convention throughout.

## Pass 3: figures, tables, equations

- Every figure and table referenced in the text before it appears, by number, with the reference resolving (`??` or "Figure" with no number is a broken ref).
- Captions self-contained: content, conditions, what to notice, what error bars mean and n.
- Axes labelled with units; legends readable; the same series the same colour across figures.
- Tables: units in headers, consistent decimals per column, best result marked if the text says "best".
- Equations numbered if referenced; every symbol introduced in prose near the equation.

## Pass 4: numbers and statistics

- Each number in the text matches its table or figure (spot-check every one; this is where copy errors live).
- Percentages have a base ("23% of 412 sessions"); means have variance and n; comparisons have the test, statistic, p or CI, and effect size where the field expects it.
- No "significant" without a test; no "proves" from an empirical result; no "significantly" as an intensifier.
- Rounding consistent and not beyond measurement precision.

## Pass 5: citations

- Claims about the literature carry a citation; common knowledge does not.
- No citation inside a claim of the student's own contribution.
- A citation supports the specific claim (hand suspicious ones to `citation-verifier` Level 3).
- Citation style consistent (numeric or author-year, not both); "et al." usage per style.
- Bibliography contains only cited works; entries have the fields the style needs (`bibtex-manager` checks this).

## Pass 6: mechanics

- Spelling variant (US or UK) consistent; the department's choice wins.
- Hyphenation consistent ("open-source" adjective, "open source" noun); no em dashes; straight vs curly quotes consistent with the format.
- Latin abbreviations used correctly or replaced (e.g., i.e., et al., cf.), no "etc." in formal prose.
- Sentences over 40 words: flag; nested parentheses: flag; paragraphs over 250 words: flag.
- Widows, orphans, and a heading at the bottom of a page (check the PDF, not the source).
- Front matter complete: title page, abstract, acknowledgements, ToC, lists of figures/tables, acronyms.

## Report

```
# Proofread: chapters/04-results.md (2026-09-21)

Summary: 3 structural, 11 consistency, 6 figure/table, 4 numeric, 2 citation, 9 mechanical.

## Must fix before submission
- 04-results.md:88  "Table 4.3" referenced; file has Tables 4.1 and 4.2 only.
- 04-results.md:130 text says 23.4% reduction; Table 4.2 row 3 shows 24.3%.
- 04-results.md:12  "significantly faster" with no test reported.

## Consistency
- "the proposed system" (12 uses) vs "our tool" (5 uses) vs "FeedbackBot" (3): choose one.
- Acronyms: LLM defined at 02-related.md:14 and again at 04-results.md:20; "SUS" used at 04-results.md:160 never defined.

## Mechanics
- 04-results.md:44 sentence of 58 words.
...
```

Order within each group by location. Cap mechanics at 20 with a count of the rest. Never silently fix; never change the file.

## Attribution

Checklist categories adapted from [proofreading](https://github.com/jakobthumm/proofreading) by jakobthumm (MIT).
