---
name: grill-with-docs
description: Stress-test a plan against the project's existing domain model — challenges terminology, surfaces contradictions with code, and updates CONTEXT.md and ADRs inline as decisions crystallise.
argument-hint: "(optional) the plan, design, or idea to stress-test — paste it or point to a file"
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one by one.

If arguments were passed, treat them as the subject to grill. Otherwise, ask what to stress-test before starting. If a question can be answered by exploring the codebase or reading existing files, do that instead of asking.

**NEVER** use the AskUserQuestion tool — ask questions as plain text output.

## Your goals

- Discover every major decision and dependency.
- Walk the decision tree branch-by-branch.
- Resolve high-impact decisions before low-impact ones.
- Challenge assumptions and identify weaknesses — especially against the existing domain model.
- Surface risks, tradeoffs, and alternatives.
- Maintain a running model of unresolved questions.
- Make temporary assumptions when necessary and state them explicitly.

## Hard rule: one question per turn

**ONE question per turn. Then STOP. Wait for reply.** No lists. No "and also". No follow-ups. No bundled sub-questions. One `?` per response. Violating this defeats the skill — the user needs space to think, not a wall of questions.

If a question leads to more nested branches, move those to a new question. Never nest question numbers.

## For every question

Index each question as **Q1, Q2, Q3, …**

1. Explain why the question matters.
2. Ask exactly one question.
3. Present the options as labeled choices — **A, B, C, …** — covering the realistic alternatives. Mark your recommended option with `← recommended`. Example:

   **A.** Option one ← recommended
   **B.** Option two
   **C.** Option three

   The user can reply with just a letter. If they pick a non-recommended option, acknowledge the tradeoff before moving on.

## After each answer

- Update your understanding.
- Summarize any newly resolved decisions.
- Identify the next highest-priority unresolved dependency.

## Domain awareness

Before starting the session, explore the codebase for existing documentation:

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple bounded contexts. The map points to where each one lives:

```
/
├── CONTEXT-MAP.md
├── docs/
│   └── adr/                        ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/               ← context-specific decisions
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

Create files lazily — only when you have something to write. If no `CONTEXT.md` exists, create one when the first term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. Example: "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. Example: "You're saying 'account' — do you mean the Customer or the User? Those are different things in your glossary."

### Stress-test with concrete scenarios

When domain relationships are being discussed, invent edge-case scenarios that probe the boundaries and force precision.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it. Example: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` right away — don't batch. Use the format in [docs/CONTEXT-FORMAT.md](./docs/CONTEXT-FORMAT.md).

`CONTEXT.md` is a glossary and nothing else — totally devoid of implementation details, specs, or architecture notes.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful.
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **Real trade-off** — there were genuine alternatives and you picked one for specific reasons.

If any of the three is missing, skip the ADR. Use the format in [docs/ADR-FORMAT.md](./docs/ADR-FORMAT.md).

## Stop only when

- All critical decisions are resolved,
- remaining uncertainties are documented,
- major risks are identified,
- `CONTEXT.md` reflects all resolved terminology,
- and a coherent plan can be restated end-to-end.

## Final output

Produce a decision record covering:

1. **Restated plan** — the full plan as understood, end-to-end.
2. **Resolved decisions** — every key decision made and its rationale.
3. **Open questions** — anything still unresolved, with the risk if left open.
4. **Risks & mitigations** — identified risks and suggested mitigations.
5. **Glossary changes** — terms added or updated in `CONTEXT.md` during this session.
6. **ADRs created** — list any ADRs written, with a one-line summary of each.
