#!/usr/bin/env node
/**
 * typecheck-on-edit: a PostToolUse hook that type-checks the project after
 * Claude edits a TypeScript, Python, or Go file and feeds any errors straight
 * back as context, so a type error is fixed in the same breath as the edit
 * instead of surfacing at the end of the session.
 *
 * Per language, using only tools the project already has:
 *   - .ts/.tsx/.mts/.cts  nearest tsconfig.json + ./node_modules/.bin/tsc --noEmit
 *   - .py                 pyright (local node_modules/.bin or on PATH), else mypy
 *   - .go                 go vet on the file's package
 *
 * Errors in the edited file are listed first, then up to a cap of others (an
 * edit can break callers). Output is `additionalContext`, never a block: the
 * edit already happened and Claude should see the consequences, not be
 * stopped.
 *
 * Configuration (optional):
 *   { "typecheckOnEdit": { "enabled": true, "timeoutMs": 60000, "maxLines": 25 } }
 *
 * Fails open: no checker, a crash, or a timeout means no output and exit 0.
 * Zero dependencies (node >= 18).
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { stdin } from "node:process";

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit"]);
const TS_EXTS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const DEFAULTS = { enabled: true, timeoutMs: 60_000, maxLines: 25 };

function readConfig(projectDir) {
  try {
    const raw = readFileSync(join(projectDir, ".claude", "dotclaude.json"), "utf8");
    const section = JSON.parse(raw)?.typecheckOnEdit;
    return { ...DEFAULTS, ...(section && typeof section === "object" ? section : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

function findUp(startDir, stopDir, predicate) {
  let dir = startDir;
  for (let i = 0; i < 50; i++) {
    if (predicate(dir)) return dir;
    if (dir === stopDir || dirname(dir) === dir) return null;
    dir = dirname(dir);
  }
  return null;
}

function run(command, args, cwd, timeout) {
  const res = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
  });
  if (res.error || res.status === null) return null;
  return { status: res.status, output: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

/** { cwd, command, args } for the checker that applies, or null. */
function checker(filePath, projectDir) {
  const ext = extname(filePath).toLowerCase();
  const fileDir = dirname(filePath);

  if (TS_EXTS.has(ext)) {
    const tsDir = findUp(fileDir, projectDir, (d) => existsSync(join(d, "tsconfig.json")));
    if (!tsDir) return null;
    const binDir = findUp(fileDir, projectDir, (d) => existsSync(join(d, "node_modules/.bin/tsc")));
    if (!binDir) return null;
    return {
      cwd: tsDir,
      command: join(binDir, "node_modules/.bin/tsc"),
      args: ["--noEmit", "--pretty", "false", "-p", join(tsDir, "tsconfig.json")],
    };
  }
  if (ext === ".py") {
    const binDir = findUp(fileDir, projectDir, (d) =>
      existsSync(join(d, "node_modules/.bin/pyright")),
    );
    if (binDir) {
      return {
        cwd: projectDir,
        command: join(binDir, "node_modules/.bin/pyright"),
        args: ["--outputjson", filePath],
      };
    }
    return {
      cwd: projectDir,
      command: "pyright",
      args: ["--outputjson", filePath],
      fallback: "mypy",
    };
  }
  if (ext === ".go") {
    return { cwd: fileDir, command: "go", args: ["vet", "."] };
  }
  return null;
}

/** Turn pyright's JSON into tsc-style `file(line,col): message` lines. */
function pyrightLines(output) {
  try {
    const report = JSON.parse(output);
    return (report.generalDiagnostics ?? [])
      .filter((d) => d.severity === "error")
      .map(
        (d) => `${d.file}(${d.range.start.line + 1},${d.range.start.character + 1}): ${d.message}`,
      );
  } catch {
    return output.split("\n").filter((l) => /error/i.test(l));
  }
}

function errorLines(command, output) {
  if (/pyright/.test(command)) return pyrightLines(output);
  return output
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l !== "" && !/^\s+at /.test(l));
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
  if (!EDIT_TOOLS.has(event?.tool_name)) return;
  const filePath = event.tool_input?.file_path;
  if (typeof filePath !== "string" || filePath === "") return;
  const file = resolve(filePath);
  if (!existsSync(file)) return;

  const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd());
  const config = readConfig(projectDir);
  if (config.enabled === false) return;

  const spec = checker(file, projectDir);
  if (!spec) return;

  const timeout = Number(config.timeoutMs) > 0 ? Number(config.timeoutMs) : DEFAULTS.timeoutMs;
  let res = run(spec.command, spec.args, spec.cwd, timeout);
  if (res === null && spec.fallback) res = run(spec.fallback, [file], spec.cwd, timeout);
  if (res === null || res.status === 0) return;

  const lines = errorLines(spec.command, res.output);
  if (lines.length === 0) return;

  const rel = relative(projectDir, file);
  const own = lines.filter((l) => l.includes(rel) || l.includes(file));
  const others = lines.filter((l) => !own.includes(l));
  const cap = Number(config.maxLines) > 0 ? Number(config.maxLines) : DEFAULTS.maxLines;
  const shown = [...own, ...others].slice(0, cap);
  const hidden = lines.length - shown.length;

  const context = [
    `Type check failed after editing ${rel} (${lines.length} error line${lines.length === 1 ? "" : "s"}). Fix these before moving on:`,
    ...shown,
    hidden > 0 ? `... and ${hidden} more` : null,
  ]
    .filter(Boolean)
    .join("\n");

  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: context },
    })}\n`,
  );
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
