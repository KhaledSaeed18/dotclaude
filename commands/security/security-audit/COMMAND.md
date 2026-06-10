---
name: security-audit
description: Run a full-codebase security audit covering OWASP Top 10:2025 vulnerability classes, authentication and authorization logic, secret handling, input validation, dependency CVEs, and supply-chain risk. Broader than the secret-scan skill, which scans a single diff. Produces a structured findings report ranked by severity. Pass a path to limit the audit to a specific module or directory.
argument-hint: "[scope-path]"
allowed-tools: Read, Grep, Glob, Bash(npm:*), Bash(git:*), Bash(find:*), Bash(grep:*)
model: inherit
---

## Context

Scope: `$ARGUMENTS` (defaults to the entire repository if blank)

**Dependency manifest:**

!`cat package.json 2>/dev/null | head -60`

**Recent changes:**

!`git log --oneline -10 2>/dev/null`

## Task

Conduct a structured security audit of the codebase (or the path given in `$ARGUMENTS`). Report findings ranked by severity with concrete evidence and specific remediation steps.

### Step 1: Establish scope and entry points

```bash
# Identify entry points: routes, controllers, handlers
find ${ARGUMENTS:-.} -name "*.ts" -o -name "*.js" -o -name "*.py" \
  | grep -v node_modules | grep -iE "route|controller|handler|api|server|app" | head -20
```

Read the top-level entry files first. Then trace inward through authentication middleware, input validation layers, and data access code.

### Step 2: Check dependencies

```bash
npm audit --json 2>/dev/null | head -200
```

Flag CVEs in direct dependencies, stale packages with no recent releases, and overly permissive version ranges (`*`, `>=0`).

### Step 3: Scan for hardcoded secrets

```bash
grep -rn --include="*.ts" --include="*.js" --include="*.json" --include="*.yaml" --include="*.env*" \
  -E "(api_key|apikey|secret|password|passwd|token|private_key|access_key)\s*[:=]\s*['\"][^'\"]{8,}" \
  ${ARGUMENTS:-.} | grep -v node_modules | grep -v ".env.example" | head -40
```

### Step 4: Audit by vulnerability class

Work through each class. Skip classes that clearly do not apply.

**Injection (OWASP A03)**
- Parameterized queries used everywhere, or string concatenation into SQL/NoSQL queries?
- `exec` / `spawn` with user-controlled input?
- `path.join` / file reads on user-supplied paths without canonicalization?

**Broken Access Control (OWASP A01)**
- Ownership and permission checks on every resource endpoint?
- Horizontal escalation: can user A reach user B's data by changing an ID?
- Vertical escalation: can a regular user reach admin functionality?
- Any access control enforced only client-side?

**Broken Authentication (OWASP A07)**
- Password hashing with bcrypt, argon2, or scrypt? Never MD5/SHA1/SHA256 for passwords.
- JWT `alg` field pinned? `alg: none` accepted?
- Session tokens cryptographically random, HttpOnly, Secure, SameSite?
- Rate limiting on login, password reset, and OTP endpoints?

**Cryptographic Failures (OWASP A02)**
- Sensitive data (PII, passwords, tokens) in logs, error responses, or plaintext in the database?
- Weak algorithms: MD5, SHA1, DES, RC4, ECB mode, static IVs?

**Security Misconfiguration (OWASP A05)**
- `Access-Control-Allow-Origin: *` on authenticated endpoints?
- Verbose error messages or stack traces in production paths?
- Security headers present: CSP, HSTS, X-Frame-Options, X-Content-Type-Options?
- Debug mode flags reachable in production?

**SSRF (OWASP A10)**
- Any HTTP request where the URL is user-controlled?
- Allowlist of permitted target hosts and schemes?

**Software Integrity (OWASP A08)**
- Third-party CI actions pinned to a commit hash, not a mutable tag?
- Lockfile present and committed?

### Step 5: Report

Lead with a one-sentence verdict and the scope reviewed, then list findings worst-first:

```
### Critical
- `src/auth/session.ts:42` - <attack path and what the adversary gains>. Fix: <specific change>.

### High
### Medium
### Low / Informational
```

For each finding: file and line, the concrete attack path, what an adversary gains, and the specific remediation (not "validate input" but "use `zod.string().url()` and reject non-HTTPS schemes before calling `fetch`").

Severity definitions:
- **Critical** - direct exploitation, no preconditions required, or credential/data exposure.
- **High** - exploitable with low-effort preconditions (authenticated session, known endpoint).
- **Medium** - meaningful attacker precondition needed, or limited blast radius.
- **Low** - defense-in-depth improvement, hardening, or noteworthy pattern.

End with the single most important finding to address first and a one-sentence overall assessment.
