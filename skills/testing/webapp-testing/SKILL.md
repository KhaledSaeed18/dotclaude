---
name: webapp-testing
description: Verify a web application works correctly in a real browser using Playwright. Covers page navigation, form submission, user interactions, console error detection, screenshot capture, and responsive layout checking. Use when you need to confirm a UI feature actually works end-to-end, catch regressions after a change, verify a form flow completes, or check that the page is free of console errors. Requires Node.js; installs Playwright if not already present.
---

Test the application in a real browser rather than claiming it works from a code read alone. A passing type-check or unit test does not mean the page renders, the form submits, or the network request succeeds. Run the app, drive it with Playwright, and report what actually happened.

## Step 1: Check for Playwright and a running app

```bash
# Check if Playwright is installed
npx playwright --version 2>/dev/null || echo "not installed"

# Check if there is an existing Playwright config
ls playwright.config.ts playwright.config.js 2>/dev/null
```

If Playwright is not installed, install it:

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

Check whether the dev server is already running. If not, start it before writing tests. Use the project's start script - check `package.json` for the correct command (`npm run dev`, `npm start`, etc.). The server must be running for Playwright to connect.

## Step 2: Identify what to verify

Before writing any test, state the scenario in plain terms:

- What page or URL does the scenario start from?
- What actions does the user take? (navigate, click, type, submit, wait)
- What is the expected outcome? (page title changes, element appears, URL changes, form resets, API call completes)
- Are there any states to verify along the way? (loading indicator, validation message, success confirmation)

If the user has not specified a scenario, default to: navigate to the app's root, confirm it loads without console errors, and take a screenshot.

## Step 3: Write the Playwright script

Write a focused script that tests the specified scenario. Keep each script to one scenario.

```typescript
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();

// Collect console errors throughout the session
const consoleErrors: string[] = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

// Collect failed network requests
const networkErrors: string[] = [];
page.on("requestfailed", (request) => {
  networkErrors.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
});

try {
  // Navigate and wait for the page to be ready
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

  // Take a screenshot of the initial state
  await page.screenshot({ path: "screenshot-initial.png", fullPage: true });

  // Example: verify a heading is present
  const heading = await page.locator("h1").first().textContent();
  console.log(`Page heading: ${heading}`);

  // Example: fill and submit a form
  // await page.fill('[name="email"]', 'test@example.com');
  // await page.fill('[name="password"]', 'test-password');
  // await page.click('[type="submit"]');
  // await page.waitForURL('**/dashboard');

  // Take a final screenshot
  await page.screenshot({ path: "screenshot-final.png", fullPage: true });

  console.log("Console errors:", consoleErrors.length === 0 ? "none" : consoleErrors);
  console.log("Network errors:", networkErrors.length === 0 ? "none" : networkErrors);
} finally {
  await browser.close();
}
```

Adapt the script to the actual scenario. Replace the example interactions with the specific steps needed.

## Step 4: Interaction patterns

Use these patterns for common UI actions:

**Waiting correctly:**
```typescript
// Wait for a specific element to appear (not arbitrary sleep)
await page.waitForSelector(".success-message", { state: "visible" });

// Wait for navigation
await page.waitForURL("**/dashboard");

// Wait for a network request to complete
await page.waitForResponse((resp) => resp.url().includes("/api/login") && resp.status() === 200);
```

**Forms:**
```typescript
await page.fill('[name="email"]', "user@example.com");
await page.selectOption("select#country", "US");
await page.check('[name="terms"]');
await page.click('[type="submit"]');
```

**Responsive layout:**
```typescript
// Mobile viewport
await page.setViewportSize({ width: 375, height: 812 });
await page.screenshot({ path: "screenshot-mobile.png" });

// Tablet
await page.setViewportSize({ width: 768, height: 1024 });
await page.screenshot({ path: "screenshot-tablet.png" });
```

**Checking visibility and content:**
```typescript
const isVisible = await page.locator(".error-banner").isVisible();
const text = await page.locator(".status-message").textContent();
const count = await page.locator(".list-item").count();
```

## Step 5: Run and report

```bash
npx ts-node test-scenario.ts
# or if using @playwright/test:
npx playwright test
```

Report the outcome as:

**Passed:** what was verified (page loaded, form submitted, URL changed, specific elements present), the screenshot paths, and the console/network error counts.

**Failed:** the exact step that failed, the error message, what the page looked like at failure (screenshot path), any console errors collected, and any failed network requests.

Do not report "the test ran" as success. Report what was actually observed: the page title, the presence or absence of specific elements, whether the expected URL was reached, and whether any console errors fired.

## Common failure patterns to check

- **Hydration errors:** React/Next.js console errors starting with "Hydration failed" or "Text content did not match"
- **Missing environment variables:** `undefined` values appearing in rendered output where a URL or key should be
- **Network failures:** API calls returning 401, 404, or 500 visible in the network error list
- **Layout breaking at mobile widths:** elements overlapping or overflowing at 375px
- **Form validation not triggering:** submit button reachable without filling required fields
