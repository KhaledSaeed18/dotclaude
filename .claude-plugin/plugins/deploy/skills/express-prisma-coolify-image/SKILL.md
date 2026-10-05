---
name: express-prisma-coolify-image
description: Package an Express and Prisma API as a runtime-only image that migrates its Postgres database at start. Use when containerising a Node API with a database, or when migrations, readiness or shutdown misbehave in production.
argument-hint: "(optional) the API directory, its port and route prefix"
---

The image carries compiled code, production dependencies and the migrations, applies pending migrations before it listens, and reports ready only when it can reach its database. Because a rolling update runs the new container beside the old one, every migration must be compatible with the previous release: expand, migrate, contract.

## Hard rules: never break these

- **Build natively on the runner, copy artifacts into the image.** No `pnpm install` inside Docker, no build on the server.
- **Migrations run in the entrypoint, with `prisma migrate deploy`, never `migrate dev`, `db push` or `migrate reset`.** The entrypoint applies them and then execs the server, so a failed migration stops the container before it takes traffic.
- **Applied migrations are immutable.** CI rejects any edit, rename or deletion under `prisma/migrations`; a mistake gets a new migration.
- **Every release starts from a restore-verified backup.** The deploy job takes one before touching the tag (the `vps-ops-toolkit` skill provides it).
- **Readiness means the database answers.** The probe calls the readiness route that runs a trivial query, so a container that cannot reach Postgres never takes traffic.
- **Non-root user, no host ports, a stop that finishes within 10 s.**

## Step 1: Audit the API

```bash
cat package.json | jq '{scripts, engines, packageManager}'
ls prisma prisma/migrations | head; cat prisma.config.ts 2>/dev/null
grep -rn "process.env" src/config | head -40
grep -rn "health" src/routes src/modules 2>/dev/null | head
```

List the runtime variables the app validates at boot (database URL, secrets, allowed origins, feature switches) and which have safe values for a smoke test. Note native or downloaded dependencies (a headless browser, image libraries): they must be fetched on the runner and copied in, with their shared libraries installed in the image.

## Step 2: Add the runtime files

| File | Purpose |
| --- | --- |
| [Dockerfile](./templates/Dockerfile) | `node:<major>-slim`, copies `node_modules`, `dist`, `prisma`, config and entrypoint; `USER node`; `HEALTHCHECK` on the probe |
| [docker-entrypoint.sh](./templates/docker-entrypoint.sh) | `prisma migrate deploy` when migrations exist, then `exec node dist/server.js` |
| [healthcheck.ts](./templates/healthcheck.ts) | compiled with the app; fetches the readiness route with a 4 s timeout |
| [.dockerignore](./templates/dockerignore) | keeps sources, tests, docs and env files out; `node_modules` and `dist` deliberately stay in |

Readiness route: `GET <prefix>/health/ready` runs `SELECT 1` through Prisma and answers `{status: "ok", checks: {database: "up"}}` with 200, or 503. Liveness `GET <prefix>/health` answers without touching the database.

## Step 3: Build the context on the runner

In this order, because an in-place `--prod` install leaves dev tooling in pnpm's store:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build                         # tsc -p tsconfig.build.json, prisma generate
rm -rf node_modules && pnpm install --prod --frozen-lockfile --ignore-scripts
ls node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines/schema-engine-*   # the migrate engine must be present
```

The schema engine is downloaded by the Prisma CLI on first use; the container cannot download it at start as an unprivileged user over root-owned files, so prove it exists before `docker build`.

## Step 4: Smoke-test against a throwaway Postgres

In CI, a `postgres` service on a non-default port; locally, `docker run -d -p 5433:5432 -e POSTGRES_PASSWORD=... postgres:17-alpine`. Start the image with `--network host`, a `DATABASE_URL` pointing at it, and safe values for every required variable. Loop `docker exec <c> node dist/healthcheck.js` until it exits 0 (migrations applied, database reachable), check `id -un` is `node`, then `docker stop -t 30` must return within 10 s with exit code 0. The full script is the image job in the `ghcr-coolify-pipeline` skill; the migration guard and the `migrate diff --exit-code` schema check belong in its quality job.

## Step 5: Hand over

Report the image size, the migration state the smoke test reached, the list of runtime variables Coolify must carry (names only), and any compatibility note for the next release (a column added now, removed later). Migration safety itself is the `db-migration-safety` skill.
