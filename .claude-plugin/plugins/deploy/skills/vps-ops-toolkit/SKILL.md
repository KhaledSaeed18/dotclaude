---
name: vps-ops-toolkit
description: Install host operations on a VPS, with a cron health check that alerts on change, restore-verified encrypted database backups, and an installer. Use when a server has no monitoring or backups, or when adding a resource to them.
argument-hint: "(optional) the SSH alias, the database resource name, and the domains to watch"
---

A server is operated when something other than a person notices a problem and when the database can be rebuilt from a copy that was proven to restore. The toolkit lives in the API repository under `ops/`, is installed by one command, and reports through a webhook only when the set of problems changes.

## Hard rules: never break these

- **Installing or changing cron, logrotate or anything under `/etc` is a production action.** The owner authorises `ship.sh`; you prepare and review it.
- **A backup that was not restored is not a backup.** Keep only archives whose restore fingerprint matched the source snapshot. Nothing is kept from a failed run.
- **The server holds only the public encryption key.** The private key stays with the owner, offline; a compromised server cannot read old backups.
- **Alerts only on change.** Every run logs; the webhook fires when a problem appears, persists with a change, or resolves. No heartbeat spam.
- **Never store webhook URLs or keys in the repository.** They live in `/etc/<prefix>-*.env`, mode 600, created once from the examples and never overwritten by the installer.

## Step 1: Fit the templates to the project

Copy [templates/ops/](./templates/ops/) into the repository as `ops/` and rename the `app` prefix (`app-ops`, `app-health`, `app-backup`) to the project's name in `install.sh`, the cron files, the logrotate file and the env examples. The files:

| File | Role |
| --- | --- |
| `lib/alert.sh` | one Discord embed per alert, colour by severity, fields, length limits |
| `health/health-check.sh` | services, Coolify resources by label, capacity, backup age, certificate verification per domain, readiness, pending reboot; state in `/var/lib`, alert on change |
| `backup/backup.sh` with `snapshot.sql` and `fingerprint.sql` | one-snapshot `pg_dump` plus roles, restore into a throwaway Postgres with no network, fingerprint diff, `age` encryption, local and optional git offsite retention |
| `install.sh` | idempotent root installer: scripts, schedules, logrotate, env files created only when missing, a pre-deploy backup profile, one health run |
| `ship.sh` | tar the folder over SSH and run the installer with sudo |

Add `"ops:install": "bash ops/ship.sh"` to `package.json` and `shellcheck -x` of `ops/**/*.sh` to the pipeline's ops job (the `ghcr-coolify-pipeline` skill has the step).

## Step 2: Set the defaults for this server

In `health.env.example`: `RESOURCES` (every Coolify resource name that must run), `DOMAINS` (every certificate the proxy must serve, including Coolify's own), `READINESS_URL`. In `backup.env.example`: the database resource name, role, database, the exact `postgres` image version for verification, retention. The owner generates the age key pair (`age-keygen`) and pastes only the public key into `/etc/<prefix>-backup.env` on the server.

## Step 3: Review, then ship with the owner's go

```bash
shellcheck -x ops/**/*.sh ops/*.sh
pnpm ops:install       # tar over SSH, install as root, one health run; prints the last RESULT line
```

Then from the server: `tail -20 /var/log/<prefix>-health.log` should list every check with `OK` and end in `RESULT 0 problem(s)`. Run the backup once by hand (`sudo /usr/local/lib/<prefix>-ops/backup/backup.sh`) and read the `restore verified: N tables, N rows identical` line before trusting the schedule.

## Step 4: Keep it current

Every new Coolify resource goes into `RESOURCES`, every new domain into `DOMAINS`, in the example file and on the server, followed by `pnpm ops:install`. The pipeline's pre-deploy backup uses the `predeploy` profile the installer creates, so deploy backups never crowd out nightly ones. The restore procedure (decrypt with the private key, roles then data into an empty Postgres, fingerprint diff) belongs in the repository's ops README; the `incident-postmortem` skill is for when it was needed.

Report what was installed, the first health result, the first verified backup line, and the env values the owner still has to set.
