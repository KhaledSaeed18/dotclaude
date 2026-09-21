---
name: adr-writing
description: "Write Architecture Decision Records that a future engineer can act on: a numbered, immutable record with the context that forced the decision, the options weighed with real trade-offs, the decision in one sentence, and the consequences including what becomes harder. Covers when a decision deserves an ADR, how to supersede one, and how to keep an index. Use when a design choice has cross-cutting or long-lived effects, when reviewers keep asking why, or when onboarding depends on decisions nobody wrote down."
argument-hint: "(optional) the decision to record, or the existing ADR to supersede"
---

An ADR records a decision at the moment it was made, with the reasoning that was available then. It is not documentation of the system (that changes) and not a design document (that precedes the decision). Its reader is an engineer two years from now asking "why is it like this, and can I change it?"

## When to write one

Write an ADR when a decision is:

- **hard to reverse** (a database, a framework, a public API shape, a data format), or
- **cross-cutting** (affects how most code is written: error handling convention, module boundaries, auth model), or
- **surprising** (a reader would assume the other option), or
- **contested** (people disagreed, and the losing option will come up again).

Do not write one for choices that are local, obvious, or cheaply reversible; a comment or a commit message serves those. A repository with 200 ADRs has stopped recording decisions and started recording activity.

## Format

```markdown
# 0007. Use PostgreSQL row-level security for tenant isolation

Date: 2026-09-21
Status: accepted
Supersedes: 0003
Deciders: (names or roles)

## Context

What situation forces a decision. The constraints (scale, team, deadline, compliance), the problem observed, and what happens if nothing is decided. Facts, with numbers where they exist. No solutions yet.

## Options considered

### A. Application-level filtering (current)
How it works in one or two sentences. Pros. Cons. What it costs to stay.

### B. Row-level security in PostgreSQL
Same.

### C. Schema per tenant
Same.

## Decision

One sentence: "We will use B: row-level security policies on every tenant-scoped table, enforced by a session variable set in the connection middleware."

Then the reasoning that tipped it, referring to the context's constraints. Two or three paragraphs at most.

## Consequences

What becomes easier. What becomes harder or is now forbidden (and what to do instead). Migration or rollout steps and who owns them. What would make us revisit this (the trigger for a superseding ADR).
```

## Writing rules

- **Context is factual and dated.** "Queries were taking 800 ms at p95 with 40 tenants" ages well; "performance was bad" does not.
- **Options are honest.** Give the rejected options their real advantages. An ADR whose alternatives are strawmen will not convince the person who preferred one of them.
- **The decision is one sentence** and uses "we will". Everything else is reasoning.
- **Consequences include the negative ones.** An ADR that lists only benefits is marketing.
- **Immutable once accepted.** Fix typos; do not rewrite history. A changed decision is a new ADR that supersedes this one; the old one's status becomes "superseded by NNNN".
- **Short.** One to two pages. Link to the design document, the benchmark, or the spike branch instead of inlining them.
- **Status vocabulary**: proposed, accepted, deprecated, superseded by NNNN. Nothing else.

## Files and index

- `docs/adr/NNNN-kebab-title.md`, four-digit sequence, never reused.
- `docs/adr/README.md` with a table: number, title, status, date. Regenerate it or keep it by hand; either way, keep it.
- Reference ADRs from code comments where the decision is enforced (`// See ADR 0007`), so the reader finds the reasoning from the code.

## Superseding

1. Write the new ADR with `Supersedes: NNNN` and a Context section that says what changed since.
2. Edit the old ADR's status line only: `Status: superseded by 0012`.
3. Update the index.

## Retrofitting

When a codebase has undocumented decisions, write ADRs for the ones people keep asking about, dated today, with a Context that says "recorded retrospectively; the original reasoning was reconstructed from ...". Do not fake the date.
