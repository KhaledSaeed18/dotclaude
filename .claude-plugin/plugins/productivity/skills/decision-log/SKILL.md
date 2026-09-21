---
name: decision-log
description: "Keep a lightweight decision log for a project or a person: one dated line per decision with the choice, the reason, the alternatives, who decided, and a revisit trigger, in a single Markdown file that is grepped rather than browsed, so that why did we do that has an answer six months later. Lighter than an ADR; use for product, process, and scope decisions that do not warrant one. Use when a decision is made in chat or a meeting, when the same debate keeps recurring, or when onboarding someone into a project's history."
argument-hint: "(optional) the decision to record, or 'review' to list open revisit triggers"
---

An ADR is for architecture; most decisions are smaller (we will not support IE; the sprint is two weeks; the API uses cursor pagination; the thesis excludes mobile). They still get relitigated when nobody wrote them down. A decision log is the cheapest record that stops that: one file, one line per decision, appended and never rewritten.

## The file

`DECISIONS.md` at the project root (or `docs/DECISIONS.md`; match the repo), newest at the bottom so git blame and diffs stay readable:

```markdown
# Decision log

Format: date | decision | reason | alternatives | who | revisit when

- 2026-09-21 | Cursor pagination on all list endpoints | offset breaks under concurrent writes; clients already handle cursors | offset+limit; keyset only for large tables | API guild (A, B) | if a client cannot support cursors
- 2026-09-21 | Thesis scope excludes mobile clients | no access to a device lab; desktop covers 80% of sessions | include with emulators | K with supervisor | if the device lab opens before December
```

One line, under 200 words, no nested lists. Long reasoning links to a doc, an ADR, a ticket, or a meeting record.

## When to add a line

- A choice between real alternatives was made, by anyone, that others will have to live with.
- A scope was cut or a request declined.
- A convention was set (naming, process, cadence).
- A decision was reversed: add a new line that says "reverses 2026-08-02 ..." and why; never edit the old line.

Do not log: the obvious, the trivial, or a decision that already has an ADR (link it instead).

## Writing the line

- **Decision** in the imperative or declarative, specific enough to be checked ("two-week sprints starting Monday" not "agile process").
- **Reason** is the constraint or evidence that tipped it, not a restatement of the decision.
- **Alternatives** as noun phrases, at least one, honestly stated.
- **Who** decided or confirmed; "consensus" is allowed when true.
- **Revisit when**: the condition that should reopen it. This is the field that stops future relitigation: the answer to "should we reconsider?" is "only if X".

## Review mode

With `review` (or when asked), list every line whose revisit trigger may have fired (ask the user about each condition you cannot check), decisions older than a year with no trigger, and reversals, so a project can prune what no longer applies.

## Relationship to other records

- **ADR** (`adr-writing`): architecture, long-lived, multi-page. The log gets one line pointing at it.
- **Research log** (`/research-log`): the thesis's daily record; thesis-level decisions appear in both, the log line linking to the research log entry.
- **Meeting notes** (`meeting-notes`): decisions there are copied here the same day, one line each.
