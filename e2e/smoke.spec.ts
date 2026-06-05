import { test, expect } from "@playwright/test";

const BASE = "/orthodox-saints/";

test("home loads with title and a resolvable logo", async ({ page }) => {
  const resp = await page.goto("./");
  expect(resp?.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/Cloud of Witnesses/);

  // The logo must resolve under the base path (not 404) — guards the #1 base-path bug.
  const logo = page.locator("header .brand img");
  const src = await logo.getAttribute("src");
  expect(src).toContain(BASE);
  const logoResp = await page.request.get(new URL(src!, page.url()).href);
  expect(logoResp.status()).toBe(200);
});

test("search filters the results", async ({ page }) => {
  await page.goto("./");
  // Results render client-side from the inlined finder data.
  await expect(page.locator("#results .saint-row").first()).toBeVisible();

  const totalText = (await page.locator("#count").innerText()).match(
    /\d+/,
  )?.[0];
  const total = Number(totalText);
  expect(total).toBeGreaterThan(1000);

  await page.fill("#q", "Nicholas");
  // Substring search runs over the whole haystack (name + brief + facets), so the
  // result set shrinks sharply and Nicholas-named saints surface.
  await expect
    .poll(async () =>
      Number((await page.locator("#count").innerText()).match(/\d+/)?.[0]),
    )
    .toBeLessThan(total);
  await expect(
    page.locator("#results .saint-row h3", { hasText: "Nicholas" }).first(),
  ).toBeVisible();
});

test("clicking a result opens the quick-look modal with the prayer", async ({
  page,
}) => {
  await page.goto("./");
  await page.locator("#results .saint-row").first().click();
  const modal = page.locator("#detail");
  await expect(modal).toBeVisible();
  await expect(modal.locator(".detail-card .prayer")).toBeVisible();
  // The URL carries the ?s= deep link.
  expect(page.url()).toContain("s=OS-");
  // Escape closes it.
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
});

test("static per-saint page is real, indexable HTML", async ({ page }) => {
  const resp = await page.goto("./saint/OS-0021/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("h1")).toContainText("Basil");
  const desc = await page
    .locator('meta[name="description"]')
    .getAttribute("content");
  expect(desc && desc.length).toBeTruthy();
  // Canonical URL is absolute and base-correct.
  const canon = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(canon).toContain("/orthodox-saints/saint/OS-0021/");
});

test("quiz produces a patron with reasons", async ({ page }) => {
  await page.goto("./quiz/");
  // Pick a chip in the first two questions.
  await page.locator(".quiz-q").nth(0).locator(".chip").first().click();
  await page.locator(".quiz-q").nth(1).locator(".chip").first().click();
  await page.click("#quiz-submit");
  const patron = page.locator("#quiz-results .patron-card");
  await expect(patron).toBeVisible();
  await expect(patron.locator(".why .tag")).not.toHaveCount(0);
});

test("primary nav links are base-prefixed and resolve", async ({ page }) => {
  await page.goto("./");
  for (const label of ["Saints", "America", "Patron Quiz"]) {
    const href = await page
      .getByRole("link", { name: label, exact: true })
      .getAttribute("href");
    expect(href).toContain(BASE);
  }
  // America navigates without a 404.
  const resp = await page.goto("./america/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator(".am-grid .am-card").first()).toBeVisible();
});
