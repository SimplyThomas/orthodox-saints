# Human-Verified Dove Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 🕊 dove icon (icon-only, no text) to saint profile pages (breadcrumb bar) and browse rows (portrait corner) to indicate a profile has been manually human-reviewed, distinct from AI-generated profiles.

**Architecture:** `humanReviewed: true` is a boolean field in individual profile YAML files. At Astro build time, `search.astro` loads the profiles Content Collection, builds a Set of human-reviewed IDs, and annotates the inlined finder JSON. `SaintView.astro` reads `profile?.humanReviewed` directly. No Python pipeline changes; no runtime fetching.

**Tech Stack:** Astro (Content Collections, Zod schema), TypeScript, Playwright (e2e tests), Vitest (unit tests), vanilla CSS.

---

## File Map

| File | Change |
|------|--------|
| `src/content.config.ts` | Add `humanReviewed: z.boolean().optional().default(false)` to `profileSchema` |
| `src/lib/types.ts` | Add `humanReviewed?: boolean` to `FinderSaint` interface |
| `src/content/profiles/OS-0021.yaml` | Add `humanReviewed: true` (Basil the Great — used as the e2e test fixture) |
| `e2e/dove-badge.spec.ts` | New file: Playwright tests for both badge surfaces |
| `src/components/SaintView.astro` | Render `.sv-verified-dove` in `.sv-back` when `profile?.humanReviewed` |
| `src/pages/search.astro` | Load profiles, build humanReviewedIds Set, annotate `finderData` before serialising |
| `src/islands/finder.client.ts` | Render `.portrait-dove` inside `.portrait` when `s.humanReviewed` |
| `src/styles/global.css` | Add `position: relative` to `.saint-row .portrait`; add `.portrait-dove` rule |

---

## Task 1: Schema and type changes

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add `humanReviewed` to the profile Zod schema**

In `src/content.config.ts`, add one line after `generated`:

```ts
    generated: z.string().optional(), // ISO date
    humanReviewed: z.boolean().optional().default(false),
```

- [ ] **Step 2: Add `humanReviewed` to `FinderSaint`**

In `src/lib/types.ts`, add after the `image` field:

```ts
  /** self-hosted real portrait (static/-relative path); absent → monogram */
  image?: string;
  /** true when a human has personally reviewed this profile */
  humanReviewed?: boolean;
```

- [ ] **Step 3: Verify no build errors**

```bash
python build.py --no-xlsx && npm run build 2>&1 | tail -20
```

Expected: build succeeds. Astro validates every profile YAML against the schema at build time — any malformed existing profile would surface here.

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts src/lib/types.ts
git commit -m "feat: add humanReviewed field to profile schema and FinderSaint type"
```

---

## Task 2: Mark test fixture saint as human-reviewed

**Files:**
- Modify: `src/content/profiles/OS-0021.yaml`

This gives Playwright tests a stable, known saint to assert against.

- [ ] **Step 1: Add `humanReviewed: true` to Basil's profile**

In `src/content/profiles/OS-0021.yaml`, add after the `status` line:

```yaml
status: reviewed
humanReviewed: true
```

- [ ] **Step 2: Commit**

```bash
git add src/content/profiles/OS-0021.yaml
git commit -m "feat: mark Basil the Great (OS-0021) as human-reviewed (e2e fixture)"
```

---

## Task 3: Write failing e2e tests

**Files:**
- Create: `e2e/dove-badge.spec.ts`

- [ ] **Step 1: Write the tests**

Create `e2e/dove-badge.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("dove badge appears in breadcrumb for human-reviewed saint page", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/"); // Basil the Great — humanReviewed: true
  await expect(page.locator(".sv-back .sv-verified-dove")).toBeVisible();
});

test("dove badge does not appear for a saint without humanReviewed profile", async ({
  page,
}) => {
  // OS-0022 (Gregory the Theologian) has a profile; humanReviewed defaults to false
  await page.goto("./saint/OS-0022/");
  await expect(page.locator(".sv-back .sv-verified-dove")).toHaveCount(0);
});

test("dove badge appears on portrait in browse results for human-reviewed saint", async ({
  page,
}) => {
  await page.goto("./search/?q=Basil+the+Great");
  // Wait for the finder island to render OS-0021's row
  await expect(
    page.locator('.saint-row[data-saint="OS-0021"]'),
  ).toBeVisible({ timeout: 5000 });
  await expect(
    page.locator('.saint-row[data-saint="OS-0021"] .portrait-dove'),
  ).toBeVisible();
});

test("portrait dove does not appear on non-human-reviewed saint in browse", async ({
  page,
}) => {
  await page.goto("./search/?q=Gregory+the+Theologian");
  await expect(
    page.locator('.saint-row[data-saint="OS-0022"]'),
  ).toBeVisible({ timeout: 5000 });
  await expect(
    page.locator('.saint-row[data-saint="OS-0022"] .portrait-dove'),
  ).toHaveCount(0);
});
```

- [ ] **Step 2: Build and run tests to confirm they all fail**

```bash
python build.py --no-xlsx && npm run build && npm test -- --grep "dove badge"
```

Expected: 4 tests fail with "locator not found" errors. (The negative tests will unexpectedly pass — that is fine; the positive tests must fail to confirm TDD baseline.)

- [ ] **Step 3: Commit the failing tests**

```bash
git add e2e/dove-badge.spec.ts
git commit -m "test: add failing e2e tests for human-verified dove badge"
```

---

## Task 4: Implement the breadcrumb dove (detail page)

**Files:**
- Modify: `src/components/SaintView.astro`

- [ ] **Step 1: Add the dove span to the breadcrumb bar**

In `src/components/SaintView.astro`, find the `.sv-back` div (around line 71). The current last element in that div is:

```astro
    <span class="sv-here">{m.honorificName}</span>
```

Add the dove immediately after it, still inside `.sv-back`:

```astro
    <span class="sv-here">{m.honorificName}</span>
    {profile?.humanReviewed && (
      <span
        class="sv-verified-dove"
        title="Reviewed by a human"
        aria-label="Reviewed by a human"
      >🕊</span>
    )}
```

- [ ] **Step 2: Add CSS for the breadcrumb dove**

The `.sv-back` element is already in `SaintView.astro`'s scoped styles or in `global.css`. Find the `.sv-back` block in `src/styles/global.css` and add a rule. Search for `.sv-back` — you'll find the block. Append:

```css
.sv-verified-dove {
  font-size: 13px;
  line-height: 1;
  opacity: 0.75;
  cursor: default;
}
```

- [ ] **Step 3: Build and run the breadcrumb tests only**

```bash
python build.py --no-xlsx && npm run build && npm test -- --grep "breadcrumb"
```

Expected: both breadcrumb tests now pass (positive: `.sv-verified-dove` is visible; negative: count is 0 for OS-0022).

- [ ] **Step 4: Commit**

```bash
git add src/components/SaintView.astro src/styles/global.css
git commit -m "feat: render dove badge in breadcrumb for human-reviewed saint profiles"
```

---

## Task 5: Implement the browse page portrait overlay

**Files:**
- Modify: `src/pages/search.astro`
- Modify: `src/islands/finder.client.ts`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Annotate finder data in `search.astro`**

In `src/pages/search.astro`, the current frontmatter block opens with:

```ts
import { FINDER_SAINTS } from "../lib/data";

const finderJson = JSON.stringify(FINDER_SAINTS).replace(/</g, "\\u003c");
const total = FINDER_SAINTS.length;
```

Replace those lines with:

```ts
import { getCollection } from "astro:content";
import { FINDER_SAINTS } from "../lib/data";

const profiles = await getCollection("profiles");
const humanReviewedIds = new Set(
  profiles
    .filter((p) => p.data.humanReviewed)
    .map((p) => p.data.id),
);
const finderData = FINDER_SAINTS.map((s) =>
  humanReviewedIds.has(s.id) ? { ...s, humanReviewed: true } : s,
);
const finderJson = JSON.stringify(finderData).replace(/</g, "\\u003c");
const total = FINDER_SAINTS.length;
```

- [ ] **Step 2: Render `.portrait-dove` in `finder.client.ts`**

In `src/islands/finder.client.ts`, find the `row()` function. The current `.portrait` div is:

```ts
        <div class="portrait">${saintAvatar(s, 58, 72, { type: primaryRank(s) })}</div>
```

Replace it with:

```ts
        <div class="portrait">${saintAvatar(s, 58, 72, { type: primaryRank(s) })}${
          s.humanReviewed
            ? '<span class="portrait-dove" title="Reviewed by a human" aria-label="Reviewed by a human">🕊</span>'
            : ""
        }</div>
```

- [ ] **Step 3: Add portrait-dove CSS to `global.css`**

Find `.saint-row .portrait` in `src/styles/global.css` (around line 988). The current rule is:

```css
.saint-row .portrait {
  flex-shrink: 0;
}
```

Add `position: relative`:

```css
.saint-row .portrait {
  flex-shrink: 0;
  position: relative;
}
```

Then add a new rule immediately after:

```css
.portrait-dove {
  position: absolute;
  bottom: -4px;
  right: -5px;
  font-size: 13px;
  background: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  line-height: 1;
  pointer-events: none;
}
```

- [ ] **Step 4: Build and run all dove badge tests**

```bash
python build.py --no-xlsx && npm run build && npm test -- --grep "dove badge"
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/search.astro src/islands/finder.client.ts src/styles/global.css
git commit -m "feat: render dove badge on portrait corner in browse results for human-reviewed saints"
```

---

## Task 6: Full gate check and PR

**Files:** none (verification only)

- [ ] **Step 1: Run the full lint + build + test suite**

```bash
npm run lint && python build.py --no-xlsx && npm run build && npm test
```

Expected: lint clean, build succeeds, all Playwright tests (including pre-existing smoke, profile, group, themes) pass.

- [ ] **Step 2: Open the PR**

```bash
git push -u origin HEAD
```

Then open a PR against `main`. Branch name: `feat/human-verified-dove-badge` (or current branch). Include the Cloudflare preview link in the PR description (see CLAUDE.md §12.7 for the branch-alias formula).
