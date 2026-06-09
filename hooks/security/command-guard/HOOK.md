---
name: command-guard
description: A PreToolUse hook that blocks catastrophic Bash commands before they run (recursive force deletes of the filesystem root or home, fork bombs, writing to or formatting raw disk devices, recursive chmod 777 on root, and force-pushes to main or master), returning a clear reason. Use to add a deterministic safety net against destructive shell commands.
---

# command-guard

A Claude Code hook that inspects every Bash command before it runs and blocks a short list of irreversible, catastrophic ones. It runs as a `command` hook on `PreToolUse`: Claude Code pipes the tool event to the script on stdin, and the script either allows the command (exit `0`) or blocks it (exit `2`) with a reason fed back to Claude.

- **Deterministic safety net, not airtight security.** It catches the textbook foot-guns. An obfuscated or unusual command can still slip past, so do not treat it as a sandbox.
- **Fails open.** It swallows its own errors and exits `0`, so a bug in the hook can never break a legitimate command.
- **Zero dependencies.** Node standard library only (`node >= 18`).

## What it blocks

| Pattern | Example |
| --- | --- |
| Recursive force delete of root or home | `rm -rf /`, `rm -rf ~` |
| Shell fork bomb | `:(){ :\|:& };:` |
| Writing to a raw disk device | `dd if=... of=/dev/sda`, `cat x > /dev/sda` |
| Formatting a raw disk device | `mkfs.ext4 /dev/sdb` |
| Recursive `chmod 777` on root | `chmod -R 777 /` |
| Force-push to a shared branch | `git push --force origin main` |

Anything else is allowed through to the normal permission flow. Deleting a specific subpath such as `rm -rf ./build` is not blocked.

## Files

| File | Purpose |
| --- | --- |
| `command-guard.mjs` | The hook script. Reads the event from stdin, blocks or allows. |
| `HOOK.md` | This file. |

After `npx shadcn@latest add KhaledSaeed18/dotclaude/command-guard`, both land in `.claude/hooks/command-guard/`.

## Activate it (required manual step)

The installer copies the files but **cannot** edit your `settings.json`, because hooks are configuration rather than loadable files, so you wire it up once by hand. Add this to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/command-guard/command-guard.mjs\""
          }
        ]
      }
    ]
  }
}
```

The `matcher` of `Bash` means the hook only runs before Bash tool calls. The script double-checks the tool name anyway, so a broader matcher is harmless.

## Tune it

Open `command-guard.mjs` and edit the `RULES` list. Each rule is a regular expression tested against the normalized command plus a human-readable reason. Add patterns for commands that are dangerous in your environment, or remove ones you find too strict. Keep the rules conservative: a false block is more annoying than a rare miss, and this hook is a safety net, not your only line of defense.

## Verify it

Pipe a fake event to the script and check the exit code:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' \
  | node .claude/hooks/command-guard/command-guard.mjs; echo "exit: $?"
```

A blocked command exits `2` and prints the reason to stderr; a safe one exits `0` with no output.
