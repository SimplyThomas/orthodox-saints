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
