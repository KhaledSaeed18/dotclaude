# Pipeline anatomy

Why each job and line exists, so adapting the template keeps its guarantees.

## Jobs and their dependencies

```
changes ──┬── quality ──┐
          └── image ────┼── deploy ── (prune)
ops ───────────────────┘
```

- **changes** runs first and is cheap. It compares the push's `before` (or the pull request base) with `HEAD`. With no usable base (first push, force push, manual run) it treats everything as changed. Two outputs: `code` gates `quality`, `runtime` gates `image`. A docs-only push ends here.
- **ops** always runs: actionlint on the workflow (which includes shellcheck of every `run:` block) and shellcheck on any ops scripts. It is a `needs` of `deploy` so a broken script never ships.
- **quality** is the repository's existing gates, unchanged, plus for a database app the migration guard and the schema check against a fresh Postgres service.
- **image** builds natively, packs the runtime image, smoke-tests it, and only on `main` logs in and pushes. The job outputs the immutable tag for `deploy`.
- **deploy** needs all three. It PATCHes the tag, POSTs a deploy, polls to a terminal status, probes the public URL, and prunes the registry to the last 20 versions.

## Lines that look optional and are not

| Line | Why |
| --- | --- |
| `fetch-depth: 0` on `changes` | the diff needs the base commit present |
| `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` | pull request pushes supersede; main runs finish |
| `concurrency: group: deploy-production` on `deploy` | two merges in a row queue, never interleave |
| `if: needs.image.result == 'success'` on `deploy` | a skipped image job (nothing shipped) must not deploy a stale tag |
| `defaults: run: shell: bash` | pipefail, so `curl ... \| jq` fails on an empty body |
| writing curl output to files before `grep -q` | `grep -q` exits on first match and curl gets SIGPIPE under pipefail |
| `--fail-with-body` | a 4xx from Coolify prints its message instead of a bare exit |
| `${IMAGE##*:}` | the tag alone is what Coolify's `docker_registry_image_tag` wants |
| `for _ in $(seq 1 90); ... sleep 10` | 15 minutes covers a pull plus a slow start period |
| `min-versions-to-keep: 20` | the rollback window Coolify can redeploy from |
| `permissions: packages: write` on `image` and `prune` | GHCR push and delete with `GITHUB_TOKEN`, no personal token |
| `--ignore-scripts` on the Express install | the build runs explicitly; postinstall hooks are not needed and can hang |
| no `--ignore-scripts` on the Next.js install | sharp's postinstall provides the binary next/image needs in the image |

## Secrets and variables

Variables are plain configuration (`gh variable set NAME --body VALUE`); secrets are pasted by the owner in the repository settings. The deploy job refuses to run when any of its three Coolify inputs is empty, which turns a misconfigured repository into a fast red instead of a half deploy.

## Timing

Expect about 10 minutes from push to deploy on a free runner: 1 minute for `changes` and `ops`, 5 to 10 minutes for `quality` (tests dominate), 3 minutes for `image`, 1 to 2 minutes for `deploy`. Merging an API and a front-end together therefore puts the new front-end in front of the old API for the difference; merge the API first and the front-end after its readiness answers 200.

## Debugging

```bash
gh run list --branch main --limit 3
gh run view <id> --json conclusion,jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'
gh run view <id> --log-failed --job <job-id>
gh workflow run pipeline.yml --ref main       # redeploy
```

Read `conclusion` per job; the run's overall state can be reported before the deploy job has run.
