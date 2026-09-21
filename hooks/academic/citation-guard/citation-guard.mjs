#!/usr/bin/env node
/**
 * citation-guard: a PostToolUse hook that, after Claude edits a .tex or .md
 * file, checks every cite key in it against the project's .bib file and
 * reports the ones that do not exist, so a citation invented mid-draft is
 * caught in the same step. After an edit to a .bib file it reports duplicate
 * keys and entries with no DOI, arXiv id, or URL (the ones citation-verifier
 * cannot check).
 *
 * Cite forms recognised:
 *   LaTeX     \cite{a,b} \citep \citet \parencite \textcite \autocite \footcite
 *             \citeauthor \citeyear, with optional [..] arguments and a star
 *   Markdown  [@key] [@a; @b, p. 3] and bare @key inside brackets
 *
 * The .bib is `citationGuard.bibFile` in `<project>/.claude/dotclaude.json`,
 * else the nearest *.bib walking up from the edited file, else every *.bib in
 * the project (depth <= 4). With no .bib at all the hook stays silent.
 *
 * Output is `additionalContext`, never a block. Fails open. Zero dependencies
 * (node >= 18).
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { stdin } from "node:process";

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit"]);
const TEXT_EXTS = new Set([".tex", ".md", ".markdown", ".qmd", ".Rmd"]);
const DEFAULTS = { enabled: true, bibFile: "" };
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".venv", "venv", "_build"]);

function readConfig(projectDir) {
  try {
    const raw = readFileSync(join(projectDir, ".claude", "dotclaude.json"), "utf8");
    const section = JSON.parse(raw)?.citationGuard;
    return { ...DEFAULTS, ...(section && typeof section === "object" ? section : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

function findBibsUpward(startDir, stopDir) {
  let dir = startDir;
  for (let i = 0; i < 50; i++) {
    const bibs = readdirSync(dir).filter((f) => f.endsWith(".bib"));
    if (bibs.length > 0) return bibs.map((f) => join(dir, f));
    if (dir === stopDir || dirname(dir) === dir) return [];
    dir = dirname(dir);
  }
  return [];
}

function findBibsBelow(dir, depth, out) {
  if (depth < 0) return out;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name) && !e.name.startsWith(".")) {
        findBibsBelow(join(dir, e.name), depth - 1, out);
      }
    } else if (e.name.endsWith(".bib")) {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

function locateBibs(file, projectDir, config) {
  if (typeof config.bibFile === "string" && config.bibFile !== "") {
    const p = resolve(projectDir, config.bibFile);
    return existsSync(p) ? [p] : [];
  }
  const up = findBibsUpward(dirname(file), projectDir);
  if (up.length > 0) return up;
  return findBibsBelow(projectDir, 4, []);
}

/** Keys defined in a .bib, with duplicate detection. */
function bibKeys(text) {
  const keys = new Map();
  const duplicates = new Set();
  for (const m of text.matchAll(/^\s*@(\w+)\s*\{\s*([^,\s]+)\s*,/gm)) {
    if (m[1].toLowerCase() === "comment" || m[1].toLowerCase() === "string") continue;
    const key = m[2];
    if (keys.has(key)) duplicates.add(key);
    keys.set(key, (keys.get(key) ?? 0) + 1);
  }
  return { keys: new Set(keys.keys()), duplicates: [...duplicates] };
}

/** Entries lacking any resolvable identifier. */
function unverifiableEntries(text) {
  const out = [];
  const entries = text.split(/^(?=\s*@\w+\s*\{)/m);
  for (const entry of entries) {
    const head = entry.match(/^\s*@(\w+)\s*\{\s*([^,\s]+)\s*,/);
    if (!head || ["comment", "string"].includes(head[1].toLowerCase())) continue;
    if (!/[,{]\s*(doi|eprint|url|howpublished)\s*=/i.test(entry)) out.push(head[2]);
  }
  return [...new Set(out)];
}

/** Cite keys used in a .tex or .md file, in order of first appearance. */
function citedKeys(text, ext) {
  const found = [];
  const seen = new Set();
  const add = (k) => {
    const key = k.trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      found.push(key);
    }
  };
  if (ext === ".tex") {
    const re =
      /\\(?:cite|citep|citet|parencite|textcite|autocite|footcite|citeauthor|citeyear|citealp|citealt|fullcite|nocite)\*?(?:\[[^\]]*\]){0,2}\{([^}]*)\}/g;
    for (const m of text.matchAll(re)) for (const k of m[1].split(",")) add(k);
  } else {
    // Pandoc: [@a; @b, p. 3] and in-text @a; ignore emails and @ in code.
    const stripped = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
    for (const m of stripped.matchAll(/\[([^\]]*@[^\]]*)\]/g)) {
      for (const part of m[1].split(";")) {
        const k = part.match(/@\{?([A-Za-z0-9_][A-Za-z0-9_:.#$%&+?<>~/-]*)\}?/);
        if (k) add(k[1].replace(/[.,;:]+$/, ""));
      }
    }
    for (const m of stripped.matchAll(/(^|[\s(])@([A-Za-z][A-Za-z0-9_:.-]*[A-Za-z0-9])/g)) {
      if (!m[2].includes(".") || /^[A-Za-z0-9_]+\d{4}/.test(m[2])) add(m[2]);
    }
  }
  return found;
}

function emit(context) {
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: context },
    })}\n`,
  );
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
  if (!existsSync(file) || !statSync(file).isFile()) return;

  const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd());
  const config = readConfig(projectDir);
  if (config.enabled === false) return;

  const ext = extname(file);
  const rel = relative(projectDir, file);

  if (ext === ".bib") {
    const text = readFileSync(file, "utf8");
    const { duplicates } = bibKeys(text);
    const unverifiable = unverifiableEntries(text);
    const lines = [];
    if (duplicates.length > 0) lines.push(`Duplicate keys: ${duplicates.join(", ")}`);
    if (unverifiable.length > 0) {
      lines.push(
        `Entries with no doi, eprint, url, or howpublished (citation-verifier cannot check these): ${unverifiable.slice(0, 15).join(", ")}${unverifiable.length > 15 ? ` and ${unverifiable.length - 15} more` : ""}`,
      );
    }
    if (lines.length > 0) emit(`citation-guard on ${rel}:\n${lines.join("\n")}`);
    return;
  }

  if (!TEXT_EXTS.has(ext)) return;
  const text = readFileSync(file, "utf8");
  const cited = citedKeys(text, ext === ".tex" ? ".tex" : ".md");
  if (cited.length === 0) return;

  const bibs = locateBibs(file, projectDir, config);
  if (bibs.length === 0) return;

  const defined = new Set();
  for (const bib of bibs) {
    try {
      for (const k of bibKeys(readFileSync(bib, "utf8")).keys) defined.add(k);
    } catch {
      // Unreadable .bib: treat as empty.
    }
  }
  const missing = cited.filter((k) => !defined.has(k));
  if (missing.length === 0) return;

  const bibList = bibs.map((b) => relative(projectDir, b)).join(", ");
  emit(
    `citation-guard: ${rel} cites ${missing.length} key${missing.length === 1 ? "" : "s"} not defined in ${bibList}: ${missing.join(", ")}. Add each with bibtex-manager from a real DOI or arXiv id, or fix the key. Never invent an entry.`,
  );
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
