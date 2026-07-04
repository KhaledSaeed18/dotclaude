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

/** A README with all three marker pairs gen owns, used unless a test supplies one. */
const DEFAULT_README = [
  "# Fixture",
  "",
  "<!-- badges:start -->",
  "<!-- badges:end -->",
  "",
  "<!-- plugins:start -->",
  "<!-- plugins:end -->",
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

  it("builds marketplace plugins from category folders", () => {
    const dir = makeFixture({
      "skills/engineering/my-skill/SKILL.md": manifest({ name: "my-skill", description: "S." }),
      "skills/engineering/create-skill/SKILL.md": manifest({
        name: "create-skill",
        description: "Repo-authoring skill, excluded from plugins.",
      }),
      "agents/engineering/my-agent/AGENT.md": manifest({ name: "my-agent", description: "A." }),
      "commands/engineering/my-cmd/COMMAND.md": manifest(
        { name: "my-cmd", description: "C." },
        "Command body.",
      ),
    });

    expect(runGen(dir).status).toBe(0);

    const marketplace = JSON.parse(read(dir, ".claude-plugin/marketplace.json"));
    expect(marketplace.name).toBe("dotclaude");
    expect(marketplace.plugins).toHaveLength(1);

    const plugin = marketplace.plugins[0];
    expect(plugin.name).toBe("engineering");
    expect(plugin.source).toBe("./.claude-plugin/plugins/engineering");

    // The generated tree uses the standard plugin layout: skill folders are
    // copied whole, agents and commands become <name>.md files.
    const tree = ".claude-plugin/plugins/engineering";
    expect(read(dir, `${tree}/skills/my-skill/SKILL.md`)).toContain("name: my-skill");
    expect(existsSync(join(dir, `${tree}/skills/create-skill`))).toBe(false);
    expect(read(dir, `${tree}/agents/my-agent.md`)).toContain("name: my-agent");
    expect(read(dir, `${tree}/commands/my-cmd.md`)).toContain("Command body.");

    // The README plugins table lists the plugin with its install command.
    expect(read(dir, "README.md")).toContain("/plugin install engineering@dotclaude");
  });

  it("removes orphaned plugin-tree files and --check flags them", () => {
    const dir = makeFixture({
      "skills/engineering/my-skill/SKILL.md": manifest({ name: "my-skill", description: "S." }),
    });

    expect(runGen(dir).status).toBe(0);
    expect(runGen(dir, ["--check"]).status).toBe(0);

    // A leftover copy of a removed item is stale even though no listed output
    // changed; --check must flag it and a plain gen must clear it.
    const orphan = join(dir, ".claude-plugin/plugins/engineering/skills/gone/SKILL.md");
    mkdirSync(dirname(orphan), { recursive: true });
    writeFileSync(orphan, "leftover");

    const checked = runGen(dir, ["--check"]);
    expect(checked.status).not.toBe(0);
    expect(checked.output).toContain("orphaned");

    expect(runGen(dir).status).toBe(0);
    expect(existsSync(orphan)).toBe(false);
  });

  it("omits plugins whose selectors match nothing", () => {
    const dir = makeFixture({
      "skills/util/my-skill/SKILL.md": manifest({ name: "my-skill", description: "S." }),
    });

    expect(runGen(dir).status).toBe(0);

    // No category matches a plugin selector, and no hook scripts exist in the
    // fixture, so the marketplace publishes no plugins at all.
    const marketplace = JSON.parse(read(dir, ".claude-plugin/marketplace.json"));
    expect(marketplace.plugins).toEqual([]);
    expect(read(dir, "README.md")).toContain("_No plugins yet._");
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

  it("flags a broken relative link in a manifest", () => {
    const dir = makeFixture({
      "skills/util/linky/SKILL.md": manifest(
        { name: "linky", description: "Has links." },
        "See [missing](./reference/nope.md).",
      ),
    });

    expect(runGen(dir).status).toBe(0);

    const result = runValidate(dir);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("broken relative link");
  });

  it("accepts a manifest link to a real companion and ignores example links", () => {
    const dir = makeFixture({
      "skills/util/linky/SKILL.md": manifest(
        { name: "linky", description: "Has links." },
        "Real: [ref](./reference/r.md). Example in code: `[x](./reference/nope.md)`.",
      ),
      "skills/util/linky/reference/r.md": "# R\n",
    });

    expect(runGen(dir).status).toBe(0);
    expect(runValidate(dir).status).toBe(0);
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
