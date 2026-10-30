/**
 * site-pages.ts: the crawlable half of the catalog site.
 *
 * The home page is an app that keeps its filters in the query string, which
 * no crawler or assistant can index per item. This module derives, from the
 * same site model `gen.ts` builds, one static page per item and per plugin
 * (`site/<type>/<name>/index.html`, `site/plugins/<name>/index.html`), the
 * plugins index (`site/plugins/index.html`), the install guide
 * (`site/install/index.html`), a markdown twin of every item page
 * (`index.md`, the manifest as published), `site/sitemap.xml`, and
 * `site/llms-full.txt` (every manifest in full).
 *
 * Each page carries its own title, description, canonical URL, Open Graph
 * and Twitter cards, a BreadcrumbList and a SoftwareSourceCode JSON-LD node,
 * and the rendered manifest body, so search engines and answer engines can
 * cite the exact item rather than the catalog. Every page shares one header
 * and footer with `site/index.html`; change them here and there together.
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
export const OWNED_SITE_DIRS = ["skill", "agent", "command", "hook", "plugins", "install"] as const;

const DESCRIPTION_MAX = 155;

/** Plugins the install guide and plugins index suggest first. */
const STARTER_PLUGINS = ["engineering", "git", "security-hooks"];

/** What each type is, for the install guide. Mirrors the README. */
const TYPE_EXPLAINERS: Record<string, string> = {
  skill:
    "A procedure Claude loads on its own when your request matches its description. You never call it by name.",
  agent:
    "A specialist Claude hands a whole side task to, in its own context, returning only the result.",
  command: "A shortcut you trigger yourself by typing /name in the session.",
  hook: "A script that runs on a Claude Code event, every time, with no model judgment involved.",
};

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

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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

/** The h2 and h3 headings of rendered markdown, for a table of contents. */
export function headingsOf(html: string): Array<{ depth: number; id: string; text: string }> {
  const out: Array<{ depth: number; id: string; text: string }> = [];
  const pattern = /<h([23]) id="([^"]+)">(.*?)<\/h\1>/g;
  for (const match of html.matchAll(pattern)) {
    out.push({
      depth: Number(match[1]),
      id: match[2] ?? "",
      text: (match[3] ?? "").replace(/<[^>]+>/g, ""),
    });
  }
  return out;
}

/* Shared chrome ---------------------------------------------------------- */

type Section = "catalog" | "plugins" | "install" | "none";

const ICON_GITHUB =
  '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 .2a8 8 0 0 0-2.5 15.6c.4 0 .5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.3 1.9.9 2.4.7 0-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.6 7.6 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3.1-1.9 3.7-3.6 3.9.3.3.5.8.5 1.5v2.2c0 .2.1.5.6.4A8 8 0 0 0 8 .2Z" /></svg>';

const ICON_MENU =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 5.5h14M3 10h14M3 14.5h14" /></svg>';

const ICON_SUN =
  '<svg class="icon-sun" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="3.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" /></svg>';

const ICON_MOON =
  '<svg class="icon-moon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" hidden><path d="M16.5 12.5A7 7 0 0 1 7.5 3.5a7 7 0 1 0 9 9Z" /></svg>';

function header(registry: PageRegistry, active: Section): string {
  const link = (href: string, label: string, section: Section) =>
    `<a href="${href}"${active === section ? ' aria-current="page"' : ""}>${label}</a>`;
  return `    <header class="masthead">
      <div class="masthead-inner wrap">
        <a class="brand" href="/">
          <img class="brand-mark" src="/favicon.svg" alt="" width="20" height="20" />
          ${escapeHtml(registry.name)}
        </a>
        <button class="menu-toggle icon-button" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">${ICON_MENU}</button>
        <nav class="masthead-nav" id="site-nav" aria-label="Sections">
          ${link("/", "Catalog", "catalog")}
          ${link("/plugins/", "Plugins", "plugins")}
          ${link("/install/", "Install", "install")}
          <a href="${escapeAttr(registry.homepage)}" rel="noopener" class="icon-button" title="Source on GitHub">${ICON_GITHUB}<span class="visually-hidden">GitHub</span></a>
          <button type="button" class="icon-button theme-toggle" aria-label="Switch theme" title="Switch theme">${ICON_SUN}${ICON_MOON}<span class="visually-hidden">Theme</span></button>
        </nav>
      </div>
    </header>`;
}

function footer(registry: PageRegistry): string {
  return `    <footer class="footer">
      <div class="footer-inner wrap">
        <p>MIT licensed. Built by <a href="https://khaledsaeed.tech/work/dotclaude" rel="noopener">${escapeHtml(registry.author)}</a>.</p>
        <nav aria-label="More">
          <a href="${escapeAttr(registry.homepage)}" rel="noopener">Source</a>
          <a href="${escapeAttr(registry.homepage)}/blob/main/CONTRIBUTING.md" rel="noopener">Contributing</a>
          <a href="/llms.txt">llms.txt</a>
          <a href="/sitemap.xml">Sitemap</a>
        </nav>
      </div>
    </footer>`;
}

interface Layout {
  title: string;
  description: string;
  canonical: string;
  ogType: "article" | "website";
  graph: unknown[];
  breadcrumb: Array<[string, string]>;
  section: Section;
  /** Main content, already wrapped in its own `.wrap`. */
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
    <meta name="theme-color" content="#fbfbfa" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#111317" media="(prefers-color-scheme: dark)" />
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
    <script>try{const t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch{}</script>
  </head>
  <body data-page="doc">
    <a class="skip" href="#main">Skip to content</a>
${header(registry, page.section)}
    <main class="page" id="main">
      <div class="wrap">
        <nav class="breadcrumb" aria-label="Breadcrumb"><ol>${crumbs}</ol></nav>
${page.main}
      </div>
    </main>
${footer(registry)}
    <script src="/app.js"></script>
  </body>
</html>
`;
}

/* Building blocks ---------------------------------------------------------- */

function commandBlock(command: string): string {
  const prompt = command.startsWith("/") ? ' data-prompt="claude"' : "";
  return `<div class="command" data-copy="${escapeAttr(command)}"${prompt}><code>${escapeHtml(command)}</code><button type="button" class="copy" aria-label="Copy command">Copy</button></div>`;
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

function pluralNoun(type: PageType, n: number): string {
  return `${n} ${type.noun.toLowerCase()}${n === 1 ? "" : "s"}`;
}

function membersOf(model: PageModel, plugin: PagePlugin): PageItem[] {
  return plugin.items
    .map((key) => model.items.find((item) => item.key === key))
    .filter((item): item is PageItem => item !== undefined);
}

function countsOf(model: PageModel, members: PageItem[]): string {
  return model.types
    .map((type) => [members.filter((m) => m.type === type.type).length, type] as const)
    .filter(([n]) => n > 0)
    .map(([n, type]) => pluralNoun(type, n))
    .join(", ");
}

function relatedItems(model: PageModel, item: PageItem): PageItem[] {
  const sameCategory = model.items.filter(
    (other) => other.key !== item.key && other.category === item.category,
  );
  const sameType = sameCategory.filter((other) => other.type === item.type);
  const rest = sameCategory.filter((other) => other.type !== item.type);
  return [...sameType, ...rest].slice(0, 6);
}

function itemList(site: string, items: PageItem[]): string {
  if (items.length === 0) return "";
  return `<ul class="doc-list">${items
    .map(
      (item) =>
        `<li data-type="${item.type}"><span class="dot" aria-hidden="true"></span><a href="${escapeAttr(itemUrl(site, item))}">${escapeHtml(item.name)}</a><span class="desc">${escapeHtml(metaDescription(item.description))}</span></li>`,
    )
    .join("")}</ul>`;
}

function sideList(site: string, items: PageItem[], more?: { href: string; label: string }): string {
  return `<ul class="side-list">${items
    .map(
      (item) =>
        `<li data-type="${item.type}"><a href="${escapeAttr(itemUrl(site, item))}"><span class="dot" aria-hidden="true"></span><code>${escapeHtml(item.name)}</code></a></li>`,
    )
    .join(
      "",
    )}${more ? `<li><a class="more" href="${escapeAttr(more.href)}">${escapeHtml(more.label)}</a></li>` : ""}</ul>`;
}

function websiteNode(registry: PageRegistry): unknown {
  return {
    "@type": "WebSite",
    "@id": `${registry.site}/#website`,
    url: `${registry.site}/`,
    name: registry.name,
  };
}

/* Item page ------------------------------------------------------------------ */

function buildItemPage(model: PageModel, item: PageItem, source: PageSource): string {
  const { registry } = model;
  const type = typeOf(model, item.type);
  const url = itemUrl(registry.site, item);
  const blobBase = `${registry.homepage}/blob/main/${item.path}`;
  const title = `${item.name}: ${type.noun} for Claude Code | ${registry.name}`;
  const description = metaDescription(item.description);
  const shadcn = `npx shadcn@latest add ${registry.owner}/${item.name}`;
  const plugins = item.plugins
    .map((name) => model.plugins.find((p) => p.name === name))
    .filter((p): p is PagePlugin => p !== undefined);
  const firstPlugin = plugins[0];
  const facts = source.facts
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join("");
  const body = renderMarkdown(source.body, blobBase);
  const headings = headingsOf(body);
  const showTitle = item.title.toLowerCase() !== item.name.replace(/-/g, " ").toLowerCase();

  const pluginWay =
    plugins.length > 0
      ? `<div class="install-way">
  <h3>As a plugin</h3>
  <p>Bundled in ${plugins
    .map(
      (p) =>
        `the <a href="${escapeAttr(pluginUrl(registry.site, p.name))}">${escapeHtml(p.name)}</a> plugin`,
    )
    .join(
      " and ",
    )}. Add the marketplace once, then install the bundle; it updates with the marketplace.</p>
  ${commandBlock(`/plugin marketplace add ${registry.owner}`)}
  ${item.plugins.map((name) => commandBlock(`/plugin install ${name}@${registry.name}`)).join("\n  ")}
</div>`
      : `<div class="install-way">
  <h3>As a plugin</h3>
  <p>Not part of any plugin yet. Install it as a single item with the shadcn CLI.</p>
</div>`;

  const hookNote =
    item.type === "hook"
      ? `<p class="note">Installed as a single item, a hook still needs the settings block documented below added to <code>.claude/settings.json</code>. The plugin route wires it automatically.</p>`
      : "";

  const singleWay = `<div class="install-way">
  <h3>As a single item</h3>
  <p>Run from the project root; the ${escapeHtml(type.noun.toLowerCase())} lands under <code>.claude/</code>. Copy it to <code>~/.claude/</code> to make it global.</p>
  ${commandBlock(shadcn)}
</div>`;

  const toc =
    headings.length > 1
      ? `<nav class="side-block toc" aria-label="On this page">
  <h2>On this page</h2>
  <ol>${headings
    .map(
      (h) =>
        `<li data-depth="${h.depth}"><a href="#${escapeAttr(h.id)}">${escapeHtml(h.text)}</a></li>`,
    )
    .join("")}</ol>
</nav>`
      : "";

  const siblings = plugins.map((p) => {
    const members = membersOf(model, p).filter((m) => m.key !== item.key);
    return `<div class="side-block">
  <h2>Also in ${escapeHtml(p.name)}</h2>
  <p>${escapeHtml(countsOf(model, membersOf(model, p)))} in the bundle.</p>
  ${sideList(registry.site, members.slice(0, 6), {
    href: pluginUrl(registry.site, p.name),
    label: members.length > 6 ? `All ${members.length + 1} items` : "View the plugin",
  })}
</div>`;
  });

  const related = relatedItems(model, item);
  const ofType = model.items.filter((i) => i.type === item.type);
  const index = ofType.findIndex((i) => i.key === item.key);
  const prev = ofType[(index - 1 + ofType.length) % ofType.length] ?? item;
  const next = ofType[(index + 1) % ofType.length] ?? item;

  const main = `        <article class="doc" data-type="${item.type}">
          <header class="doc-head">
            <p class="doc-kind"><span class="pill" data-type="${item.type}"><span class="dot" aria-hidden="true"></span>${escapeHtml(type.noun)}</span> <span>in <a href="/?category=${encodeURIComponent(item.category)}">${escapeHtml(item.category)}</a></span></p>
            <h1><code>${escapeHtml(item.name)}</code></h1>
            ${showTitle ? `<p class="doc-title">${escapeHtml(item.title)}</p>` : ""}
            <p class="lede">${escapeHtml(item.description)}</p>
            ${facts ? `<dl class="doc-facts">${facts}</dl>` : ""}
          </header>
          <div class="doc-layout">
            <div class="doc-main">
              <h2 id="install">Install</h2>
              <div class="install-ways">
${pluginWay}
${singleWay}
              </div>
              ${hookNote}
              <h3 id="files-installed">Files installed</h3>
              <ul class="targets">${item.targets.map((t) => `<li><code>${escapeHtml(t)}</code></li>`).join("")}</ul>
              <h2 id="contents">What it does</h2>
              <div class="prose">
${body}
              </div>
              <p class="note">This is the ${escapeHtml(type.noun.toLowerCase())} as installed, rendered from <a href="${escapeAttr(item.docs)}" rel="noopener">its source on GitHub</a>. <a href="index.md">Read it as Markdown</a>.</p>
              ${related.length > 0 ? `<h2 id="related">More in ${escapeHtml(item.category)}</h2>${itemList(registry.site, related)}` : ""}
              <nav class="pager" aria-label="More ${escapeAttr(type.label.toLowerCase())}">
                <a rel="prev" href="${escapeAttr(itemUrl(registry.site, prev))}"><small>Previous ${escapeHtml(type.noun.toLowerCase())}</small><code>${escapeHtml(prev.name)}</code></a>
                <a rel="next" href="${escapeAttr(itemUrl(registry.site, next))}"><small>Next ${escapeHtml(type.noun.toLowerCase())}</small><code>${escapeHtml(next.name)}</code></a>
              </nav>
            </div>
            <aside class="doc-side">
              <div class="side-block">
                <h2>Quick install</h2>
                ${commandBlock(firstPlugin ? `/plugin install ${firstPlugin.name}@${registry.name}` : shadcn)}
                <p>${firstPlugin ? `After <code>/plugin marketplace add ${escapeHtml(registry.owner)}</code>.` : "From your project root."}</p>
              </div>
              ${toc}
              ${siblings.join("\n")}
              <div class="side-block">
                <h2>Links</h2>
                <ul class="side-list">
                  <li><a href="${escapeAttr(item.docs)}" rel="noopener">Source on GitHub</a></li>
                  <li><a href="index.md">Markdown</a></li>
                  <li><a href="/?type=${encodeURIComponent(item.type)}">All ${escapeHtml(type.label.toLowerCase())}</a></li>
                </ul>
              </div>
            </aside>
          </div>
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
          item: `${registry.site}/?type=${item.type}`,
        },
        { "@type": "ListItem", position: 3, name: item.name, item: url },
      ],
    },
    websiteNode(registry),
  ];

  return layout(registry, {
    title,
    description,
    canonical: url,
    ogType: "article",
    graph,
    breadcrumb: [
      [registry.name, "/"],
      [type.label, `/?type=${item.type}`],
      [item.name, url],
    ],
    section: "catalog",
    main,
    alternateMarkdown: "index.md",
  });
}

/* Plugin page ---------------------------------------------------------------- */

function buildPluginPage(model: PageModel, plugin: PagePlugin): string {
  const { registry } = model;
  const url = pluginUrl(registry.site, plugin.name);
  const members = membersOf(model, plugin);
  const byType = model.types
    .map((type) => ({ type, items: members.filter((item) => item.type === type.type) }))
    .filter((group) => group.items.length > 0);
  const title = `${plugin.name} plugin for Claude Code | ${registry.name}`;
  const description = metaDescription(plugin.description);
  const others = model.plugins.filter((p) => p.name !== plugin.name);

  const main = `        <article class="doc" data-type="plugin">
          <header class="doc-head">
            <p class="doc-kind"><span class="pill" data-type="plugin"><span class="dot" aria-hidden="true"></span>Plugin</span> <span>${escapeHtml(plugin.category)}</span> <span>·</span> <span>${escapeHtml(countsOf(model, members))}</span></p>
            <h1><code>${escapeHtml(plugin.name)}</code></h1>
            <p class="lede">${escapeHtml(plugin.description)}</p>
            ${plugin.keywords.length > 0 ? `<p class="doc-keywords">${plugin.keywords.map((k) => `<span>${escapeHtml(k)}</span>`).join("")}</p>` : ""}
          </header>
          <div class="doc-layout">
            <div class="doc-main">
              <h2 id="install">Install</h2>
              <p>Add the marketplace once, then install the bundle. Claude Code namespaces its commands (<code>/${escapeHtml(plugin.name)}:name</code>), wires any hooks, and updates it with <code>/plugin marketplace update ${escapeHtml(registry.name)}</code>.</p>
              <div class="command-stack" style="margin-top:0.75rem">
                ${commandBlock(`/plugin marketplace add ${registry.owner}`)}
                ${commandBlock(`/plugin install ${plugin.name}@${registry.name}`)}
              </div>
              <h2 id="contents">What you get</h2>
${byType
  .map(
    (group) =>
      `              <h3 id="${group.type.type}s">${escapeHtml(group.type.label)} <span class="n">(${group.items.length})</span></h3>${itemList(registry.site, group.items)}`,
  )
  .join("\n")}
            </div>
            <aside class="doc-side">
              <div class="side-block">
                <h2>Quick install</h2>
                ${commandBlock(`/plugin install ${plugin.name}@${registry.name}`)}
                <p>After <code>/plugin marketplace add ${escapeHtml(registry.owner)}</code>.</p>
              </div>
              <nav class="side-block toc" aria-label="On this page">
                <h2>On this page</h2>
                <ol><li><a href="#install">Install</a></li>${byType.map((g) => `<li data-depth="3"><a href="#${g.type.type}s">${escapeHtml(g.type.label)}</a></li>`).join("")}</ol>
              </nav>
              <div class="side-block">
                <h2>Other plugins</h2>
                <ul class="side-list">${others
                  .slice(0, 8)
                  .map(
                    (p) =>
                      `<li data-type="plugin"><a href="${escapeAttr(pluginUrl(registry.site, p.name))}"><span class="dot" aria-hidden="true"></span><code>${escapeHtml(p.name)}</code></a></li>`,
                  )
                  .join(
                    "",
                  )}<li><a class="more" href="/plugins/">All ${model.plugins.length} plugins</a></li></ul>
              </div>
              <div class="side-block">
                <h2>Links</h2>
                <ul class="side-list">
                  <li><a href="${escapeAttr(`${registry.homepage}/tree/main/.claude-plugin/plugins/${plugin.name}`)}" rel="noopener">Plugin tree on GitHub</a></li>
                  <li><a href="/?plugin=${encodeURIComponent(plugin.name)}">Filter the catalog</a></li>
                </ul>
              </div>
            </aside>
          </div>
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
        { "@type": "ListItem", position: 2, name: "Plugins", item: `${registry.site}/plugins/` },
        { "@type": "ListItem", position: 3, name: plugin.name, item: url },
      ],
    },
    websiteNode(registry),
  ];

  return layout(registry, {
    title,
    description,
    canonical: url,
    ogType: "website",
    graph,
    breadcrumb: [
      [registry.name, "/"],
      ["Plugins", "/plugins/"],
      [plugin.name, url],
    ],
    section: "plugins",
    main,
  });
}

/* Plugins index ------------------------------------------------------------ */

function pluginCard(model: PageModel, plugin: PagePlugin, featured: boolean): string {
  const { registry } = model;
  const members = membersOf(model, plugin);
  const shown = members.slice(0, 6);
  return `          <li class="card${featured ? " card--featured" : ""}" data-type="plugin">
            <div class="card-head">
              <h3><a href="${escapeAttr(pluginUrl(registry.site, plugin.name))}">${escapeHtml(plugin.name)}</a></h3>
              <span class="card-counts">${escapeHtml(countsOf(model, members))}</span>
            </div>
            <p class="card-desc">${escapeHtml(plugin.description)}</p>
            ${commandBlock(`/plugin install ${plugin.name}@${registry.name}`)}
            <ul class="card-items" aria-label="Items in ${escapeAttr(plugin.name)}">${shown
              .map(
                (m) =>
                  `<li data-type="${m.type}"><a href="${escapeAttr(itemUrl(registry.site, m))}"><span class="dot" aria-hidden="true"></span>${escapeHtml(m.name)}</a></li>`,
              )
              .join(
                "",
              )}${members.length > shown.length ? `<li><span>+${members.length - shown.length} more</span></li>` : ""}</ul>
            <p class="card-foot"><a href="${escapeAttr(pluginUrl(registry.site, plugin.name))}">Everything in ${escapeHtml(plugin.name)}</a></p>
          </li>`;
}

function buildPluginsIndex(model: PageModel): string {
  const { registry } = model;
  const url = `${registry.site}/plugins/`;
  const starters = STARTER_PLUGINS.map((n) => model.plugins.find((p) => p.name === n)).filter(
    (p): p is PagePlugin => p !== undefined,
  );
  const starterNames = new Set(starters.map((p) => p.name));
  const rest = model.plugins.filter((p) => !starterNames.has(p.name));
  const description = `${model.plugins.length} Claude Code plugins from the ${registry.name} marketplace: bundles of skills, agents, commands and hooks installed with one command.`;

  const main = `        <section class="hero" style="padding-left:0;padding-right:0">
          <h1>Plugins</h1>
          <p class="lede">A plugin is a bundle of related items that Claude Code manages for you: one command installs it, hooks activate on install, commands are namespaced, and <code>/plugin marketplace update ${escapeHtml(registry.name)}</code> keeps every bundle current.</p>
          <div class="hero-actions">
            ${commandBlock(`/plugin marketplace add ${registry.owner}`)}
            <p class="hint">Run once, then any <code>/plugin install</code> below works.</p>
          </div>
        </section>
        ${
          starters.length > 0
            ? `<section class="section" aria-labelledby="start-here">
          <div class="section-head"><h2 id="start-here">Start here</h2><p class="lede">Three bundles that cover most engineering sessions: a workflow, version control, and the hooks that block the dangerous commands.</p></div>
          <ol class="grid">
${starters.map((p) => pluginCard(model, p, true)).join("\n")}
          </ol>
        </section>`
            : ""
        }
        <section class="section" aria-labelledby="all-plugins">
          <div class="section-head"><h2 id="all-plugins">${starters.length > 0 ? "Everything else" : "All plugins"}</h2><p class="lede">${rest.length} more bundles, from academic writing to single-hook plugins you can install on their own.</p></div>
          <ol class="grid">
${rest.map((p) => pluginCard(model, p, false)).join("\n")}
          </ol>
        </section>`;

  const graph: unknown[] = [
    {
      "@type": "CollectionPage",
      "@id": url,
      url,
      name: "Plugins",
      description,
      isPartOf: { "@id": `${registry.site}/#website` },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: model.plugins.length,
        itemListElement: model.plugins.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.name,
          url: pluginUrl(registry.site, p.name),
        })),
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: registry.name, item: `${registry.site}/` },
        { "@type": "ListItem", position: 2, name: "Plugins", item: url },
      ],
    },
    websiteNode(registry),
  ];

  return layout(registry, {
    title: `Plugins for Claude Code | ${registry.name}`,
    description,
    canonical: url,
    ogType: "website",
    graph,
    breadcrumb: [
      [registry.name, "/"],
      ["Plugins", url],
    ],
    section: "plugins",
    main,
  });
}

/* Install guide --------------------------------------------------------------- */

function buildInstallPage(model: PageModel): string {
  const { registry } = model;
  const url = `${registry.site}/install/`;
  const starters = STARTER_PLUGINS.filter((n) => model.plugins.some((p) => p.name === n));
  const exampleItem = model.items.find((i) => i.type === "skill") ?? model.items[0];
  const exampleCommand = model.items.find((i) => i.type === "command");
  const description = `How to install ${registry.name} items into Claude Code: as plugins from the marketplace, or one at a time with the shadcn CLI, and what a skill, agent, command and hook each do.`;

  const main = `        <section class="hero" style="padding-left:0;padding-right:0">
          <h1>Install</h1>
          <p class="lede">Two routes into the same files. A plugin is the easy way and keeps itself updated; a single item is the surgical way when you want one thing in one project.</p>
        </section>

        <section class="section" aria-labelledby="ways">
          <div class="section-head"><h2 id="ways">Two ways in</h2></div>
          <div class="ways">
            <article class="card">
              <h3>As a plugin</h3>
              <p>Bundles of related items managed by Claude Code. Hooks activate on install, commands are namespaced (<code>/security:security-audit</code>), and one command updates everything.</p>
              <ol class="steps">
                <li><div>Add the marketplace once, inside a Claude Code session.${commandBlock(`/plugin marketplace add ${registry.owner}`)}</div></li>
                <li><div>Install a bundle.${commandBlock(`/plugin install ${starters[0] ?? model.plugins[0]?.name ?? "engineering"}@${registry.name}`)}</div></li>
                <li><div>Later, pull every update at once.${commandBlock(`/plugin marketplace update ${registry.name}`)}</div></li>
              </ol>
              <p>A good starter set is ${starters.map((n) => `<a href="/plugins/${n}/"><strong>${escapeHtml(n)}</strong></a>`).join(", ")}.</p>
            </article>
            <article class="card">
              <h3>As a single item</h3>
              <p>The shadcn CLI copies one item into the project you run it from, under <code>.claude/</code>. Nothing else is touched, and nothing updates itself.</p>
              <ol class="steps">
                <li><div>From the project root, add the item by name.${commandBlock(`npx shadcn@latest add ${registry.owner}/${exampleItem?.name ?? "handoff"}`)}</div></li>
                <li><div>To make it global, move it from <code>.claude/</code> into <code>~/.claude/</code>: folders for skills and hooks, single files for agents and commands.</div></li>
                <li><div>A hook installed this way still needs its documented block in <code>.claude/settings.json</code>; each hook's page shows it.</div></li>
              </ol>
            </article>
          </div>
        </section>

        <section class="section" aria-labelledby="which">
          <div class="section-head"><h2 id="which">Which should I pick?</h2></div>
          <table class="compare">
            <thead><tr><th scope="col"></th><th scope="col">Plugin</th><th scope="col">Single item</th></tr></thead>
            <tbody>
              <tr><th scope="row">Scope</th><td>Everything in the bundle, in every project</td><td>One item, in one project</td></tr>
              <tr><th scope="row">Updates</th><td>One command updates all installed bundles</td><td>Run the add command again to refresh</td></tr>
              <tr><th scope="row">Hooks</th><td>Wired on install</td><td>Add the settings block yourself</td></tr>
              <tr><th scope="row">Commands</th><td>Namespaced: <code>/${escapeHtml(model.plugins[0]?.name ?? "engineering")}:${escapeHtml(exampleCommand?.name ?? "name")}</code></td><td>Plain: <code>/${escapeHtml(exampleCommand?.name ?? "name")}</code></td></tr>
              <tr><th scope="row">Where the files go</th><td>Claude Code's plugin cache</td><td><code>.claude/</code> in the project, visible in git</td></tr>
              <tr><th scope="row">Best for</th><td>Your own machine, a whole workflow</td><td>A shared repository, one specific need</td></tr>
            </tbody>
          </table>
        </section>

        <section class="section" aria-labelledby="types">
          <div class="section-head"><h2 id="types">What each type is</h2><p class="lede">Four kinds of file, four ways Claude reaches them.</p></div>
          <div class="types">
${model.types
  .map(
    (t) => `            <article class="card" data-type="${t.type}">
              <h3><span class="dot" aria-hidden="true"></span>${escapeHtml(t.noun)}</h3>
              <p>${escapeHtml(TYPE_EXPLAINERS[t.type] ?? "")}</p>
              <p>Installs to <code>${escapeHtml(t.targetBase)}/${t.layout === "folder" ? "&lt;name&gt;/" : "&lt;name&gt;.md"}</code></p>
              <a href="/?type=${t.type}">Browse ${t.count} ${escapeHtml(t.label.toLowerCase())}</a>
            </article>`,
  )
  .join("\n")}
          </div>
        </section>

        <section class="section" aria-labelledby="faq">
          <div class="section-head"><h2 id="faq">Questions</h2></div>
          <div class="faq">
            <details><summary>Is it safe to install?</summary><div><p>Every item is a Markdown file you can read before you trust it: open any item's page and the full text is there, or read it on GitHub. Hooks are small standalone scripts with no dependencies; each hook's page shows exactly what it blocks and allows.</p></div></details>
            <details><summary>Can I install a plugin for one project only?</summary><div><p>Plugins live in Claude Code's own config and apply wherever you run it. For one project, install the items you want as single items so they sit in that repository's <code>.claude/</code> folder.</p></div></details>
            <details><summary>How do I remove something?</summary><div><p>A plugin: <code>/plugin uninstall name@${escapeHtml(registry.name)}</code>. A single item: delete its file or folder under <code>.claude/</code>, and for a hook remove its block from <code>settings.json</code>.</p></div></details>
            <details><summary>Does the shadcn CLI need a React project?</summary><div><p>No. The registry format is shadcn's, but the items are plain files; the CLI only copies them into place. Any folder works as the project root.</p></div></details>
            <details><summary>Can I use these with other agents?</summary><div><p>Skills are plain Markdown with a description and instructions, so most agents that read a skills folder can use them. Hooks, agents and commands follow Claude Code's conventions.</p></div></details>
          </div>
        </section>`;

  const graph: unknown[] = [
    {
      "@type": "HowTo",
      "@id": url,
      name: `Install ${registry.name} items into Claude Code`,
      description,
      step: [
        {
          "@type": "HowToStep",
          name: "Add the marketplace",
          text: `/plugin marketplace add ${registry.owner}`,
        },
        {
          "@type": "HowToStep",
          name: "Install a plugin",
          text: `/plugin install ${starters[0] ?? "engineering"}@${registry.name}`,
        },
        {
          "@type": "HowToStep",
          name: "Or add a single item",
          text: `npx shadcn@latest add ${registry.owner}/${exampleItem?.name ?? "handoff"}`,
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: registry.name, item: `${registry.site}/` },
        { "@type": "ListItem", position: 2, name: "Install", item: url },
      ],
    },
    websiteNode(registry),
  ];

  return layout(registry, {
    title: `Install Claude Code extensions | ${registry.name}`,
    description,
    canonical: url,
    ogType: "website",
    graph,
    breadcrumb: [
      [registry.name, "/"],
      ["Install", url],
    ],
    section: "install",
    main,
  });
}

/* Sitemap and llms-full ------------------------------------------------------ */

function buildSitemap(model: PageModel): string {
  const { registry } = model;
  const urls = [
    `${registry.site}/`,
    `${registry.site}/plugins/`,
    `${registry.site}/install/`,
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
  out.push({ path: join(siteDir, "plugins", "index.html"), content: buildPluginsIndex(model) });
  out.push({ path: join(siteDir, "install", "index.html"), content: buildInstallPage(model) });
  out.push({ path: join(siteDir, "sitemap.xml"), content: buildSitemap(model) });
  out.push({ path: join(siteDir, "llms-full.txt"), content: buildLlmsFull(model, sources) });
  return out;
}
