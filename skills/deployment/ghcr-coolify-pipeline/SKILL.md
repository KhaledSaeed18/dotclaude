---
name: ghcr-coolify-pipeline
description: Write the single GitHub Actions workflow that takes a repository from pull request to production through GHCR and Coolify. Use when adding deployment to a repo, replacing a CI-only workflow, or debugging a deploy job.
argument-hint: "(optional) the stack (next or express), the production URL, and the existing workflow file"
---

One workflow, five jobs: classify what changed, lint the ops layer, run the quality gates, build and smoke-test the runtime image, deploy through the Coolify API and prune the registry. Pull requests prove the image without publishing it; a push to `main` that changes something shipped publishes and deploys; "Run workflow" on `main` redeploys. Nothing in it needs a long-lived cloud key beyond one Coolify token.

## Hard rules: never break these

- **A main run is never cancelled mid-flight and deploys never overlap.** `cancel-in-progress` only on pull requests; the deploy job holds its own concurrency group.
- **Only `main` publishes and deploys.** Every push condition reads `github.ref == 'refs/heads/main' && github.event_name != 'pull_request'`.
- **The image is proven before it is pushed.** The smoke test runs the image the way production will: own user, own probe, both locales or a real database, and a timed stop.
- **Immutable tags.** `sha-<12>` is what deploys and rollbacks pin; `main` only tracks the newest build.
- **`shell: bash` with pipefail on every job that pipes curl into jq.** Otherwise an empty body reaches jq silently. And never pipe curl into `grep -q`: it closes the pipe early and fails curl; write to a file first.
- **Fail fast when configuration is missing.** The deploy job checks `COOLIFY_URL`, `COOLIFY_APP_UUID` and `COOLIFY_TOKEN` before touching anything.
- **No secret is ever printed.** Tokens only appear as `Authorization` headers; the token value is pasted into GitHub by the owner.

## Step 1: Choose the template and read the repo

| Stack | Template | Smoke test proves |
| --- | --- | --- |
| Next.js | [pipeline.nextjs.yml](./templates/pipeline.nextjs.yml) | healthy, non-root, both locales, auth redirect, headers, image optimizer, stop within 10 s |
| Express and Prisma | [pipeline.express.yml](./templates/pipeline.express.yml) | migrations against a fresh Postgres, readiness probe, non-root, stop within 10 s, plus a schema and migration guard in the quality job |

Read the existing workflow for the gates it already runs (lint, typecheck, tests, coverage, unused-code checks, build) and keep every one of them in the quality job. Check `package.json` for `packageManager` and `.nvmrc` for the Node version; the setup actions read both, so pin them if missing. Decide which Playwright or end-to-end suites stay local: anything that provisions its own database and sibling services usually does, because a free plan shares a small minutes budget across repositories.

## Step 2: Adapt the change classifier

The `changes` job decides `code` (anything the gates can judge) and `runtime` (anything that ends up in the image). Edit the two regexes to the repo's layout: source folders, config files, lockfiles, Dockerfile, entrypoint, probe and shutdown scripts count as runtime; tests and docs do not. A docs-only push then stops after one job. The anatomy of every job and the reason for each line is in [reference/pipeline-anatomy.md](./reference/pipeline-anatomy.md).

## Step 3: Fill the variables and secrets

| Name | Kind | Set by | Value |
| --- | --- | --- | --- |
| `SITE_URL` | variable | you, `gh variable set` | the URL the deploy job probes; the rehearsal domain first, the real one after cutover |
| `API_ORIGIN` or `API_BASE_URL` | variable | you | the build-time backend origin baked into the image |
| `COOLIFY_URL` | variable | you | the Coolify instance |
| `COOLIFY_APP_UUID` | variable | you | from the application's URL |
| `COOLIFY_TOKEN` | secret | owner | API token with deploy, read, write |
| `VPS_SSH_KEY`, `VPS_HOST_KEY`, `VPS_HOST` | secrets | owner | only for the Express template's pre-deploy backup over SSH |

`GITHUB_TOKEN` with `packages: write` pushes to GHCR; nothing else is needed for the registry.

## Step 4: Lint and run it

```bash
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.7   # includes shellcheck of every run block
```

Open a pull request; the run must be green with the deploy job skipped. After the merge, watch the main run to completion and read the `conclusion` field of each job rather than the overall badge:

```bash
gh run watch <id> --exit-status; gh run view <id> --json conclusion,jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'
```

The first main run's live probe fails if the domain has no DNS yet; that is expected and clears with the `live-domain-cutover` skill. The `fix-ci` skill covers a failing step; the `github-actions-pipeline` skill the general workflow rules.

Report the workflow path, the gates kept, the variables set, the secrets the owner must add, and the first run's per-job result.
