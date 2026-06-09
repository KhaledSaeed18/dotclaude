# Security policy

## Reporting a vulnerability

If you find a security issue in this registry or in any item it ships, please report it privately rather than opening a public issue.

- Open a private security advisory through GitHub at [the advisories page](https://github.com/KhaledSaeed18/dotclaude/security/advisories/new), or
- Email the maintainer at khaled18saeed@gmail.com.

Include enough detail to reproduce the problem: the affected item or script, the steps, and the impact. You will get an acknowledgement, and either a fix or a clear explanation once the report is assessed.

## Scope

This repository distributes Claude Code extensions (skills, agents, commands, and hooks) plus the small Node tooling that builds the registry. Reports worth sending include:

- An item that could cause data loss or run unintended commands when used as documented.
- A hook or script in this repo that mishandles untrusted input.
- Secrets or credentials committed to the repository.

The items here are prompts and small scripts that run inside your own Claude Code session, under your own permissions. Review any item before installing it, the same as any code you add to your project.

## Good to know

- The `command-guard` hook is a deterministic safety net, not a sandbox. Do not rely on it as your only protection against destructive commands.
- CI runs secret scanning and a dependency audit on every change. See [.github/workflows/security.yml](.github/workflows/security.yml).
