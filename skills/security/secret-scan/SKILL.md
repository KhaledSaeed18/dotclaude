---
name: secret-scan
description: Scan code or a diff for hardcoded secrets — API keys, tokens, passwords, private keys, and other exposed credentials — before they get committed or shipped. Use before committing, during review, or when auditing a repository.
argument-hint: "(optional) a path, or 'diff' / 'staged' / 'history' to scope the scan"
---

Find secrets that should never be in source control, then advise on remediation. Default scope: the staged diff if there is one, otherwise the working tree. Scan history or a specific path only when asked.

## What to look for

- **Known credential patterns** — cloud keys (AWS `AKIA…`, GCP, Azure), provider API tokens (Stripe, GitHub `ghp_…`, Slack, OpenAI, etc.), OAuth client secrets, JWTs.
- **Private keys & certs** — `-----BEGIN … PRIVATE KEY-----` blocks, `.pem` / `.p12` / keystore contents.
- **Credentials in URLs/config** — connection strings and URLs with embedded passwords (`scheme://user:pass@host`), basic-auth headers.
- **Generic secrets** — assignments to names like `password`, `secret`, `token`, `api_key`, `access_key`, `client_secret`, plus high-entropy strings that look like keys.
- **Risky files committed by mistake** — `.env`, credential JSON, `*.key`, and their presence in history.

## Reduce false positives

Distinguish real secrets from example/placeholder values (`xxxxx`, `your-key-here`, `changeme`), test fixtures, public keys, and sample docs. When genuinely unsure, label a finding "review" rather than asserting a leak — but err toward reporting over silence.

## Report and remediate

For each finding give: the file and `line`, the kind of secret, and a confidence (high / review). Then recommend remediation:

- **Rotate the credential immediately.** Assume anything committed — even briefly, even if later removed — is compromised. Deleting it from the latest commit is not enough; it remains in history.
- Move the value to an environment variable or a secrets manager and reference it instead of inlining.
- Add the offending file pattern to `.gitignore`; consider a pre-commit hook or scanner to prevent recurrence.

This is a defensive check. Report findings so the owner can secure their own project — do not exfiltrate, store, or transmit any secret you find.
