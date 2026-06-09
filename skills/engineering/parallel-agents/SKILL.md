---
name: parallel-agents
description: Fan independent work out to multiple subagents that run concurrently, each with a focused scope and self-contained instructions, then review and integrate their results. Use when you face two or more genuinely independent tasks — separate failing test files, unrelated bugs, distinct subsystems — that share no state and don't depend on each other's order.
---

When you have several independent problems, investigating them one after another wastes time that could be spent in parallel. Hand each one to its own subagent with precisely the context it needs, let them work at once, then pull the results together. Each subagent should get exactly what you construct for it — never your whole session history — so it stays focused, and so your own context stays free for coordination.

## When this applies — and when it doesn't

Dispatch in parallel when the problems are genuinely independent: different test files failing for different reasons, separate subsystems broken on their own, distinct bugs that can each be understood without the others. The test is whether fixing one could change another. If it can't, and they touch different code, they can run concurrently.

Don't reach for this when:

- The failures look related — fixing one might fix the rest. Investigate together first.
- You'd need the full system in view to understand any of it.
- You don't yet know what's broken (exploratory debugging — find the shape of the problem before fanning out).
- The tasks share state or would edit the same files; concurrent agents there collide.

## The pattern

**1. Split into independent domains.** Group the work by what's actually broken — "tool approval flow", "batch completion", "abort handling" — such that each group can be fixed without reference to the others.

**2. Write a focused task per domain.** Each subagent prompt needs three things:

- *Scope* — one file or subsystem, named exactly. "Fix `agent-tool-abort.test.ts`", not "fix the tests."
- *Context* — the concrete failures: paste the error messages and failing test names, not a vague "the race condition."
- *Constraints and expected output* — what it may and may not change ("fix the tests only, don't touch production code"), and what to return ("a summary of the root cause and the changes you made").

**3. Dispatch them concurrently.** Launch all the subagents in one batch so they run at the same time rather than in sequence.

**4. Review and integrate.** When they return, read each summary, check that their changes don't conflict (did two agents touch the same file?), run the full test suite against the combined result, and spot-check the work — subagents can make systematic mistakes. Don't trust a "success" report without looking at the actual diff.

## What a good subagent prompt looks like

Focused, self-contained, and explicit about output. For example:

> Three tests are failing in `src/agents/agent-tool-abort.test.ts`:
>
> 1. "aborts a tool but still captures partial output" — expects "interrupted at" in the message
> 2. "handles mixed completed and aborted tools" — the fast tool is being aborted instead of completing
> 3. "tracks the pending tool count" — expects 3 results, gets 0
>
> These look like timing / race-condition issues. Read the test file, work out the real root cause (a genuine bug, or arbitrary timeouts that should be event-based waits), and fix it. Do not just raise the timeouts, and do not change unrelated production code. Return a summary of what you found and what you changed.

Contrast the failure modes: "fix all the tests" is too broad and the agent gets lost; "fix the race condition" gives no location; with no constraints the agent may refactor half the codebase; with no output spec you won't know what changed.

## Why it pays off

Each subagent has a narrow scope and little to track, so it stays accurate. The investigations happen at once instead of back to back. And because the domains are independent by construction, the fixes integrate cleanly. The cost is yours to manage: you own the split, the context you hand each agent, and the integration check at the end.
