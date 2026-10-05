---
name: cutover
description: Drive a live domain migration step by step, with the owner doing DNS and the agent verifying each stage. Use when moving a production domain to a new host.
argument-hint: "<domain> --to <new-host-address> [--coolify-app <name>] [--dns <provider>] [--ssh <alias>]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
model: inherit
---

## Context

Request: `$ARGUMENTS`

**Current DNS and deployment doc:**

!`D=$(echo "$ARGUMENTS" | awk '{print $1}'); [ -n "$D" ] && dig +noall +answer "$D" 2>/dev/null; dig +short NS "$(echo "$D" | awk -F. '{print $(NF-1)"."$NF}')" 2>/dev/null | head -2; ls docs/engineering/DEPLOYMENT.md 2>/dev/null`

## Task

Run the `live-domain-cutover` skill as a guided session. You verify; the owner edits DNS and hosting consoles from exact steps you give. Never advance a stage on an assumption: each stage ends with a verification whose output you show.

### Stage 1: Record

Write the current record (type, value, TTL) and the authoritative servers into the deployment doc as the rollback value. Give the owner the TTL change (1 min on the existing record) and wait for "done"; confirm with `dig @<ns>`.

### Stage 2: Rehearse

Give the owner the rehearsal record (`<name>-next` A to the new host, TTL 1 min). Deploy the app on that name only, then run the `deploy-verification` skill there in full, including a rolling-update probe and the header comparison with the old host. Fix and redeploy until every check passes. Report the checklist.

### Stage 3: Switch

Agree a time. Give the owner the two edits (delete the old record, add the A record, TTL 1 min) and wait. Then: poll the authoritative server and two public resolvers; set the real domain as the only domain in Coolify and redeploy; watch the certificate until it verifies; switch the pipeline's probe variable; run `deploy-verification` on the real domain; ask the owner to reload their signed-in tab and confirm the session survived.

### Stage 4: Soak and remove

Record the cutover time and results in the deployment doc. Ask the owner how long to soak. When they declare it over, give the removal steps (DNS cleanup and TTL back to Automatic, old host domain, Git connection and project, GitHub app access and environments, hook secrets in other repositories), verify each with `dig`, `gh api` and `gh secret list`, and finish the docs: migration section removed, follow-ups for other repositories listed.

End with a timeline of timestamps and a one-line status per stage. If anything failed at Stage 3, lead with the rollback instruction (restore the recorded value) before any analysis.
