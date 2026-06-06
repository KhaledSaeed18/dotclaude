# Frontmatter reference

The YAML frontmatter at the top of `SKILL.md` is what Claude reads to decide **whether to load the skill**. The body is only pulled in once the skill triggers — so the frontmatter, especially `description`, is the most load-bearing text in the file. Get it specific.

## Fields

| Field           | Required | Purpose                                                                                          |
| --------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `name`          | yes      | Unique identifier. Must equal the folder name, kebab-case. Also the install dir and shadcn item. |
| `description`   | yes      | The trigger. What the skill does + when to use it. See below.                                    |
| `title`         | no       | Human display name. Defaults to title-cased `name` (`git-commit` → "Git Commit").                |
| `argument-hint` | no       | One-line hint about what arguments mean, shown to the user. Omit if the skill takes none.         |

`gen.ts` validates `name`, `description`, and optional `title`. Extra keys like `argument-hint` are allowed (Claude Code reads them) and ignored by the generator.

## `name` rules

- kebab-case: lowercase words joined by hyphens (`merge-conflict`, `pr-description`).
- **Must match the folder name exactly** and be **globally unique** — skills install to a flat `.claude/skills/<name>/`, so a collision across categories would clobber.
- Prefer a verb or domain noun that signals the job: `create-skill`, `dependency-audit`, `git-undo`.

## `description` — write it to trigger

This single string decides when the skill fires. Pattern that works well here:

> `<What it does, third person, leading with the action> — <the concrete value/scope>. Use when <the situations and user phrasings that should load it>.`

Guidelines:

- **Third person, present tense.** "Generate a changelog…", not "I will generate…" or "Generate a changelog" addressed to the agent.
- **Lead with the capability**, then add an explicit **"Use when …"** clause. The "Use when" is what most improves trigger accuracy.
- **Name the real phrasings/triggers.** List the synonyms and situations a user might actually say. Vague descriptions both miss real triggers and fire on the wrong ones.
- **Be specific about scope** so it doesn't over-trigger. If it's only for a diff, say so; if it spans any stack, say that.
- Keep it to a sentence or two — long enough to be specific, short enough to scan.

### Good

```yaml
description: Resolve Git merge, rebase, cherry-pick, revert, and stash conflicts safely — by understanding both sides and the operation in progress before integrating, then verifying the result builds and passes tests. Use when a merge/rebase/cherry-pick stops with conflicts or "needs merge".
```

Specific capability, clear scope, concrete "use when" with the phrasings that should fire it.

### Weak

```yaml
description: Helps with git conflicts.
```

Too vague to trigger reliably, no scope, no "use when" — it will both miss real cases and fire on unrelated ones.

## `title`

Only set `title` when title-casing the name produces the wrong label. Otherwise leave it out and let the generator derive it.
