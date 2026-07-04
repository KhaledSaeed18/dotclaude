---
name: executing-plans
description: Execute a written implementation plan task by task, reviewing it critically first, following each step exactly, running every verification, and stopping to ask rather than guessing when blocked. Use when you have a plan document (such as one from the writing-plans skill) and need to implement it in this session.
---

Take a finished implementation plan and turn it into working code, one task at a time, without drifting from what the plan says. The plan has already done the thinking and the decomposition; your job is faithful execution plus the judgement to stop when something is genuinely wrong.

## Step 1: Load and review the plan critically

Read the whole plan before doing anything. Don't take it on faith — look for gaps, contradictions, steps that can't work, or instructions you don't actually understand. If you have real concerns, raise them with the user before you start, not halfway through. If it's sound, create a task list from it and begin.

If the work isn't already isolated and the plan calls for it, set up an isolated workspace first with the `git-worktrees` skill. Never start implementing on `main` or `master` without the user's explicit consent.

## Step 2: Execute task by task

For each task, in order:

- Mark it in progress.
- Follow each step exactly as written — the steps are deliberately bite-sized, so do them as given rather than collapsing or reordering them.
- Run every verification the plan specifies. Don't skip a test or a build because the code "looks right."
- Mark it complete only once its verifications actually pass.

Don't bundle in changes the plan didn't ask for. If you spot something worth doing that's outside the plan, note it and raise it — don't silently fold it into a task.

## Step 3: Stop and ask when blocked

Stop immediately — don't guess or work around it — when:

- You hit a blocker: a missing dependency, a test that won't pass, an unclear instruction.
- The plan has a gap that prevents you from starting or continuing a task.
- A verification keeps failing and you don't understand why.
- The approach itself looks wrong once you're in the code.

Ask for clarification rather than improvising. If the user updates the plan in response, return to Step 1 and re-review the changed parts before continuing.

## Step 4: Finish the work

Once every task is done and its verifications pass, don't just stop — wrap up the branch deliberately using the `finish-branch` skill, which verifies the full test suite and walks through how to integrate the work (merge, PR, keep, or discard).

## Keep in mind

- Review the plan critically before trusting it; follow it exactly once you do.
- Never skip a verification step.
- When the plan references another skill, use it.
- Stop when blocked instead of guessing.
- Don't claim a task is done off a code change alone — the `verify-completion` skill is the standard here: run the check, read the output, then claim the result.
