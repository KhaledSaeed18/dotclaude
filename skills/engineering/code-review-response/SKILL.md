---
name: code-review-response
description: Process code-review feedback with technical rigour — understand each point, check it against the actual codebase, and respond with reasoning or implementation rather than reflexive agreement. Use when you receive review comments (from a human, the code-reviewer agent, or any reviewer) and are about to act on them, especially if any feedback seems unclear or wrong.
---

Code review is a technical exchange, not a social one. The job isn't to agree warmly and start changing things — it's to understand each point, verify it against the real code, and then implement it, push back on it, or ask about it on the merits. Blindly applying a suggestion that's wrong for this codebase is as much a failure as ignoring a good one.

## The response pattern

For each piece of feedback:

1. **Read it fully** before reacting. Take in all of it, not just the first comment.
2. **Restate the point** in your own words — or ask, if you can't. If you can't articulate what's being asked, you can't correctly implement it.
3. **Verify against reality.** Check the claim against the actual codebase. Is the problem real here? Does the suggested approach fit how this code already works?
4. **Evaluate on technical merit.** Is it sound *for this codebase*, not just in the abstract?
5. **Respond.** A technical acknowledgement, a clarifying question, or reasoned pushback — whichever the evaluation produced.
6. **Implement one item at a time**, verifying each before moving to the next.

## Skip the performance

Don't open with "You're absolutely right!", "Great point!", or "Let me implement that right away" — the first two are filler, and the third commits you before you've checked anything. Replace the reflex with substance: restate the technical requirement, ask a clarifying question, push back with reasoning if it's wrong, or just quietly start the work. Actions communicate more than agreement noises.

## When feedback is unclear

If any item is ambiguous, stop — don't implement anything yet — and ask about the unclear items specifically. Guessing at what a reviewer meant and building the wrong thing wastes both your effort and their next review. It's faster to ask.

## When feedback seems wrong

Sometimes a suggestion is incorrect for this codebase: it misreads the code, conflicts with a constraint the reviewer can't see, or would introduce a regression. Push back — with evidence. Cite the file and line, state the concrete problem the suggestion would cause, and propose the alternative. A reviewer would rather be shown a real issue than have a mistaken comment implemented silently. If you turn out to be the one who's wrong, you've learned something; either way the code is better than if you'd agreed reflexively.

## Implementing

- One item at a time. Bundling several changes makes it impossible to tell which one broke something.
- Verify each change before the next — the `verify-completion` skill is the standard: run the check, read the output, then move on.
- For anything non-trivial, a failing-test-first approach (the `test-driven-development` skill) proves the change does what the reviewer asked.
- Track which items you've addressed and which you've deferred, so the reviewer can see what happened to each comment.
