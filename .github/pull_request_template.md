# Summary

<!-- What does this change and why? Link any related issue: Closes #123 -->

## Type of change

<!-- Mark all that apply with an x -->

- [ ] New item (skill / agent / command / hook)
- [ ] Change to an existing item
- [ ] Tooling, scripts, or CI
- [ ] Docs only

## Checklist

- [ ] I added or changed the item via its source manifest, not by hand-editing any `registry.json`, the README catalog, or the badge counts.
- [ ] I ran `pnpm gen` so the derived files are up to date.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm gen:check && pnpm validate` all pass locally.
- [ ] The `description` triggers on the intended phrasings without over-triggering.
- [ ] File-layout items (agents, commands) contain only their manifest; folder-layout companions are linked.
- [ ] No em dashes, and no Claude / AI / co-author mentions in any item or its output.

## Notes for the reviewer

<!-- Anything worth calling out: trade-offs, follow-ups, things you were unsure about. -->
