---
name: github-actions-pipeline
description: "Design, write, or fix GitHub Actions workflows for a project: a CI pipeline with the right triggers, concurrency, caching, matrix, and least-privilege permissions; pinned actions; reusable workflows and composite actions; deploy workflows with environments and OIDC instead of long-lived secrets; and the debugging moves for slow, flaky, or failing runs. Use when adding CI to a repository, when a pipeline is slow or flaky, when a workflow needs deploy or release steps, or when a security review flags workflow permissions."
argument-hint: "(optional) the project type, what the pipeline must do, or the failing workflow"
---

A pipeline is trusted when it is fast enough to run on every push, deterministic enough that a red is a real failure, and locked down enough that a compromised dependency cannot use it. Design for those three before adding steps.

## A CI workflow skeleton

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read            # top-level default; widen per job only

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4      # pin to a SHA in security-sensitive repos
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test -- --reporter=junit --outputFile=junit.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: test-results-${{ matrix.node }}, path: junit.xml }
```

## Rules

**Triggers**
- `pull_request` for validation, `push` to the default branch for post-merge and deploy, `workflow_dispatch` for manual runs, `schedule` for nightly or dependency checks. Path filters (`paths:`) to skip irrelevant runs, remembering that a required check that is skipped blocks merging unless the branch rule allows it.
- Never `pull_request_target` with a checkout of the PR head unless you understand it: it runs with write permissions on untrusted code.

**Permissions**
- Top-level `permissions: contents: read`; each job adds only what it needs (`pull-requests: write` to comment, `id-token: write` for OIDC, `packages: write` to publish).
- No long-lived cloud keys in secrets; use OIDC federation (`aws-actions/configure-aws-credentials` with a role, `google-github-actions/auth`, Azure federated credentials).
- Secrets never printed; `::add-mask::` for derived values; no `set -x` in steps that touch them.

**Pinning**
- Third-party actions pinned to a full commit SHA with a version comment, bumped by Dependabot (`package-ecosystem: github-actions`). First-party `actions/*` at a major tag is an acceptable compromise in low-risk repos.
- Tool versions from the repo's own files (`.nvmrc`, `.tool-versions`, `package.json` `engines`), not hard-coded twice.

**Speed**
- Cache the package manager store via the setup action's `cache:` input; cache build outputs (`actions/cache` keyed on lockfile hash plus source hash) only when the build is expensive and the cache is safe.
- Split into jobs that run in parallel (lint, typecheck, test, build) when each takes over a minute; keep one job when they are all fast, because job startup costs 20 to 40 seconds.
- `timeout-minutes` on every job so a hang fails instead of consuming the runner for six hours.
- `concurrency` with `cancel-in-progress` on pull requests so pushes supersede stale runs.

**Determinism**
- `--frozen-lockfile` / `npm ci` / `pip install -r` with hashes; no `latest` tags; pinned runner images when the OS matters (`ubuntu-24.04` over `ubuntu-latest` for reproducibility).
- Retries only for steps with known transient failure (network installs), via a retry action with a small count; a retried test is a flaky test to fix, not to hide.

**Reuse**
- A reusable workflow (`on: workflow_call`) for a pipeline shared across repos; a composite action (`action.yml` with `runs: using: composite`) for a bundle of steps shared across jobs. Version them by tag.

## Deploy workflows

```yaml
jobs:
  deploy:
    needs: [test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    permissions: { id-token: write, contents: read }
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: arn:aws:iam::123456789012:role/gh-deploy, aws-region: eu-west-1 }
      - run: ./scripts/deploy.sh
```

Environments carry the protection rules (required reviewers, wait timers, branch restrictions) and the environment-scoped secrets. Deploy from an artifact built in the tested job (`actions/download-artifact`), not from a fresh build, so what was tested is what ships.

## Releases

Tag-triggered (`on: push: tags: ['v*']`), build, create the release with `gh release create` or `softprops/action-gh-release`, attach artifacts, publish packages with provenance (`npm publish --provenance` needs `id-token: write`).

## Debugging

- Re-run with debug logging (`ACTIONS_STEP_DEBUG` secret or the "enable debug logging" checkbox) and read the raw log; `gh run view <id> --log-failed` gets the failing step's log locally (the `fix-ci` skill covers the loop).
- Reproduce locally with the same commands and the same tool versions; `act` for a rough approximation of the runner.
- For a flaky test, capture the seed and the artifact, and quarantine with a tracked issue rather than a retry.
- Timing: the run summary shows per-step durations; the slowest step is usually dependency install without cache or a test suite that should be sharded.

## Review checklist

Least-privilege permissions; no `pull_request_target` misuse; actions pinned; frozen installs; caching keyed correctly; timeouts; concurrency; artifacts uploaded on failure; deploy from tested artifact with an environment and OIDC; no secrets in logs.
