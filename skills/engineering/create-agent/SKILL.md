---
name: create-agent
description: Author a new subagent for this repository end to end by scaffolding it with pnpm new, curating its tool allowlist, setting model, color, and memory in frontmatter, then writing a focused system prompt and regenerating the registry. Use when creating, scaffolding, or reviewing an agent or subagent in this repo.
argument-hint: "(optional) the agent's purpose, proposed name, or category"
---

Create a subagent that earns its own context window: one clear role, a tightly curated tool allowlist, and a system prompt focused enough that the main agent knows exactly when to delegate to it. Then regenerate the derived files and validate.

Source layout is `agents/<category>/<name>/AGENT.md`. Agents are **file-layout**: the folder must contain only `AGENT.md`, because it installs as the single file `.claude/agents/<name>.md`. The **category is the folder**; the per-agent `registry.json`, the root `registry.json`, and the README catalog are all *generated* by `pnpm gen`. Never hand-edit generated files.

## Hard rules: never break these

- **One agent, one role.** A subagent exists to keep a side task out of the main context and return a tight result. If the role needs "and" to describe it, narrow it or split it.
- **Curate the tool allowlist ruthlessly.** The whole point of a subagent is a constrained tool set. Grant only what the role genuinely needs; omit `Bash` unless it must run commands, omit write tools for a read-only reviewer. Inheriting everything defeats the purpose.
- **File layout: only `AGENT.md`.** No companion files in an agent folder. `pnpm gen` rejects extra files because the agent installs as one file. Reference material for the agent goes in its system prompt, not a sidecar.
- **`name` is globally unique and equals the folder name**, kebab-case. Agents install to a flat `.claude/agents/<name>.md`.
- **Never hand-write `registry.json` or the README catalog.** They are derived; run `pnpm gen`.
- **No AI/co-author mentions** anywhere in the agent or in what it produces.

## Step 1: Define the agent

Pin down before writing a line:

- **The one role**, in a sentence.
- **When the main agent should delegate to it.** This is the most load-bearing decision; it drives the `description`.
- **The tools the role actually needs.** List them; everything else stays off.
- **The model.** `opus` for synthesis and hard judgment, `haiku` for cheap high-volume work, `inherit` (the default) when it should match the session.

If the role is fuzzy or sounds like two jobs, sharpen or split it now.

## Step 2: Scaffold it

From the repo root, let the scaffolder create the folder, stub, and regenerate in one step:

```
pnpm new --type agent --category <category> --name <name> --description "<what it does. Use when ...>"
```

Current agent categories: `engineering`, `research`. Reuse one unless a genuinely new family is justified. The scaffolder enforces kebab-case and global name uniqueness, so a bad name fails fast.

## Step 3: Write the frontmatter

Required: `name`, `description`. The rest are optional but shape behavior, cost, and UI. Full field table and valid values: [reference/frontmatter.md](./reference/frontmatter.md).

- **`description` is the delegation trigger.** Third person, lead with the capability, end with an explicit **"Use when …"** clause naming the situations that should route to this agent. Vague descriptions never get delegated to (avoid a `: ` in the value; it is YAML).
- **`tools`**: the curated allowlist from Step 1.
- **`model`**, and optionally **`color`** (UI accent) and **`memory`** (`user` / `project` / `local` for cross-session learning). `pnpm validate` rejects an invalid color, memory scope, or model, so typos fail in CI.

## Step 4: Write the system prompt

The markdown body is the agent's system prompt. Address the agent in the second person, imperative. The shape that works:

1. One or two lines establishing the role and the standard it's held to.
2. **Operating rules / hard constraints** the agent must always follow.
3. The **procedure** if the work is staged.
4. The **exact output** it should return to the caller, since that result is all the main agent sees.

Keep it focused. A subagent's prompt should be sharp, not a second copy of the whole repo's conventions.

## Step 5: Regenerate and validate

```
pnpm gen        # writes registry.json files and the README catalog
pnpm validate   # checks frontmatter values + layout, then shadcn registry validate
```

If `pnpm validate` flags the frontmatter or layout, fix the source `AGENT.md` and rerun; never patch generated output.

## Step 6: Review against the bar

- The `description` would actually get the agent delegated to on the intended situations, and not over-trigger.
- The tool allowlist is the minimum the role needs, nothing more.
- The folder contains only `AGENT.md`.
- `color`/`memory`/`model` are valid and `pnpm validate` passes.
- It reads like the existing agents in voice and structure.

Report the agent's path, category, its tools and model, and the validation result. Leave committing to the user.
