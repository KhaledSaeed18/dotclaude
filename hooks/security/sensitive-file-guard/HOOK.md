---
name: sensitive-file-guard
description: A PreToolUse hook that blocks Read, Edit, Write, and Bash operations that target sensitive files (.env, credentials, SSH private keys, certificates, secrets, AWS config, netrc, and similar). Use to prevent Claude from autonomously reading or exfiltrating credential files.
---

# sensitive-file-guard

A Claude Code hook that intercepts file-access operations before they run and blocks any that target well-known sensitive-file patterns.

- **Closes the exfiltration gap.** `command-guard` blocks destructive commands. But `cat .env` is not destructive — it reads a secret that could then be sent elsewhere. This hook prevents Claude from reading secrets in the first place.
- **Covers four tool surfaces.** Intercepts `Read`, `Edit`, `Write` (by file path), and `Bash` (by command string and path extraction).
- **Fails open.** Any error in the hook exits `0`, so it can never break a legitimate file operation.
- **Zero dependencies.** Node standard library only (`node >= 18`).

## What it blocks

| Pattern | Examples blocked |
| --- | --- |
| `.env` files | `.env`, `.env.local`, `.env.production`, `.env.test` |
| Credential files | `credentials.json`, `credentials.yaml` |
| SSH private keys | `id_rsa`, `id_ed25519`, `id_ecdsa` (public `.pub` files are not blocked) |
| Certificate and key files | `*.pem`, `*.p12`, `*.pfx`, `*.cer`, `*.key` |
| AWS config | `~/.aws/credentials`, `~/.aws/config` |
| Netrc | `.netrc`, `_netrc` |
| macOS Keychain exports | `*.keychain`, `*.keychain-db` |
| Token files | `.token`, `.tokens.json`, `.tokens.txt` |
| Secret files | `secrets.json`, `secrets.yaml`, `secrets.env` |
| API key files | `api_keys.json`, `api-keys.yaml` |
| GPG exports | `*.gpg` |
| OAuth token stores | `.oauth_token`, `.oauth_credentials.json` |
| Service account files | `service_account.json`, `service-account.yaml` |
| Shell env dumps | `env > file`, `printenv > file` |
| Bash read patterns | `cat .env`, `less .env.local`, `cat credentials.json` |

## Files

| File | Purpose |
| --- | --- |
| `sensitive-file-guard.mjs` | The hook script. Checks every relevant tool call. |
| `HOOK.md` | This file. |

After `npx shadcn@latest add KhaledSaeed18/dotclaude/sensitive-file-guard`, both land in `.claude/hooks/sensitive-file-guard/`.

## Activate it (required manual step)

Add this to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/sensitive-file-guard/sensitive-file-guard.mjs\""
          }
        ]
      }
    ]
  }
}
```

The `matcher: ".*"` ensures the hook runs for Read, Edit, Write, and Bash. The script only acts on those four tools; anything else exits `0` immediately.

## Tune it

Open `sensitive-file-guard.mjs` and edit `SENSITIVE_PATH_PATTERNS` and `SENSITIVE_BASH_PATTERNS`. Each is a list of regular expressions. Add patterns for secrets specific to your stack, or remove ones that clash with your project's file layout.

## Verify it

```bash
# Attempt to Read .env — should be blocked (exit 2)
echo '{"tool_name":"Read","tool_input":{"file_path":".env"}}' \
  | node .claude/hooks/sensitive-file-guard/sensitive-file-guard.mjs; echo "exit: $?"

# Attempt to cat .env via Bash — should be blocked (exit 2)
echo '{"tool_name":"Bash","tool_input":{"command":"cat .env"}}' \
  | node .claude/hooks/sensitive-file-guard/sensitive-file-guard.mjs; echo "exit: $?"

# A safe read — should pass (exit 0)
echo '{"tool_name":"Read","tool_input":{"file_path":"README.md"}}' \
  | node .claude/hooks/sensitive-file-guard/sensitive-file-guard.mjs; echo "exit: $?"
```
