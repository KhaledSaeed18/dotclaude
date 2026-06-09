/**
 * new.ts: scaffold a new skill, agent, command, or hook.
 *
 * Creates `<type>/<category>/<name>/<MANIFEST>` with a stub manifest that
 * follows this repo's conventions, then regenerates the registry and README
 * catalog so the item is wired up in one step. Values come from CLI flags; any
 * that are missing are prompted for interactively.
 *
 *   pnpm new --type agent --category research --name my-agent \
 *            --description "What it does. Use when ..."
 *   pnpm new                       # fully interactive
 *   pnpm new --type skill ...      # prompts only for what is left out
 *
 * Flags: --type, --category, --name, --title, --description, and --no-gen to
 * skip the regenerate step (the manifest is still written).
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

const ROOT = process.cwd();
const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

interface ManifestFields {
  name: string;
  description: string;
  title?: string;
}

interface TypeSpec {
  /** Top-level folder and the CLI value, e.g. "agents" / "agent". */
  dir: string;
  /** Manifest filename written into the item folder. */
  manifest: string;
  /** Builds the stub manifest body for this type. */
  stub: (fields: ManifestFields) => string;
}

/**
 * Emit a value as a YAML scalar, quoting only when a plain scalar would be
 * misparsed (a `: ` reads as a mapping, a leading special char changes meaning).
 * A JSON-encoded string is always a valid YAML double-quoted scalar.
 */
function yamlScalar(value: string): string {
  const risky =
    value === "" ||
    /\s$/.test(value) ||
    /^[\s>|@#%&*!?,[\]{}'"`-]/.test(value) ||
    value.includes(": ") ||
    value.includes(" #") ||
    value.endsWith(":");
  return risky ? JSON.stringify(value) : value;
}

/** The shared `name` / optional `title` / `description` frontmatter head. */
function head(fields: ManifestFields, extra: string[] = []): string {
  const lines = [`name: ${fields.name}`];
  if (fields.title) lines.push(`title: ${yamlScalar(fields.title)}`);
  lines.push(`description: ${yamlScalar(fields.description)}`, ...extra);
  return ["---", ...lines, "---"].join("\n");
}

const TYPES: Record<string, TypeSpec> = {
  skill: {
    dir: "skills",
    manifest: "SKILL.md",
    stub: (f) =>
      `${head(f)}

<TODO: one or two sentences framing what this skill produces and the principle
that governs how. Write to the agent, imperative. Do not restate the description.>

## Step 1: <orient>

<Read-only discovery first, so the skill acts on reality, not assumptions.>

## Step 2: <core work>

<The main procedure. Keep each step scannable.>
`,
  },
  agent: {
    dir: "agents",
    manifest: "AGENT.md",
    stub: (f) =>
      `${head(f, ["model: inherit", "# Optional: tools, color, memory, effort. See CONTRIBUTING.md."])}

<TODO: the agent's system prompt. Define its role, operating rules, and the
exact output it should produce. Curate the \`tools\` list down to only what it
needs, and remove this body.>
`,
  },
  command: {
    dir: "commands",
    manifest: "COMMAND.md",
    stub: (f) =>
      `${head(f, ['argument-hint: "(optional) what arguments mean; delete this line if none"'])}

<TODO: the command instructions, written to the agent. Replace this body.>
`,
  },
  hook: {
    dir: "hooks",
    manifest: "HOOK.md",
    stub: (f) =>
      `${head(f)}

# ${f.name}

<TODO: describe what this hook does and when it runs. Add the hook script (for
example \`${f.name}.mjs\`) alongside this file, then document the \`settings.json\`
block needed to activate it.>
`,
  },
};

interface Args {
  flags: Record<string, string>;
  noGen: boolean;
}

/** Parse `--key value`, `--key=value`, and the `--no-gen` boolean. */
function parseArgs(argv: string[]): Args {
  const flags: Record<string, string> = {};
  let noGen = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined || !arg.startsWith("--")) continue;
    if (arg === "--no-gen") {
      noGen = true;
      continue;
    }
    const body = arg.slice(2);
    const eq = body.indexOf("=");
    if (eq !== -1) {
      flags[body.slice(0, eq)] = body.slice(eq + 1);
    } else {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[body] = next;
        i++;
      } else {
        flags[body] = "";
      }
    }
  }
  return { flags, noGen };
}

function subdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Every existing item name across all types, for the uniqueness check. */
function allNames(): Set<string> {
  const names = new Set<string>();
  for (const spec of Object.values(TYPES)) {
    const base = join(ROOT, spec.dir);
    for (const category of subdirs(base)) {
      for (const name of subdirs(join(base, category))) names.add(name);
    }
  }
  return names;
}

class UsageError extends Error {}

async function main(): Promise<void> {
  const { flags, noGen } = parseArgs(process.argv.slice(2));
  const interactive = stdin.isTTY === true;
  const rl = interactive ? createInterface({ input: stdin, output: stdout }) : undefined;

  const ask = async (label: string, flagValue: string | undefined): Promise<string> => {
    if (flagValue !== undefined && flagValue !== "") return flagValue.trim();
    if (!rl) throw new UsageError(`missing --${label} (and no interactive terminal to prompt)`);
    return (await rl.question(`${label}: `)).trim();
  };

  try {
    const typeKey = (await ask(`type (${Object.keys(TYPES).join("/")})`, flags.type)).toLowerCase();
    const spec = TYPES[typeKey];
    if (!spec)
      throw new UsageError(
        `unknown type "${typeKey}"; expected one of ${Object.keys(TYPES).join(", ")}`,
      );

    if (rl && flags.category === undefined) {
      const existing = subdirs(join(ROOT, spec.dir));
      if (existing.length > 0)
        stdout.write(`existing ${spec.dir} categories: ${existing.join(", ")}\n`);
    }
    const category = await ask("category", flags.category);
    if (!NAME_RE.test(category)) {
      throw new UsageError(`category "${category}" must be kebab-case (${NAME_RE.source})`);
    }

    const name = await ask("name", flags.name);
    if (!NAME_RE.test(name)) {
      throw new UsageError(`name "${name}" must be kebab-case (${NAME_RE.source})`);
    }
    if (allNames().has(name)) {
      throw new UsageError(`name "${name}" already exists; names must be globally unique`);
    }

    const description = await ask("description", flags.description);
    if (description === "") throw new UsageError("description must not be empty");

    const title = flags.title?.trim() || undefined;

    const folder = join(ROOT, spec.dir, category, name);
    if (existsSync(folder)) throw new UsageError(`${spec.dir}/${category}/${name} already exists`);

    mkdirSync(folder, { recursive: true });
    const manifestPath = join(folder, spec.manifest);
    writeFileSync(manifestPath, spec.stub({ name, description, title }));
    stdout.write(`Created ${spec.dir}/${category}/${name}/${spec.manifest}\n`);

    rl?.close();

    if (noGen) {
      stdout.write("Skipped regeneration (--no-gen). Run `pnpm gen` when ready.\n");
      return;
    }

    // Run the generator in-process so registry.json and the README catalog are
    // written from the new manifest. gen reads process.cwd(), same as here.
    await import(new URL("./gen.ts", import.meta.url).href);
    stdout.write(
      `\nDone. Edit ${spec.dir}/${category}/${name}/${spec.manifest}, then run \`pnpm validate\`.\n`,
    );
  } catch (error) {
    rl?.close();
    if (error instanceof UsageError) {
      stdout.write(`Error: ${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

await main();
