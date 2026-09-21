---
name: thesis-proposal
description: "Draft or revise a master's thesis proposal from a research question record, reading notes, and the department's template: problem statement, gap, research questions, method, evaluation, timeline, risks, and a chapter plan, in the student's own claims with citations only to sources they actually have. Use when a proposal is due, a supervisor asks for a written plan, or the research question is settled and needs a structured document around it."
argument-hint: "(optional) path to the research question record and any template or existing draft"
---

Produce a proposal a supervisor can approve: specific about what will be done, honest about what is uncertain, and short. A proposal is a contract for the coming months, not a literature review; every section exists to let a reader judge feasibility and value.

## Inputs to gather first

Read before writing. Ask only for what is missing:

1. The research question record (`research/QUESTION.md` or wherever `research-question` wrote it). If none exists, run that skill's process first; do not invent a question.
2. The department's proposal template or page limit, if any. Follow its section names exactly. A proposal that ignores the template gets sent back on form before anyone reads the content.
3. Reading notes produced by `paper-reader` (`research/notes/*.md`) and the `.bib` file. **Cite only sources present there.** A proposal with an invented reference is worse than one with a gap.
4. Constraints: submission date, defence date, supervisor meeting cadence, available compute or data, ethics requirements.

## Structure (adapt names to the template)

1. **Title**: descriptive, no colon-subtitle unless the template expects one, under 15 words.
2. **Problem statement** (one to two paragraphs): the practical or scientific problem, who has it, why it matters now. Concrete, with one or two figures or citations that show the problem is real.
3. **Background and gap** (one page): the three to six most relevant lines of prior work, what they established, and the specific thing they leave open. This is a targeted argument for the gap, not a survey; the full literature review is a chapter, not a proposal section.
4. **Research questions**: the primary question and sub-questions, verbatim from the record.
5. **Method**: for each sub-question, what will be done to answer it. Name the design (experiment, case study, design science, survey, systematic review), the data (source, size, access status), the procedure, and the analysis. State what would count as a negative result.
6. **Evaluation and validity**: how results will be judged, what the threats to validity are (internal, external, construct, conclusion) and what is done about each.
7. **Expected contribution**: one paragraph, the same sentence as the record expanded with what artifacts result (a dataset, a tool, a model, a set of findings).
8. **Timeline**: a table of phases with start and end weeks, milestones, and the supervisor checkpoints. Back-load writing time: at least the final quarter is writing and revision. Include the buffer explicitly.
9. **Risks**: table of risk, likelihood, impact, mitigation. Data access and ethics approval are almost always the top two.
10. **Chapter plan**: chapter titles with one line each and a target page count. Total should match the department norm (often 60 to 100 pages for a master's).
11. **References**: only entries in the `.bib`.

## Writing rules

- Present tense for what the thesis will establish, future tense for what will be done, past tense for prior work.
- The student is the author. Write "this thesis", "the study", or "I/we" per the department convention; never "the AI" or "the assistant".
- No hedging stacks. One "may" per claim at most. Uncertainty goes in the risks table, not in every sentence.
- Every method claim must be executable: "compare A and B on dataset D using metric M with N runs" rather than "evaluate the approach".
- Run `humanize` on the draft before returning it.

## Output

Write to the path the student names (default `research/PROPOSAL.md`, or `.tex` if the template is LaTeX). Return a short list of open items the student must fill in personally (supervisor name, ethics reference number, exact deadlines) marked with `[[FILL]]` in the document.
