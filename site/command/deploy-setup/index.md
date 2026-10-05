---
name: deploy-setup
description: Add container packaging and a GHCR to Coolify pipeline to the current repository, then list the owner actions left. Use when a project needs to go from code to automatic deploys on a VPS.
argument-hint: "[next|express] [--domain <host>] [--coolify <url>] [--branch-only]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
model: inherit
---

## Context

Request: `$ARGUMENTS`

**Repository:**

!`git branch --show-current 2>/dev/null; git status --short 2>/dev/null | head -5; cat package.json 2>/dev/null | head -40`

**Existing deployment files:**

!`ls Dockerfile .dockerignore healthcheck.js shutdown.cjs docker-entrypoint.sh .nvmrc .github/workflows 2>/dev/null; grep -n "output\|rewrites" next.config.* 2>/dev/null; ls prisma 2>/dev/null`

## Task

Take the repository from code to automatic deploys through GHCR and Coolify, in phases. Each phase ends with a short status; stop for the owner only where a secret, a Coolify resource or a merge is needed.

### Phase 0: Branch and detect

Create `ci/coolify-pipeline` from the default branch. Detect the stack: a `next` dependency means Next.js; `express` with `prisma` means the API. If both or neither, ask. Pin `packageManager` in `package.json` and the Node major in `.nvmrc` if missing; run the install with `--frozen-lockfile` to prove the lockfile still matches.

### Phase 1: Package the image

Apply the `nextjs-coolify-image` skill or the `express-prisma-coolify-image` skill: Dockerfile, ignore allowlist, probe, shutdown or entrypoint, health route, config changes. Build locally with the production inputs, build the image, and run the smoke checks the skill lists. Do not continue until they pass locally.

### Phase 2: Pipeline

Apply the `ghcr-coolify-pipeline` skill: write `.github/workflows/pipeline.yml` from the matching template, keep every existing quality gate, delete the old CI workflow, adapt the change classifier, run actionlint. Set the repository variables you own (`SITE_URL`, the API origin, `COOLIFY_URL`, `COOLIFY_APP_UUID` once known).

### Phase 3: Documentation

Write `docs/engineering/DEPLOYMENT.md` (or the repository's equivalent place): where it runs, the pipeline table, build-time versus runtime inputs, the health probe, the Coolify settings, rollback, the rollover check command, the local image check. Add a pointer from the repository's agent instructions file.

### Phase 4: Open the pull request

Commit in conventional style, push, open the PR with motivation, key changes and what was verified. Watch the run; read each job's `conclusion`. The deploy job is skipped on a pull request; the image job must pass.

### Phase 5: Owner checklist

Stop with one numbered list, each item click-by-click:

1. Create the Coolify application (or authorise you to do it in the browser) per the `coolify-image-app` skill.
2. Create the Coolify API token (deploy, read, write) and add the `COOLIFY_TOKEN` secret.
3. Add any runtime secrets to the Coolify app.
4. Merge the PR; the first main run publishes the image and deploys.
5. DNS, when the domain is new or moving (the `live-domain-cutover` skill).

Unless `--branch-only` was passed, continue once the owner reports each item done: run the first deploy, then the `deploy-verification` skill, and record the results in the deployment doc.
