---
name: feature
description: "Take a feature from a one-line description to a reviewed, tested change through a fixed pipeline: orient with the code-explorer agent, clarify requirements, write a task-by-task plan with the writing-plans skill, execute it with test-driven development, simplify with the code-simplifier agent, verify completion, and hand off ready for /pr. Each phase produces an artifact and stops for agreement at the plan. Use when starting any feature or non-trivial change, or when an implementation keeps drifting because it started without a plan."
argument-hint: "<what to build> [--plan-only] [--no-simplify]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
model: inherit
---

## Context

Request: `$ARGUMENTS`

**Branch and state:**

!`git branch --show-current 2>/dev/null; git status --short 2>/dev/null | head -10`

**Project conventions:**

!`head -60 CLAUDE.md 2>/dev/null || echo "(no CLAUDE.md)"`

## Task

Deliver the feature through these phases in order. Do not skip a phase; do not start editing before the plan is agreed.

### Phase 0: Branch

If on the default branch (or `main`/`master`/`develop`), create a feature branch named from the request (`feat/<kebab-summary>`) before anything else. If the working tree is dirty with unrelated changes, say so and ask whether to stash.

### Phase 1: Orient

Launch the `code-explorer` agent with the request. It returns entry points, the flow, shared types, gates, tests, and the likely change surface with `file:line` anchors. Read its report; open anything it flagged as uncertain.

### Phase 2: Clarify

From the request and the orientation, list the decisions the request leaves open (behaviour at edges, backward compatibility, configuration, error handling, UI copy). For each, either resolve it from the codebase's existing conventions and say so, or ask the user. Ask in one message, as a numbered list, with a recommended answer for each; proceed on the recommendations if the user says so.

Write the outcome as a short spec: goal, in scope, out of scope, acceptance criteria as checkable statements.

### Phase 3: Plan

Apply `writing-plans` to the spec and the orientation report. The plan lives at `docs/plans/<date>-<kebab-summary>.md` (or the project's plans directory if one exists). Each task names files, code, and the verification command.

Show the plan summary (task list with one line each) and **stop for agreement**. With `--plan-only`, end here.

### Phase 4: Execute

Apply `executing-plans` with `test-driven-development` for each task: failing test, minimal code, green, refactor. Run the task's verification before moving on. If a task cannot be done as planned, stop and revise the plan rather than improvising around it. Commit at the plan's commit points with the `git-commit` rules if the plan or user asks; otherwise leave the tree uncommitted.

### Phase 5: Simplify

Unless `--no-simplify`, launch the `code-simplifier` agent on the change. Review its report; every simplification is already applied with tests green, so only vetoes need action.

### Phase 6: Verify

Apply `verify-completion`: run the full test suite, lint, and typecheck with fresh output; check each acceptance criterion from the spec against evidence; list anything unmet honestly.

### Phase 7: Hand off

Report:

- Spec (goal, acceptance criteria with pass/fail evidence)
- Plan path and which tasks are done
- Files changed (`git diff --stat`)
- Simplifications applied
- Verification output summary
- Suggested next: `/review-pr` for a specialist review, then `/pr` to open the pull request
