---
name: paper-reader
description: "Read one paper (PDF, arXiv id, DOI, or text) and produce a structured note: the claim, method, evidence, limitations, how it relates to the student's research question, and quotable passages with locations, so that lit-review-synthesis can build an argument from many notes. Use when working through a reading list, when a supervisor asks what a paper actually shows, or before citing a paper for a specific claim."
argument-hint: "path, DOI, or arXiv id of the paper; optionally the research question to read it against"
---

Read the paper, not the abstract. The note you produce will be trusted later, when the student is writing under deadline and will not reopen the PDF, so every claim in the note must be traceable to a page or section.

## Get the text

- A local PDF: extract text (`pdftotext -layout file.pdf -`), and read the figures and tables where the text is unclear.
- An arXiv id: fetch the LaTeX source when available (`https://arxiv.org/e-print/<id>`, a gzipped tar) because it keeps equations and tables intact; otherwise the PDF (`https://arxiv.org/pdf/<id>`).
- A DOI: resolve it to metadata with CrossRef, then ask the student for the PDF if it is not open access. Do not summarise a paper from its abstract and pretend it was read.

## Read in this order

1. Abstract, introduction, conclusion: what the authors *claim*.
2. Method and setup: what they *did*, precisely enough to judge the claim.
3. Results, including tables: what the evidence *shows*, including what it does not show.
4. Related work and limitations: where they place themselves and what they concede.
5. References: which works they lean on (candidates for `citation-graph`).

## The note

Write one markdown file per paper under `research/notes/`, named `<firstauthor><year>-<short-title>.md`, with the BibTeX key in the front matter so `citation-verifier` and `lit-review-synthesis` can join them:

```markdown
---
key: smith2023feedback
title: ...
authors: ...
year: 2023
venue: ...
doi: 10.xxxx/yyyy
type: empirical | design | survey | theory | position
read: 2026-09-21
relevance: high | medium | low
---

## One-sentence claim
What the paper says it shows, in your words.

## Research question it answers
Their question, and which of the student's sub-questions it bears on.

## Method
Design, data (source, size), procedure, metrics, baselines. Enough to judge validity.

## Evidence
The key results with numbers, and the table or figure each comes from (Table 3, Fig. 2).
What was not tested.

## Limitations
Theirs (from the paper) and yours (what you noticed).

## Relation to this thesis
Supports / contradicts / extends / provides method for: which claim of the student's, and how.

## Quotable
> "exact sentence" (p. 4, Sec. 3.2)
At most five. Exact text, with location, for use in the review.

## Follow-up
References worth chasing, with the reason.
```

## Rules

- Distinguish what the paper *claims* from what its evidence *supports*; when they differ, say so in Limitations.
- Numbers are copied, not rounded or recalled. If a number is unreadable in the extraction, write `[unreadable, check Table N]`.
- Never invent a page number. If the source is LaTeX or HTML with no pagination, cite the section.
- The note is in the student's voice for the student's purpose; "relevance: low" is a valid and useful outcome.
- When reading several papers, do not compare them here; that is `lit-review-synthesis`. One paper, one note.
