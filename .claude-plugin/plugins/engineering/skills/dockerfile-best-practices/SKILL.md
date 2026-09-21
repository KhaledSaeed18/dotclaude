---
name: dockerfile-best-practices
description: "Write or review a Dockerfile and compose setup for a production service: multi-stage builds that ship only the runtime, pinned base images, layer order for cache hits, non-root user, minimal image size, correct signal handling and health checks, secrets kept out of layers, and language-specific patterns for Node, Python, Go, and Java. Use when containerising a service, when images are large or slow to build, when a container ignores SIGTERM, or when a security scan flags the image."
argument-hint: "(optional) the Dockerfile or the language and framework to containerise"
---

A production image contains exactly what the process needs to run, built reproducibly, running as a non-root user, and stopping cleanly when asked. Everything below follows from those four properties.

## Structure: multi-stage

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:22.11-bookworm-slim AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod=false

FROM deps AS build
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:22.11-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd -r app && useradd -r -g app -d /app app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --chown=app:app package.json ./
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD node dist/healthcheck.js
ENTRYPOINT ["node", "dist/server.js"]
```

Build stages hold compilers and dev dependencies; the runtime stage copies artifacts only.

## Rules

**Base images**
- Pin to a specific version tag (`22.11-bookworm-slim`), and for reproducible builds pin the digest (`@sha256:...`) with a tool (Renovate, Dependabot) to bump it.
- Prefer `-slim` or distroless over `alpine` for glibc-dependent runtimes (Node native modules, Python wheels); alpine for Go static binaries is fine.
- One process per container; no supervisord.

**Layers and cache**
- Order from least to most frequently changed: base, system packages, dependency manifests, dependency install, source, build. Copy lockfiles before source so dependency layers cache.
- `RUN` steps combined with `&&` and cleanup in the same step (`apt-get install ... && rm -rf /var/lib/apt/lists/*`); a later `rm` does not shrink an earlier layer.
- `.dockerignore` with `.git`, `node_modules`, build output, `.env*`, tests, docs; without it the build context and the cache invalidation are both wrong.
- BuildKit cache mounts for package managers: `RUN --mount=type=cache,target=/root/.npm npm ci`.

**Security**
- `USER` non-root before `ENTRYPOINT`; files copied with `--chown`. Bind to a port above 1024.
- No secrets in `ENV`, `ARG`, or copied files; they persist in layers and history. Use `RUN --mount=type=secret,id=npmrc` for build-time secrets and runtime injection (env at run, mounted files, a secrets manager) for the rest.
- Read-only root filesystem where possible (`--read-only` with `tmpfs` for `/tmp`); drop capabilities; no `--privileged`.
- Scan (`docker scout`, `trivy image`) in CI; fail on critical CVEs with a fix available.

**Runtime behaviour**
- `ENTRYPOINT` in exec form (JSON array) so the process is PID 1 and receives signals; `CMD` for default arguments only. Shell form wraps in `sh -c` and swallows SIGTERM.
- The application handles SIGTERM: stop accepting, drain in-flight requests, close connections, exit within the orchestrator's grace period (default 30 s). If the runtime cannot (some shell scripts), use `tini` as the init (`ENTRYPOINT ["tini", "--", ...]`).
- `HEALTHCHECK` (or the orchestrator's probe) hits a cheap endpoint that checks dependencies the process needs; readiness separate from liveness in Kubernetes.
- Logs to stdout/stderr, unbuffered (`PYTHONUNBUFFERED=1`); no log files in the container.
- `EXPOSE` documents the port; it does not publish it.

**Size**
- Check with `docker image ls` and `dive`. Typical targets: Go static under 20 MB (distroless/static), Node under 200 MB, Python under 250 MB.
- Do not install dev dependencies, docs, or test files in the runtime stage.

## Language notes

- **Node**: `npm ci` / `pnpm install --frozen-lockfile`; `NODE_ENV=production`; `node` directly, not `npm start` (npm does not forward signals); set `--max-old-space-size` from the container limit or use a version that respects cgroups.
- **Python**: `python:3.12-slim`; `pip install --no-cache-dir -r requirements.txt` (or `uv sync --frozen`) in a build stage into a venv copied to runtime; `PYTHONDONTWRITEBYTECODE=1`; run with `gunicorn`/`uvicorn` directly; `--workers` from CPU limit.
- **Go**: build stage `golang:1.23`, `CGO_ENABLED=0 go build -ldflags="-s -w"`, runtime `gcr.io/distroless/static-debian12:nonroot`, copy the binary and CA certs.
- **Java**: build with the JDK, run on a JRE (`eclipse-temurin:21-jre`), layered jar (`spring-boot:build-image` or `jarmode=layertools`), `-XX:MaxRAMPercentage=75`.

## Compose for local development

`compose.yaml` with the service built from the Dockerfile's build stage (`target: build`), source bind-mounted for hot reload, dependencies (db, cache) with named volumes and health checks, `depends_on` with `condition: service_healthy`, env from `.env` (git-ignored) with an `.env.example` committed.

## Review checklist

Pinned base; multi-stage; lockfile copied before source; `.dockerignore`; non-root; exec-form `ENTRYPOINT`; signals handled; health check; no secrets in layers (`docker history` shows none); scan clean; size within target; builds reproducibly twice with the same digest.
