---
name: adr
description: "Write an Architecture Decision Record from the current discussion or a stated decision: numbers it in sequence under docs/adr/, captures context, the options considered with their trade-offs, the decision, and its consequences, in the adr-writing skill's format and the repo's existing ADR style if one exists. Use when a design choice has just been made in conversation, when a reviewer asks why something was done this way, or when a decision needs to outlive the people who made it."
argument-hint: "<decision title> [--supersedes N] [--status proposed|accepted]"
allowed-tools: Read, Write, Glob, Grep, Bash(git:*), Bash(ls:*), Bash(date:*)
model: inherit
---

## Context

Title and options: `$ARGUMENTS`

Today: !`date +%Y-%m-%d`

**Existing ADRs:**

!`ls docs/adr docs/decisions doc/adr adr 2>/dev/null | tail -15 || echo "(none; docs/adr/ will be created)"`

**Last ADR (for format):**

!`for d in docs/adr docs/decisions doc/adr adr; do f=$(ls $d/*.md 2>/dev/null | sort | tail -1); [ -n "$f" ] && sed -n 1,40p "$f" && break; done 2>/dev/null || echo "(no template to match; using the adr-writing format)"`

## Task

Write one ADR by applying the `adr-writing` skill.

1. **Locate the directory and the next number.** Use the existing ADR directory if any; otherwise `docs/adr/`. Number is the highest existing plus one, four digits (`0007`). File name `NNNN-<kebab-title>.md`.
2. **Match the existing format** if ADRs exist (headings, status vocabulary, metadata line). Otherwise use the skill's template.
3. **Fill it from the conversation.** The context, options, and reasoning were usually just discussed; capture them faithfully, including the options that were rejected and why. Where the discussion did not cover something the template needs (consequences, migration), write what follows from the decision and mark speculation as such.
4. **Status** from `--status` (default `accepted` if the decision was made, `proposed` if it is still open). With `--supersedes N`, set this ADR's "Supersedes" line and append "Superseded by NNNN" to the old one's status.
5. **Show the ADR** before writing and ask for a yes. Then write it, and if the repository keeps an index (`docs/adr/README.md` or similar), add the row.

Report the path and a one-line summary. Do not commit; that is `/commit`.
