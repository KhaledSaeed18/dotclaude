---
name: literature-search
description: "Find the literature for a research question by querying OpenAlex, Semantic Scholar, arXiv, and CrossRef from the shell with curl (no keys, no MCP), deduplicating by DOI, ranking by relevance, citations, and recency, and producing a reading list with verified identifiers ready for paper-reader and bibtex-manager. Use when starting a literature review, checking whether a gap is real, or looking for the papers that cite or are cited by a known key paper."
argument-hint: "(optional) the research question or search terms; add --since YEAR or --limit N"
---

Search the literature the way a librarian would: several databases, explicit search strings, deduplication, and a record of what was searched so the process can be reported. Every result must carry a real identifier (DOI, arXiv id, or OpenAlex id) that resolves. A paper you cannot resolve does not go on the list.

## Sources and how to query them

All are free and need no API key. Use `curl -s` with a `User-Agent` header and a `mailto` where the API asks for one (OpenAlex and CrossRef give a faster "polite pool" with it). Read [reference/apis.md](reference/apis.md) for the exact endpoints, parameters, and the fields to keep.

| Source | Best for | Endpoint |
| --- | --- | --- |
| OpenAlex | broad coverage, citation counts, concepts, open-access links | `api.openalex.org/works?search=...` |
| Semantic Scholar | CS and AI, citation graph, TL;DR, influential citations | `api.semanticscholar.org/graph/v1/paper/search?query=...` |
| arXiv | preprints, latest ML/systems work | `export.arxiv.org/api/query?search_query=...` |
| CrossRef | resolving a DOI to full metadata, verifying a reference | `api.crossref.org/works/<doi>` |

Respect rate limits: at most one request per second per source without a key; back off on HTTP 429.

## Procedure

1. **Build the search strings.** From the research question, extract two to four concept groups (the phenomenon, the method, the setting, the population). For each group list synonyms and abbreviations. Combine as `(a OR a') AND (b OR b')`. Record every string; the thesis method chapter will report them.
2. **Query each source** with each string, most specific first. Keep the top 50 per query per source at most. Filter by year only when the student asks (`--since`), and say so in the log.
3. **Normalise and deduplicate.** Key on lowercase DOI; fall back to arXiv id, then to normalised title (lowercase, ASCII, no punctuation) plus first author surname. Merge fields across sources: prefer CrossRef for bibliographic fields, OpenAlex for citation count and OA link, Semantic Scholar for abstract and TL;DR.
4. **Snowball once.** For the three to five most relevant hits, fetch their references and their citing works from Semantic Scholar (`/paper/<id>/references`, `/paper/<id>/citations`) and add anything that appears twice or more.
5. **Rank.** Score = relevance (title and abstract term overlap with the concept groups) with a bonus for citation count normalised by age, and a small bonus for recency. Show the formula used. Never rank purely by citations: the newest relevant work has few.
6. **Screen titles and abstracts** against the inclusion criteria the student states (or propose criteria and ask). Mark each as include, exclude with reason, or unsure.
7. **Verify** every included identifier resolves: `curl -sI https://doi.org/<doi>` returns 3xx, or the arXiv abs page returns 200. Drop anything that does not.

## Output

Write two files (default under `research/`), and summarise in the reply:

- `search-log.md`: date, sources, every search string, result counts per source, inclusion criteria, and the snowballing seeds. This is a method-chapter artifact.
- `reading-list.md`: one entry per included paper, ranked:

  ```
  ## 1. Title (Year)
  Authors. Venue. DOI: 10.xxxx/yyyy  | arXiv: 2401.01234  | cited by 142  | OA: url
  Why it is here: one sentence tying it to the research question.
  Abstract: (verbatim, from the source)
  ```

Offer the next steps: `bibtex-manager` to turn the list into a `.bib`, `paper-reader` for structured notes on each, `citation-graph` to expand from the key papers.

## Rules

- Never fabricate a paper, author, venue, or identifier. If an API returns nothing, say so and widen the search string.
- Never paraphrase an abstract as if it were the paper's finding; the reading happens in `paper-reader`.
- Report negative results: "no paper matched string 3 in any source" is useful for the gap argument.
