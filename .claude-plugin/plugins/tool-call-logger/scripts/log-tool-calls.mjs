#!/usr/bin/env node
/**
 * tool-call-logger: append one JSON line per tool call to a log file.
 *
 * Wire it to PreToolUse and/or PostToolUse in .claude/settings.json (see
 * HOOK.md). It reads the hook payload from stdin and appends a sanitized
 * record as JSONL.
 *
 * Design guarantees:
 *   - Never blocks Claude Code: it ignores every error and always exits 0.
 *   - Zero dependencies (Node standard library only).
 *   - Redacts secret-looking values and truncates oversized payloads.
 *
 * Configuration (environment variables):
 *   - CLAUDE_TOOL_LOG         Log file path. Default:
 *                             $CLAUDE_PROJECT_DIR/.claude/logs/tool-calls.jsonl
 *   - CLAUDE_TOOL_LOG_MAXLEN  Max characters per string field. Default: 2000.
 */

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import process from "node:process";

const MAX_LEN = Number.parseInt(process.env.CLAUDE_TOOL_LOG_MAXLEN ?? "", 10) || 2000;
const MAX_DEPTH = 6;
const MAX_ARRAY = 100;
const SECRET_KEY =
  /pass(word)?|secret|token|api[-_]?key|access[-_]?key|client[-_]?secret|auth(orization)?|cookie|credential/i;

/** Cap a string so a single huge argument can't bloat the log. */
function truncate(value) {
  if (value.length <= MAX_LEN) return value;
  return `${value.slice(0, MAX_LEN)}…(+${value.length - MAX_LEN} chars)`;
}

/** Deep-copy a value, redacting secret-looking keys and truncating strings. */
function sanitize(value, depth, seen) {
  if (depth > MAX_DEPTH) return "[max depth]";
  if (typeof value === "string") return truncate(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY).map((item) => sanitize(item, depth + 1, seen));
    if (value.length > MAX_ARRAY) items.push(`…(+${value.length - MAX_ARRAY} items)`);
    return items;
  }

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = SECRET_KEY.test(key) ? "[redacted]" : sanitize(val, depth + 1, seen);
  }
  return out;
}

/** Resolve the log file: explicit env var wins, else project-local default. */
function resolveLogPath(payload) {
  const fromEnv = process.env.CLAUDE_TOOL_LOG;
  if (fromEnv && fromEnv.trim() !== "") {
    return isAbsolute(fromEnv) ? fromEnv : join(process.cwd(), fromEnv);
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
  return join(projectDir, ".claude", "logs", "tool-calls.jsonl");
}

function main() {
  let raw = "";
  try {
    raw = readFileSync(0, "utf8");
  } catch {
    return; // no stdin available
  }
  if (raw.trim() === "") return;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return; // payload was not JSON — nothing to log
  }

  const seen = new WeakSet();
  const record = {
    ts: new Date().toISOString(),
    event: payload.hook_event_name ?? null,
    session_id: payload.session_id ?? null,
    cwd: payload.cwd ?? null,
    tool_name: payload.tool_name ?? null,
    tool_input: sanitize(payload.tool_input ?? null, 0, seen),
  };
  // tool_response is present on PostToolUse only.
  if ("tool_response" in payload) {
    record.tool_response = sanitize(payload.tool_response, 0, seen);
  }

  const logPath = resolveLogPath(payload);
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, `${JSON.stringify(record)}\n`);
}

try {
  main();
} catch {
  // A logger must never break the session — swallow everything.
}
process.exit(0);
