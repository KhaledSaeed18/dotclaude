#!/usr/bin/env node
/**
 * branch-protect: a UserPromptSubmit hook that, once per session, tells Claude
 * it is working directly on a protected branch so it branches before making
 * changes. Advisory only: it adds a line of context and never blocks. The
 * hard stop for force-pushes and deletions lives in git-guard.
 *
 * Configuration (optional):
 *   { "branchProtect": { "protectedBranches": ["main", "master", "develop"], "oncePerSession": true } }
 *
 * Fails open (exit 0, no output). Zero dependencies (node >= 18).
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { stdin } from "node:process";

const DEFAULTS = { protectedBranches: ["main", "master", "develop"], oncePerSession: true };

function readConfig(projectDir) {
  try {
    const raw = readFileSync(join(projectDir, ".claude", "dotclaude.json"), "utf8");
    const section = JSON.parse(raw)?.branchProtect;
    const merged = { ...DEFAULTS, ...(section && typeof section === "object" ? section : {}) };
    if (!Array.isArray(merged.protectedBranches))
      merged.protectedBranches = DEFAULTS.protectedBranches;
    return merged;
  } catch {
    return { ...DEFAULTS };
  }
}

function currentBranch(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5_000,
    }).trim();
  } catch {
    return null;
  }
}

function isProtected(branch, patterns) {
  return patterns.some((pattern) => {
    if (typeof pattern !== "string") return false;
    if (!pattern.includes("*")) return pattern === branch;
    const re = new RegExp(
      `^${pattern
        .split("*")
        .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*")}$`,
    );
    return re.test(branch);
  });
}

/** True the first time this session sees a given branch; false after. */
function firstTime(sessionId, branch) {
  if (typeof sessionId !== "string" || sessionId === "") return true;
  const marker = join(
    tmpdir(),
    `dotclaude-branch-protect-${sessionId.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
  );
  try {
    if (existsSync(marker) && readFileSync(marker, "utf8") === branch) return false;
    writeFileSync(marker, branch);
  } catch {
    // Unwritable temp dir: warn every time rather than never.
  }
  return true;
}

async function readStdin() {
  let raw = "";
  for await (const chunk of stdin) raw += chunk;
  return raw;
}

async function main() {
  const raw = await readStdin();
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return;
  }
  if (event?.hook_event_name && event.hook_event_name !== "UserPromptSubmit") return;

  const cwd = resolve(process.env.CLAUDE_PROJECT_DIR || event?.cwd || process.cwd());
  const config = readConfig(cwd);
  const branch = currentBranch(cwd);
  if (!branch || branch === "HEAD" || !isProtected(branch, config.protectedBranches)) return;
  if (config.oncePerSession !== false && !firstTime(event?.session_id, branch)) return;

  process.stdout.write(
    `Note from the branch-protect hook: this checkout is on the protected branch "${branch}". Before committing or editing files, create a feature branch (git switch -c <name>) unless the user explicitly asked to work on ${branch}.\n`,
  );
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
