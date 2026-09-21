/**
 * Black-box tests for the academic hooks, spawned as child processes with the
 * event JSON on stdin against throwaway project directories.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const CITATION_GUARD = join(
  process.cwd(),
  "hooks",
  "academic",
  "citation-guard",
  "citation-guard.mjs",
);

interface HookResult {
  status: number;
  stdout: string;
}

function runHook(script: string, event: unknown, env: Record<string, string> = {}): HookResult {
  const res = spawnSync(process.execPath, [script], {
    input: typeof event === "string" ? event : JSON.stringify(event),
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  return { status: res.status ?? -1, stdout: res.stdout ?? "" };
}

function context(result: HookResult): string {
  if (result.stdout.trim() === "") return "";
  return JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
}

let cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
});

function makeProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "dotclaude-cite-"));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

const BIB = [
  "@article{smith2023feedback,",
  "  title = {X},",
  "  doi = {10.1/x}",
  "}",
  "@comment{ignored}",
  "@misc{lee2022, title = {Y}, url = {https://e.org} }",
  "",
].join("\n");

const edit = (file: string, cwd: string) => ({
  tool_name: "Edit",
  tool_input: { file_path: file },
  cwd,
});

describe("citation-guard", () => {
  it("reports LaTeX cite keys missing from the nearest .bib", () => {
    const dir = makeProject();
    mkdirSync(join(dir, "chapters"));
    writeFileSync(join(dir, "refs.bib"), BIB);
    const file = join(dir, "chapters", "intro.tex");
    writeFileSync(
      file,
      "As shown \\cite{smith2023feedback, ghost2024} and \\parencite[see][p.~3]{other2021} and \\citet*{lee2022}.\n",
    );
    const out = context(runHook(CITATION_GUARD, edit(file, dir)));
    expect(out).toContain(
      "chapters/intro.tex cites 2 keys not defined in refs.bib: ghost2024, other2021",
    );
    expect(out).toContain("Never invent an entry");
  });

  it("reports Pandoc cite keys and ignores code and emails", () => {
    const dir = makeProject();
    writeFileSync(join(dir, "refs.bib"), BIB);
    const file = join(dir, "rel.md");
    writeFileSync(
      file,
      "Prior work [@smith2023feedback; @lee2022, p. 3] and @jones2020 show it. Mail a@b.com. `[@code]`\n```\n[@fenced]\n```\n",
    );
    const out = context(runHook(CITATION_GUARD, edit(file, dir)));
    expect(out).toContain("cites 1 key not defined");
    expect(out).toContain("jones2020");
    expect(out).not.toContain("code");
    expect(out).not.toContain("fenced");
  });

  it("is silent when every key exists, when there is no .bib, or no cites", () => {
    const dir = makeProject();
    const file = join(dir, "a.tex");
    writeFileSync(file, "\\cite{smith2023feedback}\n");
    expect(runHook(CITATION_GUARD, edit(file, dir)).stdout).toBe("");
    writeFileSync(join(dir, "refs.bib"), BIB);
    expect(runHook(CITATION_GUARD, edit(file, dir)).stdout).toBe("");
    writeFileSync(file, "No citations here.\n");
    expect(runHook(CITATION_GUARD, edit(file, dir)).stdout).toBe("");
  });

  it("uses the configured .bib, or every .bib below the project when none is nearby", () => {
    const dir = makeProject();
    mkdirSync(join(dir, "bib"));
    mkdirSync(join(dir, "text"));
    writeFileSync(join(dir, "bib", "a.bib"), "@misc{alpha2020, title={A}, url={u}}\n");
    writeFileSync(join(dir, "bib", "b.bib"), "@misc{beta2021, title={B}, url={u}}\n");
    const file = join(dir, "text", "ch.tex");
    writeFileSync(file, "\\cite{alpha2020,beta2021,gamma2022}\n");
    let out = context(runHook(CITATION_GUARD, edit(file, dir)));
    expect(out).toContain("not defined in bib/a.bib, bib/b.bib: gamma2022");

    mkdirSync(join(dir, ".claude"));
    writeFileSync(
      join(dir, ".claude", "dotclaude.json"),
      JSON.stringify({ citationGuard: { bibFile: "bib/a.bib" } }),
    );
    out = context(runHook(CITATION_GUARD, edit(file, dir), { CLAUDE_PROJECT_DIR: dir }));
    expect(out).toContain("not defined in bib/a.bib: beta2021, gamma2022");

    writeFileSync(
      join(dir, ".claude", "dotclaude.json"),
      JSON.stringify({ citationGuard: { bibFile: "missing.bib" } }),
    );
    expect(runHook(CITATION_GUARD, edit(file, dir)).stdout).toBe("");
    writeFileSync(
      join(dir, ".claude", "dotclaude.json"),
      JSON.stringify({ citationGuard: { enabled: false } }),
    );
    expect(runHook(CITATION_GUARD, edit(file, dir)).stdout).toBe("");
  });

  it("reports duplicate keys and unverifiable entries after a .bib edit", () => {
    const dir = makeProject();
    const bib = join(dir, "refs.bib");
    writeFileSync(
      bib,
      `${BIB}@misc{nodoi2020, title={Y}}\n@misc{nodoi2020, title={Y2}}\n@string{x = "y"}\n`,
    );
    const out = context(runHook(CITATION_GUARD, edit(bib, dir)));
    expect(out).toContain("Duplicate keys: nodoi2020");
    expect(out).toContain("citation-verifier cannot check these): nodoi2020");
    expect(out).not.toContain("nodoi2020, nodoi2020");

    writeFileSync(bib, BIB);
    expect(runHook(CITATION_GUARD, edit(bib, dir)).stdout).toBe("");
  });

  it("ignores other tools, other file types, missing files, and bad input", () => {
    const dir = makeProject();
    writeFileSync(join(dir, "refs.bib"), BIB);
    const py = join(dir, "x.py");
    writeFileSync(py, "cite = '\\\\cite{ghost}'\n");
    expect(runHook(CITATION_GUARD, edit(py, dir)).stdout).toBe("");
    expect(runHook(CITATION_GUARD, { tool_name: "Bash", tool_input: {}, cwd: dir }).stdout).toBe(
      "",
    );
    expect(runHook(CITATION_GUARD, edit(join(dir, "nope.tex"), dir)).stdout).toBe("");
    expect(runHook(CITATION_GUARD, edit(dir, dir)).stdout).toBe("");
    expect(runHook(CITATION_GUARD, "not json").status).toBe(0);
  });
});
