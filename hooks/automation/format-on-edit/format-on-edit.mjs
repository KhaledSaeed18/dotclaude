#!/usr/bin/env node
/**
 * format-on-edit: a PostToolUse hook that runs the project's own formatter on
 * each file Claude Code just edited or wrote, so every edit lands already
 * formatted instead of accumulating style drift for a later cleanup commit.
 *
 * Formatter detection is conservative and project-driven:
 *   - biome.json / biome.jsonc            -> ./node_modules/.bin/biome
 *   - a Prettier config or package.json   -> ./node_modules/.bin/prettier
 *     "prettier" key
 *   - *.go                                -> gofmt on PATH
 *   - *.rs                                -> rustfmt on PATH
 *   - *.py with ruff configured           -> ruff on PATH
 *
 * Only locally installed binaries are used for JS tooling (never a network
 * npx fetch), and only the single edited file is formatted. If no formatter
 * applies, the hook does nothing.
 *
 * Fails open: any error (including a formatter crash) exits 0 so it can never
 * break an edit. Zero dependencies (Node standard library, node >= 18).
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { stdin } from "node:process";

/** Tools whose input carries a file path this hook should format. */
const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

/** Per-formatter file types, so a formatter is only invoked on files it owns. */
const BIOME_EXTS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".css",
]);
const PRETTIER_EXTS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".scss",
  ".less",
  ".html",
  ".vue",
  ".svelte",
  ".md",
  ".mdx",
  ".yaml",
  ".yml",
  ".graphql",
]);

const PRETTIER_CONFIGS = [
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.yml",
  ".prettierrc.yaml",
  ".prettierrc.js",
  ".prettierrc.cjs",
  ".prettierrc.mjs",
  ".prettierrc.toml",
  "prettier.config.js",
  "prettier.config.cjs",
  "prettier.config.mjs",
];

/** Walk up from the edited file to the project root, looking for a marker. */
function findUp(startDir, stopDir, predicate) {
  let dir = startDir;
  for (let i = 0; i < 50; i++) {
    if (predicate(dir)) return dir;
    if (dir === stopDir || dirname(dir) === dir) return null;
    dir = dirname(dir);
  }
  return null;
}

function hasPrettierConfig(dir) {
  if (PRETTIER_CONFIGS.some((name) => existsSync(join(dir, name)))) return true;
  const pkg = join(dir, "package.json");
  if (!existsSync(pkg)) return false;
  try {
    return JSON.parse(readFileSync(pkg, "utf8")).prettier !== undefined;
  } catch {
    return false;
  }
}

function hasRuffConfig(dir) {
  if (existsSync(join(dir, "ruff.toml")) || existsSync(join(dir, ".ruff.toml"))) return true;
  const pyproject = join(dir, "pyproject.toml");
  return existsSync(pyproject) && readFileSync(pyproject, "utf8").includes("[tool.ruff");
}

/** Run a formatter, capped so a hung tool can never stall the session. */
function run(command, args) {
  execFileSync(command, args, { stdio: "ignore", timeout: 15_000 });
}

function formatFile(filePath, projectDir) {
  const ext = extname(filePath).toLowerCase();
  const fileDir = dirname(filePath);
  const root = projectDir || fileDir;

  if (ext === ".go") {
    run("gofmt", ["-w", filePath]);
    return;
  }
  if (ext === ".rs") {
    run("rustfmt", ["--edition", "2021", filePath]);
    return;
  }
  if (ext === ".py") {
    if (findUp(fileDir, root, hasRuffConfig)) run("ruff", ["format", filePath]);
    return;
  }

  // JS-family tooling: only ever the project's own installed binary.
  const biomeDir = findUp(
    fileDir,
    root,
    (dir) => existsSync(join(dir, "biome.json")) || existsSync(join(dir, "biome.jsonc")),
  );
  if (biomeDir && BIOME_EXTS.has(ext)) {
    const bin = findUp(fileDir, root, (dir) => existsSync(join(dir, "node_modules/.bin/biome")));
    if (bin) run(join(bin, "node_modules/.bin/biome"), ["format", "--write", filePath]);
    return;
  }

  const prettierDir = findUp(fileDir, root, hasPrettierConfig);
  if (prettierDir && PRETTIER_EXTS.has(ext)) {
    const bin = findUp(fileDir, root, (dir) => existsSync(join(dir, "node_modules/.bin/prettier")));
    if (bin) run(join(bin, "node_modules/.bin/prettier"), ["--write", filePath]);
  }
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
  const input = event.tool_input;
  const filePath = typeof input?.file_path === "string" ? input.file_path : input?.notebook_path;
  if (typeof filePath !== "string" || filePath === "") return;

  const resolved = resolve(filePath);
  if (!existsSync(resolved)) return;

  const projectDir = process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd();
  formatFile(resolved, resolve(projectDir));
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
