---
name: design-science-methodology
description: "Structure a thesis whose contribution is a built artifact (tool, system, method, model) using design science research: explicit problem and requirements, knowledge base, iterative build with design decisions recorded, and a rigorous evaluation strategy (technical benchmarks, controlled use, case study, expert review) that separates whether it works from whether it helps, following Hevner's guidelines and Peffers' process. Use when the thesis builds something, when a supervisor says a system alone is not a contribution, or when the evaluation chapter has no design."
argument-hint: "(optional) the artifact, the problem it addresses, and the intended users"
---

Building a system is engineering; showing what is learned from building it is research. Design science research (DSR) is the frame that turns the first into the second: an artifact designed to solve a stated problem, evaluated with rigour, and a contribution to knowledge stated separately from the artifact itself.

## The process (Peffers et al.)

1. **Problem identification and motivation**: the problem, who has it, why existing solutions fall short (from `lit-review-synthesis`), and why solving it matters. Concrete and, where possible, quantified.
2. **Objectives of the solution**: requirements the artifact must meet, derived from the problem and the literature. Functional (must do X) and quality (latency under Y, usable by Z without training). Each requirement is later a row in the evaluation table. Number them (R1..Rn).
3. **Design and development**: the artifact, with its design decisions recorded as they are made (`adr-writing` works for this) and the knowledge they draw on (which theories, patterns, prior systems). The thesis describes architecture and the decisions, not every line.
4. **Demonstration**: the artifact used to solve an instance of the problem (a worked example, a pilot). Shows feasibility.
5. **Evaluation**: how well the artifact meets the objectives, with a method chosen from the strategy below. This is the chapter examiners read hardest.
6. **Communication**: the thesis, and the artifact released with documentation (`experiment-reproducibility`).

Iterate: evaluation feeds back into design. Record each cycle; a thesis that shows two design iterations with evidence is stronger than one that presents a finished system.

## Evaluation strategy

Choose along two axes (Venable, Pries-Heje, Baskerville): artificial or naturalistic setting, and formative (during design) or summative (final). Combine at least two of:

| Method | Answers | Setting |
| --- | --- | --- |
| Technical experiment / benchmark | Does it perform (speed, accuracy, scale) against baselines? | artificial |
| Controlled experiment with users | Does it help people do the task better than the alternative? | artificial |
| Case study in a real setting | Does it work in practice, and what happens around it? | naturalistic |
| Expert evaluation / walkthrough | Do practitioners judge it sound and useful? | either |
| Illustrative scenario | Can it handle the representative cases? (weak alone) | artificial |
| Analytical (complexity, formal properties) | Does it have the guaranteed properties claimed? | artificial |

Map every requirement to at least one method. A requirement with no evaluation is a claim.

Separate two questions in the write-up: *does it work* (efficacy: technical evaluation) and *does it help* (effectiveness: users, context). A master's thesis usually shows the first rigorously and the second in a limited pilot; say which is which.

## Contribution types (Gregor and Hevner)

State which the thesis makes:

- **Level 1: instantiation**: a working system for a specific problem (weakest as knowledge; strengthen with 2).
- **Level 2: nascent design theory**: constructs, principles, or a method that would apply to other instantiations ("design principles for X: DP1 ...").
- **Level 3: design theory**: a well-developed, tested theory (rare at master's level).

Write the design principles explicitly, each with the evidence from the evaluation that supports it. That list is the research contribution; the code is the artifact.

## Rigour checklist (Hevner's guidelines)

1. The artifact is described precisely enough to be reconstructed.
2. The problem is relevant to a named stakeholder group.
3. The evaluation method fits the artifact and the objectives.
4. The contribution to knowledge is stated apart from the artifact.
5. The design draws on the knowledge base (cite the theories and prior systems it builds on) and the evaluation uses recognised methods.
6. The search for the design is described: alternatives considered, why this one.
7. The thesis communicates to both technical and managerial readers (architecture for the first, requirements and results for the second).

## Output

A method chapter skeleton with the six process steps as sections, the requirements table (id, requirement, source, evaluation method), the evaluation design per method (using `research-methodology` for the user-facing ones and `benchmark-reporting` for technical ones), and a placeholder design-principles list to be filled from the evaluation. Update `research/QUESTION.md` with the chosen contribution level.
