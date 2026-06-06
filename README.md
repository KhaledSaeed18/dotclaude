# dotclaude

My personal collection of [Claude Code](https://docs.claude.com/en/docs/claude-code) extensions, distributed as a [shadcn GitHub registry](https://ui.shadcn.com/docs/registry/github).

Everything here installs into your personal Claude Code scope under `~/.claude/`, so the items are available across all of your projects.

## Install

Install any item with the shadcn CLI:

```bash
npx shadcn@latest add KhaledSaeed18/dotclaude/<item>
```

For example, the `handoff` skill lands in `~/.claude/skills/handoff/`:

```bash
npx shadcn@latest add KhaledSaeed18/dotclaude/handoff
```

Want an item in a single project instead of your personal scope? Pass your own `target` (the registry items default to `~/.claude/...`) or copy the folder under the project's `.claude/` directory.

## Catalog

The table below is generated from each skill's `SKILL.md` — run `pnpm gen` after adding or editing a skill.

<!-- skills:start -->

| Skill | Description | Install |
| --- | --- | --- |
| [handoff](skills/handoff/) | Compact the current conversation into a handoff document for another agent to pick up. | `npx shadcn@latest add KhaledSaeed18/dotclaude/handoff` |

<!-- skills:end -->

## Adding a skill

Create `skills/<name>/SKILL.md`, then run `pnpm gen` (regenerates the registry files and this catalog) and `pnpm validate`.

## How it works

The single source of truth for each item is its manifest's frontmatter plus the files in its folder. `scripts/gen.ts` derives the shadcn registry files (`registry.json` at the root and one per item) and the catalog above; `scripts/validate.ts` checks the manifests and then delegates structural checks to `shadcn registry validate`. CI runs both on every pull request.

## License

[MIT](LICENSE) © Khaled Saeed
