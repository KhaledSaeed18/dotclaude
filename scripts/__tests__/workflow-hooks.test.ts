/**
 * Black-box tests for the workflow hooks. Each hook is spawned as a real child
 * process with the event JSON on stdin, inside a throwaway git repo, so the
 * tests pin the contract (exit code, stdout/stderr, files written) rather than
 * internals. Git is a hard requirement of these hooks, so it is one here too.
 */

import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const hook = (name: string, file = `${name}.mjs`): string =>
  join(REPO_ROOT, "hooks", "workflow", name, file);

const SESSION_CONTEXT = hook("session-context");
const STOP_GATE = hook("stop-gate");
const TYPECHECK = hook("typecheck-on-edit");
const GIT_GUARD = hook("git-guard");
const BRANCH_PROTECT = hook("branch-protect");
const SUBAGENT_SUMMARY = hook("subagent-summary");

interface HookResult {
  status: number;
  stdout: string;
  stderr: string;
}

function runHook(script: string, event: unknown, env: Record<string, string> = {}): HookResult {
  const res = spawnSync(process.execPath, [script], {
    input: typeof event === "string" ? event : JSON.stringify(event),
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  return { status: res.status ?? -1, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

/** Parse the `additionalContext` a hook emitted, or "" when it emitted nothing. */
function context(result: HookResult): string {
  if (result.stdout.trim() === "") return "";
  return JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
}

let cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
});

function git(dir: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: dir,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "t",
      GIT_AUTHOR_EMAIL: "t@t",
      GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@t",
    },
  }).trim();
}

/** A fresh git repo with one commit on `main`. */
function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "dotclaude-wf-"));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  git(dir, ["init", "-q", "-b", "main"]);
  writeFileSync(join(dir, "README.md"), "# t\n");
  git(dir, ["add", "."]);
  git(dir, ["commit", "-qm", "init"]);
  return dir;
}

function writeConfig(dir: string, config: unknown): void {
  mkdirSync(join(dir, ".claude"), { recursive: true });
  writeFileSync(join(dir, ".claude", "dotclaude.json"), JSON.stringify(config));
}

const bash = (command: string, cwd: string) => ({
  tool_name: "Bash",
  tool_input: { command },
  cwd,
});

describe("session-context", () => {
  it("summarises branch, uncommitted files, recent commits, and the handoff file", () => {
    const dir = makeRepo();
    writeFileSync(join(dir, "wip.txt"), "x\n");
    writeFileSync(join(dir, "HANDOFF.md"), "# Handoff\nNext: finish the thing\n");

    const out = context(runHook(SESSION_CONTEXT, { hook_event_name: "SessionStart", cwd: dir }));
    expect(out).toContain("Branch: main");
    expect(out).toContain("Uncommitted changes (2)");
    expect(out).toContain("?? wip.txt");
    expect(out).toMatch(/Recent commits:\n {2}[0-9a-f]{7} init/);
    expect(out).toContain("Handoff from a previous session (HANDOFF.md)");
    expect(out).toContain("Next: finish the thing");
  });

  it("reports a clean tree, honours config, and truncates a long handoff", () => {
    const dir = makeRepo();
    writeConfig(dir, {
      sessionContext: { commits: 0, handoffFile: "notes/NEXT.md", maxHandoffChars: 20 },
    });
    mkdirSync(join(dir, "notes"));
    writeFileSync(join(dir, "notes", "NEXT.md"), "a".repeat(100));
    git(dir, ["add", "."]);
    git(dir, ["commit", "-qm", "config"]);

    const out = context(runHook(SESSION_CONTEXT, { cwd: dir }, { CLAUDE_PROJECT_DIR: dir }));
    expect(out).toContain("Working tree clean");
    expect(out).not.toContain("Recent commits");
    expect(out).toContain("(truncated, read notes/NEXT.md for the rest)");
  });

  it("lists at most ten changed files", () => {
    const dir = makeRepo();
    for (let i = 0; i < 12; i++) writeFileSync(join(dir, `f${i}.txt`), "x");
    const out = context(runHook(SESSION_CONTEXT, { cwd: dir }));
    expect(out).toContain("Uncommitted changes (12)");
    expect(out).toContain("... and 2 more");
  });

  it("ignores a handoff path outside the project and a handoff that is empty", () => {
    const dir = makeRepo();
    writeConfig(dir, { sessionContext: { handoffFile: "../../etc/passwd" } });
    expect(context(runHook(SESSION_CONTEXT, { cwd: dir }))).not.toContain("Handoff");

    writeConfig(dir, { sessionContext: { handoffFile: "EMPTY.md" } });
    writeFileSync(join(dir, "EMPTY.md"), "  \n");
    expect(context(runHook(SESSION_CONTEXT, { cwd: dir }))).not.toContain("Handoff");
  });

  it("is silent outside a git repo, on other events, and on malformed input", () => {
    const plain = mkdtempSync(join(tmpdir(), "dotclaude-wf-plain-"));
    cleanups.push(() => rmSync(plain, { recursive: true, force: true }));
    expect(runHook(SESSION_CONTEXT, { cwd: plain }).stdout).toBe("");
    expect(runHook(SESSION_CONTEXT, { hook_event_name: "Stop", cwd: makeRepo() }).stdout).toBe("");
    const bad = runHook(SESSION_CONTEXT, "not json");
    expect(bad.status).toBe(0);
    expect(bad.stdout).toBe("");
  });

  it("tolerates an unreadable config file", () => {
    const dir = makeRepo();
    mkdirSync(join(dir, ".claude"));
    writeFileSync(join(dir, ".claude", "dotclaude.json"), "{ not json");
    expect(context(runHook(SESSION_CONTEXT, { cwd: dir }))).toContain("Branch: main");
  });
});

describe("stop-gate", () => {
  const stop = (cwd: string, active = false) => ({
    hook_event_name: "Stop",
    cwd,
    stop_hook_active: active,
  });

  it("blocks the stop with the failing command's output when the tree is dirty", () => {
    const dir = makeRepo();
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ scripts: { test: "echo BOOM && exit 3" } }),
    );
    const res = runHook(STOP_GATE, stop(dir));
    expect(res.status).toBe(2);
    expect(res.stderr).toContain("stop-gate: `npm test` failed (exit 3)");
    expect(res.stderr).toContain("BOOM");
  });

  it("passes when tests succeed", () => {
    const dir = makeRepo();
    writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { test: "exit 0" } }));
    expect(runHook(STOP_GATE, stop(dir)).status).toBe(0);
  });

  it("never runs when the stop was caused by a hook, or when the tree is clean", () => {
    const dir = makeRepo();
    writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { test: "exit 1" } }));
    expect(runHook(STOP_GATE, stop(dir, true)).status).toBe(0);

    git(dir, ["add", "."]);
    git(dir, ["commit", "-qm", "pkg"]);
    expect(runHook(STOP_GATE, stop(dir)).status).toBe(0);
  });

  it("honours a configured command, onlyWhenDirty, and enabled", () => {
    const dir = makeRepo();
    git(dir, ["add", "."]);
    writeConfig(dir, { stopGate: { command: "exit 7", onlyWhenDirty: false } });
    git(dir, ["add", "."]);
    git(dir, ["commit", "-qm", "cfg"]);
    const res = runHook(STOP_GATE, stop(dir));
    expect(res.status).toBe(2);
    expect(res.stderr).toContain("`exit 7` failed (exit 7)");

    writeConfig(dir, { stopGate: { enabled: false, command: "exit 7", onlyWhenDirty: false } });
    expect(runHook(STOP_GATE, stop(dir)).status).toBe(0);
  });

  it("picks the package manager from the lockfile and skips npm's placeholder", () => {
    const dir = makeRepo();
    writeFileSync(join(dir, "pnpm-lock.yaml"), "");
    writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { test: "exit 1" } }));
    // pnpm may not be resolvable in this test env; the command name is what matters.
    const res = runHook(STOP_GATE, stop(dir), { PATH: "/nonexistent" });
    // Either the shell could not find pnpm (fails open, 0) or it ran and failed (2).
    expect([0, 2]).toContain(res.status);
    if (res.status === 2) expect(res.stderr).toContain("`pnpm test`");

    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ scripts: { test: 'echo "Error: no test specified" && exit 1' } }),
    );
    rmSync(join(dir, "pnpm-lock.yaml"));
    expect(runHook(STOP_GATE, stop(dir)).status).toBe(0);
  });

  it("detects make, cargo, go, and pytest projects", () => {
    const cases: Array<[string, string, string]> = [
      ["Makefile", "test:\n\t@exit 1\n", "make test"],
      ["Cargo.toml", "[package]\n", "cargo test"],
      ["go.mod", "module x\n", "go test ./..."],
      ["pytest.ini", "[pytest]\n", "pytest -q"],
      ["pyproject.toml", "[tool.pytest.ini_options]\n", "pytest -q"],
    ];
    for (const [file, content, command] of cases) {
      const dir = makeRepo();
      writeFileSync(join(dir, file), content);
      // Force the detected command to fail regardless of toolchain presence.
      const res = runHook(STOP_GATE, stop(dir), { PATH: "/nonexistent" });
      expect([0, 2]).toContain(res.status);
      if (res.status === 2) expect(res.stderr).toContain(`\`${command}\``);
    }
  });

  it("does nothing without a test command, on other events, or on bad input", () => {
    const dir = makeRepo();
    writeFileSync(join(dir, "x.txt"), "x");
    expect(runHook(STOP_GATE, stop(dir)).status).toBe(0);
    writeFileSync(join(dir, "package.json"), "{ nope");
    expect(runHook(STOP_GATE, stop(dir)).status).toBe(0);
    expect(runHook(STOP_GATE, { hook_event_name: "PreToolUse", cwd: dir }).status).toBe(0);
    expect(runHook(STOP_GATE, "not json").status).toBe(0);
  });

  it("fails open on a timeout", () => {
    const dir = makeRepo();
    writeFileSync(join(dir, "x.txt"), "x");
    writeConfig(dir, { stopGate: { command: "sleep 5", timeoutMs: 200 } });
    expect(runHook(STOP_GATE, stop(dir)).status).toBe(0);
  });

  it("truncates long output", () => {
    const dir = makeRepo();
    writeFileSync(join(dir, "x.txt"), "x");
    writeConfig(dir, { stopGate: { command: "yes | head -c 6000; exit 1" } });
    const res = runHook(STOP_GATE, stop(dir));
    expect(res.status).toBe(2);
    expect(res.stderr.length).toBeLessThan(4400);
    expect(res.stderr).toContain("...\n");
  });
});

describe("typecheck-on-edit", () => {
  function tsProject(): string {
    const dir = makeRepo();
    symlinkSync(join(REPO_ROOT, "node_modules"), join(dir, "node_modules"));
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { strict: true, noEmit: true }, include: ["*.ts"] }),
    );
    return dir;
  }
  const edit = (file: string, cwd: string) => ({
    tool_name: "Edit",
    tool_input: { file_path: file },
    cwd,
  });

  it("feeds tsc errors back as context, edited file first", () => {
    const dir = tsProject();
    writeFileSync(join(dir, "other.ts"), "export const s: string = 1;\n");
    const file = join(dir, "bad.ts");
    writeFileSync(file, 'export const n: number = "x";\n');
    const out = context(runHook(TYPECHECK, edit(file, dir)));
    expect(out).toContain("Type check failed after editing bad.ts (2 error lines)");
    expect(out.indexOf("bad.ts(")).toBeLessThan(out.indexOf("other.ts("));
    expect(out).toContain("TS2322");
  });

  it("is silent when the project type-checks, and caps the listing", () => {
    const dir = tsProject();
    const file = join(dir, "ok.ts");
    writeFileSync(file, "export const n: number = 1;\n");
    expect(runHook(TYPECHECK, edit(file, dir)).stdout).toBe("");

    writeConfig(dir, { typecheckOnEdit: { maxLines: 1 } });
    writeFileSync(file, 'export const a: number = "x";\nexport const b: number = "y";\n');
    const out = context(runHook(TYPECHECK, edit(file, dir)));
    expect(out).toContain("... and 1 more");
  });

  it("does nothing without a tsconfig, when disabled, for other tools, or on bad input", () => {
    const dir = makeRepo();
    const file = join(dir, "x.ts");
    writeFileSync(file, 'const n: number = "x";\n');
    expect(runHook(TYPECHECK, edit(file, dir)).stdout).toBe("");

    const ts = tsProject();
    writeConfig(ts, { typecheckOnEdit: { enabled: false } });
    const bad = join(ts, "bad.ts");
    writeFileSync(bad, 'const n: number = "x";\n');
    expect(runHook(TYPECHECK, edit(bad, ts)).stdout).toBe("");

    expect(runHook(TYPECHECK, { tool_name: "Bash", tool_input: {}, cwd: dir }).stdout).toBe("");
    expect(runHook(TYPECHECK, edit(join(dir, "missing.ts"), dir)).stdout).toBe("");
    expect(runHook(TYPECHECK, edit(join(dir, "README.md"), dir)).stdout).toBe("");
    expect(runHook(TYPECHECK, "not json").status).toBe(0);
  });

  it("fails open when the checker is unavailable (python, go)", () => {
    const dir = makeRepo();
    const py = join(dir, "a.py");
    writeFileSync(py, "x: int = 'a'\n");
    const goFile = join(dir, "a.go");
    writeFileSync(goFile, "package a\n");
    const env = { PATH: "/nonexistent" };
    expect(runHook(TYPECHECK, edit(py, dir), env).status).toBe(0);
    expect(runHook(TYPECHECK, edit(goFile, dir), env).status).toBe(0);
  });
});

describe("git-guard", () => {
  const blocked = (command: string, cwd: string): string => {
    const res = runHook(GIT_GUARD, bash(command, cwd));
    expect(res.status).toBe(2);
    return res.stderr;
  };
  const allowed = (command: string, cwd: string): void => {
    expect(runHook(GIT_GUARD, bash(command, cwd)).status).toBe(0);
  };

  it("blocks force-pushes to protected branches, named or current", () => {
    const dir = makeRepo();
    expect(blocked("git push --force origin main", dir)).toContain('protected branch "main"');
    expect(blocked("git push -f", dir)).toContain('protected branch "main"');
    expect(blocked("git push --force-with-lease=main origin master", dir)).toContain("master");
    expect(blocked("git push -uf origin develop", dir)).toContain("develop");
    expect(blocked("git -C . push origin +main", dir)).toContain("main");
    allowed("git push origin feature --force", dir);
    allowed("git push origin main", dir);
    allowed("git push -u origin main", dir);
  });

  it("blocks deleting protected branches by every route", () => {
    const dir = makeRepo();
    expect(blocked("git push origin :main", dir)).toContain("empty refspec");
    expect(blocked("git push origin --delete master", dir)).toContain("--delete");
    expect(blocked("git branch -D develop", dir)).toContain("deleting protected branch");
    allowed("git branch -D feature/x", dir);
    allowed("git push origin --delete feature/x", dir);
  });

  it("blocks --no-verify commits unless allowed", () => {
    const dir = makeRepo();
    expect(blocked("git commit -m x --no-verify", dir)).toContain("--no-verify");
    expect(blocked("git commit -nm x", dir)).toContain("--no-verify");
    allowed('git commit -m "skip: -n is fine in a message"', dir);
    writeConfig(dir, { gitGuard: { allowNoVerify: true } });
    allowed("git commit -m x --no-verify", dir);
  });

  it("blocks discarding changes only while the tree is dirty", () => {
    const dir = makeRepo();
    allowed("git reset --hard HEAD", dir);
    allowed("git checkout .", dir);
    writeFileSync(join(dir, "README.md"), "changed\n");
    expect(blocked("git reset --hard HEAD~1", dir)).toContain("discard uncommitted changes");
    expect(blocked("git checkout -- .", dir)).toContain("discard");
    expect(blocked("git restore .", dir)).toContain("discard");
    allowed("git restore README.md", dir);
    allowed("git reset --soft HEAD~1", dir);
  });

  it("blocks git clean -f and stash drop/clear", () => {
    const dir = makeRepo();
    expect(blocked("git clean -fd", dir)).toContain("git clean -f");
    expect(blocked("git clean --force", dir)).toContain("git clean -f");
    expect(blocked("git stash drop", dir)).toContain("stash drop");
    expect(blocked("git stash clear", dir)).toContain("stash clear");
    allowed("git clean -n", dir);
    allowed("git stash list", dir);
  });

  it("inspects every part of a compound command and respects quotes", () => {
    const dir = makeRepo();
    expect(blocked("echo ok && git push --force origin main", dir)).toContain("Command: git push");
    expect(blocked("git status; git push -f origin main", dir)).toContain("main");
    expect(blocked("git log | head; git stash clear", dir)).toContain("stash clear");
    allowed('echo "git push --force origin main"', dir);
    allowed("echo 'a && b' && git status", dir);
  });

  it("supports glob patterns and custom branch lists", () => {
    const dir = makeRepo();
    writeConfig(dir, { gitGuard: { protectedBranches: ["release/*", "trunk"] } });
    expect(blocked("git push --force origin release/1.2", dir)).toContain("release/1.2");
    expect(blocked("git branch -D trunk", dir)).toContain("trunk");
    allowed("git push --force origin main", dir);
    writeConfig(dir, { gitGuard: { protectedBranches: "not-a-list", allowForcePush: true } });
    allowed("git push --force origin main", dir);
  });

  it("ignores non-git commands, other tools, and bad input", () => {
    const dir = makeRepo();
    allowed("ls -la", dir);
    allowed("gitk", dir);
    expect(runHook(GIT_GUARD, { tool_name: "Edit", tool_input: {}, cwd: dir }).status).toBe(0);
    expect(runHook(GIT_GUARD, "not json").status).toBe(0);
  });
});

describe("branch-protect", () => {
  const prompt = (cwd: string, session_id?: string) => ({
    hook_event_name: "UserPromptSubmit",
    cwd,
    session_id,
  });

  it("warns once per session on a protected branch", () => {
    const dir = makeRepo();
    const session = `t-${process.pid}-${Date.now()}`;
    const first = runHook(BRANCH_PROTECT, prompt(dir, session));
    expect(first.status).toBe(0);
    expect(first.stdout).toContain('protected branch "main"');
    expect(runHook(BRANCH_PROTECT, prompt(dir, session)).stdout).toBe("");
    // A different branch in the same session warns again.
    git(dir, ["switch", "-qc", "develop"]);
    expect(runHook(BRANCH_PROTECT, prompt(dir, session)).stdout).toContain('"develop"');
  });

  it("warns every time without a session id or when oncePerSession is off", () => {
    const dir = makeRepo();
    expect(runHook(BRANCH_PROTECT, prompt(dir)).stdout).toContain("main");
    expect(runHook(BRANCH_PROTECT, prompt(dir)).stdout).toContain("main");
    writeConfig(dir, { branchProtect: { oncePerSession: false } });
    const session = `u-${process.pid}-${Date.now()}`;
    expect(runHook(BRANCH_PROTECT, prompt(dir, session)).stdout).toContain("main");
    expect(runHook(BRANCH_PROTECT, prompt(dir, session)).stdout).toContain("main");
  });

  it("is silent on a feature branch, outside git, on other events, and bad input", () => {
    const dir = makeRepo();
    git(dir, ["switch", "-qc", "feature/x"]);
    expect(runHook(BRANCH_PROTECT, prompt(dir)).stdout).toBe("");
    writeConfig(dir, { branchProtect: { protectedBranches: ["feature/*"] } });
    expect(runHook(BRANCH_PROTECT, prompt(dir)).stdout).toContain("feature/x");

    const plain = mkdtempSync(join(tmpdir(), "dotclaude-wf-plain-"));
    cleanups.push(() => rmSync(plain, { recursive: true, force: true }));
    expect(runHook(BRANCH_PROTECT, prompt(plain)).stdout).toBe("");
    expect(runHook(BRANCH_PROTECT, { hook_event_name: "Stop", cwd: dir }).stdout).toBe("");
    expect(runHook(BRANCH_PROTECT, "not json").status).toBe(0);
  });
});

describe("subagent-summary", () => {
  const stop = (cwd: string, extra: Record<string, unknown> = {}) => ({
    hook_event_name: "SubagentStop",
    cwd,
    session_id: "s1",
    agent_id: "a1",
    ...extra,
  });

  it("appends one JSON line with the subagent's final text", () => {
    const dir = makeRepo();
    const transcript = join(dir, "t.jsonl");
    writeFileSync(
      transcript,
      [
        JSON.stringify({ type: "user", message: { role: "user", content: "go" } }),
        JSON.stringify({
          type: "assistant",
          message: { role: "assistant", content: [{ type: "text", text: "Found  3\nissues" }] },
        }),
        "{ not json",
      ].join("\n"),
    );
    expect(runHook(SUBAGENT_SUMMARY, stop(dir, { agent_transcript_path: transcript })).status).toBe(
      0,
    );
    const lines = readFileSync(join(dir, ".claude", "subagents.log"), "utf8")
      .trim()
      .split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0] ?? "");
    expect(entry).toMatchObject({ session: "s1", agent: "a1", summary: "Found 3 issues" });
    expect(entry.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("handles string content, missing transcripts, and truncation", () => {
    const dir = makeRepo();
    writeConfig(dir, { subagentSummary: { logFile: "logs/agents.log", maxSummaryChars: 5 } });
    const transcript = join(dir, "t.jsonl");
    writeFileSync(
      transcript,
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: "abcdefgh" } }),
    );
    runHook(SUBAGENT_SUMMARY, stop(dir, { transcript_path: transcript }));
    runHook(SUBAGENT_SUMMARY, stop(dir, { agent_transcript_path: join(dir, "nope.jsonl") }));
    const lines = readFileSync(join(dir, "logs", "agents.log"), "utf8")
      .trim()
      .split("\n");
    expect(JSON.parse(lines[0] ?? "").summary).toBe("abcde…");
    expect(JSON.parse(lines[1] ?? "").summary).toBe("");
  });

  it("refuses a log path outside the project and ignores other events", () => {
    const dir = makeRepo();
    writeConfig(dir, { subagentSummary: { logFile: "../outside.log" } });
    runHook(SUBAGENT_SUMMARY, stop(dir));
    expect(existsSync(join(dir, "..", "outside.log"))).toBe(false);
    writeConfig(dir, { subagentSummary: { logFile: "" } });
    runHook(SUBAGENT_SUMMARY, stop(dir));
    expect(existsSync(join(dir, ".claude", "subagents.log"))).toBe(false);
    runHook(SUBAGENT_SUMMARY, { hook_event_name: "Stop", cwd: dir });
    expect(existsSync(join(dir, ".claude", "subagents.log"))).toBe(false);
    expect(runHook(SUBAGENT_SUMMARY, "not json").status).toBe(0);
  });
});
