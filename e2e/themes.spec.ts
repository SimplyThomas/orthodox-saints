import { test, expect } from "@playwright/test";

test("themes landing shows grouped cards with counts", async ({ page }) => {
  const resp = await page.goto("./themes/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("h1")).toContainText("Browse by Theme");
  await expect(
    page.locator(".th-group h2", { hasText: "Vocations" }),
  ).toBeVisible();
  const card = page.locator('.th-card[href*="/themes/bishops"]');
  await expect(card).toBeVisible();
  await expect(card).toContainText("Bishops");
  await expect(card.locator(".th-count")).toContainText(/\d/);
  await expect(page.locator('.th-card[href*="/themes/orphans"]')).toHaveCount(
    0,
  );
});

test("Themes nav item is present and base-prefixed", async ({ page }) => {
  await page.goto("./");
  const href = await page
    .locator(".site-nav")
    .getByRole("link", { name: "Themes", exact: true })
    .getAttribute("href");
  expect(href).toContain("/themes");
});
