import { test, expect } from "@playwright/test";

test("Refine rail shows a grouped 'Browse by Theme' panel with counts", async ({
  page,
}) => {
  await page.goto("./search/");
  const panel = page.locator('details[data-key="themes"]');
  await expect(panel.locator("summary")).toContainText("Browse by Theme");
  await panel.locator("summary").click();
  await expect(
    panel.locator(".theme-family-head", { hasText: "Vocations" }),
  ).toBeVisible();
  const bishops = panel.locator('input[data-key="themes"][value="bishops"]');
  await expect(bishops).toHaveCount(1);
  // Populated-only: an override-only theme (count 0) is not listed.
  await expect(
    panel.locator('input[data-key="themes"][value="orphans"]'),
  ).toHaveCount(0);
});

test("Themes is no longer a top-level nav item", async ({ page }) => {
  await page.goto("./");
  await expect(
    page
      .locator(".site-nav")
      .getByRole("link", { name: "Themes", exact: true }),
  ).toHaveCount(0);
});

test("the old /themes route is gone", async ({ page }) => {
  const resp = await page.goto("./themes/");
  expect(resp?.status()).toBe(404);
});

test("selecting a theme filters the results and shows a labeled chip", async ({
  page,
}) => {
  await page.goto("./search/");
  const panel = page.locator('details[data-key="themes"]');
  await panel.locator("summary").click();
  // The <input> is visually hidden (custom checkbox) — click the label.
  await panel.locator('label:has(input[value="bishops"])').click();
  await expect(
    panel.locator('input[data-key="themes"][value="bishops"]'),
  ).toBeChecked();
  // Active chip shows the human label, not the slug.
  await expect(page.locator(".active-chips .ac")).toContainText("Bishops");
  await expect(page.locator("#count")).toContainText("filter");
});

test("?theme= deep-links into a filtered finder", async ({ page }) => {
  await page.goto("./search/?theme=bishops");
  await expect(
    page.locator('input[data-key="themes"][value="bishops"]'),
  ).toBeChecked();
  await expect(page.locator(".active-chips .ac")).toContainText("Bishops");
});

test("saint pages' theme chips link to the filtered browse page", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");
  const badges = page.locator(".sv-themes a.sv-theme");
  expect(await badges.count()).toBeGreaterThan(0);
  const bishops = page.locator('.sv-themes a[href*="search?theme=bishops"]');
  await expect(bishops).toBeVisible();
  await bishops.click();
  await page.waitForURL(/\/search\/?\?theme=bishops/);
  await expect(
    page.locator('input[data-key="themes"][value="bishops"]'),
  ).toBeChecked();
});

test("a non-profiled saint also shows theme badges", async ({ page }) => {
  await page.goto("./saint/OS-0022/"); // Gregory the Theologian, no profile
  await expect(page.locator(".sv-themes a.sv-theme").first()).toBeVisible();
});

test("a saint without curated kin shows Related Saints theme links", async ({
  page,
}) => {
  await page.goto("./saint/OS-0031/"); // Ephraim the Syrian (no curated family/companions/related)
  // The tag-derived "Related Saints" collapsible offers "More <theme>" links.
  const rel = page.locator(".sv-themelinks a.sv-themelink[href*='theme=']");
  expect(await rel.count()).toBeGreaterThan(0);
});

test("a theme suggestion toggles the theme filter inline", async ({ page }) => {
  await page.goto("./search/");
  await page.fill("#q", "saints who were soldiers");
  const sug = page.locator("#theme-suggest button");
  await expect(sug).toBeVisible();
  await expect(sug).toContainText("Soldiers");
  await sug.click();
  await expect(
    page.locator('input[data-key="themes"][value="soldiers"]'),
  ).toBeChecked();
  await expect(page.locator(".active-chips .ac")).toContainText("Soldiers");
});

test("search recognizes 'in america' as the Saints of America theme", async ({
  page,
}) => {
  await page.goto("./search/");
  await page.fill("#q", "saints in america");
  await expect(page.locator("#theme-suggest button")).toContainText(
    "Saints of America",
  );
});

test("an override-only theme alias does not surface a banner", async ({
  page,
}) => {
  await page.goto("./search/");
  await page.fill("#q", "saints who defended icons");
  // icon-defenders is override-only (count 0) → banner must stay hidden
  await expect(page.locator("#theme-suggest")).toBeHidden();
});
