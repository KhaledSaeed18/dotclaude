---
name: academic-writing
description: "Write or revise thesis and paper prose section by section (abstract, introduction, related work, method, results, discussion, conclusion) with the conventions of computer-science writing: claim-first paragraphs, tense and voice by section, hedging matched to evidence, signposting, defined terms, and figures and tables that carry their own argument. Works from the student's outline and notes and never invents a result or a citation. Use when drafting a chapter, when a supervisor says a section is unclear or unstructured, or when turning results into a discussion."
argument-hint: "(optional) the section to write or revise, and the file, outline, or notes to work from"
---

Academic prose has one job: let a sceptical reader check a claim. Every device below exists for that reader. Write for the examiner who will read chapter 4 at 11pm looking for a reason to ask a hard question at the defence.

## Before writing a section

1. Read the research question record and the outline for the chapter. If neither exists, ask for the section's purpose in one sentence; do not start from a blank page.
2. Read the notes or results the section must draw on (`research/notes/`, result tables, figures). Everything you state must be traceable to one of them or to the student.
3. Confirm the target: length, the department's style guide, the citation style, and whether the document is LaTeX or Word (this changes how you write cross-references and citations, never what you write).

## Section by section

**Abstract** (150 to 300 words, written last): context in one sentence; the problem or gap; what was done (method, scale); the main result with a number; what it means. No citations, no abbreviations undefined, no "this thesis is organised as follows".

**Introduction**: the problem and why it matters now; the gap in one paragraph with two or three citations; the research questions verbatim; the contributions as a short list, each a noun phrase a reader could check; the thesis structure in three sentences. Length: 5 to 8% of the thesis.

**Related work / background**: comes from `lit-review-synthesis`; every paragraph opens with a claim about the field and ends by relating it to this thesis. The last paragraph is the gap.

**Method**: what was done, precisely enough to replicate. Past tense, passive voice acceptable ("the data were collected"), but name the agent when it matters ("the author labelled the samples"). Subsections follow the sub-questions. Design decisions get one sentence of justification each, with the alternative rejected. Threats to validity live here or in a dedicated section, never omitted.

**Results**: what was observed, without interpretation. Each table and figure is introduced by a sentence that says what to look at ("Table 4 shows that variant B halves latency at all input sizes"), followed by the exact numbers, then the caveat. Report variance (standard deviation, confidence interval, number of runs). Present tense for what the data show.

**Discussion**: what the results mean for each research question, in order; comparison with the literature (agreement, disagreement, and why); limitations, honestly and specifically; implications. This is where interpretation lives, and where the hedges are earned.

**Conclusion**: answer each research question in one or two sentences; restate the contributions; future work as concrete next studies, not a wish list.

## Paragraph and sentence rules

- **Claim first.** The first sentence of a paragraph is what the paragraph shows. A reader skimming first sentences should get the argument.
- **One idea per paragraph**, four to eight sentences. A paragraph of one sentence is a heading in disguise; a paragraph of fifteen is two paragraphs.
- **Signpost** transitions with meaning ("Because the baseline ignores ordering, ...") rather than with connectives ("Furthermore, ...").
- **Hedge to the evidence, once.** "Suggests" for one small study, "indicates" for consistent results, "shows" for a replicated or definitive result. Never stack ("may possibly suggest").
- **Define every term** at first use and use it identically afterwards. Synonyms in academic writing read as different concepts.
- **Numbers**: exact, with units and precision matching the measurement; "about 40%" only when the exact figure appears in a table nearby.
- **Tense**: past for what was done and what prior work did; present for what is true and what the data show; future only in the proposal.
- **Voice**: "this thesis", "the study", "we" or "I" per department convention, consistently. Never "the researcher".
- **Citations** are keys only (`\cite{key}` or `[@key]`); never write author-year by hand. Cite for a claim about the literature or a borrowed method, not for common knowledge.
- **No em dashes.** Commas, colons, parentheses, or a new sentence.

## Figures and tables

A figure or table must make sense from its caption alone: what is shown, the conditions, what the reader should notice. Number sequentially, refer to each in the text before it appears, and keep units in headers, not cells. Prefer a table for exact values and a figure for trends. Use `research-figures` to produce them.

## Before returning a section

1. Read the first sentence of every paragraph in order; it should read as an outline.
2. Run `citation-verifier` Level 1 (every key exists).
3. Run `humanize` with the academic exemptions.
4. List what the section still needs from the student marked `[[FILL]]`: a number not yet measured, a supervisor decision, a citation to find.

## Attribution

The section conventions draw on Kristin Sainani's "Writing in the Sciences" (Stanford) as encoded in [writing-in-the-sciences-skill](https://github.com/jingkarqi/writing-in-the-sciences-skill) (MIT); the CS specifics are this repository's.
