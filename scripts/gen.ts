/**
 * gen.ts — regenerate the shadcn registry files and the README catalog.
 *
 * Source layout is `skills/<category>/<name>/SKILL.md`. The category is the
 * folder a skill lives in — the single source of truth, so there is no
 * `category` field to set or keep in sync. Skills always *install* to a flat
 * `.claude/skills/<name>/` (Claude Code loads them from there), so the category
 * is stripped from the install target and exists only to organise this repo.
 *
 * This script derives:
 *   - skills/<category>/<name>/registry.json  (one shadcn item per skill)
 *   - registry.json                           (root: name/homepage + include[])
 *   - the README catalog                       (between the skills markers)
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
  /** Top-level folder that holds one `<category>/<item>` tree. */
  dir: string;
  /** Manifest filename inside each item folder. */
  manifest: string;
  /** Personal-scope install base; `<name>/<file>` is appended per file. */
  targetBase: string;
}

const CONTENT_TYPES: readonly ContentType[] = [
  { dir: "skills", manifest: "SKILL.md", targetBase: ".claude/skills" },
];

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
  categories: string[];
  files: RegistryFile[];
}

interface CatalogRow {
  name: string;
  folder: string;
  description: string;
  category: string;
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

function subdirs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Walk `<dir>/<category>/<name>/`, deriving each skill's category from its folder. */
function items(ct: ContentType): Item[] {
  const base = join(ROOT, ct.dir);
  if (!existsSync(base)) return [];
  const out: Item[] = [];
  for (const category of subdirs(base)) {
    for (const name of subdirs(join(base, category))) {
      out.push({ category, name });
    }
  }
  return out;
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

function buildItem(ct: ContentType, item: Item, fm: Frontmatter): RegistryItem {
  const folder = join(ROOT, ct.dir, item.category, item.name);
  const files = listFiles(folder)
    .map(toPosix)
    .filter((rel) => rel !== "registry.json")
    .sort();

  if (files.length === 0) {
    throw new Error(`${ct.dir}/${item.category}/${item.name} has no files to publish.`);
  }

  const fileEntries: RegistryFile[] = files.map((rel) => ({
    path: rel,
    type: "registry:file",
    target: `${ct.targetBase}/${item.name}/${rel}`,
  }));

  return {
    name: item.name,
    type: "registry:item",
    title: fm.title ?? toTitle(item.name),
    description: fm.description.replace(/\s+/g, " ").trim(),
    categories: [item.category],
    files: fileEntries,
  };
}

function inlineDescription(description: string): string {
  return description.replace(/\s+/g, " ").trim().replace(/\|/g, "\\|");
}

function catalogRow(row: CatalogRow): string {
  return `| [${row.name}](${row.folder}) | ${inlineDescription(row.description)} | \`npx shadcn@latest add ${GITHUB_OWNER_REPO}/${row.name}\` |`;
}

function catalogSection(label: string, rows: CatalogRow[]): string[] {
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  return [
    `### ${label}`,
    "",
    "| Skill | Description | Install |",
    "| --- | --- | --- |",
    ...sorted.map(catalogRow),
    "",
  ];
}

function buildCatalog(rows: CatalogRow[]): string {
  if (rows.length === 0) {
    return [
      README_START,
      "",
      "| Skill | Description | Install |",
      "| --- | --- | --- |",
      "| _none yet_ | | |",
      "",
      README_END,
    ].join("\n");
  }

  const byCategory = new Map<string, CatalogRow[]>();
  for (const row of rows) {
    const group = byCategory.get(row.category) ?? [];
    group.push(row);
    byCategory.set(row.category, group);
  }

  const sections: string[] = [];
  for (const category of [...byCategory.keys()].sort()) {
    sections.push(...catalogSection(toTitle(category), byCategory.get(category) ?? []));
  }

  return [README_START, "", ...sections, README_END].join("\n");
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
    for (const item of items(ct)) {
      const itemDir = join(ct.dir, item.category, item.name);
      const manifestPath = join(ROOT, itemDir, ct.manifest);
      if (!existsSync(manifestPath)) {
        throw new Error(`${itemDir} is missing ${ct.manifest}.`);
      }
      const fm = readFrontmatter(manifestPath);
      const registryItem = buildItem(ct, item, fm);

      outputs.push({
        path: join(ROOT, itemDir, "registry.json"),
        content: toJson({ $schema: REGISTRY_SCHEMA, items: [registryItem] }),
      });

      includePaths.push(toPosix(join(itemDir, "registry.json")));
      rows.push({
        name: item.name,
        folder: `${toPosix(itemDir)}/`,
        description: registryItem.description,
        category: item.category,
      });
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
