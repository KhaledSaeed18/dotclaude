---
name: deploy-verify
description: Run the server-side verification of a deployment and report pass or fail per check. Use when a deploy finished, after a cutover, or before closing a release.
argument-hint: "<domain> [--app <coolify-resource-name>] [--api <api-resource-name>] [--run <workflow-run-id>] [--ssh <alias>]"
allowed-tools: Read, Bash, Glob, Grep
model: inherit
---

## Context

Request: `$ARGUMENTS`

**Deployment doc and latest main run:**

!`ls docs/engineering/DEPLOYMENT.md docs/*deploy* 2>/dev/null; gh run list --branch main --limit 1 --json databaseId,conclusion,displayTitle --jq '.[] | "\(.databaseId) \(.conclusion) \(.displayTitle)"' 2>/dev/null`

## Task

Run the `deploy-verification` skill end to end for the given domain and report a checklist. Everything is read-only and measured from the server over one SSH connection; the owner's signed-in session is used only to open pages.

1. Resolve the inputs from the arguments or the deployment doc: domain, SSH alias, Coolify resource names of the app and of the API behind it. Ask only for what cannot be found.
2. Open the SSH ControlMaster connection once; every later command multiplexes through it.
3. Run the checks in this order, each with its command and output captured: certificate verification and issuer; `/healthz` and the API readiness route through the domain; response headers (and a diff against the previous host when one is named); container contract (health, memory limit, no port bindings, non-root, image tag equals the latest published `sha-` tag); client address proof with a forged header from the server and from this machine; when `--run` is given and its deploy job has not started, arm the rolling-update probe and summarise the status counts and the slowest response.
4. If the owner is signed in on the domain in the browser pane, open the landing page, one data page and one page per locale and read the network log for same-origin API calls and their status codes. Click nothing that writes.
5. Close the SSH master connection.

Produce a table: check, command, expected, observed, pass or fail. End with the overall verdict and, for every failure, the skill that fixes it (`nextjs-coolify-image` for shutdown or headers, `coolify-image-app` for container settings, `proxy-client-address` for the address, `live-domain-cutover` for certificate and DNS). Offer to append the dated table to the deployment doc.
