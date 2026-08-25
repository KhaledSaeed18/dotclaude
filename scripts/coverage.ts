/**
 * coverage.ts: measure how much of the shipped code the test suite actually runs.
 *
 * The test suite is deliberately black-box — hooks and the gen/validate/new
 * scripts are executed as real child processes with their event or argv piped
 * in, never imported. That is the right design (it pins the contract rather
 * than the internals), but it defeats ordinary coverage tooling, which only
 * instruments the runner's own module graph and would report a confident and
 * completely wrong 0%.
 *
 * So this runs the suite with NODE_V8_COVERAGE set, which makes every child
 * process drop a raw V8 coverage report, then merges them.
 *
 * Two details matter for the merge to be truthful, and both produce a
 * believable-looking overcount when missed:
 *
 *   - V8 nests ranges. A function that ran is one range with count > 0, and the
 *     branches inside it that did *not* run are nested ranges with count 0. So
 *     ranges have to be applied in order, letting the nested zeros overwrite
 *     the enclosing range, rather than only ever marking bytes as covered.
 *   - Every hook runs many times across the suite, once per spawn. A line is
 *     covered if *any* of those runs reached it, so per-process results are
 *     OR-ed together, not concatenated.
 *
 * Blank lines, comments, and lone punctuation are excluded from the
 * denominator, so the number reflects executable code rather than formatting.
 *
 * Run `pnpm coverage`. Exits non-zero below MINIMUM so a branch that quietly
 * stops being exercised is caught in CI.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = process.cwd();

/**
 * Floor for the overall percentage. Deliberately below the current figure:
 * this is a ratchet against a real regression, not a target to chase with
 * tests written for the number's sake. Some branches are genuinely
 * platform-specific (notify's macOS path cannot run on Linux and vice versa),
 * so the achievable maximum differs per OS and 100% is not the goal.
 */
const MINIMUM = 90;

/** Only these trees are measured; tests and generated output are not code we ship. */
const MEASURED = /\/(hooks|scripts)\//;
const EXCLUDED = /__tests__|node_modules|\.claude-plugin/;

interface V8Range {
  startOffset: number;
  endOffset: number;
  count: number;
}
interface V8Function {
  ranges: V8Range[];
}
interface V8Script {
  url: string;
  functions: V8Function[];
}

interface FileReport {
  path: string;
  executable: number;
  uncovered: number[];
}

/** Lines that carry no executable code, so they should not skew the ratio. */
function isExecutable(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed === "") return false;
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return false;
  return !["}", "};", "];", ");", "{", "]", ")", "},", "],"].includes(trimmed);
}

function analyse(path: string, scripts: V8Script[]): FileReport | null {
  let source: string;
  try {
    source = readFileSync(path, "utf8");
  } catch {
    return null;
  }

  const everCovered = new Uint8Array(source.length);
  for (const script of scripts) {
    // Per process: apply ranges in order so nested count-0 ranges override the
    // enclosing function range that did run.
    const thisRun = new Uint8Array(source.length);
    for (const fn of script.functions) {
      for (const range of fn.ranges) {
        const end = Math.min(range.endOffset, source.length);
        const value = range.count > 0 ? 1 : 0;
        for (let i = Math.max(range.startOffset, 0); i < end; i++) thisRun[i] = value;
      }
    }
    // OR across processes: reached by any run counts as reached.
    for (let i = 0; i < source.length; i++) if (thisRun[i]) everCovered[i] = 1;
  }

  const lines = source.split("\n");
  const uncovered: number[] = [];
  let executable = 0;
  let offset = 0;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    if (isExecutable(line)) {
      executable++;
      let reached = false;
      for (let i = offset; i < offset + line.length; i++) {
        if (everCovered[i]) {
          reached = true;
          break;
        }
      }
      if (!reached) uncovered.push(index + 1);
    }
    offset += line.length + 1;
  }
  return { path, executable, uncovered };
}

/** Collapse [3,4,5,9] into "3-5, 9" so the report stays readable. */
function summariseLines(lines: number[]): string {
  const ranges: Array<[number, number]> = [];
  let start = lines[0] as number;
  let previous = start;
  for (const line of lines.slice(1)) {
    if (line === previous + 1) {
      previous = line;
      continue;
    }
    ranges.push([start, previous]);
    start = line;
    previous = line;
  }
  ranges.push([start, previous]);
  return ranges.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(", ");
}

function main(): void {
  const covDir = mkdtempSync(join(tmpdir(), "dotclaude-coverage-"));
  try {
    console.log("Running the suite with V8 coverage collection on…\n");
    const run = spawnSync("npx", ["vitest", "run"], {
      cwd: ROOT,
      env: { ...process.env, NODE_V8_COVERAGE: covDir },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (run.status !== 0) {
      console.error(run.stdout ?? "");
      console.error(run.stderr ?? "");
      console.error("Tests failed; coverage numbers would be meaningless. Fix the suite first.");
      process.exit(1);
    }

    const byFile = new Map<string, V8Script[]>();
    for (const entry of readdirSync(covDir)) {
      let parsed: { result?: V8Script[] };
      try {
        parsed = JSON.parse(readFileSync(join(covDir, entry), "utf8"));
      } catch {
        continue;
      }
      for (const script of parsed.result ?? []) {
        if (!script.url.startsWith("file://")) continue;
        const path = script.url.slice("file://".length);
        if (!path.startsWith(ROOT) || !MEASURED.test(path) || EXCLUDED.test(path)) continue;
        const list = byFile.get(path);
        if (list) list.push(script);
        else byFile.set(path, [script]);
      }
    }

    if (byFile.size === 0) {
      console.error("No coverage data was collected — did the suite spawn any child processes?");
      process.exit(1);
    }

    let totalExecutable = 0;
    let totalUncovered = 0;
    const reports: FileReport[] = [];
    for (const [path, scripts] of [...byFile].sort()) {
      const report = analyse(path, scripts);
      if (!report) continue;
      reports.push(report);
      totalExecutable += report.executable;
      totalUncovered += report.uncovered.length;
    }

    for (const report of reports) {
      const covered = report.executable - report.uncovered.length;
      const percent = report.executable === 0 ? 100 : (covered / report.executable) * 100;
      const relative = report.path.slice(ROOT.length + 1);
      const label = report.uncovered.length === 0 ? "FULL" : "GAPS";
      console.log(`${label}  ${percent.toFixed(1).padStart(5)}%  ${relative}`);
      if (report.uncovered.length > 0) {
        console.log(`             lines ${summariseLines(report.uncovered)}`);
      }
    }

    const overall =
      totalExecutable === 0 ? 100 : ((totalExecutable - totalUncovered) / totalExecutable) * 100;
    console.log(
      `\nOverall: ${overall.toFixed(1)}% of executable lines run ` +
        `(${totalUncovered} uncovered of ${totalExecutable}) across ${reports.length} file(s).`,
    );

    if (overall < MINIMUM) {
      console.error(`\nBelow the ${MINIMUM}% floor. Add tests for the gaps listed above.`);
      process.exit(1);
    }
    console.log(`At or above the ${MINIMUM}% floor.`);
  } finally {
    rmSync(covDir, { recursive: true, force: true });
  }
}

main();
