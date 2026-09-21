# Literature APIs, no key required

All examples use `curl -s`. Replace `you@example.org` with the student's address; the polite-pool mail is a courtesy, not authentication.

## OpenAlex

```bash
curl -s "https://api.openalex.org/works?search=automated%20feedback%20programming%20assignments&per-page=25&sort=relevance_score:desc&mailto=you@example.org" \
  | jq '.results[] | {id, doi, title, publication_year, cited_by_count, venue: .primary_location.source.display_name, oa: .open_access.oa_url, authors: [.authorships[].author.display_name]}'
```

- Filters: `&filter=publication_year:>2019,type:article` (also `concepts.id`, `is_oa:true`).
- Abstracts come as an inverted index (`abstract_inverted_index`); rebuild with `jq` or ask Semantic Scholar for the plain text.
- Rate: 10 requests/second in the polite pool; be gentler.

## Semantic Scholar Graph API

```bash
curl -s "https://api.semanticscholar.org/graph/v1/paper/search?query=automated+feedback+programming+assignments&limit=25&fields=title,year,externalIds,citationCount,influentialCitationCount,abstract,tldr,venue,authors,openAccessPdf" \
  | jq '.data[]'
```

- References and citations of a paper (id may be `DOI:10.…`, `ARXIV:2401.…`, or the S2 id):

  ```bash
  curl -s "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1145/3313831.3376234/references?fields=title,year,externalIds,citationCount&limit=100"
  curl -s "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1145/3313831.3376234/citations?fields=title,year,externalIds,citationCount&limit=100"
  ```

- Rate without a key: about 1 request/second shared; wait and retry on 429.

## arXiv

```bash
curl -s "http://export.arxiv.org/api/query?search_query=all:%22automated%20feedback%22%20AND%20all:programming&start=0&max_results=25&sortBy=relevance"
```

- Returns Atom XML. Extract `<entry>` blocks: `<id>` (the abs URL, whose tail is the arXiv id), `<title>`, `<summary>`, `<published>`, `<author><name>`. `xmllint --xpath` or a short Python snippet both work.
- Prefix fields: `ti:` title, `au:` author, `abs:` abstract, `cat:` category (e.g. `cat:cs.SE`).
- Rate: one request every 3 seconds is the documented courtesy.

## CrossRef

```bash
curl -s "https://api.crossref.org/works/10.1145/3313831.3376234?mailto=you@example.org" \
  | jq '.message | {DOI, title: .title[0], container: (.["container-title"][0] // ""), year: (.issued["date-parts"][0][0]), author: [.author[] | "\(.given) \(.family)"], type, publisher}'
```

- Search: `https://api.crossref.org/works?query.bibliographic=<title words>&rows=5` to find the DOI for a known title.
- BibTeX for a DOI (content negotiation): `curl -sL -H "Accept: application/x-bibtex" https://doi.org/10.1145/3313831.3376234`

## Verifying an identifier

```bash
curl -sI "https://doi.org/10.1145/3313831.3376234" | head -1     # HTTP/2 302 means it resolves
curl -sI "https://arxiv.org/abs/2401.01234" | head -1            # HTTP/2 200
```

A 404 from doi.org means the DOI does not exist. Do not "fix" a DOI by guessing; search CrossRef by title instead.
