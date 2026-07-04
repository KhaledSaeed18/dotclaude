/**
 * validate.ts: integrity checks for the registry.
 *
 * Source layout is `skills/<category>/<name>/SKILL.md`. The category is the
 * folder a skill lives in. This script owns the rules shadcn cannot know about
 * (manifest present, frontmatter shape, name matches folder, naming convention,
 * category folder convention, globally-unique names) and then delegates
 * structural registry validation (duplicate names, include rules, missing
 * files) to `shadcn registry validate`.
 *
 * Run `pnpm validate`, or `pnpm validate --no-shadcn` to skip the shadcn step
 * (offline).
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, sep } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const ROOT = process.cwd();
const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Frontmatter schemas, one per content type. The base shape (name/description,
 * optional title) is required everywhere; each type then layers on the optional
 * fields Claude Code understands for that family and validates their values.
 * Every schema passes through unknown keys, so authors can add fields we do not
 * model yet without tripping validation. The point is to catch typos in the
 * constrained fields (a bad color, an invalid model alias), not to forbid
 * anything Claude Code actually accepts.
 */
const AGENT_COLORS = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
  "pink",
  "cyan",
] as const;
const MEMORY_SCOPES = ["user", "project", "local"] as const;
const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
const PERMISSION_MODES = [
  "default",
  "acceptEdits",
  "auto",
  "dontAsk",
  "bypassPermissions",
  "plan",
] as const;
const MODEL_ALIASES = ["sonnet", "opus", "haiku", "inherit"] as const;

/** A model alias, or a full model id such as `claude-opus-4-8`. */
const modelSchema = z.union([
  z.enum(MODEL_ALIASES),
  z.string().regex(/^claude-[a-z0-9.-]+$/, "must be a model alias or a full claude model id"),
]);

/** Tool lists may be written as a comma string or a YAML array. */
const toolListSchema = z.union([z.string(), z.array(z.string())]);

const baseFrontmatter = z.object({
  name: z.string(),
  description: z.string(),
  title: z.string().optional(),
});

const skillFrontmatter = baseFrontmatter
  .extend({
    "argument-hint": z.string().optional(),
  })
  .passthrough();

const agentFrontmatter = baseFrontmatter
  .extend({
    tools: toolListSchema.optional(),
    disallowedTools: toolListSchema.optional(),
    model: modelSchema.optional(),
    color: z.enum(AGENT_COLORS).optional(),
    memory: z.enum(MEMORY_SCOPES).optional(),
    effort: z.enum(EFFORT_LEVELS).optional(),
    permissionMode: z.enum(PERMISSION_MODES).optional(),
    isolation: z.literal("worktree").optional(),
    background: z.boolean().optional(),
    maxTurns: z.number().optional(),
  })
  .passthrough();

const commandFrontmatter = baseFrontmatter
  .extend({
    "argument-hint": z.string().optional(),
    "allowed-tools": toolListSchema.optional(),
    model: modelSchema.optional(),
  })
  .passthrough();

const hookFrontmatter = baseFrontmatter.passthrough();

interface ContentType {
  dir: string;
  manifest: string;
  frontmatter: z.ZodTypeAny;
}

const CONTENT_TYPES: readonly ContentType[] = [
  { dir: "skills", manifest: "SKILL.md", frontmatter: skillFrontmatter },
  { dir: "agents", manifest: "AGENT.md", frontmatter: agentFrontmatter },
  { dir: "commands", manifest: "COMMAND.md", frontmatter: commandFrontmatter },
  { dir: "hooks", manifest: "HOOK.md", frontmatter: hookFrontmatter },
];

/** One item, located at `<dir>/<category>/<name>/`. */
interface Item {
  category: string;
  name: string;
}

/** The base fields every manifest carries, used after a type-specific parse. */
interface ParsedFrontmatter {
  name: string;
  description: string;
  title?: string;
}

const RegistryChunkSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      files: z.array(z.object({ path: z.string() })).optional(),
    }),
  ),
});

function subdirs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * Walk `<dir>/<category>/<name>/`. A category folder that holds the manifest
 * directly (an item placed without its own folder) is reported via `errors`
 * rather than silently treated as an item.
 */
function items(ct: ContentType, errors: string[]): Item[] {
  const base = join(ROOT, ct.dir);
  if (!existsSync(base)) return [];
  const out: Item[] = [];
  for (const category of subdirs(base)) {
    const categoryDir = join(base, category);
    if (existsSync(join(categoryDir, ct.manifest))) {
      errors.push(
        `${ct.dir}/${category}: contains ${ct.manifest} directly; items must live in ${ct.dir}/<category>/<name>/`,
      );
      continue;
    }
    if (!NAME_RE.test(category)) {
      errors.push(
        `${ct.dir}/${category}: category "${category}" violates convention ${NAME_RE.source}`,
      );
    }
    for (const name of subdirs(categoryDir)) {
      out.push({ category, name });
    }
  }
  return out;
}

/**
 * Drop fenced code blocks and inline code spans so example links inside them
 * (`./reference/topic.md` shown as syntax) are not mistaken for real links.
 */
function stripCode(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

const LINK_RE = /\]\(([^)]+)\)/g;

/**
 * Check that every relative link in the manifest resolves to a real file inside
 * the item folder. The manifest is the navigational entry point: a dead link to
 * a companion would survive `gen` but break after install. Only the manifest is
 * scanned, since reference and template files carry illustrative example links
 * (`./reference/topic.md`) that are intentionally not real.
 */
function checkManifestLinks(
  folder: string,
  manifest: string,
  label: string,
  errors: string[],
): void {
  const body = stripCode(readFileSync(join(folder, manifest), "utf8"));
  for (const match of body.matchAll(LINK_RE)) {
    // Drop an optional title (`](path "title")`) and any anchor.
    const target = (match[1] ?? "").trim().split(/\s+/)[0] ?? "";
    const pathPart = target.split("#")[0] ?? "";
    if (pathPart === "") continue;
    // Skip absolute URLs (scheme:...) and protocol-relative links.
    if (/^[a-z][a-z0-9+.-]*:/i.test(pathPart) || pathPart.startsWith("//")) continue;

    const resolved = join(folder, pathPart);
    const rel = relative(folder, resolved);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      errors.push(`${label}: ${manifest} links outside the item folder: "${pathPart}"`);
    } else if (!existsSync(resolved)) {
      errors.push(`${label}: ${manifest} has a broken relative link: "${pathPart}"`);
    }
  }
}

function checkRegistryFiles(folder: string, label: string, errors: string[]): void {
  const regPath = join(folder, "registry.json");
  if (!existsSync(regPath)) {
    errors.push(`${label}: missing registry.json (run \`pnpm gen\`)`);
    return;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(regPath, "utf8"));
  } catch (error) {
    errors.push(`${label}: registry.json is not valid JSON: ${String(error)}`);
    return;
  }
  const parsed = RegistryChunkSchema.safeParse(raw);
  if (!parsed.success) {
    errors.push(`${label}: registry.json has an unexpected shape`);
    return;
  }
  for (const item of parsed.data.items) {
    for (const file of item.files ?? []) {
      if (!existsSync(join(folder, file.path))) {
        errors.push(`${label}: registry.json references missing file "${file.path}"`);
      }
    }
  }
}

function main(): void {
  const errors: string[] = [];
  const seen = new Map<string, string>();

  for (const ct of CONTENT_TYPES) {
    for (const item of items(ct, errors)) {
      const label = `${ct.dir}/${item.category}/${item.name}`;
      const folder = join(ROOT, ct.dir, item.category, item.name);
      const manifestPath = join(folder, ct.manifest);

      if (!existsSync(manifestPath)) {
        errors.push(`${label}: missing ${ct.manifest}`);
        continue;
      }

      const parsed = ct.frontmatter.safeParse(matter(readFileSync(manifestPath, "utf8")).data);
      if (!parsed.success) {
        const reason = parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
          .join("; ");
        errors.push(`${label}: invalid frontmatter: ${reason}`);
        continue;
      }
      const fm = parsed.data as ParsedFrontmatter;

      if (fm.name.trim() === "") errors.push(`${label}: empty name`);
      if (fm.description.trim() === "") errors.push(`${label}: empty description`);
      if (fm.name !== item.name) {
        errors.push(`${label}: frontmatter name "${fm.name}" does not match folder "${item.name}"`);
      }
      if (!NAME_RE.test(fm.name)) {
        errors.push(`${label}: name "${fm.name}" violates convention ${NAME_RE.source}`);
      }

      const prior = seen.get(fm.name);
      if (prior) errors.push(`duplicate name "${fm.name}" in ${prior} and ${label}`);
      else seen.set(fm.name, label);

      checkRegistryFiles(folder, label, errors);
      checkManifestLinks(folder, ct.manifest, label, errors);
    }
  }

  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(`Item checks passed (${seen.size} item(s)).`);

  if (process.argv.includes("--no-shadcn")) {
    console.log("Skipping `shadcn registry validate` (--no-shadcn).");
    return;
  }

  console.log("Running `shadcn registry validate ./registry.json` …");
  try {
    // Pinned so validation never executes an unreviewed release; bump deliberately.
    execFileSync("npx", ["shadcn@4.13.0", "registry", "validate", "./registry.json"], {
      stdio: "inherit",
      cwd: ROOT,
    });
  } catch {
    process.exit(1);
  }
}

main();
