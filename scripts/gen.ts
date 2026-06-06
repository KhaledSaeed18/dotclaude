/**
 * gen.ts — regenerate the shadcn registry files and the README catalog.
 *
 * Single source of truth for each item is its manifest (SKILL.md) frontmatter
 * plus the actual files in the item folder. This script derives:
 *   - skills/<name>/registry.json   (one shadcn item per folder)
 *   - registry.json                 (root: name/homepage + include[])
 *   - the README catalog table       (between the skills markers)
 *
 * Run `pnpm gen` to write, `pnpm gen:check` to fail if anything is stale.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const ROOT = process.cwd();

const REGISTRY_NAME = "dotclaude";
const GITHUB_OWNER_REPO = "KhaledSaeed18/dotclaude";
const REGISTRY_HOMEPAGE = `https://github.com/${GITHUB_OWNER_REPO}`;
const REGISTRY_SCHEMA = "https://ui.shadcn.com/schema/registry.json";

const README_PATH = join(ROOT, "README.md");
const README_START = "<!-- skills:start -->";
const README_END = "<!-- skills:end -->";

const ROOT_REGISTRY_PATH = join(ROOT, "registry.json");

/**
 * Content-type seam. Adding hooks/agents/commands later = one more entry here;
 * no other code changes are required.
 */
interface ContentType {
  /** Top-level folder that holds one subfolder per item. */
  dir: string;
  /** Manifest filename inside each item folder. */
  manifest: string;
  /** Personal-scope install base; `<name>/<file>` is appended per file. */
  targetBase: string;
}

const CONTENT_TYPES: readonly ContentType[] = [
  { dir: "skills", manifest: "SKILL.md", targetBase: "~/.claude/skills" },
];

const FrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
  title: z.string().optional(),
});
type Frontmatter = z.infer<typeof FrontmatterSchema>;

interface RegistryFile {
  path: string;
  type: "registry:file";
  target: string;
}

interface RegistryItem {
  name: string;
  type: "registry:item";
  title: string;
  description: string;
  files: RegistryFile[];
}

interface CatalogRow {
  name: string;
  folder: string;
  description: string;
}

interface GeneratedFile {
  path: string;
  content: string;
}

function toJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function toTitle(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

/** Recursively list every file under `dir`, returned as paths relative to it. */
function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const nested of listFiles(full)) {
        out.push(join(entry.name, nested));
      }
    } else if (entry.isFile()) {
      out.push(entry.name);
    }
  }
  return out;
}

function itemFolders(ct: ContentType): string[] {
  const base = join(ROOT, ct.dir);
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readFrontmatter(manifestPath: string): Frontmatter {
  const parsed = matter(readFileSync(manifestPath, "utf8"));
  const result = FrontmatterSchema.safeParse(parsed.data);
  if (!result.success) {
    const reason = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid frontmatter in ${relative(ROOT, manifestPath)} — ${reason}`);
  }
  return result.data;
}

function buildItem(ct: ContentType, name: string, fm: Frontmatter): RegistryItem {
  const folder = join(ROOT, ct.dir, name);
  const files = listFiles(folder)
    .map(toPosix)
    .filter((rel) => rel !== "registry.json")
    .sort();

  if (files.length === 0) {
    throw new Error(`${ct.dir}/${name} has no files to publish.`);
  }

  const fileEntries: RegistryFile[] = files.map((rel) => ({
    path: rel,
    type: "registry:file",
    target: `${ct.targetBase}/${name}/${rel}`,
  }));

  const item: RegistryItem = {
    name,
    type: "registry:item",
    title: fm.title ?? toTitle(name),
    description: fm.description.replace(/\s+/g, " ").trim(),
    files: fileEntries,
  };
  return item;
}

function inlineDescription(description: string): string {
  return description.replace(/\s+/g, " ").trim().replace(/\|/g, "\\|");
}

function buildCatalog(rows: CatalogRow[]): string {
  const header = ["| Skill | Description | Install |", "| --- | --- | --- |"];
  const body =
    rows.length === 0
      ? ["| _none yet_ | | |"]
      : rows.map(
          (row) =>
            `| [${row.name}](${row.folder}) | ${inlineDescription(row.description)} | \`npx shadcn@latest add ${GITHUB_OWNER_REPO}/${row.name}\` |`,
        );
  return [README_START, "", ...header, ...body, "", README_END].join("\n");
}

function replaceCatalog(readme: string, catalog: string): string {
  const start = readme.indexOf(README_START);
  const end = readme.indexOf(README_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`README.md is missing the "${README_START}" / "${README_END}" markers.`);
  }
  return readme.slice(0, start) + catalog + readme.slice(end + README_END.length);
}

function generate(): GeneratedFile[] {
  const outputs: GeneratedFile[] = [];
  const includePaths: string[] = [];
  const rows: CatalogRow[] = [];

  for (const ct of CONTENT_TYPES) {
    for (const name of itemFolders(ct)) {
      const manifestPath = join(ROOT, ct.dir, name, ct.manifest);
      if (!existsSync(manifestPath)) {
        throw new Error(`${ct.dir}/${name} is missing ${ct.manifest}.`);
      }
      const fm = readFrontmatter(manifestPath);
      const item = buildItem(ct, name, fm);

      const chunkPath = join(ROOT, ct.dir, name, "registry.json");
      outputs.push({
        path: chunkPath,
        content: toJson({ $schema: REGISTRY_SCHEMA, items: [item] }),
      });

      includePaths.push(`${ct.dir}/${name}/registry.json`);
      rows.push({ name, folder: `${ct.dir}/${name}/`, description: item.description });
    }
  }

  includePaths.sort();
  outputs.push({
    path: ROOT_REGISTRY_PATH,
    content: toJson({
      $schema: REGISTRY_SCHEMA,
      name: REGISTRY_NAME,
      homepage: REGISTRY_HOMEPAGE,
      include: includePaths,
    }),
  });

  const readme = readFileSync(README_PATH, "utf8");
  outputs.push({
    path: README_PATH,
    content: replaceCatalog(readme, buildCatalog(rows)),
  });

  return outputs;
}

function main(): void {
  const check = process.argv.includes("--check");
  const outputs = generate();

  if (check) {
    const stale = outputs.filter(
      (out) => !existsSync(out.path) || readFileSync(out.path, "utf8") !== out.content,
    );
    if (stale.length > 0) {
      console.error("Generated files are out of date. Run `pnpm gen`:");
      for (const out of stale) console.error(`  - ${toPosix(relative(ROOT, out.path))}`);
      process.exit(1);
    }
    console.log(`All generated files are up to date (${outputs.length} checked).`);
    return;
  }

  for (const out of outputs) writeFileSync(out.path, out.content);
  console.log(`Generated ${outputs.length} file(s).`);
}

main();
