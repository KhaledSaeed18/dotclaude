---
name: docx-thesis
description: "Write a thesis in Word without losing the discipline of a source-controlled workflow: author chapters in Markdown or LaTeX, convert with pandoc and a reference .docx that carries the department's styles, manage citations through Zotero with Better BibTeX so the .bib stays the source of truth, and handle the Word-specific submission checks (styles, table of contents, captions, tracked changes). Use when the department requires .docx, the supervisor comments in Word, or a LaTeX draft must become a Word document."
argument-hint: "(optional) the source files, the department template .docx, and the citation style"
---

Word is a delivery format, not an authoring format. Author in plain text under git, convert at the end of each cycle, and treat the `.docx` as a build artifact you regenerate rather than edit. This keeps `citation-verifier`, `humanize`, and the whole pipeline working while the department gets what it asked for.

## Pipeline

```
chapters/*.md  +  references.bib  +  template/reference.docx  +  style.csl
        │
        └── pandoc ──▶ build/thesis.docx
```

1. **Author** each chapter in Pandoc Markdown (`[@key]` citations, `$math$`, `![caption](figures/x.png){#fig:x}`, `Table: caption {#tbl:x}`), or keep LaTeX and let pandoc read it (loses some packages; test early).
2. **Reference document**: open the department's template in Word, or create one with `pandoc -o template/reference.docx --print-default-data-file reference.docx`, then set the styles (Heading 1..3, Body Text, First Paragraph, Caption, Table, Source Code, Bibliography) to the required fonts and spacing. Pandoc copies styles from this file; it ignores its content.
3. **Citation style**: download the CSL for the required style (IEEE, APA 7, Harvard) from the Zotero style repository (`https://www.zotero.org/styles/<name>`) into `style.csl`.
4. **Build**:

   ```bash
   pandoc chapters/*.md \
     --reference-doc=template/reference.docx \
     --citeproc --bibliography=references.bib --csl=style.csl \
     --filter pandoc-crossref \
     --toc --number-sections \
     -o build/thesis.docx
   ```

   `pandoc-crossref` numbers figures, tables, and equations and resolves `@fig:x`. Install with `pip install pandoc-crossref` or the release binary.
5. **Finish in Word** only what pandoc cannot do: the title page from the template, the declaration page, updating the table of contents (right-click, Update field), page numbering sections. Keep a checklist so it is repeatable.

## Zotero

The `.bib` remains the source of truth (`bibtex-manager`). Two ways to keep Zotero in step:

- **Zotero as a view**: import `references.bib` (File → Import), re-import after changes. Simple, one-way.
- **Better BibTeX auto-export**: install Better BibTeX, set its key format to `auth.lower + year + shorttitle(1,1).lower` so keys match the `.bib`, then right-click the thesis collection → Export → Better BibLaTeX with "Keep updated". Zotero becomes the editing UI and the file stays current. Use this when the supervisor shares a Zotero group.

If the supervisor insists on Zotero's Word plugin (live fields in the document), the `.docx` becomes the source for citations and the pipeline above stops applying to that document. Prefer the pandoc route; if the plugin is mandatory, export the bibliography from Zotero to `references.bib` weekly so `citation-verifier` still runs against the text.

## Supervisor comments

Supervisors comment in Word. Extract them so the fixes go back into the Markdown source:

```bash
pandoc --track-changes=all reviewed.docx -t markdown -o reviewed.md
```

Comments appear as `[comment text]{.comment-start}` spans; tracked changes as `{.insertion}` / `{.deletion}`. Apply each to the source, then rebuild. Reply to the comments in the next `RESEARCH_LOG.md` entry so nothing is lost.

## From LaTeX

`pandoc main.tex --bibliography=references.bib --citeproc --csl=style.csl -o build/thesis.docx` handles standard LaTeX. Things that need attention: `\input` (use `--resource-path`), custom macros (define in a `macros.tex` pandoc can read, or `-f latex+raw_tex`), TikZ figures (export to PDF/PNG first), `booktabs` tables (pandoc flattens them; check widths), `\cref` (becomes plain references; pandoc-crossref does not read cleveref).

## Submission checks

- Styles: every heading uses a Heading style (the ToC depends on it); body is one style throughout.
- Captions above tables and below figures per the template; numbered per chapter if required (`--number-sections` and pandoc-crossref's `chapters: true` in the metadata).
- Page count and word count per the regulations (`pandoc --lua-filter wordcount.lua` or Word's count excluding references).
- No tracked changes or comments left: Review → Accept All, delete comments, then Inspect Document.
- PDF/A export if required: File → Save As → PDF → Options → PDF/A.
- Fonts embedded (Word does this for PDF export by default).

Run `citation-verifier` on the Markdown source, not the `.docx`, before every build.
