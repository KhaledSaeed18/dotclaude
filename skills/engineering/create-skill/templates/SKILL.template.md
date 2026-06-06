---
name: your-skill-name
description: <What it does, third person> — <the concrete value in a clause or two>. Use when <the user phrasings / situations that should load this skill>.
argument-hint: "(optional) what arguments mean — delete this line if the skill takes none"
---

<One or two sentences framing the job: what this skill produces and the principle that governs how. Write to the agent, imperative. Don't restate the description.>

## Hard rules — never break these

- **<Non-negotiable, stated as a rule>.** <Why it matters / what breaks if ignored.>
- **<Safety gate>.** Confirm before anything irreversible or outward-facing (commits, pushes, deletes, network sends).
- **<Scope boundary>.** What this skill does *not* do.
- **No AI/co-author mentions** in any output this skill produces.

## Step 1 — <Gather context / orient>

<Read-only discovery first. The commands or files to inspect so the skill acts on reality, not assumptions.>

## Step 2 — <Core work>

<The main procedure. Keep each step scannable. Put the actual commands, decisions, and branches here.>

| <Column> | <Column>      |
| -------- | ------------- |
| <case>   | <what to do>  |

## Step 3 — <Verify>

<How to confirm the result is correct before finishing — build, tests, re-read, dry-run.>

## Step 4 — <Finalize, with confirmation>

<The outward-facing or irreversible action, gated on explicit user approval. State exactly what will happen first.>

<Closing line: what to report or produce so the result is reviewable.>

<!--
  Authoring notes (delete before shipping):
  - Keep this SKILL.md lean — it's loaded in full whenever the skill triggers.
  - Move long tables, format specs, examples, and fill-in templates into
    ./reference/<topic>.md or ./templates/<thing>.md and link them:
    [label](./reference/topic.md). They load only when the agent opens them.
  - Run `pnpm gen` then `pnpm validate` after creating or editing the skill.
  - Never hand-edit registry.json or the README catalog — `pnpm gen` owns them.
-->
