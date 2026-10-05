---
name: coolify-image-app
description: Create and configure a Coolify application that runs a prebuilt image from a registry. Use when adding an app to Coolify, fixing its health check, domains, limits or environment, or wiring its API token for a pipeline.
argument-hint: "(optional) the app name, image, port and domain"
---

A Coolify application of type Docker Image is the contract between the pipeline and the server: the pipeline moves one field (the image tag) and asks for a deploy; Coolify does the rolling update behind one domain with the container's own probe as the gate. Configure it once, exactly, and let every later deploy be an API call.

## Hard rules: never break these

- **Creating or saving a Coolify resource is a production action.** Confirm with the owner before creating, deploying, changing domains or deleting anything, unless they already authorised it for this task.
- **Never publish host ports and never set a custom container name.** Port mapping bypasses the firewall; a fixed name breaks rolling updates.
- **The image must exist before the first deploy.** Push `:main` from the pipeline (or a manual run) first; Coolify cannot build a Docker Image app.
- **Never type or print a token or secret.** The owner creates API tokens and pastes secrets; you prefill forms and give click-by-click steps.
- **Verify every save by reloading.** Coolify's forms sometimes accept input without persisting it; reload the page and read the value back before moving on.

## Step 1: Gather the facts

From the repo and the `coolify-vps-baseline` record: project and environment names, the image reference (`ghcr.io/<owner>/<repo>`), the container port, the exact domain, the health probe command the image ships (`node healthcheck.js` or similar), the memory budget, and which environment variables are runtime (build-time ones are baked into the image and must not be set here).

## Step 2: Create the application

Coolify UI, the project's environment, **New resource**, **Docker Image**: image name without a tag, tag `main`, **Create application**. Note the application UUID from the URL; the pipeline needs it.

## Step 3: Configure, tab by tab

| Tab | Set | Why |
| --- | --- | --- |
| General | Name `<app>`; Domains `https://<domain>` only, delete the `sslip.io` one; Port `<port>`; no port mappings; no custom name | one router, one domain, no host ports |
| Healthcheck | Type **Container command**; command `node healthcheck.js`; interval 30, timeout 5, retries 3, start period 15; then **Enable** and confirm the modal | the container, not the proxy, decides readiness |
| Resource Limits | Memory `512m` (or the budget); leave CPU | one runaway app cannot take the host |
| Environment Variables | runtime variables only; mark secrets as such | build-time values are already in the image |
| Rollback | nothing to set; this is where an earlier tag is redeployed | the rollback path |

Coolify rejects shell operators (`&&`, `|`, `;`) in the health command, and the runtime image has no curl: the probe must be a plain binary call. Number inputs sometimes do not take a typed value; press Enter inside the field to submit, then reload and read it back. Full field notes and the API that moves the tag are in [reference/coolify-api.md](./reference/coolify-api.md).

## Step 4: Deploy once by hand

Actions, **Deploy**. Watch the deployment log until `Rolling update completed`, then from the server:

```bash
C=$(sudo docker ps --filter label=coolify.resourceName=<app> --format '{{.Names}}' | head -1)
sudo docker inspect "$C" --format 'health={{.State.Health.Status}} mem={{.HostConfig.Memory}} ports={{.HostConfig.PortBindings}} user={{.Config.User}}'
```

Expect `healthy`, the byte value of the limit, `map[]`, and the non-root user. Then hand over to the `deploy-verification` skill for the certificate, routing and header checks.

## Step 5: Wire the pipeline

The owner creates an API token at Keys & Tokens, API Tokens, with **Deploy, Read and Write** permissions (write to patch the tag, deploy to trigger, read to poll) and stores it as the GitHub secret `COOLIFY_TOKEN`. Set the repository variables `COOLIFY_URL` and `COOLIFY_APP_UUID` yourself with `gh variable set`. The workflow that uses them is the `ghcr-coolify-pipeline` skill.

Report the application UUID, every setting as read back after reload, the deployment outcome, and the owner actions still open.
