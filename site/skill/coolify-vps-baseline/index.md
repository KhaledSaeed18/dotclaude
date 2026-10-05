---
name: coolify-vps-baseline
description: Prepare a Linux VPS to run production containers under Coolify. Use when setting up a new server, auditing an existing one, or connecting a registry, firewall, proxy and monitoring before the first deploy.
argument-hint: "(optional) the SSH alias or host, and what already runs there"
---

A production VPS exposes two ports to the world, runs every workload as a Coolify resource behind one proxy, builds nothing itself, and is observed. Establish those facts before any application is deployed, and verify them read-only before changing anything on a server that already serves traffic.

## Hard rules: never break these

- **The server never builds.** Images are built in CI and pulled from a registry. A build on the host competes with production for CPU and memory and hangs on registry installs.
- **Never publish container ports on the host.** Only the proxy listens on 80 and 443; everything else is reached through the Docker network. A `-p` or Coolify port mapping on an app is a firewall bypass.
- **Do not touch the firewall, fail2ban, sshd or the proxy config without the owner's explicit go.** A wrong rule locks everyone out; the owner runs those commands, you give them exact lines.
- **One SSH session, reused.** Port 22 is usually rate limited; open a ControlMaster connection once and multiplex every command through it (see Step 1).
- **Read before you write.** Capacity, running containers, firewall state and registry login are facts to read first; report them before proposing changes.

## Step 1: Connect once and read the server

```bash
# ~/.ssh/config: Host <alias>, HostName <ip>, User <user>, IdentityFile ...
S=~/.ssh/<alias>.sock   # a short path; long socket paths fail silently
ssh -o ControlMaster=auto -o ControlPath=$S -o ControlPersist=30m <alias> true
ssh -o ControlPath=$S <alias> 'free -h; df -h /; nproc; sudo docker stats --no-stream --format "{{.Name}}\t{{.MemUsage}}"'
ssh -o ControlPath=$S <alias> 'sudo ufw status verbose; sudo docker ps --format "{{.Names}}\t{{.Ports}}\t{{.Status}}"'
```

Record: RAM and disk headroom, what already runs, which containers publish host ports (ideally only the proxy), and the OS version. The checklist in [reference/server-checklist.md](./reference/server-checklist.md) lists every item to confirm on a fresh or inherited server, with the command for each.

## Step 2: Confirm the Coolify layer

Coolify owns Docker on the host. Confirm, read-only:

| Fact | How |
| --- | --- |
| Coolify version and its own containers healthy | `sudo docker ps --filter name=coolify` |
| Proxy is Traefik with Let's Encrypt | `sudo docker inspect coolify-proxy --format '{{json .Args}}'`; look for `--entrypoints.https` and the ACME resolver |
| Proxy trusts no forwarded headers from clients | no `forwardedHeaders.trustedIPs` or `insecure` in the args (see [reference/traefik-notes.md](./reference/traefik-notes.md)) |
| A project and environment exist for the app | Coolify UI, Projects |
| The host can pull private images | `sudo docker pull ghcr.io/<owner>/<repo>:main` after the owner logs Docker in with a read-only package token |

Registry login is `sudo docker login ghcr.io` run by the owner with a personal access token scoped to `read:packages`; the credential lands in root's Docker config, which is what Coolify's pulls use.

## Step 3: Decide the per-app guard rails

Before the first application is created, fix these defaults and write them into the project's deployment doc:

- **Memory limit per app** sized from Step 1 (a Next.js server is comfortable at 512 MB; a Node API with a browser or heavy workers needs more). Leave headroom for the database and Coolify itself.
- **Health check as a container command**, not an HTTP check from the proxy, so a container never takes traffic until its own probe passes.
- **One domain per app**, the real one; remove the `sslip.io` placeholder Coolify adds.
- **Rolling updates** stay on (the default) so the old container serves until the new one is healthy.

## Step 4: Monitoring and backups

The server needs a watcher that is not Coolify: a cron health check with alerts on change, and verified database backups. Install them with the `vps-ops-toolkit` skill and add every new resource and domain to its defaults. Coolify's optional Beszel (or any agent) gives resource history; it does not replace the check.

## Step 5: Report

Produce a short server record for the project's docs: host, OS, public address, SSH alias, capacity, the Coolify project and environment names, the proxy facts, the registry login state, the memory budget, and the open items the owner must do (firewall rules, registry login, alert webhook). Everything you changed and everything you only read, separately.
