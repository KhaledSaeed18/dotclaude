---
name: bibtex-manager
description: "Maintain the thesis .bib file as a single source of truth: fetch verified BibTeX from a DOI, arXiv id, or title via CrossRef and arXiv, normalise citation keys (firstauthorYEARkeyword), deduplicate entries, fix fields BibTeX and biblatex care about, and export to Zotero-friendly form when the writing happens in Word. Use when adding references, cleaning a messy bibliography, resolving duplicate keys, or converting a reading list into a .bib."
argument-hint: "(optional) a DOI, arXiv id, title, or path to a .bib or reading-list.md"
---

The `.bib` file is the one place a reference is allowed to exist. Every `\cite{}` in LaTeX, every `[@key]` in Markdown, and every Zotero item in Word traces back to an entry here that was fetched from an authority, never typed from memory.

## Add an entry

1. **Resolve the identifier to metadata from an authority.** Never write an entry by hand from a memory of the paper.
   - DOI: `curl -sL -H "Accept: application/x-bibtex" "https://doi.org/<doi>"` gives publisher BibTeX. Cross-check title and year against `https://api.crossref.org/works/<doi>`.
   - arXiv id: `curl -s "http://export.arxiv.org/api/query?id_list=<id>"` and build a `@misc` (or `@article` with `journal = {arXiv preprint arXiv:<id>}`) with `eprint`, `archivePrefix = {arXiv}`, `primaryClass`. If the paper was later published, prefer the published DOI and keep the arXiv id in `eprint`.
   - Title only: `https://api.crossref.org/works?query.bibliographic=<title>&rows=3`, confirm the top hit's title matches before taking its DOI; if it does not, tell the student rather than guessing.
2. **Normalise the key** to `<firstauthorsurname><year><firstsignificanttitleword>`, lowercase ASCII (`smith2023feedback`). Collisions get a letter suffix (`smith2023feedbacka`). Keep the student's existing key convention if the file already has one.
3. **Clean the fields.** Read [reference/fields.md](reference/fields.md). In short: protect capitals in titles with braces (`{LLM}`, `{Python}`), use `and` between authors, ISO-free `year`/`month`, `doi` without the `https://doi.org/` prefix, `url` only when there is no DOI, no `abstract` or `keywords` noise unless the student wants them, page ranges with `--`.
4. **Choose the entry type** from the source, not the venue name: `@inproceedings` for conference papers (with `booktitle`), `@article` for journals (`journal`, `volume`, `number`, `pages`), `@book`, `@incollection`, `@phdthesis`, `@techreport`, `@misc` for preprints and web pages (`howpublished`, `note = {Accessed YYYY-MM-DD}`).
5. **Append** to the `.bib` (default `references.bib` or the path in the thesis config), keeping the file sorted by key if it already is.

## Clean an existing file

Run these checks and report before changing anything:

- Duplicate DOIs or near-duplicate titles (normalised, first 60 chars): merge, keep the richest entry, note which key was removed so the text can be updated.
- Keys that do not match the convention: propose renames; apply only with `--rename`, and then update every `\cite`/`[@…]` in the source files the student names.
- Missing required fields per type (see the reference): list them; fetch from CrossRef when a DOI is present.
- Unprotected capitals in titles, `&` unescaped in `booktitle`, `pages` with a single hyphen, `month` as a number in quotes.
- Entries with no DOI, arXiv id, or URL: flag as unverifiable so `citation-verifier` can chase them.

## From a reading list

Given `reading-list.md` from `literature-search`, add every entry via step 1 using its DOI or arXiv id, and write a mapping `key -> title` at the end of the reply so `paper-reader` notes can use the same keys.

## Zotero and Word

When the thesis is written in Word with Zotero:

- Import the `.bib` into Zotero (File → Import) or install Better BibTeX and set the `.bib` as an auto-export of the thesis collection, so the file remains the source of truth and Zotero is the view.
- Match Better BibTeX's key pattern to the convention above (`auth.lower + year + shorttitle(1,1).lower`) so keys are identical in both worlds.
- Never edit an entry only in Zotero; fix the `.bib` and re-import.

## Rules

- No entry without an identifier that resolved today. If the student insists on an unresolvable source (a lecture, an internal report), it goes in as `@misc` with a `note` explaining the provenance, and is listed in the reply as unverified.
- Never delete an entry without saying which citations in the text will break.
- Preserve the student's manual field additions (`annote`, `file`) when rewriting an entry.
