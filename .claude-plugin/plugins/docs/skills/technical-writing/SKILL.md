---
name: technical-writing
description: "Write and edit developer documentation, guides, design notes, and engineering blog posts with a working writer's discipline: audience and purpose first, one idea per paragraph, examples before abstractions, precise verbs, consistent terms, and structure the reader can scan. Includes formats for how-to guides, reference pages, explanations, and tutorials, and an editing checklist. Use when writing docs, a design note, a release announcement, or a post, or when a draft is accurate but nobody can follow it."
argument-hint: "(optional) the document type, audience, and the draft or notes to work from"
---

Technical writing succeeds when a specific reader can do a specific thing after reading. Decide who the reader is and what they are trying to do before writing a heading. Every later choice (structure, depth, examples, tone) follows from that.

## Before drafting

- **Reader**: their role, what they already know, what they are trying to do, how much time they have. "A backend developer integrating our API for the first time, in an afternoon" beats "developers".
- **Purpose**: teach a skill (tutorial), get a task done (how-to), look something up (reference), or understand why (explanation). Mixing two in one page produces a page that serves neither. Split.
- **Outcome**: the sentence the reader should be able to say afterwards: "I can rotate an API key without downtime."

## The four document types

**Tutorial** (learning-oriented): a guaranteed-to-work path from nothing to a result. Numbered steps, every command shown, expected output shown, no choices offered, no explanations beyond one line ("this creates the config file"). Test it end to end on a clean machine.

**How-to guide** (task-oriented): assumes competence, solves one problem. Title as the goal ("Rotate an API key"). Prerequisites, steps, verification, what can go wrong. Offer choices only where the reader's situation differs.

**Reference** (information-oriented): complete, consistent, dry. Same structure for every entry (signature, parameters with types and defaults, return, errors, example). Generated from source where possible; hand-written parts kept close to the code.

**Explanation** (understanding-oriented): why it is designed this way, the trade-offs, the history. Prose, diagrams, no steps. This is where an ADR's reasoning gets its readable form.

## Structure

- Title says what the reader gets. Sentence case.
- First paragraph: what this page covers and who it is for. A reader in the wrong place leaves in ten seconds instead of ten minutes.
- Headings the reader can scan to find their case; each section stands alone (readers arrive by search).
- Example before abstraction: show the call, then explain the parameters.
- Put the most common case first and the edge cases after, in their own section.
- End how-tos with verification ("you should now see ...") and next steps.

## Sentences

- Active voice, present tense, second person for instructions: "Run the migration" rather than "The migration should be run".
- One term per concept, thesis-wide; define it once, link to the definition.
- Precise verbs: "returns", "throws", "writes", "blocks" rather than "handles", "deals with", "manages".
- Numbers and units exact. "Fast" is not a specification.
- Short sentences for instructions; longer ones allowed in explanation.
- No em dashes; no "simply", "just", "easy", "obviously" (if it were, they would not be reading).
- Code, commands, paths, and identifiers in code font; UI labels in bold exactly as shown.

## Code examples

- Complete and runnable, or clearly a fragment (`...` where lines are elided, and only in explanation).
- Show the output.
- Realistic values, not `foo`; secrets as obvious placeholders (`<your-api-key>`).
- Tested. A wrong example costs more than no example.

## Editing checklist

1. Read the first sentence of each paragraph in order; does it tell the story?
2. Can a reader find their case from the headings alone?
3. Is every command copy-pasteable and verified?
4. Does any sentence describe the previous version of the software?
5. Are terms consistent? (Grep for synonyms.)
6. Cut every sentence that does not help the reader do or understand the thing.
7. Run `humanize`.

## Announcements and posts

Lead with what changed for the reader and what they should do. Then how it works, then why. Keep the company voice out of the first paragraph; the reader wants the fact. Link to the docs and the changelog; do not restate them.
