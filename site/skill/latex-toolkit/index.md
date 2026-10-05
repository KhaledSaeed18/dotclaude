---
name: latex-toolkit
description: "Set up, build, and debug a LaTeX thesis: project layout with one file per chapter, latexmk builds, biblatex or natbib bibliography wiring, university template adoption, compile-error diagnosis from the .log (undefined control sequence, missing $, overfull boxes, undefined citations), cross-references, figures and tables, and the packages worth using. Use when starting a LaTeX thesis, when a build fails, when references show as question marks, or when adopting a department template."
argument-hint: "(optional) the error text, the .log path, or what to set up"
---

LaTeX problems fall into two kinds: a build that fails (read the log, fix the first error, rebuild) and a document that builds wrong (question marks, misplaced floats, broken references). Both are diagnosed from the `.log`, never by guessing at the source.

## Project layout

```
thesis/
  main.tex            \documentclass, packages, \input of chapters
  preamble.tex        packages and macros, nothing else
  chapters/01-introduction.tex ...
  figures/            vector PDFs or high-dpi PNGs, one per figure
  tables/             generated .tex tables (from scripts, never hand-typed numbers)
  references.bib      the bibliography (bibtex-manager owns it)
  latexmkrc           build settings
  .gitignore          *.aux *.bbl *.blg *.log *.out *.toc *.lof *.lot *.fls *.fdb_latexmk *.synctex.gz
```

One file per chapter, `\input{chapters/01-introduction}` from `main.tex`. `\includeonly{chapters/04-results}` speeds up iteration on one chapter.

## Build

Use latexmk; it runs pdflatex/biber/pdflatex the right number of times:

```bash
latexmk -pdf -interaction=nonstopmode -file-line-error main.tex
latexmk -pdf -pvc main.tex      # rebuild on save
latexmk -C                       # clean everything
```

`latexmkrc`:

```perl
$pdf_mode = 1;
$bibtex_use = 2;            # run biber/bibtex when needed
$pdflatex = 'pdflatex -interaction=nonstopmode -file-line-error -synctex=1 %O %S';
```

Prefer `pdflatex` unless the template needs `xelatex`/`lualatex` (system fonts, Arabic or CJK text); then `$pdf_mode = 5` (xelatex) or `4` (lualatex).

## Bibliography

biblatex with biber is the modern default and handles Unicode, DOIs, and URLs cleanly:

```latex
\usepackage[backend=biber,style=ieee,sorting=none]{biblatex}   % or style=apa, authoryear
\addbibresource{references.bib}
...
\printbibliography
```

natbib (`\citep`, `\citet`, `\bibliographystyle{plainnat}`, `\bibliography{references}`) when the template requires it. Never mix the two. Question marks for citations mean biber/bibtex has not run or the key is missing: run the full latexmk build, then check `main.blg` for "I didn't find a database entry for".

## Reading the log

Always fix the **first** error; later ones are usually consequences. Search the `.log` for `!` at line start, or use `-file-line-error` so errors read `./chapters/03-method.tex:42: Undefined control sequence`.

| Message | Usual cause | Fix |
| --- | --- | --- |
| `Undefined control sequence` | typo in a macro, or the package providing it is not loaded | check spelling; add `\usepackage{...}`; look at the line shown |
| `Missing $ inserted` | math symbol (`_`, `^`, `\alpha`) outside math mode, or an unescaped `_` in text/URL | wrap in `$...$` or escape `\_`; use `\url{}` for URLs |
| `File ... not found` | wrong path or extension for `\input`, `\includegraphics`, `\addbibresource` | paths are relative to `main.tex`; omit the extension for `\input` |
| `LaTeX Error: Environment ... undefined` | missing package (`algorithmic`, `subcaption`, `listings`) | load it in the preamble |
| `Citation ... undefined` (warning) | key not in `.bib`, or bibliography step not run | run latexmk fully; `citation-guard` catches missing keys |
| `Reference ... undefined` (warning) | `\ref` before the label, or a label inside a float before its `\caption` | put `\label` after `\caption`; rebuild twice |
| `Overfull \hbox` (warning) | a long word, URL, or table wider than the text width | `\sloppy` locally, `\url`, `\resizebox`, `tabularx`, or rephrase |
| `Too many unprocessed floats` | many figures in a row with no text | `\clearpage`, or `[H]` from `float` sparingly |
| `Package biblatex Warning: Please (re)run Biber` | stale `.bbl` | `latexmk` does this; if by hand, `biber main` then pdflatex twice |
| `! LaTeX Error: Option clash for package` | same package loaded twice with different options | load once, in the preamble, before the template's own load |

When the log is huge, filter: `grep -n -A3 '^!' main.log | head -40`.

## Packages worth loading

`geometry` (margins per template), `graphicx`, `booktabs` (tables that look printed), `siunitx` (numbers and units, aligned decimals), `subcaption`, `cleveref` (`\cref{}` writes "Figure 3" for you; load last), `hyperref` (load before cleveref, after everything else), `microtype`, `csquotes` (with biblatex), `listings` or `minted` (code; minted needs `-shell-escape` and Pygments), `algorithm2e` or `algpseudocode`, `todonotes` (drafting only), `glossaries` or `acronym` (acronyms defined once).

## Templates

Department templates come as a `.cls` or a `.sty` plus an example. Keep the template unmodified in the repo, put customisations in `preamble.tex`, and check what the class already loads (`grep RequirePackage thesis.cls`) before loading packages again. If the template hard-codes `bibtex`, use natbib; do not fight it a week before submission.

## Figures and tables

- Figures as PDF (vector) from matplotlib (`savefig('x.pdf')`) or SVG converted with `inkscape --export-type=pdf`; PNG at 300 dpi only for raster content.
- Width in text units: `\includegraphics[width=0.8\linewidth]{figures/x.pdf}`.
- Tables generated by scripts into `tables/*.tex` and `\input`; `booktabs` rules (`\toprule`, `\midrule`, `\bottomrule`), no vertical lines, units in headers, `siunitx` `S` columns for numbers.
- Captions below tables and figures alike unless the template differs; `\label` after `\caption`.

## Word count and progress

`texcount -inc -total main.tex` counts words excluding markup; `thesis-progress` uses it.

## Overleaf

Overleaf projects sync with git (`git clone https://git.overleaf.com/<id>`). Keep the same layout; Overleaf runs latexmk with the main file set in the menu. Keep `references.bib` as the source of truth in git and let Overleaf read it; do not let two people edit the `.bib` in the browser.

## Attribution

The error table draws on [awesome-latex-skills](https://github.com/calix-l/awesome-latex-skills) (MIT); the layout and build conventions are this repository's.
