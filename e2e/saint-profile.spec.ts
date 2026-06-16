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
  // Naucratius has no dataset row → rendered as plain text, never a link.
  await expect(
    page.locator(".sp-family li", { hasText: "Naucratius" }).locator("a"),
  ).toHaveCount(0);

  // Related Saints links resolve to real saint pages.
  await expect(
    page.locator('.sp-related a[href*="/saint/OS-0023"]'), // John Chrysostom
  ).toBeVisible();
});

test("Basil's profile shows contributions, legacy, and the 'Great' section", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");
  await expect(
    page.locator(".sp-sec h2", { hasText: "Contributions & Legacy" }),
  ).toBeVisible();
  for (const h of [
    "Theology of the Holy Spirit",
    "Father of Eastern Monasticism",
    "Legacy in Christian Charity",
    'Why He Is Called "the Great"',
  ]) {
    await expect(page.locator(".sp-prose h3", { hasText: h })).toBeVisible();
  }
  // The Basiliad is described in the charity section.
  await expect(
    page.locator(".sp-prose", { hasText: "Basiliad" }).first(),
  ).toBeVisible();
});

test("Basil's profile shows works, further reading, patronage, and themes", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");

  // Notable Works with descriptions (profile table, not the plain CSV link list).
  await expect(
    page.locator(".sp-sec h2", { hasText: "Notable Works" }),
  ).toBeVisible();
  await expect(
    page.locator(".sp-works li", { hasText: "On the Holy Spirit" }),
  ).toBeVisible();

  // Further Reading, grouped Ancient / Modern.
  await expect(
    page.locator(".sp-sec h2", { hasText: "Further Reading" }),
  ).toBeVisible();
  await expect(
    page.locator(".sp-reading h3", { hasText: "Ancient Sources" }),
  ).toBeVisible();
  await expect(
    page.locator(".sp-reading li", { hasText: "Philip Rousseau" }),
  ).toBeVisible();

  // Patronage chips and Theme badges.
  await expect(
    page.locator(".sp-patron .sp-chip", { hasText: "Monastics" }),
  ).toBeVisible();
  await expect(
    page.locator(".sp-themes .sp-badge", { hasText: "Church Fathers" }),
  ).toBeVisible();

  // The plain CSV "Works by the Saint" block is superseded by the profile table.
  await expect(page.locator(".sv-works")).toHaveCount(0);
});
