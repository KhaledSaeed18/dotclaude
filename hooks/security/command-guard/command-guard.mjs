#!/usr/bin/env node
/**
 * command-guard: a PreToolUse hook that blocks a short list of catastrophic,
 * irreversible Bash commands before they run.
 *
 * Claude Code pipes the tool event to this script on stdin. If the command
 * matches a dangerous pattern, the script writes a reason to stderr and exits 2,
 * which tells Claude Code to block the tool call. Otherwise it exits 0 and the
 * normal permission flow continues.
 *
 * This is a deterministic safety net, not airtight security: it catches the
 * textbook foot-guns, and an obfuscated command can still slip past. Tune the
 * RULES list below for your own environment. The script swallows its own errors
 * and exits 0 so it can never break a legitimate command.
 *
 * Zero dependencies (Node standard library, node >= 18).
 */

import { stdin } from "node:process";

/** Each rule tests the normalized command string and explains the block. */
const RULES = [
  {
    test: /\brm\b(?=[^|;&]*\s-\S*r)(?=[^|;&]*\s-\S*f)[^|;&]*\s(\/|~|\$HOME|\/\*)(\s|$|\/)/,
    reason: "recursive force delete targeting the filesystem root or home directory",
  },
  {
    test: /:\(\)\s*\{\s*:\s*\|\s*:&\s*\}\s*;\s*:/,
    reason: "shell fork bomb",
  },
  {
    test: /\bdd\b[^|;&]*\bof=\/dev\/(sd|nvme|disk|hd)/,
    reason: "dd writing directly to a raw disk device",
  },
  {
    test: /\bmkfs(\.\w+)?\b[^|;&]*\/dev\//,
    reason: "formatting a raw disk device with mkfs",
  },
  {
    test: />\s*\/dev\/(sd|nvme|disk|hd)\w*/,
    reason: "redirecting output onto a raw disk device",
  },
  {
    test: /\bchmod\s+-R\s+0?777\s+\/(\s|$)/,
    reason: "recursive chmod 777 on the filesystem root",
  },
  {
    test: /\bcurl\b.*\|\s*(ba)?sh\b/,
    reason: "piping curl output directly to a shell interpreter (remote code execution risk)",
  },
  {
    test: /\bwget\b.*\|\s*(ba)?sh\b/,
    reason: "piping wget output directly to a shell interpreter (remote code execution risk)",
  },
];

/** Force-pushing to a shared branch is a separate, three-part check. */
function isForcePushToProtected(command) {
  return (
    /\bgit\s+push\b/.test(command) &&
    /(-f\b|--force\b|--force-with-lease\b)/.test(command) &&
    // main/master must stand alone (whitespace, refspec colon, or string
    // edges) so branch names like fix-main-menu are not caught.
    /(?:^|[\s:])(main|master)(?=$|[\s'";&|])/.test(command)
  );
}

async function readStdin() {
  let raw = "";
  for await (const chunk of stdin) raw += chunk;
  return raw;
}

function block(reason, command) {
  process.stderr.write(`Blocked by command-guard: ${reason}.\nCommand: ${command}\n`);
  process.exit(2);
}

async function main() {
  const raw = await readStdin();
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  // Only inspect Bash commands; anything else is none of this hook's business.
  if (event?.tool_name !== "Bash") process.exit(0);
  const command =
    event.tool_input && typeof event.tool_input.command === "string"
      ? event.tool_input.command
      : "";
  if (!command) process.exit(0);

  const normalized = command.replace(/\s+/g, " ").trim();

  for (const rule of RULES) {
    if (rule.test.test(normalized)) block(rule.reason, command);
  }
  if (isForcePushToProtected(normalized)) {
    block("force-pushing to main or master can overwrite shared history", command);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
