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
 *   - .claude-plugin/marketplace.json          (the Claude Code plugin marketplace)
 *   - .claude-plugin/commands/<name>.md        (command copies named for /name)
 *
 * Run `pnpm gen` to write, `pnpm gen:check` to fail if anything is stale.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const ROOT = process.cwd();

const REGISTRY_NAME = "dotclaude";
const GITHUB_OWNER_REPO = "KhaledSaeed18/dotclaude";
const REGISTRY_HOMEPAGE = `https://github.com/${GITHUB_OWNER_REPO}`;
const REGISTRY_SCHEMA = "https://ui.shadcn.com/schema/registry.json";
const REGISTRY_AUTHOR = "Khaled Saeed";
/** Branch the per-item `docs` links point at. */
const DOCS_BRANCH = "main";

const README_PATH = join(ROOT, "README.md");
const CATALOG_START = "<!-- catalog:start -->";
const CATALOG_END = "<!-- catalog:end -->";
const BADGES_START = "<!-- badges:start -->";
const BADGES_END = "<!-- badges:end -->";
const SHIELD_BASE = "https://shieldcn.dev/badge";

const ROOT_REGISTRY_PATH = join(ROOT, "registry.json");

const PLUGIN_META_DIR = ".claude-plugin";
const MARKETPLACE_PATH = join(ROOT, PLUGIN_META_DIR, "marketplace.json");
const MARKETPLACE_OWNER_EMAIL = "khaled18saeed@gmail.com";
/** Where the generated per-plugin trees live, relative to the repo root. */
const PLUGIN_TREES_DIR = `${PLUGIN_META_DIR}/plugins`;
const PLUGINS_START = "<!-- plugins:start -->";
const PLUGINS_END = "<!-- plugins:end -->";

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
  /** Hex color (no leading `#`) for this type's count badge in the README. */
  badgeColor: string;
  /** Remix icon slug for the badge logo, e.g. `ri:RiRobot2Fill`. */
  badgeLogo: string;
}

const CONTENT_TYPES: readonly ContentType[] = [
  {
    dir: "skills",
    label: "Skills",
    noun: "Skill",
    manifest: "SKILL.md",
    targetBase: ".claude/skills",
    layout: "folder",
    badgeColor: "2563eb",
    badgeLogo: "ri:RiSparkling2Fill",
  },
  {
    dir: "agents",
    label: "Agents",
    noun: "Agent",
    manifest: "AGENT.md",
    targetBase: ".claude/agents",
    layout: "file",
    badgeColor: "7c3aed",
    badgeLogo: "ri:RiRobot2Fill",
  },
  {
    dir: "commands",
    label: "Commands",
    noun: "Command",
    manifest: "COMMAND.md",
    targetBase: ".claude/commands",
    layout: "file",
    badgeColor: "0891b2",
    badgeLogo: "ri:RiTerminalBoxFill",
  },
  {
    dir: "hooks",
    label: "Hooks",
    noun: "Hook",
    manifest: "HOOK.md",
    targetBase: ".claude/hooks",
    layout: "folder",
    badgeColor: "db2777",
    badgeLogo: "ri:RiPlugFill",
  },
];

/** One skill, located at `<dir>/<category>/<name>/`. */
interface Item {
  category: string;
  name: string;
}

/**
 * Plugin marketplace seam. Each entry is one installable Claude Code plugin,
 * generated into `.claude-plugin/marketplace.json`. Membership is declarative:
 * a plugin selects whole category folders per type (with optional excludes), so
 * a new item added under a selected category joins its plugin on the next
 * `pnpm gen` with no edit here.
 *
 * Each plugin gets a generated tree at `.claude-plugin/plugins/<name>/` in the
 * standard plugin layout Claude Code discovers by default:
 *   - `skills/<skill>/…`      full copies of each skill folder
 *   - `agents/<name>.md`      copy of each AGENT.md
 *   - `commands/<name>.md`    copy of each COMMAND.md (a plugin command's /name
 *                             comes from its filename, the same rename the
 *                             shadcn install target does)
 *   - `hooks/hooks.json`      hook wiring, plus the scripts under `scripts/`,
 *                             so hook plugins are active immediately after
 *                             install with no manual settings.json step
 *
 * Dedicated trees, not `source: "./"` with custom component paths: pointing
 * every plugin at the repo root makes Claude Code's default directory scans
 * pick up the repo-level `agents/` and `commands/` folders for every plugin,
 * leaking every agent and raw COMMAND.md into every plugin under mangled names.
 */
interface PluginDef {
  name: string;
  description: string;
  /** Marketplace category label (free-form, for the /plugin UI). */
  category: string;
  keywords: string[];
  skills?: { category: string; exclude?: string[] };
  agents?: { category: string };
  commands?: { category: string };
  /**
   * Hook plugin: `scripts` are repo paths copied into the plugin's `scripts/`
   * folder; `config` is the hooks.json event map, referencing them via
   * `${CLAUDE_PLUGIN_ROOT}/scripts/<basename>`.
   */
  hooks?: { scripts: string[]; config: Record<string, unknown> };
}

/** A hook-config entry running one bundled script via `${CLAUDE_PLUGIN_ROOT}`. */
function hookCommand(scriptBasename: string): { type: "command"; command: string } {
  // The escaped \${...} reaches the JSON literally; Claude Code substitutes it
  // with the plugin's cache directory at runtime.
  return {
    type: "command",
    command: `node "\${CLAUDE_PLUGIN_ROOT}/scripts/${scriptBasename}"`,
  };
}

const PLUGINS: readonly PluginDef[] = [
  {
    name: "engineering",
    description:
      "Engineering workflow skills and review agents: planning, test-driven development, systematic debugging, code review, completion verification, and performance work.",
    category: "development",
    keywords: ["workflow", "tdd", "debugging", "code-review", "planning"],
    skills: {
      category: "engineering",
      // The create-* skills author items *for this repo*; they are not useful
      // outside it, so they stay shadcn-only.
      exclude: ["create-skill", "create-agent", "create-command", "create-hook"],
    },
    agents: { category: "engineering" },
    commands: { category: "engineering" },
  },
  {
    name: "security",
    description:
      "Security review toolkit: OWASP-aligned code review, dependency and secret auditing skills, a security-auditor agent, and a full-codebase /security-audit command.",
    category: "security",
    keywords: ["owasp", "audit", "secrets", "dependencies"],
    skills: { category: "security" },
    agents: { category: "security" },
    commands: { category: "security" },
  },
  {
    name: "security-hooks",
    description:
      "Deterministic guardrails, active immediately after install: a compound-command deny list, sensitive-file protection, and prompt-injection screening.",
    category: "security",
    keywords: ["hooks", "guardrails", "deny-list", "prompt-injection"],
    hooks: {
      scripts: [
        "hooks/security/smart-approve/smart-approve.mjs",
        "hooks/security/sensitive-file-guard/sensitive-file-guard.mjs",
        "hooks/security/injection-guard/injection-guard.mjs",
      ],
      config: {
        PreToolUse: [
          { matcher: "Bash", hooks: [hookCommand("smart-approve.mjs")] },
          { matcher: ".*", hooks: [hookCommand("sensitive-file-guard.mjs")] },
        ],
        UserPromptSubmit: [{ hooks: [hookCommand("injection-guard.mjs")] }],
      },
    },
  },
  {
    name: "git",
    description:
      "Version-control skills for the whole branch lifecycle: committing, worktrees, merge conflicts, undo/recovery, PR descriptions, changelogs, releases, and branch cleanup.",
    category: "version-control",
    keywords: ["git", "commits", "worktrees", "releases", "pull-requests"],
    skills: { category: "version-control" },
    commands: { category: "version-control" },
  },
  {
    name: "productivity",
    description:
      "Session productivity skills: collaborative brainstorming, plan stress-testing, session handoff documents, and a /prime command that loads project context.",
    category: "productivity",
    keywords: ["brainstorming", "handoff", "context", "planning"],
    skills: { category: "productivity" },
    commands: { category: "productivity" },
  },
  {
    name: "testing",
    description:
      "Testing toolkit: browser-based end-to-end verification with Playwright and a /write-tests command that generates a suite matching project conventions.",
    category: "testing",
    keywords: ["testing", "playwright", "e2e", "unit-tests"],
    skills: { category: "testing" },
    commands: { category: "testing" },
  },
  {
    name: "research",
    description:
      "A deep-research subagent for multi-source investigation with citations: comparisons, fact-checking, and sourced writeups.",
    category: "research",
    keywords: ["research", "citations", "web"],
    agents: { category: "research" },
  },
  {
    name: "format-on-edit",
    description:
      "Automation hook that runs the project's own formatter (Biome, Prettier, gofmt, rustfmt, or ruff) on every file Claude edits, so changes land already formatted.",
    category: "automation",
    keywords: ["formatting", "prettier", "biome", "automation"],
    hooks: {
      scripts: ["hooks/automation/format-on-edit/format-on-edit.mjs"],
      config: {
        PostToolUse: [
          {
            matcher: "Edit|Write|MultiEdit|NotebookEdit",
            hooks: [hookCommand("format-on-edit.mjs")],
          },
        ],
      },
    },
  },
  {
    name: "notify",
    description:
      "Desktop notifications for Claude Code: surfaces permission requests and attention prompts as native macOS/Linux notifications so long sessions can run in the background.",
    category: "automation",
    keywords: ["notifications", "desktop", "background"],
    hooks: {
      scripts: ["hooks/automation/notify/notify.mjs"],
      config: {
        Notification: [{ hooks: [hookCommand("notify.mjs")] }],
      },
    },
  },
  {
    name: "precompact-saver",
    description:
      "Context-preservation hook that snapshots the full session transcript before every compaction, keeping the newest ten snapshots per project.",
    category: "context",
    keywords: ["compaction", "transcript", "context"],
    hooks: {
      scripts: ["hooks/context/precompact-saver/precompact-saver.mjs"],
      config: {
        PreCompact: [{ hooks: [hookCommand("precompact-saver.mjs")] }],
      },
    },
  },
  {
    name: "tool-call-logger",
    description:
      "Observability hook that appends one sanitized JSON line per tool call to a local log, with secret redaction and payload truncation.",
    category: "observability",
    keywords: ["logging", "observability", "audit"],
    hooks: {
      scripts: ["hooks/observability/tool-call-logger/log-tool-calls.mjs"],
      config: {
        PostToolUse: [{ matcher: "*", hooks: [hookCommand("log-tool-calls.mjs")] }],
      },
    },
  },
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
  author: string;
  categories: string[];
  docs: string;
  meta: { type: string };
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

  const itemDir = toPosix(join(ct.dir, item.category, item.name));

  return {
    name: item.name,
    type: "registry:item",
    title: fm.title ?? toTitle(item.name),
    description: fm.description.replace(/\s+/g, " ").trim(),
    author: REGISTRY_AUTHOR,
    categories: [item.category],
    docs: `${REGISTRY_HOMEPAGE}/tree/${DOCS_BRANCH}/${itemDir}`,
    meta: { type: ct.noun.toLowerCase() },
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

/** Lowercase the singular noun and add a plain `s` when the count is not one. */
function pluralize(noun: string, count: number): string {
  const lower = noun.toLowerCase();
  return count === 1 ? lower : `${lower}s`;
}

/** One shieldcn count badge linking to its catalog section. */
function badgeLine(ct: ContentType, count: number): string {
  const anchor = ct.label.toLowerCase();
  const alt = `${count} ${pluralize(ct.noun, count)}`;
  const url = `${SHIELD_BASE}/${ct.label}-${count}-${ct.badgeColor}.svg?split=true&logo=${ct.badgeLogo}`;
  return `  <a href="#${anchor}"><img src="${url}" alt="${alt}" /></a>`;
}

/** The count-badge block, one badge per content type, in declaration order. */
function buildBadges(counts: Map<string, number>): string {
  const lines = CONTENT_TYPES.map((ct) => badgeLine(ct, counts.get(ct.label) ?? 0));
  return [BADGES_START, ...lines, BADGES_END].join("\n");
}

interface PluginRow {
  name: string;
  description: string;
  contents: string;
}

interface PluginBuild {
  /** marketplace.json plus every file of every per-plugin tree. */
  files: GeneratedFile[];
  rows: PluginRow[];
}

/** `"3 skills"`-style summary fragments, joined with commas. */
function contentsSummary(parts: Array<[number, string]>): string {
  const out = parts
    .filter(([count]) => count > 0)
    .map(([count, noun]) => `${count} ${pluralize(noun, count)}`);
  return out.join(", ");
}

/** Item names under `<dir>/<category>/`, sorted, or [] when absent. */
function namesIn(dir: string, category: string): string[] {
  const base = join(ROOT, dir, category);
  return existsSync(base) ? subdirs(base) : [];
}

/**
 * Build `.claude-plugin/marketplace.json` plus one generated plugin tree per
 * entry under `.claude-plugin/plugins/<name>/`, and the README plugins table
 * rows. A plugin whose selectors match nothing (or whose hook scripts are
 * absent) is omitted rather than published empty.
 */
function buildPluginArtifacts(): PluginBuild {
  const entries: unknown[] = [];
  const files: GeneratedFile[] = [];
  const rows: PluginRow[] = [];

  for (const def of PLUGINS) {
    const tree = join(ROOT, PLUGIN_TREES_DIR, def.name);
    const treeFiles: GeneratedFile[] = [];

    const skillNames = def.skills
      ? namesIn("skills", def.skills.category).filter(
          (name) => !(def.skills?.exclude ?? []).includes(name),
        )
      : [];
    for (const name of skillNames) {
      const source = join(ROOT, "skills", def.skills?.category ?? "", name);
      for (const rel of listFiles(source)) {
        if (toPosix(rel) === "registry.json") continue;
        treeFiles.push({
          path: join(tree, "skills", name, rel),
          content: readFileSync(join(source, rel), "utf8"),
        });
      }
    }

    const agentNames = def.agents ? namesIn("agents", def.agents.category) : [];
    for (const name of agentNames) {
      treeFiles.push({
        path: join(tree, "agents", `${name}.md`),
        content: readFileSync(
          join(ROOT, "agents", def.agents?.category ?? "", name, "AGENT.md"),
          "utf8",
        ),
      });
    }

    // A plugin command's /name comes from its filename, so the copy is renamed
    // from COMMAND.md to <name>.md (the same rename the shadcn target does).
    const commandNames = def.commands ? namesIn("commands", def.commands.category) : [];
    for (const name of commandNames) {
      treeFiles.push({
        path: join(tree, "commands", `${name}.md`),
        content: readFileSync(
          join(ROOT, "commands", def.commands?.category ?? "", name, "COMMAND.md"),
          "utf8",
        ),
      });
    }

    let hookCount = 0;
    if (def.hooks) {
      const present = def.hooks.scripts.filter((rel) => existsSync(join(ROOT, rel)));
      if (present.length === def.hooks.scripts.length) {
        for (const rel of def.hooks.scripts) {
          const basename = rel.split("/").at(-1) ?? rel;
          treeFiles.push({
            path: join(tree, "scripts", basename),
            content: readFileSync(join(ROOT, rel), "utf8"),
          });
        }
        treeFiles.push({
          path: join(tree, "hooks", "hooks.json"),
          content: toJson({ hooks: def.hooks.config }),
        });
        hookCount = def.hooks.scripts.length;
      } else if (present.length > 0) {
        throw new Error(
          `plugin "${def.name}" references missing hook scripts: ${def.hooks.scripts
            .filter((rel) => !present.includes(rel))
            .join(", ")}`,
        );
      }
    }

    if (skillNames.length + agentNames.length + commandNames.length + hookCount === 0) continue;

    files.push(...treeFiles);
    entries.push({
      name: def.name,
      source: `./${PLUGIN_TREES_DIR}/${def.name}`,
      description: def.description,
      author: { name: REGISTRY_AUTHOR },
      homepage: REGISTRY_HOMEPAGE,
      repository: REGISTRY_HOMEPAGE,
      license: "MIT",
      category: def.category,
      keywords: def.keywords,
    });

    rows.push({
      name: def.name,
      description: def.description,
      contents: contentsSummary([
        [skillNames.length, "skill"],
        [agentNames.length, "agent"],
        [commandNames.length, "command"],
        [hookCount, "hook"],
      ]),
    });
  }

  files.push({
    path: MARKETPLACE_PATH,
    content: toJson({
      name: REGISTRY_NAME,
      owner: { name: REGISTRY_AUTHOR, email: MARKETPLACE_OWNER_EMAIL },
      description:
        "Claude Code skills, agents, commands, and hooks from the dotclaude registry, bundled as installable plugins.",
      plugins: entries,
    }),
  });

  return { files, rows };
}

/** The README plugins table (between the plugins markers). */
function buildPluginsTable(rows: PluginRow[]): string {
  if (rows.length === 0) {
    return [PLUGINS_START, "", "_No plugins yet._", "", PLUGINS_END].join("\n");
  }
  const lines = [
    "| Plugin | What you get | Install |",
    "| --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| **${row.name}** | ${inlineDescription(row.description)} (${row.contents}) | \`/plugin install ${row.name}@${REGISTRY_NAME}\` |`,
    ),
  ];
  return [PLUGINS_START, "", ...lines, "", PLUGINS_END].join("\n");
}

/** Replace the region between `start` and `end` markers in the README. */
function replaceRegion(readme: string, start: string, end: string, next: string): string {
  const from = readme.indexOf(start);
  const to = readme.indexOf(end);
  if (from === -1 || to === -1 || to < from) {
    throw new Error(`README.md is missing the "${start}" / "${end}" markers.`);
  }
  return readme.slice(0, from) + next + readme.slice(to + end.length);
}

function generate(): GeneratedFile[] {
  const outputs: GeneratedFile[] = [];
  const includePaths: string[] = [];
  const groups: CatalogGroup[] = [];
  const counts = new Map<string, number>();

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
    counts.set(ct.label, rows.length);
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

  const plugins = buildPluginArtifacts();
  outputs.push(...plugins.files);

  let readme = readFileSync(README_PATH, "utf8");
  readme = replaceRegion(readme, CATALOG_START, CATALOG_END, buildCatalog(groups));
  readme = replaceRegion(readme, BADGES_START, BADGES_END, buildBadges(counts));
  readme = replaceRegion(readme, PLUGINS_START, PLUGINS_END, buildPluginsTable(plugins.rows));
  outputs.push({ path: README_PATH, content: readme });

  return outputs;
}

/**
 * Files under `.claude-plugin/` that gen did not produce this run. The plugin
 * trees are wholly owned by gen, so a leftover copy of a renamed or deleted
 * item counts as stale just like an outdated file does.
 */
function orphanPluginFiles(outputs: GeneratedFile[]): string[] {
  const base = join(ROOT, PLUGIN_META_DIR);
  if (!existsSync(base)) return [];
  const expected = new Set(outputs.map((out) => out.path));
  return listFiles(base)
    .map((rel) => join(base, rel))
    .filter((full) => !expected.has(full))
    .map((full) => toPosix(relative(ROOT, full)));
}

function main(): void {
  const check = process.argv.includes("--check");
  const outputs = generate();

  if (check) {
    const stale = outputs.filter(
      (out) => !existsSync(out.path) || readFileSync(out.path, "utf8") !== out.content,
    );
    const orphans = orphanPluginFiles(outputs);
    if (stale.length > 0 || orphans.length > 0) {
      console.error("Generated files are out of date. Run `pnpm gen`:");
      for (const out of stale) console.error(`  - ${toPosix(relative(ROOT, out.path))}`);
      for (const orphan of orphans) console.error(`  - ${orphan} (orphaned)`);
      process.exit(1);
    }
    console.log(`All generated files are up to date (${outputs.length} checked).`);
    return;
  }

  // The plugin trees are derived wholesale; clear them so renames and removals
  // do not leave orphaned copies behind.
  rmSync(join(ROOT, PLUGIN_META_DIR), { recursive: true, force: true });

  for (const out of outputs) {
    mkdirSync(dirname(out.path), { recursive: true });
    writeFileSync(out.path, out.content);
  }
  console.log(`Generated ${outputs.length} file(s).`);
}

main();
