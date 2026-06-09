---
name: systematic-debugging
description: Debug a bug, test failure, crash, or unexpected behaviour by finding the root cause before changing anything, instead of guessing at fixes. Works in any language or stack. Use when something is broken, a test is failing, behaviour is wrong, or a previous fix didn't hold.
---

Find the root cause before you touch a line of code. A fix that targets a symptom you don't understand either fails or moves the bug somewhere else, and each blind attempt makes the next one harder to reason about. Investigation first is not the slow path — it is the fast one.

## The one rule

**No fix before you can name the root cause.** If you can't say "the bug happens because X", you are still investigating, not fixing. The moment you feel "let me just try changing this and see" — stop. That instinct is the thing this skill exists to interrupt.

This holds hardest exactly when it feels most skippable: under time pressure, when the bug "looks simple", when you've already tried two things. Simple bugs have root causes too, and guess-and-check is slower than it feels because every wrong attempt has to be unwound.

## Step 1: Investigate the root cause

Do all of this before forming any fix.

- **Read the actual error.** The full message, the full stack trace, line numbers, error codes. The answer is often already written there. Don't skim past it to the part you assume is the problem.
- **Reproduce it reliably.** What exact steps trigger it? Every time, or intermittently? If you can't reproduce it, you can't confirm a fix — gather more data rather than guessing.
- **Check what changed.** `git diff`, recent commits, new dependencies, config or environment differences. A bug that just appeared usually has a recent cause.
- **Instrument the boundaries** when the system has multiple layers (request → service → database, CI → build → sign). Log what enters and what leaves each boundary, run once, and read where the data first goes wrong. Find the failing layer with evidence before you reason about why that layer fails.
- **Trace the bad value to its origin.** When the error surfaces deep in a call stack, work backward: where did this value come from, what passed it in, and up the chain until you reach the true source. Fix it there, not where it happened to blow up.

## Step 2: Compare against what works

- Find similar code in the same codebase that *does* work. What is different between it and the broken path? List every difference, even ones you're sure don't matter — "that can't be it" is where bugs hide.
- If you're following a reference or pattern, read it completely before applying it. Partial understanding produces confident wrong fixes.

## Step 3: Form one hypothesis and test it minimally

- State it explicitly: "I think the cause is X, because Y." Write it down. Be specific.
- Make the smallest possible change that would confirm or refute it. One variable at a time — don't bundle three speculative changes and lose track of which one mattered.
- If it confirms, move on. If it doesn't, form a *new* hypothesis from what you just learned; don't pile another fix on top of the last.
- If you genuinely don't understand something, say so and dig in or ask, rather than pretending and patching.

## Step 4: Fix the cause and prove it

- Write a failing test that reproduces the bug first — automated if there's a framework, a throwaway script if not. A fix without a test that once failed doesn't stay fixed. (Use the `test-driven-development` skill for the red-green discipline here.)
- Make one change addressing the root cause. No "while I'm in here" refactors or bundled improvements — they muddy what actually fixed it.
- Verify: the new test passes, the original symptom is gone, and nothing else broke. Don't claim it's fixed off a code change alone — run it. (The `verify-completion` skill covers this gate.)

## When fixes keep failing

Count your attempts. If three fixes have failed, stop fixing. Three failures — especially when each one reveals a new problem in a different place, or each "fix" needs a larger refactor to work — is not a run of bad luck. It is a sign the underlying design is wrong. Step back and question the architecture itself with the user before attempting a fourth patch. That is a different conversation, not another guess.

## Red flags in your own thinking

These thoughts all mean *return to Step 1*:

- "Quick fix now, understand it later."
- "It's probably X, let me just change that."
- "Let me change a few things and run the tests."
- "I'll skip the test and check it by hand."
- "I don't fully get it, but this might work."
- Listing fixes before you've traced the data flow.
- "One more attempt" — after you've already tried two.

## If there really is no single root cause

Occasionally thorough investigation shows the issue is genuinely environmental, timing-dependent, or external. Then: document what you ruled out, implement appropriate handling (retry, timeout, a clear error, monitoring), and move on. But reach this conclusion only after the investigation above — most "no root cause" calls are just incomplete ones.
