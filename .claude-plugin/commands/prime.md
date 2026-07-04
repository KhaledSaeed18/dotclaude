---
name: prime
description: Load project context into the session by reading key files and recent history. Primes the model with package metadata, architecture notes, recent commits, and directory structure so it can give better answers immediately. Use at the start of a session when switching to an unfamiliar repository or after a long break from a project.
argument-hint: "[scope]"
allowed-tools: Read, Glob, Grep, Bash(git:*), Bash(ls:*), Bash(find:*), Bash(cat:*)
model: inherit
---

## Context

Scope (optional): `$ARGUMENTS`

**Project manifest:**

!`cat package.json 2>/dev/null || cat pyproject.toml 2>/dev/null || cat Cargo.toml 2>/dev/null || cat go.mod 2>/dev/null || echo "(no manifest found)"`

**Directory structure (top two levels):**

!`find . -maxdepth 2 -not -path '*/.git/*' -not -path '*/node_modules/*' -not -path '*/__pycache__/*' -not -path '*/dist/*' -not -path '*/.next/*' | sort | head -60`

**Recent commits:**

!`git log --oneline -15 2>/dev/null || echo "(not a git repository)"`

**Active branch and status:**

!`git status --short 2>/dev/null | head -20`

## Task

Read the files above and any additional ones needed to build a working mental model of this project. Then deliver a concise session brief.

### Step 1: Extend the read

Beyond what is already injected above, read:

- `CLAUDE.md` or `CLAUDE.local.md` if present (project-specific conventions for this session)
- `README.md` or `README` (project purpose and setup)
- The main entry point for the project (the `main` or `index` file, the root route file, or the top-level `src/` directory)
- Any architecture decision records (`docs/adr/`, `decisions/`, or similar) if the scope argument names an area that would benefit from them

If `$ARGUMENTS` is set, focus the read on that path or module rather than the full project.

### Step 2: Identify what matters right now

From the git log and status:

- What work is in progress (uncommitted or staged changes)?
- What was the last significant change (most recent meaningful commit)?
- Are there any open merge conflicts or rebase states?

### Step 3: Deliver the session brief

Respond with four short sections, each under five lines:

**Project:** One sentence on what this project does and its primary tech stack.

**Structure:** The two or three most important directories and what lives in each. Skip boilerplate folders (`node_modules`, `dist`, `.git`).

**Recent work:** What the last few commits changed and whether any of that work is unfinished.

**Conventions to know:** Anything in `CLAUDE.md` or the project docs that will affect how you should work in this session (test runner, commit style, deployment process, important constraints). If nothing is documented, say so.

End with one sentence on what the project looks most ready to have done next, based purely on the git state and file structure.
