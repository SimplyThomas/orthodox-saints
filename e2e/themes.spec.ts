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

test("a theme page lists its saints and links to detail pages", async ({
  page,
}) => {
  await page.goto("./themes/bishops/");
  await expect(page.locator(".tl-head h1")).toContainText("Bishops");
  await expect(page.locator(".tl-count")).toContainText(/\d+ saints/);
  const first = page.locator(".tl-list a.tl-row").first();
  const href = await first.getAttribute("href");
  expect(href).toMatch(/\/saint\/OS-/);
  await page.goto("./themes/");
  await page.locator('.th-card[href*="/themes/bishops"]').click();
  await page.waitForURL(/\/themes\/bishops\/?$/);
});

test("saint pages show clickable theme badges", async ({ page }) => {
  await page.goto("./saint/OS-0021/");
  const badges = page.locator(".sv-themes a.sv-theme");
  expect(await badges.count()).toBeGreaterThan(0);
  const bishops = page.locator('.sv-themes a[href*="/themes/bishops"]');
  await expect(bishops).toBeVisible();
  await bishops.click();
  await page.waitForURL(/\/themes\/bishops\/?$/);
});

test("a non-profiled saint also shows theme badges", async ({ page }) => {
  await page.goto("./saint/OS-0022/"); // Gregory the Theologian, no profile
  await expect(page.locator(".sv-themes a.sv-theme").first()).toBeVisible();
});

test("a non-profiled saint shows related saints by shared themes", async ({
  page,
}) => {
  await page.goto("./saint/OS-0022/"); // Gregory the Theologian (no curated related list)
  const rel = page.locator(".sv-after a[href*='/saint/OS-']");
  expect(await rel.count()).toBeGreaterThan(0);
});

test("search surfaces a theme suggestion for natural-language queries", async ({
  page,
}) => {
  await page.goto("./search/");
  await page.fill("#q", "saints who were soldiers");
  const sug = page.locator("#theme-suggest a");
  await expect(sug).toBeVisible();
  await expect(sug).toHaveAttribute("href", /\/themes\/soldiers/);
  await expect(sug).toContainText("Soldiers");
});

test("search recognizes 'in america' as the Saints of America theme", async ({
  page,
}) => {
  await page.goto("./search/");
  await page.fill("#q", "saints in america");
  await expect(page.locator("#theme-suggest a")).toHaveAttribute(
    "href",
    /\/themes\/saints-of-america/,
  );
});

test("an override-only theme alias does not surface a 404 banner", async ({
  page,
}) => {
  await page.goto("./search/");
  await page.fill("#q", "saints who defended icons");
  // icon-defenders is override-only (count 0, no page) → banner must stay hidden
  await expect(page.locator("#theme-suggest")).toBeHidden();
});
