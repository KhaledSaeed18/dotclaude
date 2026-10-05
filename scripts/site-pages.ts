/**
 * site-pages.ts: the crawlable half of the catalog site.
 *
 * The home page is an app that keeps its state in the URL hash, which no
 * crawler or assistant can index per item. This module derives, from the
 * same site model `gen.ts` builds, one static page per item and per plugin
 * (`site/<type>/<name>/index.html`, `site/plugins/<name>/index.html`), a
 * markdown twin of every item page (`index.md`, the manifest as published),
 * `site/sitemap.xml`, and `site/llms-full.txt` (every manifest in full).
 *
 * Each page carries its own title, description, canonical URL, Open Graph
 * and Twitter cards, a BreadcrumbList and a SoftwareSourceCode JSON-LD node,
 * and the rendered manifest body, so search engines and answer engines can
 * cite the exact item rather than the catalog.
 */

import { join } from "node:path";
import { Marked } from "marked";

/** The subset of the site model the pages need; mirrors gen.ts's types. */
export interface PageRegistry {
  name: string;
  owner: string;
  homepage: string;
  site: string;
  author: string;
}

export interface PageType {
  type: string;
  label: string;
  noun: string;
  layout: string;
  targetBase: string;
  color: string;
  count: number;
}

export interface PagePlugin {
  name: string;
  description: string;
  category: string;
  keywords: string[];
  items: string[];
}

export interface PageItem {
  key: string;
  name: string;
  type: string;
  category: string;
  title: string;
  description: string;
  path: string;
  docs: string;
  targets: string[];
  plugins: string[];
}

export interface PageModel {
  registry: PageRegistry;
  types: PageType[];
  plugins: PagePlugin[];
  items: PageItem[];
}

/** What a page needs beyond the model: the manifest text and companions. */
export interface PageSource {
  /** Manifest body with the frontmatter removed. */
  body: string;
  /** The manifest as committed, frontmatter included. */
  raw: string;
  /** Item files relative to the item folder, manifest first. */
  files: string[];
  /** Frontmatter fields worth showing (argument-hint, tools, model). */
  facts: Array<[string, string]>;
}

export interface SitePageFile {
  path: string;
  content: string;
}

/** Directories under `site/` that this module owns wholesale. */
export const OWNED_SITE_DIRS = ["skill", "agent", "command", "hook", "plugins"] as const;

const DESCRIPTION_MAX = 155;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, "&#39;");
}

/** First sentence(s) that fit the meta description budget, cut at a word. */
export function metaDescription(description: string): string {
  const text = description.replace(/\s+/g, " ").trim();
  if (text.length <= DESCRIPTION_MAX) return text;
  const cut = text.slice(0, DESCRIPTION_MAX);
  const atWord = cut.slice(0, Math.max(cut.lastIndexOf(" "), 0)).replace(/[,;:]$/, "");
  return `${atWord}...`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** JSON for a script element: `<` can never close it. */
function jsonLd(graph: unknown[]): string {
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(
    /</g,
    "\\u003c",
  );
  return `<script type="application/ld+json">${json}</script>`;
}

/**
 * Markdown to HTML for a manifest body. Relative links (companion files) are
 * rewritten to the item's folder on GitHub, headings get stable ids, and
 * everything else is GitHub-flavoured markdown.
 */
export function renderMarkdown(body: string, blobBase: string): string {
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      link(token) {
        const text = this.parser.parseInline(token.tokens);
        let href = token.href;
        if (!/^(?:[a-z]+:|#|\/)/i.test(href)) {
          href = `${blobBase}/${href.replace(/^\.\//, "")}`;
        }
        const title = token.title ? ` title="${escapeAttr(token.title)}"` : "";
        const external = /^https?:/i.test(href) ? ' rel="noopener"' : "";
        return `<a href="${escapeAttr(href)}"${title}${external}>${text}</a>`;
      },
      heading(token) {
        const text = this.parser.parseInline(token.tokens);
        const level = Math.min(token.depth + 1, 6);
        return `<h${level} id="${slugify(token.text)}">${text}</h${level}>\n`;
      },
    },
  });
  return marked.parse(body, { async: false }) as string;
}

interface Layout {
  title: string;
  description: string;
  canonical: string;
  ogType: "article" | "website";
  graph: unknown[];
  breadcrumb: Array<[string, string]>;
  main: string;
  alternateMarkdown?: string;
}

function layout(registry: PageRegistry, page: Layout): string {
  const crumbs = page.breadcrumb
    .map(([label, href], i, all) =>
      i === all.length - 1
        ? `<li aria-current="page">${escapeHtml(label)}</li>`
        : `<li><a href="${escapeAttr(href)}">${escapeHtml(label)}</a></li>`,
    )
    .join("");
  const alternate = page.alternateMarkdown
    ? `\n    <link rel="alternate" type="text/markdown" href="${escapeAttr(page.alternateMarkdown)}" title="Markdown" />`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeAttr(page.description)}" />
    <link rel="canonical" href="${escapeAttr(page.canonical)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="author" content="${escapeAttr(registry.author)}" />
    <meta name="color-scheme" content="light dark" />
    <meta name="theme-color" content="#f5f6f8" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#1a1c21" media="(prefers-color-scheme: dark)" />
    <meta property="og:type" content="${page.ogType}" />
    <meta property="og:site_name" content="${escapeAttr(registry.name)}" />
    <meta property="og:url" content="${escapeAttr(page.canonical)}" />
    <meta property="og:title" content="${escapeAttr(page.title)}" />
    <meta property="og:description" content="${escapeAttr(page.description)}" />
    <meta property="og:image" content="${registry.site}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(page.title)}" />
    <meta name="twitter:description" content="${escapeAttr(page.description)}" />
    <meta name="twitter:image" content="${registry.site}/og-image.png" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />${alternate}
    ${jsonLd(page.graph)}
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="subpage">
    <a class="skip" href="#main">Skip to content</a>
    <header class="masthead">
      <div class="masthead-inner">
        <a class="brand" href="/">
          <img class="brand-mark" src="/favicon.svg" alt="" width="20" height="20" />
          ${escapeHtml(registry.name)}
        </a>
        <nav class="masthead-nav" aria-label="Sections">
          <a href="/">Items</a>
          <a href="/#/plugins">Plugins</a>
          <a href="/#/install">Install</a>
          <a href="${escapeAttr(registry.homepage)}" rel="noopener">GitHub</a>
        </nav>
      </div>
    </header>
    <main class="page doc-page" id="main">
      <nav class="breadcrumb" aria-label="Breadcrumb"><ol>${crumbs}</ol></nav>
${page.main}
    </main>
    <footer class="footer">
      <p class="footer-inner">
        MIT licensed. Source and contributing guide on
        <a href="${escapeAttr(registry.homepage)}" rel="noopener">GitHub</a>.
      </p>
    </footer>
  </body>
</html>
`;
}

function commandBlock(command: string): string {
  return `<pre class="command"><code>${escapeHtml(command)}</code></pre>`;
}

function itemUrl(site: string, item: PageItem): string {
  return `${site}/${item.key}/`;
}

function pluginUrl(site: string, name: string): string {
  return `${site}/plugins/${name}/`;
}

function typeOf(model: PageModel, type: string): PageType {
  const found = model.types.find((t) => t.type === type);
  if (!found) throw new Error(`Unknown item type "${type}".`);
  return found;
}

function relatedItems(model: PageModel, item: PageItem): PageItem[] {
  const sameCategory = model.items.filter(
    (other) => other.key !== item.key && other.category === item.category,
  );
  const sameType = sameCategory.filter((other) => other.type === item.type);
  const rest = sameCategory.filter((other) => other.type !== item.type);
  return [...sameType, ...rest].slice(0, 8);
}

function itemList(site: string, items: PageItem[]): string {
  if (items.length === 0) return "";
  return `<ul class="doc-list">${items
    .map(
      (item) =>
        `<li><a href="${escapeAttr(itemUrl(site, item))}"><code>${escapeHtml(item.name)}</code></a> <span class="row-type">${item.type}</span> ${escapeHtml(metaDescription(item.description))}</li>`,
    )
    .join("")}</ul>`;
}

function buildItemPage(model: PageModel, item: PageItem, source: PageSource): string {
  const { registry } = model;
  const type = typeOf(model, item.type);
  const url = itemUrl(registry.site, item);
  const blobBase = `${registry.homepage}/blob/main/${item.path}`;
  const title = `${item.name}: ${type.noun} for Claude Code | ${registry.name}`;
  const description = metaDescription(item.description);
  const shadcn = `npx shadcn@latest add ${registry.owner}/${item.name}`;
  const plugins = item.plugins.map((name) => model.plugins.find((p) => p.name === name));
  const facts = source.facts
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join("");

  const pluginSection =
    plugins.length > 0
      ? `<h2 id="install-as-a-plugin">Install as a plugin</h2>
<p>Bundled in ${plugins
          .map((p) =>
            p
              ? `the <a href="${escapeAttr(pluginUrl(registry.site, p.name))}">${escapeHtml(p.name)}</a> plugin`
              : "",
          )
          .filter(Boolean)
          .join(" and ")}. Add the marketplace once, then install the bundle:</p>
${commandBlock(`/plugin marketplace add ${registry.owner}`)}
${item.plugins.map((name) => commandBlock(`/plugin install ${name}@${registry.name}`)).join("\n")}`
      : `<h2 id="install-as-a-plugin">Install as a plugin</h2>
<p>Not part of any plugin; install it with the shadcn CLI below.</p>`;

  const hookNote =
    item.type === "hook"
      ? `<p class="detail-note">Installed as a single item, a hook still needs the block documented below added to <code>.claude/settings.json</code>; the plugin route wires it automatically.</p>`
      : "";

  const related = relatedItems(model, item);
  const main = `      <article class="doc">
        <header class="doc-head" data-type="${item.type}">
          <p class="detail-kind">${escapeHtml(type.noun)} <span class="row-category">in ${escapeHtml(item.category)}</span></p>
          <h1><code>${escapeHtml(item.name)}</code></h1>
          ${item.title.toLowerCase() !== item.name.replace(/-/g, " ").toLowerCase() ? `<p class="detail-title">${escapeHtml(item.title)}</p>` : ""}
          <p class="lede">${escapeHtml(item.description)}</p>
          ${facts ? `<dl class="doc-facts">${facts}</dl>` : ""}
        </header>
        <section class="doc-install">
${pluginSection}
<h2 id="install-as-a-single-item">Install as a single item</h2>
<p>Run from the project root; the ${escapeHtml(type.noun.toLowerCase())} lands under <code>.claude/</code>.</p>
${commandBlock(shadcn)}
${hookNote}
<h3 id="files-installed">Files installed</h3>
<ul class="targets">${item.targets.map((t) => `<li><code>${escapeHtml(t)}</code></li>`).join("")}</ul>
        </section>
        <section class="doc-body" aria-label="${escapeAttr(type.noun)} contents">
          <h2 id="contents">What it does</h2>
${renderMarkdown(source.body, blobBase)}
        </section>
        <footer class="doc-foot">
          <p><a href="${escapeAttr(item.docs)}" rel="noopener">View the source on GitHub</a> or <a href="index.md">read this ${escapeHtml(type.noun.toLowerCase())} as Markdown</a>.</p>
          ${related.length > 0 ? `<h2 id="related">More in ${escapeHtml(item.category)}</h2>${itemList(registry.site, related)}` : ""}
          <p><a href="/#/?type=${encodeURIComponent(item.type)}">All ${escapeHtml(type.label.toLowerCase())}</a> · <a href="/#/?category=${encodeURIComponent(item.category)}">All of ${escapeHtml(item.category)}</a></p>
        </footer>
      </article>`;

  const graph: unknown[] = [
    {
      "@type": "SoftwareSourceCode",
      "@id": `${url}#code`,
      url,
      name: item.name,
      alternateName: item.title,
      headline: `${item.name}: a Claude Code ${type.noun.toLowerCase()}`,
      description: item.description,
      codeRepository: item.docs,
      programmingLanguage: "Markdown",
      runtimePlatform: "Claude Code",
      license: "https://opensource.org/license/mit",
      author: { "@type": "Person", name: registry.author },
      isPartOf: { "@id": `${registry.site}/#website` },
      keywords: ["Claude Code", type.noun, item.category, ...item.plugins],
      ...(source.files.length > 1
        ? {
            hasPart: source.files.slice(1).map((file) => ({ "@type": "CreativeWork", name: file })),
          }
        : {}),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: registry.name, item: `${registry.site}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: type.label,
          item: `${registry.site}/#/?type=${item.type}`,
        },
        { "@type": "ListItem", position: 3, name: item.name, item: url },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${registry.site}/#website`,
      url: `${registry.site}/`,
      name: registry.name,
    },
  ];

  return layout(registry, {
    title,
    description,
    canonical: url,
    ogType: "article",
    graph,
    breadcrumb: [
      [registry.name, "/"],
      [type.label, `/#/?type=${item.type}`],
      [item.name, url],
    ],
    main,
    alternateMarkdown: "index.md",
  });
}

function buildPluginPage(model: PageModel, plugin: PagePlugin): string {
  const { registry } = model;
  const url = pluginUrl(registry.site, plugin.name);
  const members = plugin.items
    .map((key) => model.items.find((item) => item.key === key))
    .filter((item): item is PageItem => item !== undefined);
  const byType = model.types
    .map((type) => ({ type, items: members.filter((item) => item.type === type.type) }))
    .filter((group) => group.items.length > 0);
  const title = `${plugin.name} plugin for Claude Code | ${registry.name}`;
  const description = metaDescription(plugin.description);

  const main = `      <article class="doc">
        <header class="doc-head" data-type="plugin">
          <p class="detail-kind">Plugin <span class="row-category">${escapeHtml(plugin.category)}</span></p>
          <h1><code>${escapeHtml(plugin.name)}</code></h1>
          <p class="lede">${escapeHtml(plugin.description)}</p>
          ${plugin.keywords.length > 0 ? `<p class="doc-keywords">${plugin.keywords.map((k) => `<span class="chip">${escapeHtml(k)}</span>`).join(" ")}</p>` : ""}
        </header>
        <section class="doc-install">
<h2 id="install">Install</h2>
<p>Add the marketplace once, then install the bundle. It updates with <code>/plugin marketplace update ${escapeHtml(registry.name)}</code>.</p>
${commandBlock(`/plugin marketplace add ${registry.owner}`)}
${commandBlock(`/plugin install ${plugin.name}@${registry.name}`)}
        </section>
        <section class="doc-body">
          <h2 id="contents">What you get</h2>
${byType
  .map(
    (group) =>
      `<h3 id="${group.type.type}s">${escapeHtml(group.type.label)} (${group.items.length})</h3>${itemList(registry.site, group.items)}`,
  )
  .join("\n")}
        </section>
        <footer class="doc-foot">
          <p><a href="${escapeAttr(`${registry.homepage}/tree/main/.claude-plugin/plugins/${plugin.name}`)}" rel="noopener">View the plugin tree on GitHub</a> · <a href="/#/plugins">All plugins</a></p>
        </footer>
      </article>`;

  const graph: unknown[] = [
    {
      "@type": "SoftwareSourceCode",
      "@id": `${url}#code`,
      url,
      name: plugin.name,
      headline: `${plugin.name}: a Claude Code plugin`,
      description: plugin.description,
      codeRepository: `${registry.homepage}/tree/main/.claude-plugin/plugins/${plugin.name}`,
      runtimePlatform: "Claude Code",
      license: "https://opensource.org/license/mit",
      author: { "@type": "Person", name: registry.author },
      isPartOf: { "@id": `${registry.site}/#website` },
      keywords: ["Claude Code", "plugin", plugin.category, ...plugin.keywords],
      hasPart: members.map((item) => ({
        "@type": "SoftwareSourceCode",
        "@id": `${itemUrl(registry.site, item)}#code`,
        name: item.name,
        url: itemUrl(registry.site, item),
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: registry.name, item: `${registry.site}/` },
        { "@type": "ListItem", position: 2, name: "Plugins", item: `${registry.site}/#/plugins` },
        { "@type": "ListItem", position: 3, name: plugin.name, item: url },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${registry.site}/#website`,
      url: `${registry.site}/`,
      name: registry.name,
    },
  ];

  return layout(registry, {
    title,
    description,
    canonical: url,
    ogType: "website",
    graph,
    breadcrumb: [
      [registry.name, "/"],
      ["Plugins", "/#/plugins"],
      [plugin.name, url],
    ],
    main,
  });
}

function buildSitemap(model: PageModel): string {
  const { registry } = model;
  const urls = [
    `${registry.site}/`,
    ...model.plugins.map((plugin) => pluginUrl(registry.site, plugin.name)),
    ...model.items.map((item) => itemUrl(registry.site, item)),
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
}

/** Every manifest in full, one document, for assistants that read llms-full.txt. */
function buildLlmsFull(model: PageModel, sources: Map<string, PageSource>): string {
  const { registry } = model;
  const lines = [
    `# ${registry.name}: every item in full`,
    "",
    `> The complete text of every Claude Code skill, agent, command and hook in the ${registry.name} registry. The short catalog is ${registry.site}/llms.txt; each item also has its own page at ${registry.site}/<type>/<name>/ with a Markdown twin at index.md.`,
    "",
  ];
  for (const type of model.types) {
    const items = model.items.filter((item) => item.type === type.type);
    if (items.length === 0) continue;
    lines.push(`# ${type.label}`, "");
    for (const item of items) {
      const source = sources.get(item.key);
      if (!source) continue;
      lines.push(
        `## ${item.name}`,
        "",
        `- Type: ${type.noun}`,
        `- Category: ${item.category}`,
        `- Page: ${itemUrl(registry.site, item)}`,
        `- Source: ${item.docs}`,
        `- Install: \`npx shadcn@latest add ${registry.owner}/${item.name}\``,
        ...(item.plugins.length > 0 ? [`- Plugins: ${item.plugins.join(", ")}`] : []),
        "",
        `> ${item.description}`,
        "",
        source.body.trim().replace(/^(#{1,6}) /gm, (_m, hashes: string) => `${hashes}## `),
        "",
      );
    }
  }
  return lines.join("\n");
}

/**
 * All derived site files, as absolute paths under `siteDir`.
 * `sources` is keyed by item key (`skill/name`).
 */
export function buildSitePages(
  model: PageModel,
  sources: Map<string, PageSource>,
  siteDir: string,
): SitePageFile[] {
  const out: SitePageFile[] = [];
  for (const item of model.items) {
    const source = sources.get(item.key);
    if (!source) throw new Error(`No manifest source for ${item.key}.`);
    const dir = join(siteDir, item.type, item.name);
    out.push({ path: join(dir, "index.html"), content: buildItemPage(model, item, source) });
    out.push({ path: join(dir, "index.md"), content: source.raw });
  }
  for (const plugin of model.plugins) {
    out.push({
      path: join(siteDir, "plugins", plugin.name, "index.html"),
      content: buildPluginPage(model, plugin),
    });
  }
  out.push({ path: join(siteDir, "sitemap.xml"), content: buildSitemap(model) });
  out.push({ path: join(siteDir, "llms-full.txt"), content: buildLlmsFull(model, sources) });
  return out;
}
