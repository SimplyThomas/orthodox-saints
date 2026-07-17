import { test, expect } from "@playwright/test";

// "Giving Icons as Gifts" — the occasion guide. Occasion cards are native
// <details> and need no JS; the island's only job is collapsing the recipient
// picker down to one panel (every panel renders visible so the section stays a
// readable list with JS off).

test("icon-gifts loads with the hero icon corner", async ({ page }) => {
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

  await expect(page.locator(".ig-card")).toHaveCount(12);
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

test("an occasion card expands and closes", async ({ page }) => {
  await page.goto("./icon-gifts/");
  const card = page.locator("#occasion-baptism");
  const body = card.locator(".ig-more-body");

  await expect(body).toBeHidden();
  await card.locator("summary").click();
  await expect(body).toBeVisible();
  // Baptism carries the godparent note — the page's central point of custom.
  await expect(body).toContainText("The godparent gives the patron icon");
  // Suggestions that are real records link out; icon subjects stay plain text.
  await expect(body.locator('a[href$="/saint/OS-0009"]')).toHaveCount(0);
  await expect(
    card.locator('a.ig-icon-name[href$="/guardian-angels"]').first(),
  ).toBeVisible();

  await card.locator("summary").click();
  await expect(body).toBeHidden();
});

test("the recipient picker shows one panel at a time", async ({ page }) => {
  await page.goto("./icon-gifts/");
  const panels = page.locator(".ig-who-panel");
  await expect(panels).toHaveCount(13);
  // The island collapsed the list to the first recipient.
  await expect(panels.filter({ visible: true })).toHaveCount(1);
  await expect(page.locator("#who-child")).toBeVisible();

  await page.locator('[data-who-tab="monastic"]').click();
  await expect(page.locator("#who-monastic")).toBeVisible();
  await expect(page.locator("#who-child")).toBeHidden();
  await expect(panels.filter({ visible: true })).toHaveCount(1);
  await expect(page.locator('[data-who-tab="monastic"]')).toHaveAttribute(
    "aria-expanded",
    "true",
  );
});

// The vocation buttons carry a facet rather than a frozen saint list, so the
// results track the database. This proves the deep link actually seeds the
// finder rather than landing on an unfiltered page.
test("a vocation button deep-links into the finder", async ({ page }) => {
  await page.goto("./icon-gifts/");
  await page.locator("#occasion-vocation summary").click();
  await page.locator('.ig-voc[href*="theme=physicians"]').click();
  await expect(page).toHaveURL(/theme=physicians/);
  await expect(
    page.locator('#facets input[data-key="themes"][value="physicians"]'),
  ).toBeChecked();
  await expect(page.locator(".saint-row").first()).toBeVisible();
});

test("group and host suggestions resolve to real records", async ({ page }) => {
  await page.goto("./icon-gifts/");
  // A group profile (the Three Hierarchs) and a heavenly host (Raphael) are
  // both linkable subjects, served from different id namespaces.
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
  // No island to collapse them: every recipient stays readable.
  await expect(
    page.locator(".ig-who-panel").filter({ visible: true }),
  ).toHaveCount(13);
  await ctx.close();
});
