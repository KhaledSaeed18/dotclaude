---
name: test-driven-development
description: Implement a feature or bugfix test-first using the red-green-refactor cycle — write a failing test, watch it fail, write the minimal code to pass, then clean up. Works in any language or test runner. Use when building new behaviour or fixing a bug and you want the test to actually prove the code works.
---

Write the test before the code, watch it fail, then write only enough code to make it pass. The point of seeing it fail first is simple: a test you never watched fail might be testing nothing. Tests written after the fact pass immediately, and a test that has only ever passed proves nothing about whether it would catch the bug.

## The one rule

**No production code without a failing test that demands it.** If you wrote the implementation first, the honest move is to delete it and start from the test — not keep it "as reference" and reconstruct it, which is just testing-after wearing a costume. Implement fresh from what the test asks for.

Exceptions worth asking the user about: throwaway prototypes, generated code, pure config. Everything else — features, bugfixes, behaviour changes — goes test-first. The thought "I'll skip TDD just this once" is the rationalisation this skill exists to catch.

## Where the test goes: seams

A **seam** is the public boundary you test at — the interface where behaviour is observable without reaching inside. Tests live at seams, never against internals: code behind the seam can be rewritten entirely and the tests shouldn't care. The tell that you've tested inside the seam is a test that breaks on a refactor even though behaviour didn't change.

You can't test everything, so decide the seams before writing any test: name the public interface under test and, when the choice isn't obvious, confirm it with the user ("what's the public interface here, and which paths matter most?"). Agreed seams put the testing effort on critical paths and complex logic instead of spraying assertions over every private helper.

## The cycle: red → green → refactor

### Red — write one failing test

Write a single test for one behaviour, with a name that describes that behaviour. Exercise the real code, not a mock of it — a test that asserts a mock was called tests the mock, not your logic. Mock only what you genuinely can't run (network, clock, filesystem) and only when unavoidable.

Good: `test('retries a failed operation three times before giving up')` — clear name, one behaviour, real code path.
Avoid: `test('retry works')` driving a pre-scripted mock — vague, and it verifies the mock's script rather than the implementation.

Expected values come from an independent source of truth — a known-good literal, a worked example, the spec — never recomputed the way the code computes them. `expect(add(a, b)).toBe(a + b)` passes by construction and can never disagree with the code; it is a tautology wearing a test's clothes. Same for a hand-derived snapshot built with the same reasoning as the implementation.

### Verify red — watch it fail, for the right reason

Run the test. This step is not optional. Confirm it *fails* (not errors out on a typo or import), and that it fails because the behaviour is missing — the assertion you expect, not "function not defined" hiding a different problem. If it passes, you're testing something that already exists; fix the test. If it errors, fix the error and re-run until it fails cleanly.

### Green — minimal code to pass

Write the simplest thing that makes the test pass. No extra options, no configurability nobody asked for, no "while I'm here" features. Resist designing for imagined future needs — the next test will pull the design forward when it's actually needed.

### Verify green — watch it pass

Run it again. Confirm this test passes, every other test still passes, and the output is clean (no new warnings or stray logs). If your test fails, fix the code, not the test. If a *different* test broke, fix that now.

### Refactor — clean up while green

Only once green: remove duplication, improve names, extract helpers. Keep the tests passing the whole time and don't add new behaviour here — new behaviour means a new red test.

Then repeat for the next behaviour.

## Why the order is the whole point

Tests written after the code are shaped by the code: you test what you happened to build, verify the edge cases you happened to remember, and never watch the test catch anything. Tests written first force you to state what the code *should* do and to discover edge cases before they're buried in an implementation. "Thirty minutes of tests afterward" gets you coverage but throws away the proof that the tests work.

If a test is hard to write, listen to it — hard to test usually means hard to use, or too tightly coupled. That's design feedback, not a reason to skip the test.

## Bugfix flavour

A bug is a missing test. Write a test that reproduces the bug and fails, then fix the code until it passes. Now the fix is proven and the regression can't silently come back. Never fix a bug without first having a test that fails because of it.

## Red flags — stop and restart test-first

- Production code exists with no test that failed first.
- The test passed the very first time you ran it.
- You can't explain why the test failed.
- "I'll add tests at the end."
- "I already tested it by hand."
- "Keep the code as reference and write tests around it."
- "I've spent hours on this, deleting it is wasteful." (Sunk cost — untrusted code is the liability, not the deleted time.)
- "TDD is dogmatic, I'm being pragmatic." (Test-first *is* the pragmatic path; the alternative is debugging in production.)
- Writing all the tests first, then all the implementation. That's horizontal slicing: bulk tests verify *imagined* behaviour and commit you to a test structure before the implementation has taught you anything. Work in vertical slices — one test, one implementation, repeat — each test a tracer bullet shaped by what the last cycle revealed.
- An assertion that mirrors the implementation's own arithmetic or a snapshot derived the same way the code derives it (see the tautology note under Red).

## Quick checklist before calling it done

- Every new function or behaviour has a test.
- You watched each test fail before implementing it, and it failed for the expected reason.
- The implementation is the minimum that passes.
- All tests pass and the output is clean.
- Tests run real code; mocks appear only where unavoidable.
- Edge cases and error paths are covered.

Can't tick every box? You drifted off TDD — go back to the last green point and restart test-first from there.
