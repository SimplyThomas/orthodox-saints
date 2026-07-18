import { test, expect } from "@playwright/test";

// "Giving Icons as Gifts" — one combined "Finding the right icon" picker: a
// refine menu above a single card. The button shows the current subject; the
// dropdown lists all options in two labeled groups (by occasion / for a
// person); choosing one swaps the card. Every card renders up-front, so with JS
// off the section stays a complete readable list; the island collapses it to
// the pre-selected card (baptism). 12 occasions + 13 people = 25.

const PANEL_COUNT = 25;

test("icon-gifts loads with the hero icon corner and the refine menu", async ({
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

  // The refine button opens on baptism; its menu carries every option across
  // two labeled groups.
  await expect(page.locator("[data-refine-current]")).toHaveText(
    "Baptism & Chrismation",
  );
  await expect(page.locator(".ig-refine-grouplabel")).toHaveText([
    "By occasion",
    "For a person",
  ]);
  await expect(page.locator("[data-refine-opt]")).toHaveCount(PANEL_COUNT);
});

// The vendor grant (§9) is conditional on each image linking back to its own
// icon page. This guards that link condition: if a hero portrait is ever added
// without a source link, the count drops and this fails.
test("every hero portrait links back to its vendor icon page", async ({
  page,
}) => {
  await page.goto("./icon-gifts/");
  await expect(
    page.locator('.ig-credit a[href^="https://theophanyworks.com/"]'),
  ).toHaveCount(4);
});

test("the picker opens on baptism and shows one card", async ({ page }) => {
  await page.goto("./icon-gifts/");
  const cards = page.locator(".ig-who-panel");
  await expect(cards).toHaveCount(PANEL_COUNT);

  // The island collapses to the pre-selected card, baptism; the menu is closed.
  await expect(page.locator("[data-refine-menu]")).toBeHidden();
  await expect(cards.filter({ visible: true })).toHaveCount(1);
  await expect(page.locator("#who-baptism")).toBeVisible();

  // Baptism carries the godparent note — the page's central point of custom.
  await expect(page.locator("#who-baptism")).toContainText(
    "The godparent gives the patron icon",
  );
  // Real records link out; icon subjects (Christ) stay plain text.
  await expect(
    page.locator('#who-baptism a.ig-icon-name[href$="/guardian-angels"]'),
  ).toHaveCount(1);
});

test("opening the menu and choosing an option swaps the card", async ({
  page,
}) => {
  await page.goto("./icon-gifts/");
  const menu = page.locator("[data-refine-menu]");
  const visible = page.locator(".ig-who-panel").filter({ visible: true });

  // Open the menu, choose an occasion.
  await page.locator("[data-refine-btn]").click();
  await expect(menu).toBeVisible();
  await page.locator('[data-refine-opt="marriage"]').click();
  await expect(menu).toBeHidden();
  await expect(page.locator("[data-refine-current]")).toHaveText("Marriage");
  await expect(page.locator("#who-marriage")).toBeVisible();
  await expect(page.locator("#who-baptism")).toBeHidden();
  await expect(visible).toHaveCount(1);

  // Choose a person from the other group — still one card, label tracks it.
  await page.locator("[data-refine-btn]").click();
  await page.locator('[data-refine-opt="monastic"]').click();
  await expect(page.locator("[data-refine-current]")).toHaveText("A Monastic");
  await expect(page.locator("#who-monastic")).toBeVisible();
  await expect(page.locator("#who-marriage")).toBeHidden();
  await expect(visible).toHaveCount(1);
});

test("the menu closes on an outside click", async ({ page }) => {
  await page.goto("./icon-gifts/");
  const menu = page.locator("[data-refine-menu]");
  await page.locator("[data-refine-btn]").click();
  await expect(menu).toBeVisible();
  await page.locator(".ig-sec-head h2").first().click();
  await expect(menu).toBeHidden();
});

// The vocation buttons carry a facet rather than a frozen saint list, so the
// results track the database. This proves the deep link actually seeds the
// finder rather than landing on an unfiltered page.
test("a vocation button deep-links into the finder", async ({ page }) => {
  await page.goto("./icon-gifts/");
  await page.locator("[data-refine-btn]").click();
  await page.locator('[data-refine-opt="vocation"]').click();
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
  // both linkable subjects, served from different id namespaces. Both anchors
  // exist in the DOM regardless of which card is currently shown.
  await expect(page.locator('a[href$="/saint/OS-2933"]').first()).toHaveCount(
    1,
  );
  await expect(page.locator('a[href$="/host/HH-0012"]').first()).toHaveCount(1);
});

// "Knowing the difference" (tiers) and "Before you buy" (tips) are native
// <details> accordions — each an exclusive group (one open at a time), the
// first item open by default.
test("the tiers and tips sections are FAQ-style accordions", async ({
  page,
}) => {
  await page.goto("./icon-gifts/");

  // Tiers: three colour-coded panels, first open, exactly one open at a time.
  const tiers = page.locator("#tiers .ig-faq-item");
  await expect(tiers).toHaveCount(3);
  await expect(tiers.nth(0)).toHaveAttribute("open", "");
  await expect(page.locator("#tiers .ig-faq-item[open]")).toHaveCount(1);

  // Opening another closes the first (native name= exclusive accordion).
  await tiers.nth(2).locator("summary").click();
  await expect(tiers.nth(2)).toHaveAttribute("open", "");
  await expect(tiers.nth(0)).not.toHaveAttribute("open", "");
  await expect(page.locator("#tiers .ig-faq-item[open]")).toHaveCount(1);

  // Tips: eight collapsibles, the first open by default.
  await expect(page.locator("#tips .ig-faq-item")).toHaveCount(8);
  await expect(page.locator("#tips .ig-faq-item[open]")).toHaveCount(1);
});

test("stays a readable list with JavaScript disabled", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("./icon-gifts/");
  await expect(page.locator(".igp h1")).toHaveText("Giving Icons as Gifts");
  // No island to collapse them: every card stays readable, and the menu (which
  // needs JS) stays closed rather than dangling open.
  await expect(
    page.locator(".ig-who-panel").filter({ visible: true }),
  ).toHaveCount(PANEL_COUNT);
  await expect(page.locator("[data-refine-menu]")).toBeHidden();
  await ctx.close();
});
