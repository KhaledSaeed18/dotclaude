---
name: explain-code
description: Walk through a file, function, class, or module and explain what it does, how it works, and why it is structured the way it is. Suited for onboarding onto unfamiliar code, understanding a complex algorithm, or preparing to modify something you have not read before. Pass a file path or a symbol name as the argument.
argument-hint: "<file-or-symbol>"
allowed-tools: Read, Grep, Glob, Bash(git:*)
model: inherit
---

## Context

Target: `$ARGUMENTS`

## Task

Explain the code at `$ARGUMENTS` clearly enough that a developer who has never seen it can understand what it does, how it works, and what to know before touching it.

If no argument was given, ask for a file path or symbol name and stop.

### Step 1: Locate the target

If `$ARGUMENTS` is a file path, read it directly. If it names a function, class, or type:

```bash
grep -rn "$ARGUMENTS" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" --include="*.go" --include="*.rs" . | grep -v node_modules | head -20
```

Read the definition first, then any imports it pulls in, then its primary callers (at most two or three) to understand how it is used in practice.

### Step 2: Understand the context

Check what changed recently and why:

```bash
git log --oneline -10 -- "$ARGUMENTS" 2>/dev/null
```

If there is meaningful history, note whether the code has evolved significantly or is stable. Look for any comments explaining non-obvious decisions.

### Step 3: Explain

Structure the explanation as follows:

**What it does:** One or two sentences. The observable purpose from the caller's perspective, not the implementation.

**How it works:** Walk through the key logic step by step. Use concrete examples where the code operates on data (show what goes in, what comes out). For complex control flow, trace the main path first, then branches. Skip boilerplate that does not add to understanding.

**Key design decisions:** Point out anything that is non-obvious or that a reader might initially get wrong. Explain any patterns, abstractions, or constraints that shaped the implementation. If the code works around a bug or a framework quirk, say so.

**Dependencies and callers:** What does this code depend on, and what depends on it? Name the two or three most important relationships.

**What to know before modifying it:** Gotchas, invariants, or side effects a developer must not break. What tests cover it? What is likely to break if the signature or behavior changes?

### Step 4: Depth calibration

If the target is a large file (more than 300 lines) or a deeply nested module, focus on the public surface and the core logic path rather than every private helper. Offer to go deeper on any specific section if the user needs it.
