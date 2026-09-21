---
name: lit-review-synthesis
description: "Build a literature review as an argument from paper-reader notes: cluster the notes into themes, surface agreements, tensions, and methodological patterns, locate the gap the thesis fills, and draft the review chapter so that each paragraph advances a claim rather than summarising one paper. Every citation comes from the notes and the .bib. Use when the reading is done and the related-work or background chapter needs writing, or when a draft review reads like an annotated bibliography."
argument-hint: "(optional) the notes directory, the research question record, and a target length"
---

A literature review is an argument that ends in the gap. It is not a sequence of "Smith (2023) did X. Jones (2024) did Y." Every paragraph makes a point about the field, and papers appear as evidence for that point. This skill works only from `paper-reader` notes so that every sentence about a paper is traceable.

## Inputs

1. `research/notes/*.md` (the notes; refuse to proceed with fewer than five, and say why).
2. `research/QUESTION.md` (the research question the review must lead to).
3. `references.bib` (keys must match note front matter).
4. Target length and the department's expected structure, if any.

## Step 1: build the evidence matrix

Read every note and tabulate, in `research/evidence-matrix.md`:

| key | year | type | setting | method | main finding | limitation | relevance | themes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

The `themes` column is filled in Step 2. This table is a thesis artifact in its own right (appendix material) and lets the student see the field at a glance.

## Step 2: find the structure

Cluster notes into three to six themes. Good themes are claims about the field, not topic labels: "Rule-based feedback scales but does not transfer across assignments" rather than "Rule-based approaches". Test each theme:

- It has at least two papers.
- Its papers can be compared on some dimension (method, setting, result).
- It moves the argument toward the gap.

Then map the tensions: where do papers disagree, and is the disagreement explained by method, setting, or time? Disagreements are the most valuable paragraphs in a review.

Note methodological patterns across the field (everyone uses dataset D; nobody reports variance; evaluations are all with novices). These become the "limitations of prior work" paragraph and often *are* the gap.

## Step 3: outline

Write the outline as claims, one line per paragraph:

```
1. Intro: scope of the review and how sources were found (from search-log.md).
2. Theme A claim. Evidence: smith2023, lee2022. Tension: chen2021 finds the opposite, in setting S.
3. ...
N-1. Methodological limitations across the field.
N. The gap, stated as the research question, and what this thesis does about it.
```

Get the student's agreement on the outline before drafting; restructuring a drafted chapter costs a week.

## Step 4: draft

- Paragraph = claim, evidence, interpretation. The claim sentence has no citation; the evidence sentences do.
- Cite by key only (`\cite{smith2023feedback}` or `[@smith2023feedback]`); never write an author-year string by hand.
- Prefer synthesis sentences that cite several keys ("Three studies in introductory courses report reductions of 20 to 30% \cite{a,b,c}") over one-paper sentences.
- Quote only from a note's *Quotable* section, with its location.
- Every number comes from a note's *Evidence* section, unrounded.
- Hedge to the strength of the evidence, once per claim: "suggests" for one small study, "shows" for replicated results.
- End with the gap paragraph that restates the research question in the field's terms.

## Step 5: check

Run `citation-verifier` on the draft (Level 3 especially), then `humanize`. Report the ratio of synthesis sentences to single-paper sentences; below 1:2 the chapter is still an annotated bibliography.

## Output

`chapters/02-related-work.md` or `.tex` (the student's choice), the evidence matrix, and the agreed outline at the top of the file as a comment.

## Attribution

The argument-first structure is adapted from [lit-review](https://github.com/bethww/lit-review) by bethww (MIT).
