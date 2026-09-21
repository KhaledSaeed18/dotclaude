#!/usr/bin/env node
/**
 * stop-gate: a Stop hook that runs the project's test command before Claude
 * is allowed to finish a turn with uncommitted changes. A failing suite blocks
 * the stop and hands the failure output back, so "done" means the tests say so.
 *
 * Detection, in order:
 *   1. `stopGate.command` in `<project>/.claude/dotclaude.json`
 *   2. package.json "test" script, run with the lockfile's package manager
 *   3. Makefile with a `test` target                -> make test
 *   4. Cargo.toml                                    -> cargo test
 *   5. go.mod                                        -> go test ./...
 *   6. pyproject.toml / pytest.ini / setup.cfg       -> pytest -q
 *
 * Runs only when the working tree has uncommitted changes (a pure Q&A session
 * never triggers a test run) and never when `stop_hook_active` is set, which
 * is Claude Code's signal that this stop was itself caused by a hook, so the
 * gate can never loop.
 *
 * Configuration (optional):
 *   {
 *     "stopGate": {
 *       "enabled": true,
 *       "command": "pnpm test",     // overrides detection; run through the shell
 *       "timeoutMs": 120000,
 *       "onlyWhenDirty": true
 *     }
 *   }
 *
 * Exit 2 with the failure on stderr blocks the stop. Anything else (no test
 * command, timeout, internal error) exits 0. Zero dependencies (node >= 18).
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { stdin } from "node:process";

const DEFAULTS = { enabled: true, command: "", timeoutMs: 120_000, onlyWhenDirty: true };
const MAX_OUTPUT_CHARS = 4000;

function readConfig(projectDir) {
  try {
    const raw = readFileSync(join(projectDir, ".claude", "dotclaude.json"), "utf8");
    const section = JSON.parse(raw)?.stopGate;
    return { ...DEFAULTS, ...(section && typeof section === "object" ? section : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

function packageManager(dir) {
  if (existsSync(join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(dir, "yarn.lock"))) return "yarn";
  if (existsSync(join(dir, "bun.lockb")) || existsSync(join(dir, "bun.lock"))) return "bun";
  return "npm";
}

/** The test command for this project, as a shell string, or null. */
function detectCommand(dir) {
  const pkg = join(dir, "package.json");
  if (existsSync(pkg)) {
    try {
      const scripts = JSON.parse(readFileSync(pkg, "utf8")).scripts ?? {};
      // npm's placeholder counts as "no tests configured".
      if (typeof scripts.test === "string" && !/no test specified/.test(scripts.test)) {
        return `${packageManager(dir)} test`;
      }
    } catch {
      // Unparseable package.json: fall through to the other detectors.
    }
  }
  const makefile = join(dir, "Makefile");
  if (existsSync(makefile) && /^test\s*:/m.test(readFileSync(makefile, "utf8"))) return "make test";
  if (existsSync(join(dir, "Cargo.toml"))) return "cargo test";
  if (existsSync(join(dir, "go.mod"))) return "go test ./...";
  if (
    existsSync(join(dir, "pytest.ini")) ||
    existsSync(join(dir, "setup.cfg")) ||
    (existsSync(join(dir, "pyproject.toml")) &&
      /pytest/.test(readFileSync(join(dir, "pyproject.toml"), "utf8")))
  ) {
    return "pytest -q";
  }
  return null;
}

function isDirty(dir) {
  try {
    const out = execFileSync("git", ["status", "--porcelain"], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5_000,
    });
    return out.trim() !== "";
  } catch {
    // Not a git repo (or git missing): treat as dirty so the gate still runs.
    return true;
  }
}

function tail(text, cap) {
  return text.length > cap ? `...\n${text.slice(-cap)}` : text;
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
    return 0;
  }
  if (event?.hook_event_name && event.hook_event_name !== "Stop") return 0;
  // This stop was caused by a hook (possibly this one): never gate again.
  if (event?.stop_hook_active === true) return 0;

  const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR || event?.cwd || process.cwd());
  const config = readConfig(projectDir);
  if (config.enabled === false) return 0;
  if (config.onlyWhenDirty !== false && !isDirty(projectDir)) return 0;

  const command =
    typeof config.command === "string" && config.command.trim() !== ""
      ? config.command.trim()
      : detectCommand(projectDir);
  if (!command) return 0;

  const timeout = Number(config.timeoutMs) > 0 ? Number(config.timeoutMs) : DEFAULTS.timeoutMs;
  const res = spawnSync(command, {
    cwd: projectDir,
    shell: true,
    encoding: "utf8",
    timeout,
    env: { ...process.env, CI: "1", FORCE_COLOR: "0", NO_COLOR: "1" },
  });

  // A timeout or a spawn failure is not a test failure: fail open.
  if (res.error || res.status === null) return 0;
  if (res.status === 0) return 0;

  const output = tail(`${res.stdout ?? ""}${res.stderr ?? ""}`.trim(), MAX_OUTPUT_CHARS);
  process.stderr.write(
    `stop-gate: \`${command}\` failed (exit ${res.status}). Fix the failures before finishing.\n\n${output}\n`,
  );
  return 2;
}

main()
  .then((code) => process.exit(code))
  .catch(() => process.exit(0));
