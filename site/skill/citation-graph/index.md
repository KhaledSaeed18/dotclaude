---
name: citation-graph
description: "Expand a set of key papers into the literature around them by walking the citation graph with the Semantic Scholar and OpenAlex APIs: backward (references), forward (citing works), and co-citation, scored by how many seeds connect to each candidate, so the papers a reviewer will expect are found even when keyword search misses them. Use after literature-search has found the first key papers, when a supervisor names one seminal paper, or when checking that a related-work chapter has not missed a line of work."
argument-hint: "(optional) seed DOIs, arXiv ids, or keys from the .bib; add --depth 1|2 and --min-links N"
---

Keyword search finds papers that use your words; the citation graph finds papers that share your problem. Starting from a few papers known to be central, the works they cite and the works that cite them, weighted by how many seeds agree, surface the field's structure and its recent edge.

## Inputs

Seeds: DOIs, arXiv ids, Semantic Scholar ids, or `.bib` keys (resolved through `references.bib`). Three to eight seeds work best; one seed gives a star, not a graph. Options: `--depth` (1: neighbours of seeds; 2: neighbours of the strongest first-degree candidates; default 1), `--min-links` (minimum seed connections to keep a candidate; default 2), `--since YEAR` for the forward direction.

## Procedure

1. **Resolve seeds** to Semantic Scholar paper ids:
   `curl -s "https://api.semanticscholar.org/graph/v1/paper/DOI:<doi>?fields=paperId,title,year,citationCount"`.
2. **Backward**: for each seed, `/paper/<id>/references?fields=paperId,title,year,externalIds,citationCount,influentialCitationCount&limit=500`. Tally each referenced paper's seed count.
3. **Forward**: for each seed, `/paper/<id>/citations?fields=...&limit=1000` (page with `offset` when over 1000; apply `--since`). Tally.
4. **Co-citation** (optional, strong signal): for the top forward candidates, fetch their references and count how often two seeds appear together; candidates cited alongside the seeds by many papers belong to the same conversation.
5. **Score** each candidate: `links` (distinct seeds connected), `influential` (Semantic Scholar's influential-citation flag counts double), citations normalised by age, and recency for the forward set. Show the formula.
6. **Depth 2**: take the top ten candidates by score, treat them as seeds, repeat steps 2 and 3, and keep only candidates linked to at least two of the original seeds.
7. **Cross-check** each kept candidate with OpenAlex (`api.openalex.org/works/doi:<doi>`) for the DOI, venue, and open-access link; drop anything that does not resolve.
8. Rate-limit: one request per second; on 429 wait and retry. Cache responses under `research/.graph-cache/` keyed by paper id.

## Output

`research/citation-graph.md`:

```
# Citation graph from 5 seeds (2026-09-21, depth 1, min-links 2)

Seeds: smith2023feedback, lee2022grading, ...

## Backward (cited by the seeds)
| links | year | citations | title | DOI |
| 4 | 2015 | 1,203 | Foundations of ... | 10.x |
...

## Forward (cite the seeds), since 2022
...

## Co-cited with the seeds
...

## Reading recommendations
- 10.x (links 4): cited by four of five seeds; a foundational paper the related-work chapter must position against.
- ...

## Lines of work the seeds share
Two or three sentences per cluster visible in the table (same venue, same authors, same method).
```

Then hand the recommended papers to `bibtex-manager` (add) and `paper-reader` (notes).

## Rules

- Never add a candidate to the reading list without a resolvable identifier.
- Report the counts (how many references and citations were walked) so the search log in the method chapter can state the coverage.
- Highly cited is not the same as relevant; the `links` column is the relevance signal, citations are the weight.
