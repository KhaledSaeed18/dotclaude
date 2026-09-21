# BibTeX and biblatex fields that matter

## Required and useful fields by type

| Type | Required | Usually wanted |
| --- | --- | --- |
| `@article` | author, title, journal, year | volume, number, pages, doi |
| `@inproceedings` | author, title, booktitle, year | pages, publisher, doi, series |
| `@book` | author or editor, title, publisher, year | edition, isbn, address |
| `@incollection` | author, title, booktitle, publisher, year | editor, pages, doi |
| `@phdthesis` / `@mastersthesis` | author, title, school, year | type, address, url |
| `@techreport` | author, title, institution, year | number, url |
| `@misc` | title | author, howpublished, year, note, url, eprint |

biblatex adds `date` (preferred over `year`), `journaltitle` (alias of `journal`), `eprint`/`eprinttype`/`eprintclass` for arXiv, and `urldate`. Write the classic field names; biblatex maps them.

## Field hygiene

- **Titles**: protect anything that must keep its case in braces: `{A} Study of {LLM}-based {Python} Tutors`. Do not wrap the whole title in double braces; that kills the style's case rules.
- **Authors**: `Last, First and Last, First`. Corporate authors in braces: `{OpenAI}`. Use `and others` for et al. only if the source truncates the list.
- **Pages**: `123--145`, never a single hyphen or an en dash character.
- **DOI**: bare (`10.1145/…`); the style adds the URL. If both `doi` and `url` exist and the URL is just the DOI resolver, drop the `url`.
- **Month**: three-letter macro without quotes (`month = mar`) or omit.
- **Special characters**: `\&` in `booktitle` and `publisher`; accented names as UTF-8 with biblatex, or `{\"o}` for classic BibTeX.
- **Venue names**: full names, no abbreviations unless the style abbreviates: `Proceedings of the 2023 CHI Conference on Human Factors in Computing Systems`.

## arXiv preprint template

```bibtex
@misc{smith2024feedback,
  title         = {Automated Feedback for Programming Assignments},
  author        = {Smith, Jane and Doe, John},
  year          = {2024},
  eprint        = {2401.01234},
  archivePrefix = {arXiv},
  primaryClass  = {cs.SE},
  url           = {https://arxiv.org/abs/2401.01234}
}
```

## Web page template

```bibtex
@misc{owasp2025top10,
  title        = {{OWASP} Top 10:2025},
  author       = {{OWASP Foundation}},
  year         = {2025},
  howpublished = {\url{https://owasp.org/Top10/}},
  note         = {Accessed 2026-09-21}
}
```
