---
name: verify-completion
description: Gate every "it works / it's fixed / tests pass / done" claim behind fresh evidence — run the actual verifying command, read its output, and only then state the result. Use before committing, opening a PR, marking a task complete, handing off to or trusting a subagent, or otherwise asserting that work succeeded.
---

Don't claim work is done, fixed, or passing unless you've just run the thing that proves it and read the output. Saying it's complete when you haven't checked isn't optimism — it's reporting something you don't know to be true, and it breaks trust the moment it turns out wrong.

## The one rule

**No completion claim without fresh verification.** If you haven't run the verifying command in this turn, you can't say it passes. "Should pass now", "I'm confident", "the logs looked fine" are not evidence — they're the feelings that precede unverified claims.

## The gate

Before stating any status, or even expressing satisfaction ("great", "perfect", "done"):

1. **Identify** the command that would prove the claim.
2. **Run** it — the full command, fresh, start to finish. Not a partial check, not a remembered result from earlier.
3. **Read** the whole output: exit code, failure count, warnings.
4. **Decide.** Does the output actually confirm the claim? If not, state the real status with the evidence. If so, state the claim *with* the evidence.

Skipping any of these steps turns a verification into a guess.

## What each claim actually requires

| Claim | What proves it | What does *not* |
|---|---|---|
| Tests pass | A fresh test run showing 0 failures | A previous run; "should pass" |
| Linter clean | Linter output, 0 errors | A partial check; extrapolating |
| Build succeeds | Build command, exit 0 | Linter passing; logs "looking good" |
| Bug fixed | The original symptom retested and gone | The code changed, so it's "probably fixed" |
| Regression test works | Watched it fail before the fix, pass after | It passes once now |
| Requirements met | A line-by-line pass over the requirements | Tests passing |
| Subagent finished | The actual diff / output inspected | The subagent reporting "success" |

A linter passing doesn't mean it compiles. A subagent saying "done" doesn't mean it did the work — check the diff. A regression test that's only ever passed hasn't been shown to catch anything; verify it fails without the fix, then passes with it.

## Red flags — stop before you claim

- Reaching for "should", "probably", "seems to."
- About to say "great" / "perfect" / "done" before running anything.
- About to commit, push, or open a PR without a fresh check.
- Taking a subagent's success report at face value.
- Leaning on a partial or earlier run.
- "Just this once" / "I'm tired, close enough."
- Any wording that implies success when you haven't run the proof.

Different phrasing doesn't exempt you — a paraphrase that implies the work is done is still a completion claim.

## The bottom line

Run the command. Read the output. *Then* make the claim. There's no shortcut that preserves the honesty of the statement.
