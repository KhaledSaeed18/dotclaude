---
name: live-domain-cutover
description: Move a live domain from one host to another without downtime or lost sessions, with a rehearsal, a timed DNS switch, a soak and the old host removed. Use when migrating a production app between hosting platforms.
argument-hint: "(optional) the domain, the old host, the new host, and the DNS provider"
---

Move the name last. Everything about the new host is proven on a rehearsal name first; the cutover is then one DNS edit with a recorded rollback value, and the old host keeps serving stale caches until they expire. Sessions survive because cookies bind to the domain, not to the machine behind it.

## Hard rules: never break these

- **DNS edits are the owner's.** Give exact records (type, host, value, TTL); the owner saves them and tells you. You verify from the authoritative servers and public resolvers.
- **Record the rollback value before anything changes.** The current record (a CNAME target or an address) goes into the deployment doc first. Rollback is restoring it, nothing else.
- **Lower the TTL hours ahead.** A 1 minute TTL on the record being replaced is what makes the switch and the rollback fast.
- **The old host stays alive until the soak ends.** Visitors with a cached answer keep reaching it; it must keep working.
- **A certificate needs DNS first.** HTTP-01 issuance fails while the name does not resolve; plan the redeploy that re-registers the router after the record exists.

## Step 1: Record the starting point

```bash
dig +noall +answer <domain>                   # the rollback value and current TTL
dig +short NS <zone>                          # authoritative servers to query later
```

Write both into the deployment doc together with the new host's address. Ask the owner to lower the TTL of that record to 1 min now; continue only after `dig +noall +answer <domain> @<ns>` shows the lower TTL.

## Step 2: Rehearse on a sibling name

Owner adds an A record `<name>-next` to the new host (TTL 1 min). Deploy the application with only `https://<name>-next.<zone>` as its domain. Run the whole `deploy-verification` skill there: certificate, container contract, rolling update, client address, signed-in pages in every locale. Compare response headers with the old host and add anything missing (a platform edge often adds `Strict-Transport-Security`). Fix and redeploy until every line passes. Nothing on the real domain has changed yet.

## Step 3: Cut over

At a quiet time agreed with the owner, they replace the record: delete the old `<name>` record, add A `<name>` to the new host, TTL 1 min. Then, in this order:

1. Poll the authoritative server until it answers the new address (`dig +short <domain> @<ns>`), then 1.1.1.1 and 8.8.8.8.
2. Set `https://<domain>` as the application's only domain in Coolify (drop `<name>-next`), redeploy so the router re-registers, and watch the certificate: `openssl s_client ... -verify_return_error` until `Verify return code: 0`.
3. Switch the pipeline's probe variable (`SITE_URL` or `READINESS_URL`) to the real domain.
4. Run `deploy-verification` again on the real domain. The owner reloads their already signed-in tab: the session must survive.

Expected window: at most a couple of minutes during which some visitors still reach the old host, which still works. If anything fails, the owner restores the recorded value and the new host is debugged without pressure.

## Step 4: Soak, then remove the old host

Soak for as long as the owner wants (a few days of normal use, or less when the data lives elsewhere and the app is stateless). Then, owner actions with exact steps:

- DNS: delete `<name>-next`; set the `<name>` TTL back to Automatic.
- Old host: remove the domain from the project, disconnect the repository, delete the project (and with it its environment variables).
- GitHub: remove the old host's app access to the repository, delete deployment environments it created, remove any webhook or deploy-hook secret that called it (in every repository, including a backend pipeline that triggered the front-end).
- Docs: the deployment doc records the cutover and drops the migration section; references to the old host remain only as history.

Verify each: `dig` for the records, `gh api repos/<owner>/<repo>/environments`, `gh secret list` in each repository, a last `deploy-verification` pass.

Report the timeline with timestamps, the rollback value kept until removal, every verification result, and the follow-ups left in other repositories.
