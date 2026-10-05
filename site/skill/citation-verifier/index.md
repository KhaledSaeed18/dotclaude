---
name: citation-verifier
description: "Audit every citation in a chapter, paper, or proposal against the .bib file and the real world: each cite key must exist, each entry must resolve to a live DOI or arXiv record whose title, authors, and year match, and each claim attributed to a source must be supported by that source's note or text. Reports unverified, mismatched, and unsupported citations with the fix. Use before sending a draft to a supervisor, before submission, or whenever text was drafted with AI assistance and a fabricated reference would be fatal."
argument-hint: "path to the .tex, .md, or .docx chapter; optionally the .bib and the notes directory"
---

A fabricated or misattributed citation is the one error a thesis cannot survive. This skill treats every citation as unverified until three checks pass: the key exists, the entry is real, and the claim is supported.

## Level 1: every key exists

1. Extract cite keys from the document:
   - LaTeX: `\cite{a,b}`, `\citep`, `\citet`, `\parencite`, `\textcite`, `\autocite`, `\footcite`, and starred/optional-argument forms.
   - Markdown/Pandoc: `[@key]`, `[@a; @b, p. 3]`, `@key`.
   - Word: extract with `pandoc file.docx -t markdown` and look for Zotero fields or `(Author, Year)` strings; match those against `.bib` `author`+`year`.
2. Parse the `.bib` keys (`^@\w+\{([^,]+),`).
3. Report keys cited but not defined (hard error) and entries defined but never cited (informational; the bibliography should usually contain only cited works).

## Level 2: every entry is real

For each cited entry:

1. If it has a `doi`: `curl -s "https://api.crossref.org/works/<doi>"` and compare title (normalised), first author surname, and year. A DOI that returns 404 is fabricated or mistyped: search CrossRef by title to find the real one and report both.
2. If it has an arXiv `eprint`: `curl -s "http://export.arxiv.org/api/query?id_list=<id>"` and compare title and first author.
3. If it has only a URL: `curl -sI <url>` returns 2xx/3xx; flag as weakly verified.
4. If it has none of these: `curl -s "https://api.crossref.org/works?query.bibliographic=<title>&rows=3"` and report whether a plausible match exists. Until it does, the entry is **unverified**.

Rate-limit to one request per second per host. Cache results in `research/.citation-cache.json` keyed by DOI so re-runs are fast.

A mismatch in title or author is reported as **mismatched**, with the fetched metadata beside the `.bib` entry, because it usually means the wrong DOI was attached to the right paper (or the right DOI to a paraphrased title).

## Level 3: every claim is supported

This is the check that catches "the paper says X" when it does not. For each citation in context:

1. Take the sentence (or list item) that carries the cite and the claim it makes.
2. Open the matching note in `research/notes/` (joined by `key` in the note's front matter). If there is a note, check whether the claim appears under *One-sentence claim*, *Evidence*, or *Quotable*. If there is no note, say so; the student should run `paper-reader` before citing.
3. Classify: **supported** (the note contains it), **plausible but unverified** (the note is silent), **contradicted** (the note's Limitations or Evidence say otherwise), or **overclaimed** (the note supports a weaker version, e.g. "improves" cited as "solves").
4. For a quotation, the exact text must appear in the note's *Quotable* section or in the source text; otherwise it is an **unverified quote**.

## Report

Write `research/citation-report.md` and summarise in the reply:

```
# Citation report: chapters/02-related-work.tex (2026-09-21)

Cited keys: 41   Defined: 58   Missing keys: 1   Unused entries: 17
Verified: 36   Mismatched: 2   Unverified: 3   Claim checks: 30 supported, 8 unverified, 2 overclaimed, 1 contradicted

## Must fix
- `lee2022grading` is cited (line 112) but not in references.bib.
- `chen2021code`: DOI 10.1145/9999999 returns 404. CrossRef title search finds "..." with DOI 10.1145/3468264.3468563; confirm and replace.
- Line 87 cites `smith2023feedback` for "reduces grading time by half"; the note records a 23% reduction (Table 4). Overclaimed.

## Should check
- ...
```

Ordering: missing keys and dead identifiers first (they fail compilation or expose fabrication), then contradictions and overclaims, then the unverified.

## Rules

- Never "repair" a citation by inventing a DOI, year, or venue. Report and propose; the student confirms.
- Never mark a claim supported because it sounds right. Supported means the note or source text contains it.
- Re-run before every submission. The `citation-guard` hook does Level 1 continuously on every edit; this skill does the rest.
