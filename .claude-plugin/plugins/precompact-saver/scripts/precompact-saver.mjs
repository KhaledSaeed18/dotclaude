#!/usr/bin/env node
/**
 * precompact-saver: a PreCompact hook that snapshots the session transcript to
 * a local file just before Claude Code compacts the context. Compaction
 * summarizes and discards detail; the snapshot preserves the full pre-compact
 * record so you can recover exact earlier instructions, tool output, or
 * decisions that the summary dropped.
 *
 * Snapshots land in `.claude/compact-backups/` inside the project, named by
 * timestamp and session id. Old snapshots beyond KEEP_LAST are pruned so the
 * folder cannot grow without bound.
 *
 * Fails open: any error exits 0 so it can never block compaction. Zero
 * dependencies (Node standard library, node >= 18).
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { stdin } from "node:process";

const KEEP_LAST = 10;

async function readStdin() {
  let raw = "";
  for await (const chunk of stdin) raw += chunk;
  return raw;
}

/** Keep only the newest KEEP_LAST snapshots in the backup directory. */
function prune(dir) {
  const entries = readdirSync(dir)
    .filter((name) => name.startsWith("precompact-"))
    .map((name) => ({ name, mtime: statSync(join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  for (const entry of entries.slice(KEEP_LAST)) {
    rmSync(join(dir, entry.name), { force: true });
  }
}

async function main() {
  const raw = await readStdin();
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return;
  }

  const transcript = event?.transcript_path;
  if (typeof transcript !== "string" || !existsSync(transcript)) return;

  const projectDir = process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd();
  const backupDir = join(projectDir, ".claude", "compact-backups");
  mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const session = typeof event.session_id === "string" ? event.session_id.slice(0, 8) : "unknown";
  copyFileSync(transcript, join(backupDir, `precompact-${stamp}-${session}.jsonl`));

  prune(backupDir);
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
