import { test, expect } from "@playwright/test";

// "Icons in the Home" — the interactive icon-placement guide. The page renders
// every room card up-front (hidden); the island wires the house, the card swap,
// the FAQ accordion, and the two room-conditional sections.

test("icons-home loads with the hero and an empty prompt", async ({ page }) => {
  const resp = await page.goto("./icons-home/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator(".ihp h1")).toHaveText("Icons in the Home");
  // Eleven interactive rooms make up the house.
  await expect(page.locator(".ih-room[data-room]")).toHaveCount(11);
  // Before any selection: the prompt shows and every card is hidden.
  await expect(page.locator(".ih-empty")).toBeVisible();
  await expect(page.locator(".ih-card-shell:not([hidden])")).toHaveCount(0);
});

test("selecting a room reveals its card and highlights it", async ({
  page,
}) => {
  await page.goto("./icons-home/");
  await page.locator('[data-room="icon-corner"]').click();

  const card = page.locator('.ih-card-shell[data-card="icon-corner"]');
  await expect(card).toBeVisible();
  await expect(page.locator(".ih-empty")).toBeHidden();
  await expect(page.locator('[data-room="icon-corner"]')).toHaveClass(/sel/);
  await expect(card.locator("h3")).toContainText("Icon Corner");
  // An "in our database" card links to a real saint page.
  await expect(
    card.locator('.ih-related[href*="/saint/OS-"]').first(),
  ).toBeVisible();
  // Saints named within the card body are gilded links to their DB pages —
  // St Nicholas resolves to his canonical record (not a same-named martyr).
  await expect(
    card.locator('a.ih-slink[href$="/saint/OS-0019"]').first(),
  ).toBeVisible();
  // Icons that merely share a saint's name (e.g. "Hospitality of Abraham")
  // are NOT links.
  await expect(
    card.locator("a.ih-slink", { hasText: "Hospitality of Abraham" }),
  ).toHaveCount(0);
  // The Icon Corner reveals the world-traditions section.
  await expect(page.locator(".ih-traditions")).toBeVisible();
  await expect(page.locator(".ih-subjects")).toBeHidden();

  // Closing the card returns to the empty prompt.
  await card.locator(".ih-card-x").click();
  await expect(card).toBeHidden();
  await expect(page.locator(".ih-empty")).toBeVisible();
  await expect(page.locator(".ih-traditions")).toBeHidden();
});

test("the homeschool room reveals the patrons-by-subject section", async ({
  page,
}) => {
  await page.goto("./icons-home/");
  await page.locator('[data-room="homeschool"]').click();
  await expect(
    page.locator('.ih-card-shell[data-card="homeschool"]'),
  ).toBeVisible();
  await expect(page.locator(".ih-subjects")).toBeVisible();
  await expect(page.locator(".ih-subjects .ih-subject")).toHaveCount(6);
  await expect(page.locator(".ih-traditions")).toBeHidden();
});

test("the FAQ accordion opens one answer at a time", async ({ page }) => {
  await page.goto("./icons-home/");
  const items = page.locator(".ih-faq-item");
  // The first answer is open by default; exactly one is expanded.
  await expect(page.locator('.ih-faq-q[aria-expanded="true"]')).toHaveCount(1);
  await expect(items.first().locator(".ih-faq-a")).toBeVisible();

  // Opening another collapses the first.
  await items.nth(2).locator(".ih-faq-q").click();
  await expect(items.nth(2).locator(".ih-faq-a")).toBeVisible();
  await expect(items.first().locator(".ih-faq-a")).toBeHidden();
  await expect(page.locator('.ih-faq-q[aria-expanded="true"]')).toHaveCount(1);
});

test("recommendation cards show the icon they name, credited and linked", async ({
  page,
}) => {
  await page.goto("./icons-home/");
  await page.locator('[data-room="dining"]').click();
  const card = page.locator('.ih-card-shell[data-card="dining"]');
  await expect(card).toBeVisible();

  // The Wedding at Cana is an icon subject, not a saint record: it had no
  // picture at all before, and now carries the icon the card is about.
  const cana = card.locator(".ih-art", {
    has: page.locator('img[alt="The Wedding at Cana"]'),
  });
  await expect(cana).toBeVisible();
  // §9: a vendor-permission image must link to that icon's own page, and the
  // vendor must be visibly credited beside it.
  await expect(cana).toHaveAttribute("href", /theophanyworks\.com\/.+/);
  await expect(
    card.locator(".ih-art-credit", { hasText: "Theophany Works" }).first(),
  ).toBeVisible();

  // Every plate is credited — a picture with no credit line is a broken grant.
  const plates = await card.locator(".ih-art").count();
  expect(plates).toBeGreaterThanOrEqual(5);
  await expect(card.locator(".ih-art-credit")).toHaveCount(plates);
});
