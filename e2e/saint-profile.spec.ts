import { test, expect } from "@playwright/test";

test("Basil's page renders the rich profile biography", async ({ page }) => {
  const resp = await page.goto("./saint/OS-0021/");
  expect(resp?.status()).toBe(200);
  // Existing detail framing is intact.
  await expect(page.locator(".saintview .sv-rail")).toBeVisible();
  await expect(page.locator(".sv-address")).toBeVisible();
  // The rich profile adds a "Life" biography section with multiple paragraphs.
  await expect(page.locator(".sp-sec h2", { hasText: "Life" })).toBeVisible();
  await expect(
    page.locator(".sp-bio p", { hasText: "Cappadocia" }).first(),
  ).toBeVisible();
  expect(await page.locator(".sp-bio p").count()).toBeGreaterThanOrEqual(4);
});

test("a saint without a profile renders no profile sections", async ({
  page,
}) => {
  // OS-0022 (Gregory the Theologian) has no profile in Feature A.
  await page.goto("./saint/OS-0022/");
  await expect(page.locator(".saintview .sv-name")).toContainText("Gregory");
  await expect(page.locator(".sp-sec")).toHaveCount(0);
});

test("Basil's profile shows a timeline, holy family, and related saints", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");
  // Timeline with dated entries.
  await expect(
    page.locator(".sp-sec h2", { hasText: "Timeline" }),
  ).toBeVisible();
  expect(await page.locator(".sp-timeline li").count()).toBeGreaterThanOrEqual(
    5,
  );
  await expect(
    page.locator(".sp-timeline li", { hasText: "Consecrated Archbishop" }),
  ).toBeVisible();

  // Holy Family of Cappadocia — with at least one internal saint link.
  await expect(
    page.locator(".sp-sec h2", { hasText: "Holy Family of Cappadocia" }),
  ).toBeVisible();
  await expect(
    page.locator('.sp-family a[href*="/saint/OS-0422"]'), // Gregory of Nyssa
  ).toBeVisible();
  // Naucratius is not in the dataset → plain name, no link.
  await expect(
    page.locator(".sp-family", { hasText: "Naucratius" }),
  ).toBeVisible();

  // Related Saints links resolve to real saint pages.
  await expect(
    page.locator('.sp-related a[href*="/saint/OS-0023"]'), // John Chrysostom
  ).toBeVisible();
});
