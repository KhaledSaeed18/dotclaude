---
name: fix-ci
description: Diagnose and fix a failing CI run by pulling the actual failure logs (gh run view --log-failed), reproducing the failure locally, fixing the root cause rather than the symptom, and verifying green before and after pushing. Use when a GitHub Actions run is red, a PR check is failing, or CI passes locally but fails remotely.
---

Fix the failure CI actually reported, not the one you assume it hit. The log line that failed the job is evidence; everything else is guessing. Pull it first, reproduce it locally second, and only then change code.

## Step 1: Get the real failure

```bash
# What failed, and on which commit
gh run list --limit 10
gh run view <run-id> --log-failed 2>&1 | tail -80
```

Read the failed step's output completely. Identify: the failing step name, the exact error, and whether the failure is in *your change* or in the pipeline itself (setup step, cache, runner image, flaky network). If several jobs failed, find the first failure in dependency order; downstream jobs often fail as a consequence.

If the run belongs to a PR, also check which check is required and whether the failure is new to this branch:

```bash
gh pr checks <pr-number>
git log --oneline origin/main..HEAD
```

## Step 2: Reproduce locally

Run the failing step's actual command from the workflow file, not your usual local equivalent:

```bash
# Read the workflow to get the exact command and environment
cat .github/workflows/<workflow>.yml
```

- **Reproduces locally:** it is a code problem. Debug it normally (the `systematic-debugging` skill applies) and fix the root cause.
- **Passes locally, fails in CI:** the difference is environmental. Compare in this order: dependency install mode (`--frozen-lockfile` vs a loose local install), Node/tool versions (CI pins one; check yours), OS differences (case-sensitive paths, line endings), missing env vars or secrets, and cache staleness. State which difference explains the failure before changing anything.
- **Not reproducible and clearly infrastructure** (runner network blip, rate limit, timeout on a step that touches nothing you changed): rerun once with `gh run rerun <run-id> --failed`. If it fails the same way twice, it is not flake; go back to evidence.

## Step 3: Fix the cause, not the check

Make the smallest change that addresses the named root cause. Things that are not fixes:

- Deleting or skipping the failing test to make CI green.
- Loosening an assertion until it passes.
- Adding `continue-on-error` or removing the step.
- Bumping a timeout without knowing why the step got slower.

Any of these may be *proposed* to the user with justification, but never applied silently as "the fix".

## Step 4: Verify green, twice

1. **Locally:** run the exact failing command again and confirm it passes, plus the project's full check suite so the fix didn't break a sibling.
2. **Remotely:** push, then watch the run to completion rather than assuming:

```bash
gh run watch <new-run-id> --exit-status
```

Report the root cause, the fix, and the green run link. If the failure was flake, say so explicitly and note the rerun that confirmed it.
