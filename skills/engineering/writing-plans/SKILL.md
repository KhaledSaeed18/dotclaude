---
name: writing-plans
description: Turn a spec or set of requirements into a detailed, task-by-task implementation plan an engineer (or a subagent) can execute without further context. Breaks work into bite-sized steps with exact file paths, real code, and verification commands. Use before starting a multi-step build, once you know what you're building.
---

Write the implementation plan as if the engineer executing it has strong general skills but zero knowledge of this codebase, this domain, or your intentions. Everything they need to act has to be on the page: which files to touch, the actual code, how to test it, what "done" looks like for each step. Vagueness in a plan becomes wasted work or wrong work at execution time.

A good plan is a sequence of small, verifiable tasks — each one producing a self-contained change that makes sense on its own and leaves the project working.

## Step 1: Orient before planning

Read the spec or requirements fully, then look at the codebase the plan will touch — existing patterns, conventions, the files involved. Plan *with* the grain of the code that's there, not against an idealised version of it. If the spec spans several independent subsystems, say so and propose splitting it into one plan per subsystem; each plan should produce working, testable software on its own.

## Step 2: Map the files first

Before writing any task, list the files the work will create or modify and the single responsibility of each. This is where the decomposition gets decided.

- Give each file one clear job. Prefer smaller, focused files over large ones that do several things — they're easier to reason about and edit reliably.
- Keep things that change together in the same place; split by responsibility, not by technical layer.
- In an existing codebase, follow the established structure. Don't unilaterally restructure — but if a file you're already modifying has grown unwieldy, a scoped split can be part of the plan.

## Step 3: Write bite-sized tasks

Each task is a coherent unit of work; each *step* inside it is one action of two to five minutes. Following test-driven development, a typical task reads:

- Write the failing test (show the test code).
- Run it, confirm it fails (give the command and the expected failure).
- Write the minimal implementation (show the code).
- Run the test, confirm it passes (give the command and expected result).
- Commit (give the exact `git add` paths and message).

Give every task an explicit **Files** block — what to create, what to modify (with line ranges where it helps), what the test file is. Use checkbox (`- [ ]`) syntax for steps so progress is trackable during execution.

## Step 4: No placeholders — ever

A plan with gaps is a plan that fails at execution. None of these belong in a finished plan:

- "TBD", "TODO", "implement later", "fill in the details."
- "Add appropriate error handling / validation / edge cases" without saying which and how.
- "Write tests for the above" with no actual test code.
- "Similar to Task N" — repeat the code; the executor may read tasks out of order.
- A step that says *what* to do but not *how*, where code is involved (show the code).
- References to a type, function, or method that no task defines.

Every step that changes code shows the code. Every command comes with its expected output. File paths are exact.

## Step 5: Self-review against the spec

When the plan is complete, read it once more against the spec with fresh eyes — this is a checklist you run yourself, not a subagent dispatch:

1. **Coverage.** Walk each requirement in the spec. Can you point to the task that implements it? List any gaps and add tasks for them.
2. **Placeholder scan.** Search the plan for the red flags above and fix any you find.
3. **Consistency.** Do the type names, signatures, and property names used in later tasks match what earlier tasks defined? A method called `clearLayers()` in one task and `clearFullLayers()` in another is a latent bug.

Fix issues inline and move on.

## Step 6: Save and hand off

Save the plan as a markdown file (a `docs/plans/YYYY-MM-DD-<feature>.md` location works well unless the project has its own convention). Then offer the user how to execute it:

- **Inline** — run the tasks in this session with review checkpoints, using the `executing-plans` skill.
- **Subagent-driven** — a fresh subagent per task with review between, when the platform supports subagents and the tasks are largely independent.

If the work should be isolated from the current branch, note that an isolated workspace should be set up at execution time via the `git-worktrees` skill, and that the branch gets wrapped up afterward with the `finish-branch` skill.
