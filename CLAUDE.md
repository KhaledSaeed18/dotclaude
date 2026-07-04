# dotclaude

Personal Claude Code registry: skills, agents, commands, and hooks, distributed via the shadcn registry and a Claude Code plugin marketplace. Full contributor guide: [CONTRIBUTING.md](CONTRIBUTING.md).

## The one rule: source vs generated

Every item lives at `<type>/<category>/<name>/<MANIFEST>` (`SKILL.md`, `AGENT.md`, `COMMAND.md`, or `HOOK.md`). Everything else is derived by `pnpm gen`:

- each item's `registry.json` and the root `registry.json`
- the README catalog, badges, and plugins table (between `<!-- ... -->` markers)
- everything under `.claude-plugin/` (marketplace + per-plugin trees)

**Never hand-edit generated files.** Edit the source manifest, run `pnpm gen`, and commit the regenerated output. `pnpm gen:check` fails CI when anything is stale.

## Verification gate

Run before considering any change done (same as CI):

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm gen:check && pnpm validate
```

`pnpm validate` also enforces content rules: no `<TODO:` scaffold markers in manifests, and every description must carry a trigger clause ("Use when ..."). `pnpm format` fixes Biome formatting.

## Adding an item

```bash
pnpm new --type skill --category engineering --name my-skill \
         --description "What it does. Use when ..."
```

The scaffolder writes a stub manifest and regenerates. Fill in the stub (validate fails while `<TODO:` remains), then run the gate.

## Layout constraints worth knowing

- Agents and commands are **file-layout**: their folder must contain only the manifest; `pnpm gen` rejects extras. Skills and hooks are **folder-layout**: companion files ride along.
- Item names are globally unique across all four types and must match their folder name.
- Hook scripts are standalone, zero-dependency `.mjs` files (Node stdlib, node >= 18) that fail open (exit 0 on any internal error, exit 2 to block). They are copied verbatim into plugin trees, so a shared runtime module is not possible — `command-guard` and `smart-approve` intentionally duplicate their deny rules, and the parity table in `scripts/__tests__/hooks.test.ts` is the drift guard: change the rules in both files and the table together.
- Tests are black-box: hooks are spawned with the event JSON on stdin; gen/validate/new run against fixture repos in temp dirs. Follow those patterns.

## Voice

Items address the agent in the second person, imperative, third-person descriptions with an explicit "Use when ..." clause. No AI/co-authorship mentions inside items or their output.
