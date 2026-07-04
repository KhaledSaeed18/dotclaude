---
name: brainstorming
description: Turn a rough idea into a fully formed, written design through collaborative dialogue — exploring intent, requirements, and trade-offs one question at a time, then proposing approaches and capturing the agreed design in a spec before any code is written. Use at the start of any creative or feature work, when the idea isn't yet concrete enough to plan or build.
---

Help shape a vague idea into a concrete, agreed design before anything gets built. The work is collaborative and conversational: understand what the user actually wants, surface the decisions hidden inside the request, weigh approaches together, and write the result down. The goal is a design the user has explicitly approved — not code, and not a plan yet.

## Don't jump to implementation

Hold off on writing code, scaffolding a project, or invoking any build/plan skill until you've presented a design and the user has approved it. This holds even when the task looks trivial. "Too simple to need a design" is exactly where unexamined assumptions cause the most wasted work — a to-do app, a one-function utility, a config change all carry decisions worth naming. The design can be short (a few sentences for a genuinely simple thing), but present it and get a yes before moving on.

## Step 1: Understand the context

Before asking anything, look at what already exists — relevant files, docs, recent commits, the surrounding code. Ground the conversation in the real project so your questions are about *this* idea in *this* context, not generic ones.

## Step 2: Ask questions, one at a time

Refine the idea through dialogue, asking a single question at a time rather than a wall of them. You're after:

- **Purpose** — what problem this solves, and for whom.
- **Constraints** — technical limits, deadlines, things that must not change, existing patterns to fit.
- **Success criteria** — how you'll both know it's right when it's done.
- **Scope edges** — what's explicitly in, and what's explicitly out.

Let each answer shape the next question. This is where unstated assumptions get surfaced and corrected cheaply.

## Step 3: Propose approaches with trade-offs

Once you understand the shape of the problem, put two or three viable approaches on the table. For each, give the trade-offs honestly, and say which one you'd recommend and why. Don't present a single option as if it were the only one, and don't bury your recommendation — the user is deciding, and they decide better with a clear comparison.

## Step 4: Present the design and get approval

Lay out the design in sections, each scaled to its complexity — a hard part gets detail, a trivial part gets a sentence. Get the user's agreement as you go rather than presenting a finished monolith and asking for a single thumbs-up at the end. Adjust as they react.

If the design has load-bearing decisions you're unsure about, pressure-test them before settling — the `grill-me` skill is built for stress-testing a design until the critical decisions are actually resolved.

## Step 5: Write it down and self-review

Capture the agreed design in a spec document (a `docs/specs/YYYY-MM-DD-<topic>.md` location works well unless the project has its own convention). Then read it once with fresh eyes and check for:

- **Placeholders** — anything left as "TBD" or hand-waved.
- **Contradictions** — two parts of the design that can't both be true.
- **Ambiguity** — wording that two engineers would read two different ways.
- **Scope creep** — anything that drifted in beyond what was agreed.

Fix what you find inline. If the spec covers several independent subsystems, note that it should probably be split into one spec per subsystem.

## Step 6: Hand off to planning

Once the spec is written and the user has reviewed it, the natural next step is an implementation plan: use the `writing-plans` skill to turn the approved design into task-by-task work. Don't start coding directly from the brainstorm — the plan is where the design becomes executable.
