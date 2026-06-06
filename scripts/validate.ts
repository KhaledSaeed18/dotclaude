/**
 * validate.ts — integrity checks for the registry.
 *
 * Source layout is `skills/<category>/<name>/SKILL.md` — the category is the
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
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const ROOT = process.cwd();
const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

interface ContentType {
  dir: string;
  manifest: string;
}

const CONTENT_TYPES: readonly ContentType[] = [{ dir: "skills", manifest: "SKILL.md" }];

/** One skill, located at `<dir>/<category>/<name>/`. */
interface Item {
  category: string;
  name: string;
}

const FrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
  title: z.string().optional(),
});

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
 * directly (a skill placed without its own folder) is reported via `errors`
 * rather than silently treated as a skill.
 */
function items(ct: ContentType, errors: string[]): Item[] {
  const base = join(ROOT, ct.dir);
  if (!existsSync(base)) return [];
  const out: Item[] = [];
  for (const category of subdirs(base)) {
    const categoryDir = join(base, category);
    if (existsSync(join(categoryDir, ct.manifest))) {
      errors.push(
        `${ct.dir}/${category}: contains ${ct.manifest} directly — skills must live in ${ct.dir}/<category>/<name>/`,
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
    errors.push(`${label}: registry.json is not valid JSON — ${String(error)}`);
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

      const parsed = FrontmatterSchema.safeParse(matter(readFileSync(manifestPath, "utf8")).data);
      if (!parsed.success) {
        const reason = parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
          .join("; ");
        errors.push(`${label}: invalid frontmatter — ${reason}`);
        continue;
      }
      const fm = parsed.data;

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
    }
  }

  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(`Skill checks passed (${seen.size} item(s)).`);

  if (process.argv.includes("--no-shadcn")) {
    console.log("Skipping `shadcn registry validate` (--no-shadcn).");
    return;
  }

  console.log("Running `shadcn registry validate ./registry.json` …");
  try {
    execFileSync("npx", ["shadcn@latest", "registry", "validate", "./registry.json"], {
      stdio: "inherit",
      cwd: ROOT,
    });
  } catch {
    process.exit(1);
  }
}

main();
