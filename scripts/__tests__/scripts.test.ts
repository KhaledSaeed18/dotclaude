/**
 * Black-box tests for the gen and validate scripts. Each case builds a throwaway
 * fixture repo in a temp directory and runs the real script against it with that
 * directory as the working directory, then asserts on the files written or the
 * exit code and messages. Testing the scripts through their actual entry points
 * (rather than importing internals) keeps the tests honest about the contract
 * and lets them survive refactors of the scripts' internals.
 */

import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const TSX = join(REPO_ROOT, "node_modules", ".bin", "tsx");
const GEN = join(REPO_ROOT, "scripts", "gen.ts");
const VALIDATE = join(REPO_ROOT, "scripts", "validate.ts");
const NEW = join(REPO_ROOT, "scripts", "new.ts");
const COMMAND_GUARD = join(REPO_ROOT, "hooks", "security", "command-guard", "command-guard.mjs");

/** A README with both marker pairs gen owns, used unless a test supplies one. */
const DEFAULT_README = [
  "# Fixture",
  "",
  "<!-- badges:start -->",
  "<!-- badges:end -->",
  "",
  "<!-- catalog:start -->",
  "<!-- catalog:end -->",
  "",
].join("\n");

/** Build a manifest string from a flat frontmatter map plus an optional body. */
function manifest(frontmatter: Record<string, string>, body = "Body."): string {
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  return `---\n${yaml}\n---\n\n${body}\n`;
}

let cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
});

/** Write a set of `relative path -> contents` files into a fresh temp repo. */
function makeFixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "dotclaude-test-"));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  const all = { "README.md": DEFAULT_README, ...files };
  for (const [rel, content] of Object.entries(all)) {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

interface RunResult {
  status: number;
  output: string;
}

function run(script: string, cwd: string, args: string[]): RunResult {
  const res: SpawnSyncReturns<string> = spawnSync(TSX, [script, ...args], {
    cwd,
    encoding: "utf8",
  });
  return { status: res.status ?? 1, output: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

const runGen = (cwd: string, args: string[] = []): RunResult => run(GEN, cwd, args);
const runValidate = (cwd: string, args: string[] = ["--no-shadcn"]): RunResult =>
  run(VALIDATE, cwd, args);
const runNew = (cwd: string, args: string[]): RunResult => run(NEW, cwd, args);

const read = (dir: string, rel: string): string => readFileSync(join(dir, rel), "utf8");

describe("gen", () => {
  it("derives the install target per layout", () => {
    const dir = makeFixture({
      "agents/engineering/my-agent/AGENT.md": manifest({
        name: "my-agent",
        description: "An agent.",
      }),
      "skills/util/my-skill/SKILL.md": manifest({ name: "my-skill", description: "A skill." }),
      "skills/util/my-skill/reference/extra.md": "# Extra\n",
    });

    expect(runGen(dir).status).toBe(0);

    const agentReg = read(dir, "agents/engineering/my-agent/registry.json");
    expect(agentReg).toContain('"path": "AGENT.md"');
    expect(agentReg).toContain('"target": ".claude/agents/my-agent.md"');

    const skillReg = read(dir, "skills/util/my-skill/registry.json");
    expect(skillReg).toContain('"target": ".claude/skills/my-skill/SKILL.md"');
    expect(skillReg).toContain('"target": ".claude/skills/my-skill/reference/extra.md"');
  });

  it("embeds author, docs link, and type metadata", () => {
    const dir = makeFixture({
      "agents/research/m-agent/AGENT.md": manifest({ name: "m-agent", description: "Meta agent." }),
    });

    expect(runGen(dir).status).toBe(0);

    const reg = read(dir, "agents/research/m-agent/registry.json");
    expect(reg).toContain('"author": "Khaled Saeed"');
    expect(reg).toContain(
      '"docs": "https://github.com/KhaledSaeed18/dotclaude/tree/main/agents/research/m-agent"',
    );
    expect(reg).toContain('"type": "agent"');
  });

  it("renders the catalog between the markers", () => {
    const dir = makeFixture({
      "agents/engineering/a-one/AGENT.md": manifest({ name: "a-one", description: "First agent." }),
    });

    expect(runGen(dir).status).toBe(0);

    const readme = read(dir, "README.md");
    expect(readme).toContain("[a-one](agents/engineering/a-one/)");
    expect(readme).toContain("add KhaledSaeed18/dotclaude/a-one");
  });

  it("auto-derives badge counts with correct pluralization", () => {
    const dir = makeFixture({
      "skills/util/s-one/SKILL.md": manifest({ name: "s-one", description: "Skill one." }),
      "skills/util/s-two/SKILL.md": manifest({ name: "s-two", description: "Skill two." }),
      "agents/engineering/a-one/AGENT.md": manifest({ name: "a-one", description: "Agent one." }),
    });

    expect(runGen(dir).status).toBe(0);

    const readme = read(dir, "README.md");
    expect(readme).toContain("Skills-2-2563eb");
    expect(readme).toContain('alt="2 skills"');
    expect(readme).toContain("Agents-1-7c3aed");
    expect(readme).toContain('alt="1 agent"');
    expect(readme).toContain("Commands-0-0891b2");
    expect(readme).toContain('alt="0 commands"');
  });

  it("--check fails when a generated file is stale", () => {
    const dir = makeFixture({
      "skills/util/s-one/SKILL.md": manifest({ name: "s-one", description: "Skill one." }),
    });

    expect(runGen(dir).status).toBe(0);
    expect(runGen(dir, ["--check"]).status).toBe(0);

    // Corrupt a value inside the generated region; --check must notice.
    writeFileSync(join(dir, "README.md"), read(dir, "README.md").replace("Skills-1-", "Skills-9-"));
    const checked = runGen(dir, ["--check"]);
    expect(checked.status).not.toBe(0);
    expect(checked.output).toContain("out of date");
  });
});

describe("validate", () => {
  it("passes for a well-formed registry", () => {
    const dir = makeFixture({
      "agents/engineering/my-agent/AGENT.md": manifest({
        name: "my-agent",
        description: "An agent.",
        color: "cyan",
        memory: "user",
        model: "opus",
      }),
      "skills/util/my-skill/SKILL.md": manifest({ name: "my-skill", description: "A skill." }),
    });

    expect(runGen(dir).status).toBe(0);
    expect(runValidate(dir).status).toBe(0);
  });

  it("rejects invalid agent color, memory, and model", () => {
    const dir = makeFixture({
      "agents/engineering/bad/AGENT.md": manifest({
        name: "bad",
        description: "Bad agent.",
        color: "cyna",
        memory: "global",
        model: "gpt-4",
      }),
    });

    // gen is lenient about fields it does not consume, so it still succeeds.
    expect(runGen(dir).status).toBe(0);

    const result = runValidate(dir);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("color");
    expect(result.output).toContain("memory");
    expect(result.output).toContain("model");
  });

  it("detects duplicate names across categories", () => {
    const dir = makeFixture({
      "skills/cat-a/dup/SKILL.md": manifest({ name: "dup", description: "One." }),
      "skills/cat-b/dup/SKILL.md": manifest({ name: "dup", description: "Two." }),
    });

    expect(runGen(dir).status).toBe(0);

    const result = runValidate(dir);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("duplicate name");
  });

  it("flags a manifest placed directly in a category folder", () => {
    const dir = makeFixture({
      "skills/loose/SKILL.md": manifest({ name: "loose", description: "Misplaced." }),
    });

    const result = runValidate(dir);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("directly");
  });

  it("flags a frontmatter name that does not match its folder", () => {
    const dir = makeFixture({
      "skills/util/my-skill/SKILL.md": manifest({
        name: "wrong-name",
        description: "Mismatched.",
      }),
    });

    expect(runGen(dir).status).toBe(0);

    const result = runValidate(dir);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("does not match folder");
  });
});

describe("new", () => {
  const baseArgs = (over: Partial<Record<string, string>> = {}): string[] => {
    const flags: Record<string, string> = {
      type: "agent",
      category: "research",
      name: "sample-agent",
      description: "Does a thing. Use when testing the scaffolder.",
      ...over,
    };
    return Object.entries(flags).flatMap(([key, value]) => [`--${key}`, value]);
  };

  it("scaffolds a manifest and regenerates the registry", () => {
    const dir = makeFixture({});

    const result = runNew(dir, baseArgs());
    expect(result.status).toBe(0);

    const agentMd = read(dir, "agents/research/sample-agent/AGENT.md");
    expect(agentMd).toContain("name: sample-agent");
    expect(agentMd).toContain("Does a thing. Use when testing the scaffolder.");
    expect(agentMd).toContain("model: inherit");

    // gen ran in-process, so the derived files exist and the catalog updated.
    const reg = read(dir, "agents/research/sample-agent/registry.json");
    expect(reg).toContain('"target": ".claude/agents/sample-agent.md"');
    expect(read(dir, "README.md")).toContain("add KhaledSaeed18/dotclaude/sample-agent");
  });

  it("writes only the manifest with --no-gen", () => {
    const dir = makeFixture({});

    const result = runNew(dir, [...baseArgs({ type: "skill", name: "lonely-skill" }), "--no-gen"]);
    expect(result.status).toBe(0);

    expect(read(dir, "skills/research/lonely-skill/SKILL.md")).toContain("name: lonely-skill");
    expect(existsSync(join(dir, "skills/research/lonely-skill/registry.json"))).toBe(false);
  });

  it("rejects a duplicate name", () => {
    const dir = makeFixture({
      "skills/util/taken/SKILL.md": manifest({ name: "taken", description: "Existing." }),
    });

    const result = runNew(dir, baseArgs({ type: "agent", name: "taken" }));
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("already exists");
  });

  it("rejects an invalid name and an unknown type", () => {
    const dir = makeFixture({});

    const badName = runNew(dir, baseArgs({ name: "Bad_Name" }));
    expect(badName.status).not.toBe(0);
    expect(badName.output).toContain("kebab-case");

    const badType = runNew(dir, baseArgs({ type: "widget" }));
    expect(badType.status).not.toBe(0);
    expect(badType.output).toContain("unknown type");
  });
});

describe("command-guard hook", () => {
  const runGuard = (command: string | null, toolName = "Bash"): number => {
    const event =
      command === null
        ? { tool_name: toolName, tool_input: {} }
        : { tool_name: toolName, tool_input: { command } };
    const res = spawnSync(process.execPath, [COMMAND_GUARD], {
      input: JSON.stringify(event),
      encoding: "utf8",
    });
    return res.status ?? -1;
  };

  it("blocks catastrophic commands with exit 2", () => {
    expect(runGuard("rm -rf /")).toBe(2);
    expect(runGuard("sudo rm -fr ~")).toBe(2);
    expect(runGuard(":(){ :|:& };:")).toBe(2);
    expect(runGuard("dd if=/dev/zero of=/dev/sda")).toBe(2);
    expect(runGuard("chmod -R 777 /")).toBe(2);
    expect(runGuard("git push --force origin main")).toBe(2);
  });

  it("allows safe commands with exit 0", () => {
    expect(runGuard("ls -la")).toBe(0);
    expect(runGuard("rm -rf ./build")).toBe(0);
    expect(runGuard("echo hi > /dev/null")).toBe(0);
    expect(runGuard("git push --force origin my-feature")).toBe(0);
  });

  it("ignores non-Bash tools and missing commands", () => {
    expect(runGuard("rm -rf /", "Write")).toBe(0);
    expect(runGuard(null)).toBe(0);
  });
});
