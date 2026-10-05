---
name: presentation-outline
description: "Structure a talk, thesis defence, or project presentation as a slide-by-slide outline with one message per slide, an opening that states the point, evidence slides that carry a claim in the title, a timed run of show, anticipated questions with answers, and speaker notes, sized to the slot. Produces the outline and notes, not the slide design. Use when preparing a defence, a conference or team talk, a demo, or a status presentation, or when a deck has content but no argument."
argument-hint: "the occasion, the audience, the slot length, and the material (thesis, report, or notes)"
---

A presentation is an argument with a time limit. The audience remembers one message and two or three supporting points; everything else is either evidence for those or noise. Build the outline from the message down, then fit it to the minutes.

## Step 1: the message

One sentence the audience should repeat afterwards. For a defence: the contribution and what supports it ("A citation-verification hook cuts fabricated references in AI-assisted drafts to zero in our study, and here is how we know"). For a status talk: the state and the ask. Write it first; every slide either supports it or goes.

## Step 2: audience and occasion

- What they know (skip it), what they doubt (address it), what they want (lead with it).
- Slot length, including questions. Plan for 70% of the slot; talks run long.
- Rule of thumb: one slide per one to two minutes; a 20-minute talk has 10 to 15 slides.

## Step 3: structure

**Defence or research talk** (20 to 40 min):
1. Title, name, one line of context.
2. The problem and why it matters (one concrete example, one number).
3. The gap and the research questions (verbatim from the thesis).
4. Approach in one diagram.
5. Method essentials (what an examiner needs to trust the results; details in backup slides).
6. Results: one slide per research question, claim in the title, one figure or table.
7. Limitations, stated plainly.
8. Contributions and what they mean.
9. Future work (concrete next studies).
10. Thank you and the message restated. Then backup slides for questions.

**Team or status talk** (10 to 15 min): state, evidence, risks, ask, next steps.

**Demo**: what you will show and why it matters; the demo, scripted with a fallback recording; what was hard; what is next.

## Step 4: slide by slide

Each slide gets:

- **Title as the claim** ("Variant B halves latency at every input size"), not a topic ("Results").
- **One visual or three bullets**, not both; a figure from `research-figures` at slide resolution, direct-labelled.
- **Speaker note**: the two to four sentences said on the slide, in speaking voice; the transition to the next slide.
- **Time**: minutes allotted.

Cut any slide whose title is not a claim or whose removal does not weaken the argument.

## Step 5: questions

List the eight likely questions (for a defence, take them from `thesis-reviewer`'s report), each with a two-sentence answer and the backup slide that supports it. Rehearse the three hardest aloud.

## Output

```markdown
# <Talk title>: outline (slot 30 min: 20 talk + 10 Q&A)

Message: ...
Audience: ...

| # | Title (claim) | Visual | Note (what you say) | Min |
| 1 | ... | ... | ... | 1 |
...
Total: 19 min

## Backup slides
- B1: full hyperparameter table
- ...

## Anticipated questions
1. Q: Why n = 10 and not more? A: ... (B2)
...

## Rehearsal plan
Run 1 alone with a timer; run 2 to a colleague for the questions; run 3 the day before, standing.
```

Run `humanize` on the notes; spoken language tolerates fewer tells than written.
