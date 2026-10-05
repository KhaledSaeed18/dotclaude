---
name: nextjs-coolify-image
description: Package a Next.js app as a runtime-only container image with a health probe and a fast shutdown. Use when containerising a Next.js app, when its image is large or slow, or when a rolling update drops requests.
argument-hint: "(optional) the app directory, its public API origin, and where it will run"
---

The image contains the standalone server and nothing else: the build runs natively in CI, the Dockerfile only copies output, and the container proves its own readiness and leaves within a second when asked. Those three properties make rolling updates safe and images small; everything below enforces them.

## Hard rules: never break these

- **Build on the runner, never in Docker and never on the server.** Registry installs inside container builds hang; the server has no spare CPU. The Dockerfile copies `.next/standalone`, `.next/static` and `public` only.
- **`output: "standalone"` with no `NEXT_DIST_DIR` override at build time**, so the output lands in `.next`.
- **Public env is baked at build time.** Every `NEXT_PUBLIC_*` value and the `/api` rewrite destination are inlined; set them in the workflow before `next build` and verify them in `.next/routes-manifest.json`. Only server-only runtime secrets go to Coolify.
- **The health route lives outside anything proxied or localised.** `/healthz` sits beside `app/api`, not under it, and the proxy matcher excludes it.
- **Exit within a second on SIGTERM.** Next waits for in-flight requests; a long-lived stream (SSE, a WebSocket) keeps the old container alive for the whole grace period while the proxy still routes to it.
- **No `latest` tags, no root user, no host ports.**

## Step 1: Audit the app

```bash
grep -n "output\|distDir\|rewrites\|headers" next.config.*
grep -rn "process.env" app components lib proxy.ts middleware.ts 2>/dev/null | grep -v NEXT_PUBLIC_ | grep -v node_modules
grep -rln "next/image" app components | head
```

Classify every env read as build-time (`NEXT_PUBLIC_*`, anything in `next.config`) or runtime (read on the server at request time). Note whether `next/image` optimises local images: sharp is traced into the standalone output automatically when installed, so the runtime image needs no extra packages, but the smoke test must prove it.

## Step 2: Add the runtime files

Copy and adapt, from `templates/`:

| File | Purpose |
| --- | --- |
| [Dockerfile](./templates/Dockerfile) | `node:<major>-slim`, copies the three output folders plus the two scripts, `USER node`, `HEALTHCHECK` on the probe, exit deadline preloaded |
| [.dockerignore](./templates/dockerignore) | an allowlist: everything out except the build output |
| [healthcheck.js](./templates/healthcheck.js) | fetches `/healthz` on `127.0.0.1` with a 4 s timeout, exit 0 or 1 |
| [shutdown.cjs](./templates/shutdown.cjs) | exits half a second after SIGTERM or SIGINT; `NEXT_MANUAL_SIG_HANDLE=true` in the Dockerfile disables Next's own wait |
| [healthz route](./templates/healthz-route.ts) | `app/healthz/route.ts`, static, `Cache-Control: no-store` |

In `next.config.*`: `output: "standalone"`, `poweredByHeader: false`, and send `Strict-Transport-Security` yourself (a platform edge used to add it; a self-hosted proxy does not). In the proxy or middleware matcher add `healthz` to the exclusions: `"/((?!api|healthz|_next|.*\\..*).*)"`. Add the new files to knip or lint ignores if the repo gates unused files.

## Step 3: Build and verify the baked values locally

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.example.com pnpm build
jq -r '.rewrites.afterFiles[]?, .rewrites.beforeFiles[]?, .rewrites.fallback[]? | select(.source == "/api/:path*") | .destination' .next/routes-manifest.json
ls .next/standalone/node_modules/.pnpm | grep -c sharp   # non-zero when next/image is used
docker build -t app:local . && docker image inspect app:local --format '{{.Size}}'
```

## Step 4: Smoke-test the image the way CI will

Run the container with the memory limit and check, in order: Docker reports `healthy` within 30 s; `id -u` is not 0; `/healthz` 200; a page per locale (`dir="rtl"` present where expected); an unauthenticated protected route redirects to login; security headers present and `x-powered-by` absent; `/_next/image?url=...` returns `image/*` when the app optimises images; `docker stop -t 10` returns in about a second. Write curl output to files before grepping: `grep -q` closes the pipe early and fails curl under `pipefail`. The exact script is the image job in the `ghcr-coolify-pipeline` skill.

## Step 5: Hand over

Report the image size, the verified rewrite destination, the smoke results, which env values are baked and which are runtime, and anything the app does that the probe does not cover (background jobs, streams). The Coolify side is the `coolify-image-app` skill; the general container rules the `dockerfile-best-practices` skill.
