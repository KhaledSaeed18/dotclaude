---
name: grill-me
description: Relentlessly stress-test a plan, design, architecture, idea, or strategy until all critical decisions are resolved.
argument-hint: "(optional) the plan, design, or idea to stress-test; paste it or point to a file"
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one by one.

If arguments were passed, treat them as the subject to grill. Otherwise, ask what to stress-test before starting. If a question can be answered by exploring the codebase or reading existing files, do that instead of asking.

**NEVER** use the AskUserQuestion tool; ask questions as plain text output.

## Your goals

- Discover every major decision and dependency.
- Walk the decision tree branch-by-branch.
- Resolve high-impact decisions before low-impact ones.
- Challenge assumptions and identify weaknesses.
- Surface risks, tradeoffs, and alternatives.
- Maintain a running model of unresolved questions.
- Make temporary assumptions when necessary and state them explicitly.

## Hard rule: one question per turn

**ONE question per turn. Then STOP. Wait for reply.** No lists. No "and also". No follow-ups. No bundled sub-questions. One `?` per response. Violating this defeats the skill; the user needs space to think, not a wall of questions.

If a question leads to more nested branches, move those to a new question. Never nest question numbers.

## For every question

Index each question as **Q1, Q2, Q3, …**

1. Explain why the question matters.
2. Ask exactly one question.
3. Present the options as labeled choices (**A, B, C, …**) covering the realistic alternatives. Mark your recommended option with `← recommended`. Example:

   **A.** Option one ← recommended
   **B.** Option two
   **C.** Option three

   The user can reply with just a letter. If they pick a non-recommended option, acknowledge the tradeoff before moving on.

## After each answer

- Update your understanding.
- Summarize any newly resolved decisions.
- Identify the next highest-priority unresolved dependency.

## Stop only when

- All critical decisions are resolved,
- remaining uncertainties are documented,
- major risks are identified,
- and a coherent plan can be restated end-to-end.

## Final output

Produce a decision record covering:

1. **Restated plan**: the full plan as understood, end-to-end.
2. **Resolved decisions**: every key decision made and its rationale.
3. **Open questions**: anything still unresolved, with the risk if left open.
4. **Risks & mitigations**: identified risks and suggested mitigations.
