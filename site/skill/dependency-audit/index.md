---
name: dependency-audit
description: Audit a project's dependencies for outdated and vulnerable packages and surface breaking-change notes for upgrades. Works with any ecosystem, including npm/pnpm/yarn, pip/Poetry/uv, Cargo, Go modules, Maven/Gradle, Bundler, Composer, and others. Use when checking a project's dependency health, planning upgrades, or responding to a vulnerability report.
argument-hint: "(optional) a specific package, scope, or 'security-only'"
---

Audit this project's dependencies for risk and staleness, then recommend a safe upgrade path. Detect the ecosystem before running anything.

## Detect the ecosystem

Identify the package manager(s) from the manifests and lockfiles present, then use that ecosystem's native tooling. Common cases:

- **JS/TS**: `npm audit` / `pnpm audit` / `yarn npm audit`; `npm outdated`.
- **Python**: `pip list --outdated`, `pip-audit`; Poetry/uv equivalents.
- **Rust**: `cargo outdated`, `cargo audit`.
- **Go**: `go list -m -u all`, `govulncheck`.
- **Java**: `mvn versions:display-dependency-updates`, OWASP dependency-check; Gradle equivalents.
- **Ruby**: `bundle outdated`, `bundle-audit`.
- **PHP**: `composer outdated`, `composer audit`.

If a tool isn't installed, say so and give the exact command to run rather than guessing results. Never invent advisory IDs or version numbers; quote them from real tool output.

## Assess

- **Vulnerabilities**: list affected package, installed version, fixed version, severity, and advisory ID. Prioritise by severity and by whether the vulnerable code path is actually reachable from this project.
- **Outdated**: separate patch/minor (low-risk) from major (potentially breaking).
- **Breaking changes**: for the upgrades you recommend, pull the relevant changelog / release notes / migration guide and summarise what would break.

## Report

1. **Critical**: security fixes to apply now, each with the upgrade command.
2. **Recommended**: safe patch/minor bumps.
3. **Needs review**: major upgrades, each with its breaking-change summary and a rough effort estimate.
4. A suggested **upgrade order** that minimises churn and conflicts.

Keep findings factual and grounded in tool output; quote versions and advisory IDs exactly.
