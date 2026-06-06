---
name: pr-description
description: Generate a clear, reviewer-friendly pull-request description from a diff — covering what changed, why, risk, and how it was tested. Use when opening a pull request or writing/improving a PR body.
argument-hint: "(optional) base branch, ticket, or PR focus"
---

Write a pull-request description from the actual changes on this branch. Base it on the diff, not on what you assume was intended.

## Gather context

- Diff the branch against its base (default to the repo's main branch, or the base the user named): review the changed files, the commits, and their messages.
- Identify the linked issue/ticket if one is referenced in the branch name, commits, or arguments.
- Separate the substantive change from incidental churn (formatting, renames, generated files).

## Write the description

Use this structure, omitting any section that genuinely doesn't apply:

- **Summary** — one or two sentences: what this PR does.
- **What changed** — the concrete changes, grouped logically, referencing key files.
- **Why** — the motivation or problem being solved; link the issue.
- **Risk / impact** — blast radius, backward compatibility, breaking changes, data migrations, config/env or infra changes, anything reviewers should scrutinise.
- **Testing** — how it was verified: tests added/updated, manual steps, and explicitly what was *not* covered.
- **Notes for reviewers** — trade-offs, follow-ups, screenshots for UI changes.

## Rules

- Be factual and specific — describe what the diff does; don't speculate or oversell.
- Call out breaking changes and required migration steps prominently.
- Keep it scannable: short paragraphs and bullets over walls of text.
- If the repo has a PR template (`.github/PULL_REQUEST_TEMPLATE*`), match its structure.
- Never fabricate test results; if something wasn't tested, say so.
