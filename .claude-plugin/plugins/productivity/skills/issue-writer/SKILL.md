---
name: issue-writer
description: Turn a rough bug report, idea, or complaint into a well-formed, actionable issue - investigating the codebase first to add reproduction steps, expected vs actual behaviour, suspected location, and acceptance criteria - then filing it with gh or emitting paste-ready markdown. Use when the user says "file an issue for this", "write this up", describes a bug in passing that should be tracked, or wants a feature request made concrete.
---

An issue is a work order for someone with none of this conversation's context. Write it so that a developer who picks it up cold can reproduce the problem, knows when they are done, and starts in the right file - and do the investigating now, while the context exists, rather than leaving it to them. A two-minute look at the code turns "the export is broken" into an issue with a suspected cause and a pointer.

## Step 1: Extract and classify

From the user's description (and the current conversation - the bug being discussed right now is usually the subject), pin down:

- **Type:** bug, feature request, or task/chore. This decides the template below.
- **The one-sentence problem.** If you cannot state it in one sentence, you do not understand it yet; ask the one or two questions that resolve it. Do not interrogate - two questions maximum, then write with what you have and mark the gaps.
- **Severity signals** for bugs: data loss, wrong results, crash, cosmetic? Who hits it and how often?

## Step 2: Investigate before writing

Spend a short, bounded pass in the repo making the issue concrete:

- **Bugs:** find the code path involved (`grep` the error message, the feature name, the route). Note the suspected file/function. If reproduction is cheap - a failing command, a curl, a unit test - actually run it and record the real output. Check `git log` on the suspect file for a recent change that correlates.
- **Features:** find where the change would land, what patterns exist to follow, and any related prior art (an existing similar feature, an old TODO, a closed issue).
- **Duplicates:** when `gh` is available, search first - `gh issue list --search "<keywords>" --state all --limit 10`. A duplicate found now saves a triage round-trip; link it instead of filing twice.

Everything found goes in the issue as fact ("reproduced on `main` at `abc1234`, output below"), everything guessed goes in clearly marked as hypothesis ("possibly introduced by #118 - unverified").

## Step 3: Write it

**Title:** specific and searchable - symptom plus context, under ~70 chars. "CSV export drops rows with embedded newlines", not "Export broken".

**Bug body:**

```markdown
## Summary
<one sentence: who hits what, under which conditions>

## Reproduction
1. <exact steps, commands, or failing test - copy-pasteable>

**Expected:** <what should happen>
**Actual:** <what happens - real output/stack trace in a collapsed block if long>

## Environment
<version/commit, OS/browser/runtime - only the ones that matter>

## Notes
<suspected location (file:line), correlated change, workaround if any - hypotheses labelled as such>
```

**Feature body:** Problem (the need, not the solution), Proposed solution (concrete but open to alternatives), Acceptance criteria (checkboxes a reviewer can verify), Out of scope (the line that stops creep).

Respect the repository's own conventions: if `.github/ISSUE_TEMPLATE/` exists, fit its structure and answer its fields; reuse the labels the repo actually has (`gh label list`) instead of inventing new ones.

## Step 4: File or hand over

With `gh` and a confirmed target repo: show the final title and body, then file with `gh issue create --title ... --body ...` plus appropriate labels, and report the URL. Filing is outward-facing - show before sending unless the user already said to file directly.

Without `gh` or when the tracker is elsewhere (Jira, Linear): emit the finished markdown in a code block, ready to paste, with the labels/priority suggestion noted at the top.
