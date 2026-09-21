#!/usr/bin/env node
/**
 * session-context: a SessionStart hook that gives every new session its
 * bearings before the first prompt: the current branch, what is uncommitted,
 * the last few commits, and any handoff document the previous session left.
 *
 * Emits the summary as `additionalContext`, so it lands in Claude's context
 * rather than in the transcript as a user message. Nothing is written.
 *
 * Configuration (optional), in `<project>/.claude/dotclaude.json`:
 *   {
 *     "sessionContext": {
 *       "commits": 3,                  // recent commits to list (0 disables)
 *       "handoffFile": "HANDOFF.md",   // relative to the project root
 *       "maxHandoffChars": 4000
 *     }
 *   }
 *
 * Fails open: any error exits 0 with no output. Zero dependencies (node >= 18).
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { stdin } from "node:process";

const DEFAULTS = { commits: 3, handoffFile: "HANDOFF.md", maxHandoffChars: 4000 };

function readConfig(projectDir) {
  try {
    const raw = readFileSync(join(projectDir, ".claude", "dotclaude.json"), "utf8");
    const section = JSON.parse(raw)?.sessionContext;
    return { ...DEFAULTS, ...(section && typeof section === "object" ? section : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

function git(projectDir, args) {
  try {
    return execFileSync("git", args, {
      cwd: projectDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5_000,
    }).trimEnd();
  } catch {
    return null;
  }
}

function gitSummary(projectDir, config) {
  const branch = git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch === null) return [];

  const lines = [`Branch: ${branch}`];

  const upstream = git(projectDir, ["rev-list", "--left-right", "--count", "@{upstream}...HEAD"]);
  if (upstream) {
    const [behind, ahead] = upstream.split(/\s+/).map(Number);
    if (ahead || behind) lines.push(`Upstream: ${ahead} ahead, ${behind} behind`);
  }

  const status = git(projectDir, ["status", "--porcelain"]);
  if (status) {
    const files = status.split("\n").filter(Boolean);
    const shown = files.slice(0, 10).map((line) => `  ${line}`);
    if (files.length > 10) shown.push(`  ... and ${files.length - 10} more`);
    lines.push(`Uncommitted changes (${files.length}):`, ...shown);
  } else {
    lines.push("Working tree clean");
  }

  const count = Number(config.commits);
  if (Number.isInteger(count) && count > 0) {
    const log = git(projectDir, ["log", `-${count}`, "--format=  %h %s"]);
    if (log) lines.push("Recent commits:", log);
  }
  return lines;
}

function handoff(projectDir, config) {
  if (typeof config.handoffFile !== "string" || config.handoffFile === "") return [];
  const file = resolve(projectDir, config.handoffFile);
  if (!file.startsWith(resolve(projectDir)) || !existsSync(file)) return [];
  let text = readFileSync(file, "utf8").trim();
  if (text === "") return [];
  const cap = Number(config.maxHandoffChars) || DEFAULTS.maxHandoffChars;
  if (text.length > cap)
    text = `${text.slice(0, cap)}\n... (truncated, read ${config.handoffFile} for the rest)`;
  return [`Handoff from a previous session (${config.handoffFile}):`, text];
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
  if (event?.hook_event_name && event.hook_event_name !== "SessionStart") return;

  const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR || event?.cwd || process.cwd());
  const config = readConfig(projectDir);

  const sections = [...gitSummary(projectDir, config), ...handoff(projectDir, config)];
  if (sections.length === 0) return;

  const context = ["Session context (from the session-context hook):", ...sections].join("\n");
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context },
    })}\n`,
  );
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
