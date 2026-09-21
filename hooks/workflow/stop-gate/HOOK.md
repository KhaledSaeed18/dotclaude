---
name: stop-gate
description: A Stop hook that runs the project's test command before Claude may end a turn with uncommitted changes, blocking the stop and returning the failure output when tests fail. Detects the command from package.json, Makefile, Cargo.toml, go.mod, or pytest config, or takes one from .claude/dotclaude.json. Never loops (respects stop_hook_active) and never runs on a clean tree. Use to make "done" mean the tests pass, mechanically, without relying on the model remembering to run them.
---

# stop-gate

A Claude Code hook that turns the `verify-completion` discipline into a mechanism. When Claude tries to finish a turn while the working tree has uncommitted changes, the hook runs the project's tests. If they fail, the stop is blocked and the failure output goes straight back to Claude, which continues working. If they pass (or there is nothing to run), the turn ends normally.

- **Project-driven detection.** `stopGate.command` in config wins; otherwise the `test` script in `package.json` (run with pnpm, yarn, bun, or npm according to the lockfile), a Makefile `test` target, `cargo test`, `go test ./...`, or `pytest -q` when pytest is configured. npm's `no test specified` placeholder does not count.
- **Only when it matters.** Runs only if `git status` shows uncommitted changes, so a question-and-answer session never triggers a test run.
- **Cannot loop.** Claude Code sets `stop_hook_active` when a stop was itself caused by a hook; the gate then stands down.
- **Bounded.** 120-second cap by default; a timeout or a crash fails open. Only a genuine non-zero exit blocks.
- **Zero dependencies.** Node standard library only (`node >= 18`).

## Files

| File | Purpose |
| --- | --- |
| `stop-gate.mjs` | The hook script. Detects and runs the test command. |
| `HOOK.md` | This file. |

## Activate it (required manual step)

Add this to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/stop-gate/stop-gate.mjs\"",
            "timeout": 180
          }
        ]
      }
    ]
  }
}
```

The `timeout` (seconds) must exceed the hook's own cap, or Claude Code kills the hook first and the gate silently passes.

Installing the `workflow-hooks` plugin from the dotclaude marketplace wires this automatically.

## Verify it

```bash
# In a project with a failing test and an uncommitted change:
echo '{"hook_event_name":"Stop","cwd":"'$PWD'","stop_hook_active":false}' \
  | node .claude/hooks/stop-gate/stop-gate.mjs; echo "exit=$?"
```

Exit `2` with the failure on stderr means the gate is working.

## Tune it

```json
{
  "stopGate": {
    "enabled": true,
    "command": "pnpm test --run",
    "timeoutMs": 120000,
    "onlyWhenDirty": true
  }
}
```

Set `command` to a fast subset (`pnpm vitest run --changed`, `make quick`) if the full suite is slow; the gate is worth far more at ten seconds than at ten minutes. `onlyWhenDirty: false` runs it on every stop.

> Hooks run arbitrary commands on your machine with your credentials whenever their event fires. Read any hook script (including this one) before enabling it.
