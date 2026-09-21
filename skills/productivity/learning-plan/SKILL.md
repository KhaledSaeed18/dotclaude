---
name: learning-plan
description: "Turn a topic to learn into a sequenced study plan with a goal test, prerequisites, ordered units with one primary resource each, spaced practice and retrieval, a project that proves the skill, and weekly time boxes that fit the learner's calendar; then track progress against it. Works for a technology, a research field, or a course. Use when starting to learn something for a thesis, a job, or a project, when a learning effort has stalled, or when the resource list is long and the order is unclear."
argument-hint: "the topic, the goal (what you should be able to do), current level, and hours per week"
---

Learning fails from three causes: no clear end state, resources consumed in the wrong order, and no retrieval practice. A plan fixes all three before the first hour is spent. The plan is measured by what the learner can do, not by what they have read.

## Step 1: define the goal as a test

Write the goal as something the learner will do at the end, observable and dated: "By 30 Nov, implement and evaluate a retrieval-augmented pipeline on my thesis dataset and explain each design choice to my supervisor." If the stated goal is "understand X", ask what they would do with the understanding until it becomes a task.

Derive the sub-skills the test requires (usually four to eight). These are the units.

## Step 2: locate the learner

Current level per sub-skill (none, some, working, solid), from what they say and, when possible, a two-minute probe question per unit. Prerequisites missing become the first units. Skip what is already solid; a plan that re-teaches the known is abandoned by week two.

## Step 3: choose resources

One **primary** resource per unit (a chapter, a course module, a paper, official docs), chosen for being the canonical or best-explained source, not the most popular. One **practice** source per unit (exercises, a small build, a dataset). Optional **reference** links. No unit has more than three resources; the learner should never be choosing what to read.

For a research field: the survey paper first, then the two or three foundational papers, then the recent ones from `literature-search`; `paper-reader` for the notes.

## Step 4: sequence and schedule

Order units by dependency, then by usefulness to the goal. Assign each a time box (hours) from the learner's weekly budget, with 20% slack. Interleave: a week never contains only reading. Each week has:

- **Learn**: the primary resource for the current unit.
- **Practice**: the exercise or build for the unit, done from memory before consulting notes.
- **Retrieve**: 15 minutes recalling the previous units without notes (self-explanation, flashcards, or teaching it aloud); spaced at 1 day, 1 week, 1 month after each unit.
- **Build**: progress on the capstone project, which starts by week two, not at the end.

## Step 5: the capstone

A project that requires every unit and produces an artifact (a working tool, an analysis with figures, a written explanation for a specific reader). For a thesis, the capstone is a piece of the thesis itself (the pilot experiment, the literature notes for one chapter). The plan is done when the capstone passes the goal test.

## Output

`LEARNING_PLAN.md` (or the path asked for):

```markdown
# Learning plan: retrieval-augmented generation for the thesis

Goal test (by 2026-11-30): ...
Budget: 6 h/week, 10 weeks. Current level: Python solid, ML basics working, IR none, vector DBs none.

## Units
1. Information retrieval basics (prereq) | 4 h | primary: Manning IIR ch. 1, 6 | practice: BM25 over 1k docs by hand
2. Embeddings and vector search | 6 h | primary: ... | practice: ...
...

## Schedule
| Week | Learn | Practice | Retrieve | Build |
| 1 | U1 | BM25 | - | scaffold repo, load dataset |
| 2 | U2 | embed 1k docs | U1 | ... |
...

## Capstone
...

## Progress
- [ ] U1 learned  [ ] U1 practised  [ ] retrieved 1d/1w/1m
```

## Tracking

When asked for progress, read the checkboxes and the dates, compare with the schedule, and adjust: drop a unit that turned out unnecessary, add one the capstone revealed, move the slack. A plan that is never revised is a wish.
