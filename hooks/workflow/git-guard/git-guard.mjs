#!/usr/bin/env node
/**
 * git-guard: a PreToolUse hook for Bash that blocks the git operations that
 * destroy work or bypass review, with a reason Claude can act on. It fills the
 * gap between command-guard (catastrophic shell) and ordinary git hygiene.
 *
 * Blocked:
 *   - git push --force / -f / --force-with-lease / +refspec to a protected
 *     branch, whether the branch is named in the command or is the current one
 *   - git push <remote> --delete <protected>, and the `:branch` refspec form
 *   - git branch -D / -d <protected>
 *   - git commit --no-verify / -n (skips the project's own hooks)
 *   - git reset --hard, git checkout . / -- ., git restore . / --staged .
 *     while the working tree has uncommitted changes
 *   - git clean -f (deletes untracked files), git stash drop / clear
 *
 * Compound commands (&&, ||, ;, |) are split and each part is checked, so a
 * guarded operation cannot hide behind a harmless prefix.
 *
 * Configuration (optional):
 *   {
 *     "gitGuard": {
 *       "protectedBranches": ["main", "master", "develop", "release/*"],
 *       "allowNoVerify": false,
 *       "allowForcePush": false
 *     }
 *   }
 *
 * Exit 2 with the reason on stderr blocks the command. Anything unexpected
 * exits 0 (fails open). Zero dependencies (node >= 18).
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { stdin } from "node:process";

const DEFAULTS = {
  protectedBranches: ["main", "master", "develop"],
  allowNoVerify: false,
  allowForcePush: false,
};

function readConfig(projectDir) {
  try {
    const raw = readFileSync(join(projectDir, ".claude", "dotclaude.json"), "utf8");
    const section = JSON.parse(raw)?.gitGuard;
    const merged = { ...DEFAULTS, ...(section && typeof section === "object" ? section : {}) };
    if (!Array.isArray(merged.protectedBranches))
      merged.protectedBranches = DEFAULTS.protectedBranches;
    return merged;
  } catch {
    return { ...DEFAULTS };
  }
}

function git(cwd, args) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5_000,
    }).trim();
  } catch {
    return null;
  }
}

/** Glob-lite: `release/*` matches `release/1.2`; everything else is exact. */
function isProtected(branch, patterns) {
  if (!branch) return false;
  return patterns.some((pattern) => {
    if (typeof pattern !== "string") return false;
    if (!pattern.includes("*")) return pattern === branch;
    const re = new RegExp(`^${pattern.split("*").map(escapeRegExp).join(".*")}$`);
    return re.test(branch);
  });
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Split a shell string on unquoted &&, ||, ;, | and newlines. */
function splitCommands(command) {
  const parts = [];
  let current = "";
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "\n" || ch === ";") {
      parts.push(current);
      current = "";
      continue;
    }
    if ((ch === "&" || ch === "|") && command[i + 1] === ch) {
      parts.push(current);
      current = "";
      i++;
      continue;
    }
    if (ch === "|") {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** Tokenise one simple command; quotes are stripped, globs left alone. */
function tokens(part) {
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  return [...part.matchAll(re)].map((m) => m[1] ?? m[2] ?? m[3]);
}

/** The subcommand and its args, skipping `git -C dir` style global options. */
function parseGit(argv) {
  if (argv[0] !== "git") return null;
  let i = 1;
  while (i < argv.length && argv[i].startsWith("-")) {
    if (["-C", "-c", "--git-dir", "--work-tree"].includes(argv[i])) i += 2;
    else i += 1;
  }
  return { sub: argv[i], args: argv.slice(i + 1) };
}

function pushTargets(args) {
  // Everything after the remote that is not an option is a refspec.
  const positional = args.filter((a) => !a.startsWith("-"));
  const refspecs = positional.slice(1);
  return refspecs.map((raw) => {
    // A leading `+` on a refspec is the per-ref force flag.
    const forced = raw.startsWith("+");
    const spec = forced ? raw.slice(1) : raw;
    const [src, dst] = spec.split(":");
    const target = dst !== undefined ? dst : src;
    return {
      forced,
      deleteOnly: dst !== undefined && src === "",
      branch: target.replace(/^refs\/heads\//, ""),
    };
  });
}

function checkOne(part, config, cwd, dirtyCache) {
  const argv = tokens(part);
  const g = parseGit(argv);
  if (!g?.sub) return null;
  const { sub, args } = g;
  const has = (...flags) => args.some((a) => flags.includes(a));
  const patterns = config.protectedBranches;

  if (sub === "push") {
    const targets = pushTargets(args);
    const current = () => git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
    // --force, -f, --force-with-lease[=ref], and -f folded into short flags (-uf).
    const force =
      config.allowForcePush !== true &&
      args.some(
        (a) =>
          a === "--force" || a.startsWith("--force-with-lease") || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(a),
      );
    if (has("--delete", "-d")) {
      const named = targets.map((t) => t.branch).find((b) => isProtected(b, patterns));
      if (named) return `git push --delete would remove protected branch "${named}".`;
    }
    const deletion = targets.find((t) => t.deleteOnly && isProtected(t.branch, patterns));
    if (deletion) return `pushing an empty refspec deletes protected branch "${deletion.branch}".`;
    const forcedRef = targets.find((t) => t.forced && isProtected(t.branch, patterns));
    if (forcedRef && config.allowForcePush !== true) {
      return `force-pushing to protected branch "${forcedRef.branch}" (the + refspec) rewrites shared history.`;
    }
    if (force) {
      const named = targets.map((t) => t.branch).filter((b) => b !== "");
      const branch =
        named.length > 0
          ? named.find((b) => isProtected(b, patterns))
          : isProtected(current(), patterns)
            ? current()
            : null;
      if (branch)
        return `force-pushing to protected branch "${branch}" rewrites shared history. Push to a feature branch and open a pull request instead.`;
    }
    return null;
  }

  if (sub === "branch" && has("-D", "-d", "--delete")) {
    const named = args.filter((a) => !a.startsWith("-")).find((b) => isProtected(b, patterns));
    if (named) return `deleting protected branch "${named}".`;
    return null;
  }

  if (
    sub === "commit" &&
    config.allowNoVerify !== true &&
    (has("--no-verify", "-n") || args.some((a) => /^-[a-zA-Z]*n[a-zA-Z]*$/.test(a)))
  ) {
    return "git commit --no-verify skips the project's own pre-commit hooks. Fix what the hooks report instead.";
  }

  if (sub === "clean" && args.some((a) => /^-[a-zA-Z]*f/.test(a) || a === "--force")) {
    return "git clean -f permanently deletes untracked files. List them first (git clean -n) and remove deliberately.";
  }

  if (sub === "stash" && (args[0] === "drop" || args[0] === "clear")) {
    return `git stash ${args[0]} permanently discards stashed work.`;
  }

  const discards =
    (sub === "reset" && has("--hard")) ||
    (sub === "checkout" &&
      (args.includes(".") || args.some((a, i) => a === "--" && args[i + 1] === "."))) ||
    (sub === "restore" && args.includes("."));
  if (discards) {
    if (dirtyCache.value === undefined) {
      const status = git(cwd, ["status", "--porcelain"]);
      dirtyCache.value = status === null ? false : status !== "";
    }
    if (dirtyCache.value) {
      return `"git ${sub} ${args.join(" ")}" would discard uncommitted changes. Stash or commit them first (git stash), then retry.`;
    }
  }
  return null;
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
  if (event?.tool_name !== "Bash") return 0;
  const command = event.tool_input?.command;
  if (typeof command !== "string" || !/\bgit\b/.test(command)) return 0;

  const cwd = resolve(process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd());
  const config = readConfig(cwd);
  const dirtyCache = {};

  for (const part of splitCommands(command)) {
    const reason = checkOne(part, config, cwd, dirtyCache);
    if (reason) {
      process.stderr.write(`git-guard blocked: ${reason}\nCommand: ${part}\n`);
      return 2;
    }
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch(() => process.exit(0));
