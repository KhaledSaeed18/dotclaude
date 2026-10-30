import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

type Data = {
  types: Array<{ type: string; label: string; count: number }>;
  plugins: Array<{ name: string; items: string[] }>;
  items: Array<{ key: string; name: string; type: string; category: string; plugins: string[] }>;
};

const data: Data = JSON.parse(readFileSync("site/data.json", "utf8"));
const total = data.items.length;

/** Rows the app rendered (the pre-rendered list is hidden once it boots). */
const rows = (page: Page) => page.locator("#groups .row-link");

async function ready(page: Page) {
  await expect(page.locator("body")).toHaveAttribute("data-ready", "");
}

test.describe("catalog", () => {
  test("lists every item, grouped by category, with the live count", async ({ page }) => {
    await page.goto("/");
    await ready(page);
    await expect(page.locator("#summary")).toHaveText(`${total} items`);
    await expect(rows(page)).toHaveCount(total);
    const categories = [...new Set(data.items.map((i) => i.category))].length;
    await expect(page.locator("#groups .group-head")).toHaveCount(categories);
    // Every row links to the item's own page.
    const first = rows(page).first();
    await expect(first).toHaveAttribute("href", /^\/(skill|agent|command|hook)\/[a-z0-9-]+\/$/);
  });

  test("works without JavaScript: the pre-rendered rows are the whole catalog", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("#rows .row-link")).toHaveCount(total);
    await expect(page.locator("h1")).toContainText("Claude Code extensions");
    await context.close();
  });

  test("search ranks name matches first and keeps the query in the URL", async ({ page }) => {
    await page.goto("/");
    await ready(page);
    await page.locator("#search").fill("review");
    await expect(page).toHaveURL(/\?q=review$/);
    const names = await rows(page).locator(".row-name").allTextContents();
    expect(names.length).toBeGreaterThan(0);
    expect(names[0]?.toLowerCase()).toContain("review");
    // Ranked results are one flat list, not grouped.
    await expect(page.locator("#groups .group-head")).toHaveCount(0);
    await expect(page.locator("#summary")).toHaveText(new RegExp(`^\\d+ of ${total} items$`));
    await expect(page.locator("mark").first()).toBeVisible();
  });

  test("a query in the URL is applied on load", async ({ page }) => {
    await page.goto("/?q=citation&type=hook");
    await ready(page);
    await expect(page.locator("#search")).toHaveValue("citation");
    await expect(page.locator("#filter-type button[aria-pressed='true']")).toHaveAttribute(
      "data-value",
      "hook",
    );
    const types = await rows(page).evaluateAll((els) =>
      els.map((e) => e.getAttribute("data-type")),
    );
    expect(types.every((t) => t === "hook")).toBe(true);
  });

  test("the type tabs, category and plugin selects filter and compose", async ({ page }) => {
    await page.goto("/");
    await ready(page);
    const skills = data.types.find((t) => t.type === "skill")?.count ?? 0;
    await page.locator("#filter-type button[data-value='skill']").click();
    await expect(page).toHaveURL(/\?type=skill$/);
    await expect(rows(page)).toHaveCount(skills);

    const category = data.items.find((i) => i.type === "skill")?.category ?? "";
    await page.locator("#filter-category").selectOption(category);
    const expected = data.items.filter((i) => i.type === "skill" && i.category === category).length;
    await expect(rows(page)).toHaveCount(expected);
    await expect(page).toHaveURL(new RegExp(`type=skill&category=${category}`));

    // Counts in the other controls answer "what if I picked this instead".
    const all = page.locator("#filter-type button[data-value='']");
    const inCategory = data.items.filter((i) => i.category === category).length;
    await expect(all.locator(".n")).toHaveText(String(inCategory));

    await page.locator("#clear").click();
    await expect(page).toHaveURL(/\/$/);
    await expect(rows(page)).toHaveCount(total);
  });

  test("filtering by plugin shows exactly that plugin's items", async ({ page }) => {
    const plugin = data.plugins[0];
    if (!plugin) test.skip();
    await page.goto(`/?plugin=${plugin?.name}`);
    await ready(page);
    await expect(rows(page)).toHaveCount(plugin?.items.length ?? 0);
  });

  test("sorting by name flattens the groups; by type groups by type", async ({ page }) => {
    await page.goto("/");
    await ready(page);
    await page.locator("#sort").selectOption("name");
    await expect(page).toHaveURL(/sort=name$/);
    await expect(page.locator("#groups .group-head")).toHaveCount(0);
    const names = await rows(page).locator(".row-name").allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

    await page.locator("#sort").selectOption("type");
    const present = data.types.filter((t) => t.count > 0).length;
    await expect(page.locator("#groups .group-head")).toHaveCount(present);
  });

  test("nothing matching shows the empty state with a working reset", async ({ page }) => {
    await page.goto("/?q=zzzz-no-such-item");
    await ready(page);
    await expect(page.locator("#empty")).toBeVisible();
    await page.locator("#empty-reset").click();
    await expect(page.locator("#empty")).toBeHidden();
    await expect(rows(page)).toHaveCount(total);
  });

  test("keyboard: slash focuses search, arrows walk the rows, escape clears", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "no hardware keyboard on the phone profile");
    await page.goto("/");
    await ready(page);
    await page.keyboard.press("/");
    await expect(page.locator("#search")).toBeFocused();
    await page.keyboard.type("git");
    await page.keyboard.press("ArrowDown");
    await expect(rows(page).first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(rows(page).nth(1)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await expect(page.locator("#search")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator("#search")).toHaveValue("");
    await expect(page).toHaveURL(/\/$/);
  });

  test("back and forward restore earlier filters", async ({ page }) => {
    await page.goto("/");
    await ready(page);
    await page.locator("#filter-type button[data-value='agent']").click();
    await page.locator("#filter-type button[data-value='hook']").click();
    await page.goBack();
    await expect(page.locator("#filter-type button[aria-pressed='true']")).toHaveAttribute(
      "data-value",
      "agent",
    );
    await page.goForward();
    await expect(page.locator("#filter-type button[aria-pressed='true']")).toHaveAttribute(
      "data-value",
      "hook",
    );
  });
});

test.describe("legacy hash links", () => {
  test("an old item deep link opens the item's page", async ({ page }) => {
    const item = data.items[0];
    await page.goto(`/#/${item?.key}`);
    await expect(page).toHaveURL(new RegExp(`/${item?.key}/$`));
    await expect(page.locator("h1")).toHaveText(item?.name ?? "");
  });

  test("old section hashes go to their pages and old filters to the query", async ({ page }) => {
    await page.goto("/#/plugins");
    await expect(page).toHaveURL(/\/plugins\/$/);
    await page.goto("/#/install");
    await expect(page).toHaveURL(/\/install\/$/);
    await page.goto("/#/?type=hook&q=guard");
    await expect(page).toHaveURL(/\/\?type=hook&q=guard$/);
    await ready(page);
    await expect(page.locator("#search")).toHaveValue("guard");
  });
});

test.describe("chrome", () => {
  test("copy buttons write the command to the clipboard", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are chromium-only in tests");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    const block = page.locator(".hero .command").first();
    await block.locator(".copy").click();
    await expect(block.locator(".copy")).toHaveText("Copied");
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toBe("/plugin marketplace add KhaledSaeed18/dotclaude");
  });

  test("the theme toggle switches and persists", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const toggle = page.locator(".theme-toggle");
    if (await page.locator(".menu-toggle").isVisible()) await page.locator(".menu-toggle").click();
    const before = (await html.getAttribute("data-theme")) ?? "";
    await toggle.click();
    const after = await html.getAttribute("data-theme");
    expect(after).toMatch(/^(light|dark)$/);
    expect(after).not.toBe(before);
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", after ?? "");
  });

  test("the menu opens on small screens and closes with escape", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the menu button only exists on narrow viewports");
    await page.goto("/");
    const toggle = page.locator(".menu-toggle");
    await expect(toggle).toBeVisible();
    await expect(page.locator("#site-nav")).toBeHidden();
    await toggle.click();
    await expect(page.locator("#site-nav")).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(page.locator("#site-nav")).toBeHidden();
  });

  test("no page logs a console error", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    for (const url of ["/", "/plugins/", "/install/", `/${data.items[0]?.key}/`, "/404.html"]) {
      await page.goto(url);
    }
    expect(errors).toEqual([]);
  });
});

test.describe("item page", () => {
  const item = data.items.find((i) => i.plugins.length > 0) ?? data.items[0];

  test("shows both install routes, the files, the contents and its siblings", async ({ page }) => {
    await page.goto(`/${item?.key}/`);
    await expect(page.locator("h1")).toHaveText(item?.name ?? "");
    await expect(page.locator(".install-way")).toHaveCount(2);
    await expect(page.locator(".install-way .command")).toContainText([
      "/plugin marketplace add KhaledSaeed18/dotclaude",
    ]);
    await expect(page.locator(".targets li").first()).toContainText(".claude/");
    await expect(page.locator(".prose")).toBeVisible();
    await expect(page.locator(".pager a[rel='prev']")).toBeVisible();
    await expect(page.locator(".pager a[rel='next']")).toBeVisible();
    // Breadcrumb filter links use the query, not the old hash.
    await expect(page.locator(".breadcrumb a").nth(1)).toHaveAttribute("href", /^\/\?type=/);
    if (item && item.plugins.length > 0) {
      await expect(
        page.locator(".side-block", { hasText: `Also in ${item.plugins[0]}` }),
      ).toBeVisible();
    }
  });

  test("the table of contents jumps to headings in the manifest", async ({ page }) => {
    await page.goto(`/${item?.key}/`);
    const toc = page.locator(".toc a");
    if ((await toc.count()) === 0) test.skip();
    const href = (await toc.first().getAttribute("href")) ?? "";
    await expect(page.locator(href)).toHaveCount(1);
  });
});

test.describe("plugin pages", () => {
  test("the index lists every plugin as a card with an install command", async ({ page }) => {
    await page.goto("/plugins/");
    await expect(page.locator(".card")).toHaveCount(data.plugins.length);
    await expect(page.locator(".card .command").first()).toContainText("/plugin install ");
  });

  test("a plugin page lists all of its items", async ({ page }) => {
    const plugin = data.plugins[0];
    await page.goto(`/plugins/${plugin?.name}/`);
    await expect(page.locator(".doc-main .doc-list li")).toHaveCount(plugin?.items.length ?? 0);
    await expect(page.locator("h1")).toHaveText(plugin?.name ?? "");
  });

  test("the install guide has both routes, the comparison and a type explainer", async ({
    page,
  }) => {
    await page.goto("/install/");
    await expect(page.locator(".ways .card")).toHaveCount(2);
    await expect(page.locator(".compare tbody tr")).toHaveCount(6);
    await expect(page.locator(".types .card")).toHaveCount(data.types.length);
    await expect(page.locator(".faq details")).toHaveCount(5);
  });
});

test.describe("not found", () => {
  test("offers a search that lands on the catalog", async ({ page }) => {
    await page.goto("/404.html");
    await page.locator("input[name='q']").fill("hook");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/\?q=hook$/);
    await ready(page);
    await expect(page.locator("#search")).toHaveValue("hook");
  });
});
