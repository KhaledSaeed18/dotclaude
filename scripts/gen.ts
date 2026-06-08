/**
 * gen.ts: regenerate the shadcn registry files and the README catalog.
 *
 * Source layout is `<type>/<category>/<name>/<MANIFEST>`, where `<type>` is one
 * of the content types below (skills, agents, commands, hooks). The category is
 * the folder an item lives in, the single source of truth, so there is no
 * `category` field to set or keep in sync. The install target depends on the
 * type's `layout` (see ContentType): skills and hooks install as a folder,
 * agents and commands as a single file Claude Code loads directly.
 *
 * This script derives:
 *   - <type>/<category>/<name>/registry.json  (one shadcn item per item)
 *   - registry.json                           (root: name/homepage + include[])
 *   - the README catalog                       (between the catalog markers)
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
const CATALOG_START = "<!-- catalog:start -->";
const CATALOG_END = "<!-- catalog:end -->";

const ROOT_REGISTRY_PATH = join(ROOT, "registry.json");

/**
 * Content-type seam. Each entry is one installable family. `layout` decides how
 * an item maps onto the install tree:
 *   - "folder": copy the whole item folder to `<targetBase>/<name>/<relpath>`,
 *     preserving subfolders. Skills and hooks bundle companion files this way.
 *   - "file": copy only the manifest to `<targetBase>/<name>.md`. Agents and
 *     commands are a single markdown file Claude Code loads directly from
 *     `.claude/agents/` or `.claude/commands/`.
 *
 * Adding another family = one more entry here; no other code changes required.
 */
interface ContentType {
  /** Top-level folder that holds one `<category>/<item>` tree. */
  dir: string;
  /** Plural label for the catalog section heading, e.g. "Skills". */
  label: string;
  /** Singular noun for the catalog table's first column, e.g. "Skill". */
  noun: string;
  /** Manifest filename inside each item folder. */
  manifest: string;
  /** Personal-scope install base; the per-item suffix depends on `layout`. */
  targetBase: string;
  /** How the item maps onto the install tree (see above). */
  layout: "folder" | "file";
}

const CONTENT_TYPES: readonly ContentType[] = [
  {
    dir: "skills",
    label: "Skills",
    noun: "Skill",
    manifest: "SKILL.md",
    targetBase: ".claude/skills",
    layout: "folder",
  },
  {
    dir: "agents",
    label: "Agents",
    noun: "Agent",
    manifest: "AGENT.md",
    targetBase: ".claude/agents",
    layout: "file",
  },
  {
    dir: "commands",
    label: "Commands",
    noun: "Command",
    manifest: "COMMAND.md",
    targetBase: ".claude/commands",
    layout: "file",
  },
  {
    dir: "hooks",
    label: "Hooks",
    noun: "Hook",
    manifest: "HOOK.md",
    targetBase: ".claude/hooks",
    layout: "folder",
  },
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

interface CatalogGroup {
  label: string;
  noun: string;
  rows: CatalogRow[];
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
    throw new Error(`Invalid frontmatter in ${relative(ROOT, manifestPath)}: ${reason}`);
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

  let fileEntries: RegistryFile[];
  if (ct.layout === "file") {
    // Single-file items (agents, commands) install to `<base>/<name>.md`; the
    // manifest is renamed to the item name so Claude Code resolves it by file.
    const extra = files.filter((rel) => rel !== ct.manifest);
    if (extra.length > 0) {
      throw new Error(
        `${ct.dir}/${item.category}/${item.name} is "file"-layout and must contain only ` +
          `${ct.manifest}; remove: ${extra.join(", ")}`,
      );
    }
    fileEntries = [
      { path: ct.manifest, type: "registry:file", target: `${ct.targetBase}/${item.name}.md` },
    ];
  } else {
    // Folder items (skills, hooks) copy every file to `<base>/<name>/<relpath>`.
    fileEntries = files.map((rel) => ({
      path: rel,
      type: "registry:file",
      target: `${ct.targetBase}/${item.name}/${rel}`,
    }));
  }

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

/** One content type's tables, grouped by category (`#### <Category>`). */
function categorySection(noun: string, rows: CatalogRow[]): string[] {
  const byCategory = new Map<string, CatalogRow[]>();
  for (const row of rows) {
    const group = byCategory.get(row.category) ?? [];
    group.push(row);
    byCategory.set(row.category, group);
  }

  const out: string[] = [];
  for (const category of [...byCategory.keys()].sort()) {
    const sorted = [...(byCategory.get(category) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    out.push(
      `#### ${toTitle(category)}`,
      "",
      `| ${noun} | Description | Install |`,
      "| --- | --- | --- |",
      ...sorted.map(catalogRow),
      "",
    );
  }
  return out;
}

/** The full catalog, grouped by content type (`### <Label>`) then category. */
function buildCatalog(groups: CatalogGroup[]): string {
  const nonEmpty = groups.filter((group) => group.rows.length > 0);
  if (nonEmpty.length === 0) {
    return [CATALOG_START, "", "_No items yet._", "", CATALOG_END].join("\n");
  }

  const sections: string[] = [];
  for (const group of nonEmpty) {
    sections.push(`### ${group.label}`, "", ...categorySection(group.noun, group.rows));
  }

  return [CATALOG_START, "", ...sections, CATALOG_END].join("\n");
}

function replaceCatalog(readme: string, catalog: string): string {
  const start = readme.indexOf(CATALOG_START);
  const end = readme.indexOf(CATALOG_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`README.md is missing the "${CATALOG_START}" / "${CATALOG_END}" markers.`);
  }
  return readme.slice(0, start) + catalog + readme.slice(end + CATALOG_END.length);
}

function generate(): GeneratedFile[] {
  const outputs: GeneratedFile[] = [];
  const includePaths: string[] = [];
  const groups: CatalogGroup[] = [];

  for (const ct of CONTENT_TYPES) {
    const rows: CatalogRow[] = [];
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
    groups.push({ label: ct.label, noun: ct.noun, rows });
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
    content: replaceCatalog(readme, buildCatalog(groups)),
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
