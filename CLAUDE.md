# dotclaude

Personal Claude Code registry: skills, agents, commands, and hooks, distributed via the shadcn registry and a Claude Code plugin marketplace. Full contributor guide: [CONTRIBUTING.md](CONTRIBUTING.md).

## The one rule: source vs generated

Every item lives at `<type>/<category>/<name>/<MANIFEST>` (`SKILL.md`, `AGENT.md`, `COMMAND.md`, or `HOOK.md`). Everything else is derived by `pnpm gen`:

- each item's `registry.json` and the root `registry.json`
- the README catalog, badges, and plugins table (between `<!-- ... -->` markers)
- everything under `.claude-plugin/` (marketplace + per-plugin trees)
- `site/data.json`, the one file the catalog site reads
- `NOTICE.md`, the attributions collected from every manifest's `## Attribution` section

**Never hand-edit generated files.** Edit the source manifest, run `pnpm gen`, and commit the regenerated output. `pnpm gen:check` fails CI when anything is stale.

The catalog site lives in `site/`: static HTML, CSS, and JS with no build step and no dependencies, deployed to [dotclaude.khaledsaeed.tech](https://dotclaude.khaledsaeed.tech) by `.github/workflows/pages.yml` on every push to `main` that touches `site/`. Its only data source is the generated `site/data.json`, so the site never needs editing when items change; `index.html`, `styles.css`, and `app.js` are hand-written and Biome-linted like the rest of the repo. Two marked regions inside `index.html` (`rows` and `jsonld`) and `site/llms.txt` are generated too, so crawlers that do not run JavaScript still see the full catalog. Preview locally with any static server, e.g. `python3 -m http.server 4173 --directory site`.

One thing deliberately sits outside that rule: `.agents/skills/improve/`, surfaced to this repo's own sessions through the `.claude/skills/improve` symlink. It is tooling *for* working on the registry, not an item *in* it, so it is invisible to `gen` and `validate`, follows none of the item conventions, and ships to nobody. Anything under `skills/`, `agents/`, `commands/`, or `hooks/` is a registry item; `.agents/` is not.

## Verification gate

Run before considering any change done (same as CI):

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm gen:check && pnpm validate
```

`pnpm coverage` reports how much of `hooks/` and `scripts/` the suite actually
executes, and fails below 90%. It exists because the suite is black-box, hooks
run as child processes, so ordinary coverage tooling instruments only the
runner and reports a confident, wrong 0%. This collects V8 coverage from the
children and merges it. Use it to find untested branches, not to chase 100%:
some branches are platform-specific and unreachable on a given OS.

`pnpm smoke` is the slower end-to-end check CI also runs, kept out of the line above because it drives the real Claude Code CLI: it installs every generated plugin into a throwaway config dir, diffs the installed tree against the generated one, and runs each bundled hook script from its installed path (including that the deny rules still block). Run it after touching `gen.ts`'s plugin logic or any hook script. It needs no auth or network beyond resolving the CLI, and leaves nothing behind.

`pnpm validate` also enforces content rules: no `<TODO:` scaffold markers in manifests, every description carries a trigger clause ("Use when ..."), no em dash anywhere in an item's markdown (manifest or companion file), an `## Attribution` section (required on any item adapted from elsewhere) names a source URL and a permissive licence, and a cross-reference like "the `paper-reader` skill" or "the `/pr` command" must name an item that exists. `pnpm format` fixes Biome formatting.

## Adding an item

```bash
pnpm new --type skill --category engineering --name my-skill \
         --description "What it does. Use when ..."
```

The scaffolder writes a stub manifest and regenerates. Fill in the stub (validate fails while `<TODO:` remains), then run the gate.

## Layout constraints worth knowing

- Agents and commands are **file-layout**: their folder must contain only the manifest; `pnpm gen` rejects extras. Skills and hooks are **folder-layout**: companion files ride along.
- Item names are globally unique across all four types and must match their folder name.
- Hooks that take settings read `<project>/.claude/dotclaude.json` (one key per hook, documented in each `HOOK.md` and the README) and fall back to defaults when it is absent or unreadable.
- A plugin may pull in a skill from another category with `extraSkills` in its `PLUGINS` entry (`humanize` ships in both `thesis` and `writing`). Each plugin carries a semver `version`; bump the minor when items are added, the patch when they change.
- Hook scripts are standalone, zero-dependency `.mjs` files (Node stdlib, node >= 18, deliberately below the repo's own `engines.node >= 20`, because hooks run in the *user's* environment, not this repo's toolchain) that fail open (exit 0 on any internal error, exit 2 to block). They are copied verbatim into plugin trees, so a shared runtime module is not possible, `command-guard` and `smart-approve` intentionally duplicate their deny rules, and the parity table in `scripts/__tests__/hooks.test.ts` is the drift guard: change the rules in both files and the table together.
- Tests are black-box: hooks are spawned with the event JSON on stdin; gen/validate/new run against fixture repos in temp dirs. Follow those patterns.

## Voice

Items address the agent in the second person, imperative, third-person descriptions with an explicit "Use when ..." clause. No AI/co-authorship mentions inside items or their output.
