---
name: create-skill
description: Author a new skill for this repository end to end by choosing its category, writing trigger-friendly frontmatter, structuring the SKILL.md, splitting reference material into companion files, then regenerating the registry and README catalog. Use when creating, scaffolding, restructuring, or reviewing a skill in this repo.
argument-hint: "(optional) the skill's purpose, proposed name, or category"
---

Create a new skill that fits this repository's conventions and earns its place: one clear job, a description that triggers reliably, a lean `SKILL.md`, and any heavy detail pushed into companion files. Then regenerate the derived files and validate.

This repo's source layout is `skills/<category>/<name>/SKILL.md`. The **category is the folder**, so there is no category field. Everything else (per-skill `registry.json`, the root `registry.json`, the README catalog) is *generated* by `pnpm gen` from the folder location plus the frontmatter. Never hand-edit generated files.

## Hard rules: never break these

- **One skill, one job.** If it needs "and" to describe it, it's probably two skills. Split rather than bloat.
- **Earn the skill.** Don't create one for a single command or something a plain instruction covers. A skill is worth it when there's a reusable, multi-step procedure with judgment and rules.
- **Never hand-write `registry.json`** (per-skill or root) or the README catalog. They are derived; run `pnpm gen`. Editing them by hand guarantees drift.
- **The `SKILL.md` body is always loaded when the skill triggers**, so keep it lean. Push reference material, long tables, examples, and templates into companion files the agent reads on demand (progressive disclosure).
- **`name` must be globally unique and equal the folder name**, kebab-case. Skills install to a flat `.claude/skills/<name>/`, so two skills can't share a name even across categories.
- **Don't invent a category.** Reuse an existing folder unless a genuinely new family is justified (and then it's a deliberate decision, not a default).
- **Match the house voice**: see [reference/voice-and-structure.md](./reference/voice-and-structure.md). No AI/co-author mentions anywhere.

## Step 1: Define the skill

Pin down before writing a line:

- **The one job** it does, in a sentence.
- **The trigger**: what a user says or does that should load it. This drives the description.
- **Why a skill**: the reusable procedure/judgment it encodes (vs. a one-off instruction).
- **Whether it already exists**: search `skills/` so you extend rather than duplicate.

If the purpose is fuzzy or sounds like two things, sharpen or split it now.

## Step 2: Name and place it

- **Category**: pick the folder it belongs in. Current categories: `engineering`, `productivity`, `security`, `version-control`. Recategorising later is just a `git mv`.
- **Name**: short, kebab-case, action- or domain-oriented, unique across all skills (see hard rules). The display title is derived by title-casing the name.
- Create `skills/<category>/<name>/`.

## Step 3: Write the frontmatter

Frontmatter is what Claude reads to decide *whether* to load the skill, so it's load-bearing. Required: `name`, `description`. Optional: `title` (defaults to title-cased name), `argument-hint`.

- **`description`** is the trigger: write it third-person, lead with what the skill does, and end with an explicit **"Use when …"** clause covering the phrasings that should fire it. Be specific; vague descriptions misfire.

Full field reference and good/bad examples: [reference/frontmatter.md](./reference/frontmatter.md).

## Step 4: Write the SKILL.md body

Start from [templates/SKILL.template.md](./templates/SKILL.template.md) and adapt. The established shape across this repo:

1. A one- or two-sentence framing of the job.
2. A **Hard rules** section: the non-negotiables and safety gates, stated imperatively.
3. Numbered **Steps**: the procedure, each step scannable, with the actual commands/decisions.
4. A closing line on what to report/produce.

Write in the second person to the agent, imperative and direct. Voice details, do/don't, and structural patterns: [reference/voice-and-structure.md](./reference/voice-and-structure.md).

## Step 5: Split out companion files (when warranted)

Keep `SKILL.md` as the orchestrator. Move into companion files anything that is long, optional, or only needed mid-task: reference tables, format specs, fill-in templates, worked examples. Reference them with relative links so the agent loads them on demand:

```
skills/<category>/<name>/
├── SKILL.md
├── reference/<topic>.md
└── templates/<thing>.template.md
```

`pnpm gen` bundles **every** file in the folder automatically (except `registry.json`) and installs it under `.claude/skills/<name>/<relpath>`. Link from `SKILL.md` like `[label](./reference/topic.md)`. When to split vs. inline: [reference/voice-and-structure.md](./reference/voice-and-structure.md).

## Step 6: Regenerate and validate

From the repo root:

```
pnpm gen        # writes per-skill registry.json, root registry.json, README catalog
pnpm validate   # checks frontmatter + layout, then shadcn registry validate
```

`pnpm gen` is the only thing that should ever touch the generated files. If `pnpm validate` fails, fix the frontmatter/layout it points at and rerun; don't patch the generated output.

## Step 7: Review against the bar

Before calling it done:

- The description would actually trigger on the intended phrasings (and wouldn't over-trigger).
- `SKILL.md` is lean; depth lives in companion files.
- Hard rules and steps are concrete and safe, with confirmations on anything irreversible or outward-facing.
- It reads like the existing skills in voice and structure.
- `pnpm validate` passes and the README catalog shows the new row under the right category.

Report the skill's path, category, what it does, any companion files created, and the validation result. Leave committing to the user.
