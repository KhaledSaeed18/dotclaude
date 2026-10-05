---
name: systematic-review
description: "Run a systematic literature review or mapping study to the PRISMA 2020 standard: protocol with research questions and inclusion criteria written before searching, reproducible search strings per database, screening with recorded reasons for exclusion, a PRISMA flow diagram with counts, quality assessment, data extraction into a form, and synthesis, producing a method section a reviewer can audit. Use when the thesis or a chapter is a literature review, when a supervisor asks for a systematic rather than narrative review, or when a mapping study is the first contribution."
argument-hint: "(optional) the review questions, the databases available, and the date range"
---

A systematic review is an empirical study whose data are papers. It is systematic because every decision (what to search, what to include, what to extract) is written down before it is made and applied the same way to every paper. The write-up reports the process with the same care as an experiment reports its procedure.

## Phase 1: protocol (before searching)

Write `research/slr-protocol.md` and have the supervisor agree to it:

1. **Review questions** (RQ1..n), plus the mapping study's classification questions if applicable (which venues, years, methods, evaluation types).
2. **Scope**: the concept boundaries; what is explicitly out.
3. **Search strategy**: databases (ACM DL, IEEE Xplore, Scopus, Web of Science, plus OpenAlex or Semantic Scholar for coverage; arXiv if preprints count), the search string built from the PICO or concept groups with synonyms, the fields searched (title/abstract/keywords), and the date range with the reason. Plan a snowballing round (backward and forward from the included set) and note it.
4. **Inclusion and exclusion criteria**, each testable from title/abstract or full text: language, peer-reviewed venue, primary study, addresses the concept, reports an evaluation. Number them (I1.., E1..).
5. **Screening procedure**: title/abstract then full text; who screens (the student, with a second screener or the supervisor on a 10 to 20% sample); how disagreements are resolved; agreement statistic to report (Cohen's kappa).
6. **Quality assessment** checklist (for an SLR; a mapping study may skip): clear aims, described method, evaluation present, threats discussed, data available. Score, and decide whether low quality excludes or only weights.
7. **Data extraction form**: the fields to capture from each paper (bibliographic, context, method, evaluation, findings relevant to each RQ). One row per paper, `research/slr-extraction.csv`.
8. **Synthesis method**: narrative synthesis with thematic grouping, vote counting (with its limits stated), or meta-analysis if effects are comparable (rare in CS).

Register the protocol with a date; deviations later are reported as deviations.

## Phase 2: search

Run each string in each database and record, per database: date, exact string as entered, filters applied, and the count. Export results (RIS or BibTeX) and merge with `literature-search`'s deduplication (DOI, then normalised title). Record the count after deduplication. Keep every export file.

## Phase 3: screening

- Title/abstract: apply the criteria; record include/exclude and the criterion number for each exclusion in `research/slr-screening.csv`. The reason matters for the flow diagram and for auditability.
- Full text: obtain PDFs; record papers not retrievable; apply criteria again; record reasons.
- Second screener on the sample; compute and report kappa; resolve disagreements by discussion and record the outcome.
- Snowball from the included set; screen the new candidates the same way; record them as a separate source.

## Phase 4: extraction and quality

Fill the extraction form for every included paper with `paper-reader` notes as the source; record the page or section for each extracted claim. Apply the quality checklist; record scores.

## Phase 5: synthesis

Group by RQ; within each, by the themes the extraction reveals (`lit-review-synthesis` applies). Report counts and distributions for the mapping questions (bubble plots or bar charts via `research-figures`). State what the included set cannot answer.

## Phase 6: report

The method section must contain:

- The protocol summary and its date.
- The search strings per database, verbatim, and the counts.
- The PRISMA 2020 flow diagram with every number: identified per source, duplicates removed, screened, excluded (with reasons and counts), sought for retrieval, not retrieved, assessed for eligibility, excluded (reasons and counts), included; plus the snowballing branch.
- Screening reliability (kappa, sample size).
- The extraction form fields.
- Threats to validity: search coverage (databases and terms missed), selection bias (single screener), extraction errors, publication bias.

Include the full list of included studies as an appendix table and release the screening and extraction sheets as supplementary material.

## Flow diagram

Generate from the counts with the PRISMA 2020 template (R `PRISMA2020` package or the online tool at prisma-statement.org) and place as a figure; do not draw it by hand from memory of the numbers.

## Rules

- No criterion changes after screening starts without recording a protocol deviation.
- No paper included because it is well known; every paper passes the same criteria.
- Counts in the text, the diagram, and the sheets must agree; `thesis-progress` can check this.
