---
name: accessibility-audit
description: Audit UI code or a running page against WCAG 2.2 AA, covering semantics, keyboard access, focus management, labels, contrast, ARIA misuse, and motion, verifying in a real browser with axe-core when one is available and by code review when not. Produces findings ranked by user impact with concrete fixes. Use when building or reviewing UI components, before shipping user-facing pages, or when accessibility compliance is required.
---

Audit for the users who hit the wall, not for the checklist: someone on a keyboard who cannot reach the button, a screen-reader user who hears "button button", a low-vision user who cannot read grey-on-white hints. Automated checks catch at most a third of real barriers; the rest come from reading the code and walking the flows. Prefer fixing semantics over adding ARIA; the first rule of ARIA is not to use it when native HTML already does the job.

## Step 1: Scope and method

Identify what is being audited (components in a diff, a page, a whole flow) and pick the method:

- **Running app available:** audit in the browser. Use the `webapp-testing` skill's Playwright setup and inject axe-core for the automated pass, then do the manual keyboard walk below.
- **Code only:** review the markup and interaction logic directly. State that contrast and reading-order findings are provisional until seen rendered.

For the automated pass with Playwright:

```js
await page.goto(url);
await page.addScriptTag({ url: "https://cdn.jsdelivr.net/npm/axe-core@4/axe.min.js" });
const results = await page.evaluate(() => axe.run());
// results.violations: id, impact, nodes[].html, nodes[].target
```

Treat axe output as a floor, not the audit.

## Step 2: The manual pass

Work through these in order of user impact:

**Keyboard**
- Every interactive element reachable with Tab, operable with Enter/Space, in an order that follows the visual flow. No focus traps except intentional ones (modals) that also release on Escape.
- Focus visible at every stop (WCAG 2.2 requires it not be fully obscured). No `outline: none` without a replacement.
- After actions that move context (opening a modal, deleting a list item, route change in a SPA): focus is placed deliberately, not dropped to `<body>`.

**Semantics and names**
- Native elements for native jobs: `<button>` not `<div onClick>`, `<a href>` for navigation, `<label for>` on every form control. A clickable div needs role, tabindex, and key handlers to equal a button; flag it and recommend the element instead.
- Every control has an accessible name that matches its visible label; icon-only buttons have `aria-label`. Images: informative ones have real `alt`, decorative ones have `alt=""`.
- Headings form an outline (one `h1`, no skipped levels used for styling). Landmarks (`main`, `nav`) present once each.

**ARIA misuse** (the most common class of introduced bugs)
- No redundant roles (`role="button"` on `<button>`), no invalid parent/child combos (`role="tab"` outside a tablist), no `aria-hidden="true"` on focusable content.
- State conveyed both visually and programmatically: `aria-expanded` on disclosure triggers, `aria-current` on active nav, `aria-invalid` plus an error message linked with `aria-describedby` on failed fields.
- Live updates that matter (async errors, toasts, cart counts) announced via a live region; silent visual-only feedback flagged.

**Visual**
- Text contrast 4.5:1 (3:1 for large text), interactive component boundaries 3:1. Check the greys: placeholder text, disabled-looking-but-enabled buttons, hint text are the usual failures.
- Nothing conveyed by color alone (error = red border only). Content reflows at 320px width / 200% zoom without loss.
- WCAG 2.2 additions: pointer targets at least 24x24 CSS px (or spaced equivalently); no interaction requires dragging without a click alternative.

**Motion and time**
- Animations respect `prefers-reduced-motion`. Auto-advancing carousels/toasts are pausable or long enough to read. No content flashes more than three times per second.

## Step 3: Report

Rank findings by user impact: blockers (cannot complete the task at all: unreachable control, trap, unlabeled form) first, then serious (task completable with difficulty), then moderate/polish. For each: the element (selector or file:line), who it fails and how, the WCAG criterion, and the exact fix as code, not advice. Separate "verified in browser" from "found by review, verify rendered". End with the two or three highest-leverage systemic fixes (e.g. "the shared Button component takes an icon without requiring a label prop") rather than only the instance list.
