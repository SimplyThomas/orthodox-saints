import { test, expect } from "@playwright/test";

// "Giving Icons as Gifts" — one combined "Finding the right icon" picker: a
// chip-and-panel widget whose chips span two groups (by occasion / for a
// person). Every panel renders up-front, so with JS off the section stays a
// complete readable list; the island collapses it to the pre-selected chip
// (baptism, the page's centre of gravity). 12 occasions + 13 people = 25.

const PANEL_COUNT = 25;

test("icon-gifts loads with the hero icon corner and the picker", async ({
  page,
}) => {
  const resp = await page.goto("./icon-gifts/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator(".igp h1")).toHaveText("Giving Icons as Gifts");

  // The hero composes a real icon corner from database portraits — each must
  // actually load, not 404 into a broken frame.
  const imgs = page.locator(".ig-frame-img");
  await expect(imgs).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    expect(
      await imgs
        .nth(i)
        .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
      `hero portrait ${i} loaded`,
    ).toBe(true);
  }

  // The single picker carries both framings: two labeled chip groups.
  await expect(page.locator(".ig-who-grouplabel")).toHaveText([
    "By occasion",
    "For a person",
  ]);
  await expect(page.locator("[data-who-tab]")).toHaveCount(PANEL_COUNT);
});

// The vendor-permission grant (§9) is conditional on each image linking back to
// its own icon page. If a portrait is ever added to the hero without a source,
// this fails rather than quietly breaking the grant.
test("every permission portrait in the hero links to its vendor icon page", async ({
  page,
}) => {
  await page.goto("./icon-gifts/");
  const credit = page.locator(".ig-credit");
  await expect(credit).toContainText("permission");
  await expect(
    credit.locator('a[href^="https://theophanyworks.com/"]'),
  ).toHaveCount(4);
});

test("the picker opens on baptism and shows one panel at a time", async ({
  page,
}) => {
  await page.goto("./icon-gifts/");
  const panels = page.locator(".ig-who-panel");
  await expect(panels).toHaveCount(PANEL_COUNT);

  // The island collapses to the pre-selected key occasion, baptism.
  await expect(panels.filter({ visible: true })).toHaveCount(1);
  await expect(page.locator("#who-baptism")).toBeVisible();
  await expect(page.locator('[data-who-tab="baptism"]')).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  // Baptism carries the godparent note — the page's central point of custom.
  await expect(page.locator("#who-baptism")).toContainText(
    "The godparent gives the patron icon",
  );
  // Real records link out; icon subjects (Christ) stay plain text.
  await expect(
    page.locator('#who-baptism a.ig-icon-name[href$="/guardian-angels"]'),
  ).toHaveCount(1);
});

test("selecting chips from either group swaps the single panel", async ({
  page,
}) => {
  await page.goto("./icon-gifts/");
  const visible = page.locator(".ig-who-panel").filter({ visible: true });

  // An occasion chip.
  await page.locator('[data-who-tab="marriage"]').click();
  await expect(page.locator("#who-marriage")).toBeVisible();
  await expect(page.locator("#who-baptism")).toBeHidden();
  await expect(visible).toHaveCount(1);

  // A person chip — still only one panel, across both groups.
  await page.locator('[data-who-tab="monastic"]').click();
  await expect(page.locator("#who-monastic")).toBeVisible();
  await expect(page.locator("#who-marriage")).toBeHidden();
  await expect(visible).toHaveCount(1);
});

// The vocation buttons carry a facet rather than a frozen saint list, so the
// results track the database. This proves the deep link actually seeds the
// finder rather than landing on an unfiltered page.
test("a vocation button deep-links into the finder", async ({ page }) => {
  await page.goto("./icon-gifts/");
  await page.locator('[data-who-tab="vocation"]').click();
  await page.locator('#who-vocation .ig-voc[href*="theme=physicians"]').click();
  await expect(page).toHaveURL(/theme=physicians/);
  await expect(
    page.locator('#facets input[data-key="themes"][value="physicians"]'),
  ).toBeChecked();
  await expect(page.locator(".saint-row").first()).toBeVisible();
});

test("group and host suggestions resolve to real records", async ({ page }) => {
  await page.goto("./icon-gifts/");
  // A group profile (the Three Hierarchs) and a heavenly host (Raphael) are
  // both linkable subjects, served from different id namespaces. Both live in
  // panels that render up-front (hidden), so the anchors exist regardless of
  // which chip is selected.
  await expect(page.locator('a[href$="/saint/OS-2933"]').first()).toHaveCount(
    1,
  );
  await expect(page.locator('a[href$="/host/HH-0012"]').first()).toHaveCount(1);
});

test("stays a readable list with JavaScript disabled", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("./icon-gifts/");
  await expect(page.locator(".igp h1")).toHaveText("Giving Icons as Gifts");
  // No island to collapse them: every occasion and person panel stays readable.
  await expect(
    page.locator(".ig-who-panel").filter({ visible: true }),
  ).toHaveCount(PANEL_COUNT);
  await ctx.close();
});
