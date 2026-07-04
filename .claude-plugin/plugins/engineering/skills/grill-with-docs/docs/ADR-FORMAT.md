# ADR format

## When to write one

Only create an ADR when **all three** are true:

1. **Hard to reverse**: the cost of changing your mind later is meaningful.
2. **Surprising without context**: a future reader will wonder "why did they do it this way?"
3. **Real trade-off**: there were genuine alternatives and you picked one for specific reasons.

If any of the three is missing, skip it.

## File naming

`docs/adr/<NNNN>-<slug>.md`: four-digit zero-padded number, lowercase hyphenated slug.

Example: `docs/adr/0003-use-event-sourcing-for-orders.md`

## Structure

```markdown
# <NNNN>. <Title>

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded by [NNNN](./NNNN-slug.md)

## Context

What situation, constraint, or requirement forced this decision?

## Decision

What did we decide?

## Consequences

What becomes easier? What becomes harder? What debt are we taking on?

## Alternatives considered

| Option | Why rejected |
| --- | --- |
| Option A | Reason |
| Option B | Reason |
```

## Rules

- Write **Context before Decision**: the why before the what.
- **Consequences must be honest**: list the downsides, not just the benefits.
- **Alternatives must be real**: options that were genuinely on the table.
- **Status must be kept current**: if this decision is later reversed, update Status to "Superseded by …" and link to the replacement.
