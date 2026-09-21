#!/usr/bin/env node
/**
 * subagent-summary: a SubagentStop hook that appends one JSON line per
 * finished subagent to a project log, so parallel or delegated work leaves an
 * audit trail: when it ran, which session, which agent, and the first lines of
 * its final report when the transcript is available.
 *
 * Log line shape:
 *   {"ts":"2026-09-21T10:00:00.000Z","session":"…","agent":"…","summary":"…"}
 *
 * Configuration (optional):
 *   { "subagentSummary": { "logFile": ".claude/subagents.log", "maxSummaryChars": 300 } }
 *
 * The log file is created on first use, inside the project. Consider adding it
 * to .gitignore. Fails open (exit 0). Zero dependencies (node >= 18).
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { stdin } from "node:process";

const DEFAULTS = { logFile: ".claude/subagents.log", maxSummaryChars: 300 };

function readConfig(projectDir) {
  try {
    const raw = readFileSync(join(projectDir, ".claude", "dotclaude.json"), "utf8");
    const section = JSON.parse(raw)?.subagentSummary;
    return { ...DEFAULTS, ...(section && typeof section === "object" ? section : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Text of the last assistant message in a JSONL transcript, or "". */
function lastAssistantText(transcriptPath) {
  if (typeof transcriptPath !== "string" || !existsSync(transcriptPath)) return "";
  let lines;
  try {
    lines = readFileSync(transcriptPath, "utf8").split("\n").filter(Boolean);
  } catch {
    return "";
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    const message = entry?.message ?? entry;
    if ((entry?.type ?? message?.role) !== "assistant") continue;
    const content = message?.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      const text = content
        .filter((block) => block?.type === "text" && typeof block.text === "string")
        .map((block) => block.text)
        .join("\n");
      if (text) return text;
    }
  }
  return "";
}

function summarize(text, cap) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > cap ? `${oneLine.slice(0, cap)}…` : oneLine;
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
  if (event?.hook_event_name && event.hook_event_name !== "SubagentStop") return;

  const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR || event?.cwd || process.cwd());
  const config = readConfig(projectDir);
  if (typeof config.logFile !== "string" || config.logFile === "") return;
  const logFile = resolve(projectDir, config.logFile);
  if (!logFile.startsWith(projectDir)) return;

  const cap =
    Number(config.maxSummaryChars) > 0 ? Number(config.maxSummaryChars) : DEFAULTS.maxSummaryChars;
  const transcript = event?.agent_transcript_path ?? event?.transcript_path;
  const entry = {
    ts: new Date().toISOString(),
    session: typeof event?.session_id === "string" ? event.session_id : null,
    agent: typeof event?.agent_id === "string" ? event.agent_id : null,
    summary: summarize(lastAssistantText(transcript), cap),
  };

  mkdirSync(dirname(logFile), { recursive: true });
  appendFileSync(logFile, `${JSON.stringify(entry)}\n`);
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
