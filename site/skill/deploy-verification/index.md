---
name: deploy-verification
description: Prove a deployment from the server side. Use when a deploy finished and needs sign-off, when a rolling update may have dropped requests, or when a proxy, certificate, header or client address needs checking.
argument-hint: "(optional) the domain, the Coolify app name, and which checks to run"
---

A deploy is verified when the certificate verifies for the name, the container matches its contract, every public probe answers, a rolling update drops nothing, and the backend sees real client addresses. Measure from the server, not from a laptop: ISP paths produce false timeouts and hide proxy behaviour.

## Hard rules: never break these

- **Probe from the server over one SSH connection** (ControlMaster, see the `coolify-vps-baseline` skill). A laptop result is a hint, not evidence.
- **Read-only on production data.** Open pages, call health routes, send probes to routes that do not exist; never submit a form or an action in a live app.
- **Never type credentials.** When a signed-in check is needed, the owner signs in; you navigate.
- **A green pipeline is not a verified deploy.** Read each job's `conclusion` and then run these checks anyway.
- **Report failures with their evidence**, not "looks fine": the exact command and its output.

## Step 1: Certificate and routing

```bash
D=app.example.com
echo | openssl s_client -connect 127.0.0.1:443 -servername $D -verify_hostname $D -verify_return_error 2>/dev/null | grep 'Verify return code'
echo | openssl s_client -connect 127.0.0.1:443 -servername $D 2>/dev/null | openssl x509 -noout -issuer -dates
curl -s -o /dev/null -w 'healthz %{http_code}\n' https://$D/healthz
curl -s -o /dev/null -w 'api ready %{http_code}\n' https://$D/api/v1/health/ready
curl -sI https://$D/ | grep -i -E '^(strict-transport|x-frame|content-security|x-powered|server)'
```

`Verify return code: 0 (ok)` and a Let's Encrypt issuer; `TRAEFIK DEFAULT CERT` means DNS did not exist when the router registered (redeploy after it does). Before DNS exists, add `--resolve $D:443:127.0.0.1 -k` to curl to test the route anyway. Compare the header set with the previous host's (`curl -sI` against it) so nothing an edge used to add is lost.

## Step 2: Container contract

```bash
C=$(sudo docker ps --filter label=coolify.resourceName=<app> --format '{{.Names}}' | head -1)
sudo docker inspect "$C" --format 'health={{.State.Health.Status}} mem={{.HostConfig.Memory}} ports={{.HostConfig.PortBindings}} user={{.Config.User}} image={{.Config.Image}}'
sudo docker exec "$C" id -u
```

Healthy, the limit in bytes, `map[]`, a non-root user, and the immutable `sha-` tag the pipeline published.

## Step 3: Rolling update under load

Arm the probe loop when the deploy job starts, not before (quality gates run first) and not after it ended:

```bash
# on the workstation: wait for the deploy job, then probe from the server
until [ "$(gh run view <id> --json jobs --jq '.jobs[] | select(.name=="Deploy to Coolify") | .status')" = in_progress ]; do sleep 10; done
ssh -o ControlPath=$S <alias> 'for i in $(seq 1 150); do curl -s -o /dev/null -w "%{http_code} %{time_total} $(date -u +%T)\n" --max-time 3 https://'$D'/healthz; sleep 1; done > /tmp/rollover.log; cut -d" " -f1 /tmp/rollover.log | sort | uniq -c; sort -k2 -n /tmp/rollover.log | tail -1'
```

Expect every line `200`. Any `502` lines clustered in a window are the old container draining while the proxy still routes to it; read the deployment log (the `coolify-vps-baseline` skill shows the query) and fix the shutdown (the `nextjs-coolify-image` skill). Confirm the deploy job's start and end timestamps fall inside the probe window, or the test proved nothing.

## Step 4: Client address through the proxy

Send a request to a route that does not exist with a forged `X-Forwarded-For`, from the server and from the workstation, then read what the backend logged for it:

```bash
curl -s -o /dev/null -H 'X-Forwarded-For: 203.0.113.9' https://$D/api/v1/zzz-probe-forged
A=$(sudo docker ps --filter label=coolify.resourceName=<api> --format '{{.Names}}' | head -1)
sudo docker logs --since 2m "$A" 2>&1 | grep -o 'zzz-probe-[a-z]* - IP: [0-9a-f.:]*'
```

The logged address must be the real peer (the server's public address, your workstation's address), never `203.0.113.9`. The mechanism is the `proxy-client-address` skill.

## Step 5: Signed-in pages

With the owner signed in, open the landing page, one data-heavy page and one page per locale; read the network log for same-origin `/api/` calls answering 200 and for any cross-origin call (there should be none when the app proxies its API). Note long-lived streams: they are what makes shutdown timing matter.

Produce a checklist with one line per check: command, expected, observed, pass or fail. Record it in the project's deployment doc with the date.
