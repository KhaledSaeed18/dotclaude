---
name: readme-writing
description: "Write or restructure a README that gets a reader from landing to first success in minutes: a one-line purpose, a working quick start verified against the actual code, then usage, configuration, and contribution pointers in the order a new user needs them, with nothing the code contradicts. Reads the repository first and never documents behaviour it has not confirmed. Use when a project has no README, when the README has drifted from the code, or before publishing a package or repository."
argument-hint: "(optional) the audience (users, contributors, both) and anything the README must cover"
---

A README is the front door. Its first screen must answer three questions: what is this, is it for me, how do I try it. Everything after that is in order of how soon a new user needs it. The README is verified against the code, not written from memory of the code.

## Read before writing

1. The manifest (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`): name, version, entry points, scripts, dependencies, engines.
2. The entry point and the public surface: CLI flags (`--help` output if it runs), exported functions, routes, config schema.
3. Existing docs, `CONTRIBUTING`, `LICENSE`, CI config, examples directory, tests (they show real usage).
4. Run the quick start you intend to document. If it does not work, the README says what actually works.

## Structure

```markdown
# name

One sentence: what it does and for whom. (Badges on the next line, at most four: CI, version, license, one more.)

Two or three sentences: the problem it solves and the one thing that distinguishes it. Optional: a screenshot or a 10-line example that shows the payoff.

## Quick start

Prerequisites in one line (runtime version, accounts, keys).
The minimal commands, copy-pasteable, that produce a visible result. Nothing optional here.
What the user should see when it worked.

## Usage

The three to five most common tasks, each: one sentence, one code block, one sentence on the result. Link to full reference docs for the rest.

## Configuration

Table: option, env var or flag, default, what it does. Only options a user will actually set.

## How it works (optional)

Three to six sentences or a diagram, for the reader deciding whether to trust or extend it.

## Development

Clone, install, test, lint, in four commands. Link to CONTRIBUTING for the rest.

## License
```

Omit a section rather than fill it with filler. A library README leads with the API example; a CLI README leads with the command; a service README leads with the deploy or run command.

## Rules

- **Verify every command** by running it (or by reading the script it invokes when running is not possible) and say the runtime version it was verified with.
- **Match the manifest**: the install command uses the real package name and manager; scripts named in the README exist in the manifest.
- **No aspirational features.** If it is planned, it goes in a roadmap section or an issue, not in Usage.
- **Sentence case headings**, short paragraphs, no em dashes, no "simply", no "just".
- **Keep the top stable**: the first screen changes rarely; volatile detail (options, versions) lives lower or in generated sections between markers so a script can update it.
- **Badges are signals, not decoration**: a red CI badge on the README is honest; ten badges are noise.
- **Link, do not duplicate**: the changelog, the API reference, and the contribution guide each live in one place.
- Run `humanize` on the prose before returning.

## Restructuring an existing README

1. Inventory: list every section and what question it answers.
2. Check each claim against the code; mark stale ones.
3. Reorder by the new user's timeline; move contributor material below user material.
4. Cut what the code no longer does; move history to the changelog.
5. Keep the URL anchors people may have linked (`#install`, `#usage`) even when renaming headings, via a short redirect line if needed.

Report what was removed and why, separately from the new text.
