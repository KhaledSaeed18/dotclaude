---
name: owasp-security
title: "OWASP Security"
description: Review code being written or modified against the OWASP Top 10:2025 and ASVS secure-coding requirements, catching vulnerability classes before they ship. Works in any language or stack. Use when writing authentication or authorization logic, handling user input, adding API endpoints, choosing cryptographic operations, processing file uploads, or making any change that touches a trust boundary. Complements secret-scan (which finds credentials) and dependency-audit (which checks packages) with line-level vulnerability review.
---

Check code against the vulnerability classes most likely to produce real incidents. This is a line-level review of code being written or changed, not a full codebase sweep. Read the changed code and its immediate context (callers, middleware, schema) before forming any finding. Report only what can be demonstrated from the code - not what might theoretically apply.

## Injection (OWASP A03)

Any place where user-controlled data flows into an interpreter is a potential injection point. Check every such flow:

- **SQL and NoSQL:** are all parameters bound via a prepared statement or parameterized query? Any string concatenation or template literal that includes user input in a query is a finding.
- **Command execution:** `exec`, `spawn`, `system`, `popen` - is any argument derived from user input? Shell metacharacters must never reach these functions from user data.
- **Path traversal:** file system operations on paths that include user input must resolve and validate the final path against an allowed base directory. `path.join(base, userInput)` is not sufficient without checking the result starts with the allowed base.
- **Template injection:** user-controlled strings passed to template engines (Handlebars, Pug, Jinja2) must be treated as data, not templates.
- **Deserialization:** `eval`, `Function()`, and deserializers that execute code (`pickle`, `node-serialize`, YAML with `!!python/object`) must never operate on untrusted input.

## Broken Access Control (OWASP A01)

Authorization bugs are the most common critical finding in production systems:

- **Ownership check:** for every operation that reads or writes a resource, is there an explicit check that the authenticated principal owns or has permission to access that specific resource? Checking that the user is authenticated is not the same as checking that they own this record.
- **Horizontal escalation:** can a user substitute another user's ID in a request parameter and access their data? The server must validate ownership, not trust the ID from the client.
- **Vertical escalation:** are admin-only endpoints protected by a role check in addition to authentication? Is the role check done server-side?
- **Forced browsing:** are there endpoints that are "hidden" rather than protected? Any endpoint without explicit auth middleware is a finding.
- **Client-side-only enforcement:** any access control that can be bypassed by modifying the request (hidden form fields, JavaScript checks, front-end routing guards) must have a server-side counterpart.

## Cryptographic Failures (OWASP A02)

- **Password storage:** passwords must be hashed with bcrypt, argon2, or scrypt with an appropriate work factor. MD5, SHA-1, SHA-256, and SHA-512 are not password hashes - they are message digest functions and are not acceptable.
- **Token comparison:** any comparison involving a secret, MAC, or session token must use a constant-time equality function to prevent timing attacks. `===` is not constant-time.
- **Randomness:** security-sensitive tokens (session IDs, CSRF tokens, reset tokens, API keys) must be generated with a cryptographically secure random source, not `Math.random()` or `random.random()`.
- **Key hardcoding:** cryptographic keys and secrets must not appear in source code. Use environment variables or a secrets manager.
- **Algorithm choices:** AES-ECB, MD5-based MACs, RC4, and DES are broken. Use AES-GCM, HMAC-SHA-256, or established higher-level libraries.
- **Certificate validation:** TLS certificate validation must not be disabled in HTTP clients (`rejectUnauthorized: false`, `verify=False`, `InsecureSkipVerify`). Production code that disables this is a finding regardless of the stated reason.

## Security Misconfiguration (OWASP A05)

- **CORS:** `Access-Control-Allow-Origin: *` must not be set on endpoints that require authentication or return sensitive data. Reflect the request's `Origin` header only if it is on an explicit allowlist.
- **Security headers:** new HTTP endpoints should set `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY` (or use a framework that does this by default). Flag endpoints that strip or override these.
- **Verbose errors:** stack traces, SQL queries, and internal paths must not appear in API responses or rendered pages. Production error handlers must return a generic message and log the detail internally.
- **Debug flags:** any configuration that enables debug mode, disables authentication, or logs credentials must be confirmed as unreachable in production paths.

## Identification and Authentication Failures (OWASP A07)

- **Brute-force protection:** login, password reset, and OTP endpoints must have rate limiting. No rate limit is a finding.
- **Account enumeration:** authentication endpoints that respond differently for "user not found" vs "wrong password" allow username enumeration. Responses and timing should be identical for both cases.
- **Session fixation:** session tokens must be regenerated on authentication. Reusing a pre-authentication session ID after login is a finding.
- **JWT security:** verify the signature on every use. Pin the allowed algorithms (`{ algorithms: ['RS256'] }`). Reject tokens with `alg: none`. Enforce expiry.

## Sensitive Data Handling

- **Logging:** passwords, full credit card numbers, SSNs, session tokens, and API keys must not appear in log lines - even at debug level.
- **Responses:** error messages and API responses must not expose internal identifiers, user data belonging to other users, or stack traces.
- **Storage:** any PII or credentials written to disk, a database, or a cache must be encrypted at rest or stored in a form where a database dump does not directly expose the data.

## Dependencies (OWASP A06)

When a new package is added:

- Is it necessary? Could the same thing be done with standard library or existing dependencies?
- Is it maintained? Check the last release date and open security issues.
- Does `npm audit` / `pip-audit` / `cargo audit` flag it?
- Does its install script execute code (`preinstall`, `postinstall` in package.json)? Scrutinize any package that runs code on install.

## Reporting

For each finding: file and line, the vulnerability class, the concrete attack path (what an adversary inputs and what they gain), and the specific fix. Do not report theoretical issues - only ones supported by what the code actually does.

If a class was checked and the code is clean, say so briefly. A clean result from a systematic check is as useful as a finding.
