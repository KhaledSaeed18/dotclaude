---
name: explain-codebase
description: Onboard to an unfamiliar codebase by mapping its architecture, entry points, and data flow. Use when starting work in a new or unknown repository and you need a navigable mental model fast.
argument-hint: "(optional) a subsystem, feature, or question to focus on"
---

Build a navigable map of this repository so the reader can find their way around and start contributing. Work from evidence in the repo, not assumptions about the stack.

## Orient first

- Identify the project type and stack from manifests and config (e.g. `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, `Gemfile`, Dockerfiles, CI config). Note the build, test, and run commands.
- Read the README, docs, and any `CONTRIBUTING` or architecture notes before reading code, but verify their claims against the tree rather than trusting them blindly.
- Get the shape of the tree: the top-level directories and what each is responsible for.

## Map the architecture

- Find the **entry points**: CLI mains, server bootstraps, route registrations, scheduled jobs, queue consumers, lambda/handler exports, UI roots. List them with `file:line`.
- Identify the **layers / modules** and how they depend on each other (e.g. interface → service/domain → data access → external integrations). Note the boundaries that matter.
- Locate cross-cutting concerns: config/env loading, auth, logging, error handling, database/connection setup, feature flags.

## Trace the data flow

- Pick one or two representative operations (or whatever the user asked to focus on) and follow them end to end: input → validation → core logic → persistence/external calls → response.
- Show each path as a short sequence of `file:line` hops the reader can click through.
- Call out where state lives (databases, caches, queues, external services) and how it's accessed.

## Report

Produce, concisely:

1. **Summary**: one paragraph on what this project is and does.
2. **Architecture map**: the layers/modules and their responsibilities.
3. **Entry points**: where execution starts, with paths.
4. **Key flows**: the traced paths.
5. **Conventions & gotchas**: naming, patterns, where to add a new feature, anything surprising.
6. **Where to look next**: the 3 to 5 files most worth reading first.

Prefer precise `file:line` references over prose. Flag anything you were unsure about rather than guessing.
