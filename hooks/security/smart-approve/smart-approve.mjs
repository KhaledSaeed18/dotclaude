#!/usr/bin/env node
/**
 * smart-approve: a PreToolUse hook that decomposes compound Bash commands
 * (&&, ||, ;, |, $(...), backticks) into their component sub-commands and
 * checks each one independently against a deny list.
 *
 * This closes the chain-smuggling gap in simpler guards: a dangerous operation
 * embedded inside `safe-command && rm -rf /` would pass a guard that only
 * reads the full command string without decomposing it.
 *
 * Fails open: any error in the hook itself exits 0 so it can never break a
 * legitimate command. Zero dependencies (Node standard library, node >= 18).
 */

import { stdin } from "node:process";

/**
 * Deny rules, each tested against every decomposed sub-command in turn.
 * The test regex is matched against the whitespace-normalized sub-command.
 */
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
    test: /\bwget\b.*-[qO-]*\s*-\s*\|\s*(ba)?sh\b/,
    reason: "piping wget output directly to a shell interpreter (remote code execution risk)",
  },
];

/** Force-pushing to a shared branch is a separate, three-part check. */
function isForcePushToProtected(cmd) {
  return (
    /\bgit\s+push\b/.test(cmd) &&
    /(-f\b|--force\b|--force-with-lease\b)/.test(cmd) &&
    /\b(main|master)\b/.test(cmd)
  );
}

/**
 * Decompose a compound shell command into its constituent sub-commands so each
 * can be checked independently. Splits on &&, ||, ;, and | (single pipe). Also
 * extracts $(...) and backtick sub-expressions recursively (one level deep).
 */
function decompose(command) {
  const pieces = [];

  // Split on &&, ||, ;, and single-pipe (| not followed by another |)
  const parts = command.split(/&&|\|\|?|;/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed) pieces.push(trimmed);

    // Extract $(...) sub-expressions
    const dollar = /\$\(([^)]+)\)/g;
    let m;
    while ((m = dollar.exec(part)) !== null) {
      if (m[1]) pieces.push(m[1].trim());
    }
    // Extract backtick sub-expressions
    const backtick = /`([^`]+)`/g;
    while ((m = backtick.exec(part)) !== null) {
      if (m[1]) pieces.push(m[1].trim());
    }
  }

  return pieces.filter(Boolean);
}

async function readStdin() {
  let raw = "";
  for await (const chunk of stdin) raw += chunk;
  return raw;
}

function block(reason, sub, original) {
  process.stderr.write(
    `Blocked by smart-approve: ${reason}.\nSub-command: ${sub}\nFull command: ${original}\n`,
  );
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

  if (event?.tool_name !== "Bash") process.exit(0);
  const command =
    event.tool_input && typeof event.tool_input.command === "string"
      ? event.tool_input.command
      : "";
  if (!command) process.exit(0);

  const subCommands = decompose(command);

  for (const sub of subCommands) {
    const normalized = sub.replace(/\s+/g, " ").trim();
    for (const rule of RULES) {
      if (rule.test.test(normalized)) block(rule.reason, sub, command);
    }
    if (isForcePushToProtected(normalized)) {
      block("force-pushing to main or master can overwrite shared history", sub, command);
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
