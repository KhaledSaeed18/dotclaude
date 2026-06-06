# Voice & structure

How skills in this repo read and how they're laid out. New skills should be indistinguishable in style from the existing ones.

## Voice

- **Address the agent in the second person, imperative.** "Resolve conflicts by integrating both sides", "Gather full context before touching anything." The reader is the model that will execute the skill.
- **Lead with the principle, then the mechanics.** Say what good looks like, then how to do it. The opening line frames the job; it doesn't restate the description.
- **Be concrete.** Real commands (`git diff --name-only --diff-filter=U`), real file names, real decisions — not "analyze the situation appropriately."
- **Direct and dense.** No filler, no hedging, no motivational throat-clearing. Every line earns its place.
- **Bold the rule, explain the why.** In rules and tips, lead with a bolded imperative, then a short clause on the reason or failure mode.
- **Never mention Claude, AI, or co-authorship** in a skill or in anything a skill tells the agent to produce.

## Structure

The shape that recurs across the repo (adapt, don't pad):

1. **Framing line(s).** One or two sentences: what the skill produces and the governing principle.
2. **`## Hard rules — never break these`.** A bulleted list of non-negotiables and safety gates. This is where confirmations on irreversible/outward-facing actions live. Put it near the top so it's read before the procedure.
3. **`## Step N — <verb phrase>`.** The procedure, in order. Each step scannable, with the actual commands, tables, and branches. Start with read-only context-gathering; end with the irreversible/finalizing step gated on confirmation.
4. **A closing line** on what to report or produce, so the result is reviewable.

Use tables for case→action mappings and stack-specific variations. Use fenced code blocks for commands and templates.

## Progressive disclosure — when to split into companion files

The `SKILL.md` body is loaded **in full** every time the skill triggers, so it competes for context. Keep it lean; move depth into companion files the agent opens only when it needs them.

**Keep in `SKILL.md`:** the framing, hard rules, the step-by-step procedure, the short decision tables that are central to the flow.

**Split into a companion file when content is:**

- **Long** — a multi-section format spec, an exhaustive reference table.
- **Optional / occasional** — only some runs need it.
- **A fill-in artifact** — a template the agent copies (`templates/…`).
- **Reusable reference** — examples, conventions, deep background (`reference/…`).

If inlining it would push the procedure off the screen, it belongs in a companion file.

## Layout & linking

```
skills/<category>/<name>/
├── SKILL.md                      # orchestrator — always loaded on trigger
├── reference/<topic>.md          # depth, loaded on demand
└── templates/<thing>.template.md # fill-in artifacts
```

- Link with **relative paths**: `[label](./reference/topic.md)`. Those links are how the agent knows the file exists and when to read it — give each a clear label and point to it from the step that needs it.
- `pnpm gen` bundles **every** file in the folder (except `registry.json`) and installs it to `.claude/skills/<name>/<relpath>`, preserving subfolders. There's nothing to register manually.
- Folder names like `reference/`, `templates/`, `docs/` are conventions, not requirements — pick what reads clearly.

## Anti-patterns

- A `SKILL.md` that's a wall of reference text with no procedure.
- Vague steps ("handle it properly") instead of concrete commands and decisions.
- Hand-editing `registry.json` or the README catalog — always run `pnpm gen`.
- A description without a "Use when" clause (see [frontmatter.md](./frontmatter.md)).
- One skill trying to do several jobs — split it.
