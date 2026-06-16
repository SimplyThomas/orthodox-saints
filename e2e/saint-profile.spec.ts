import { test, expect } from "@playwright/test";

test("Basil's page renders the rich profile biography", async ({ page }) => {
  const resp = await page.goto("./saint/OS-0021/");
  expect(resp?.status()).toBe(200);
  // Existing detail framing is intact.
  await expect(page.locator(".saintview .sv-rail")).toBeVisible();
  // Lifespan subtitle renders under the name.
  await expect(
    page.locator(".sv-lifespan", { hasText: "Archbishop of Caesarea" }),
  ).toBeVisible();
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

test("Basil's timeline, holy family, and related saints render", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");
  // Timeline stays in the ivory story column.
  await expect(
    page.locator(".sp-sec h2", { hasText: "Timeline" }),
  ).toBeVisible();
  expect(await page.locator(".sp-timeline li").count()).toBeGreaterThanOrEqual(
    5,
  );
  await expect(
    page.locator(".sp-timeline li", { hasText: "Consecrated Archbishop" }),
  ).toBeVisible();

  // Holy Family + Related Saints sit in the "after" region beneath the legacy band.
  const after = page.locator(".sv-after");
  await expect(
    after.locator("h2", { hasText: "Holy Family of Cappadocia" }),
  ).toBeVisible();
  await expect(
    after.locator('a[href*="/saint/OS-0422"]').first(), // Gregory of Nyssa (family + related)
  ).toBeVisible();
  // Naucratius is not in the dataset → plain name, never a link.
  await expect(after.locator("li", { hasText: "Naucratius" })).toBeVisible();
  await expect(
    after.locator("li", { hasText: "Naucratius" }).locator("a"),
  ).toHaveCount(0);
  await expect(
    after.locator('a[href*="/saint/OS-0023"]'), // John Chrysostom
  ).toBeVisible();
});

test("Basil's contributions & legacy render in the full-width band", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");
  await expect(
    page.locator(".sv-legacy-title", { hasText: "Contributions & Legacy" }),
  ).toBeVisible();
  for (const h of [
    "Theology of the Holy Spirit",
    "Father of Eastern Monasticism",
    "Legacy in Christian Charity",
    'Why He Is Called "the Great"',
  ]) {
    await expect(
      page.locator(".sv-legacy-card h3", { hasText: h }),
    ).toBeVisible();
  }
  // The Basiliad is described in the charity card.
  await expect(
    page.locator(".sv-legacy-card", { hasText: "Basiliad" }).first(),
  ).toBeVisible();
});

test("Basil's rail carries the works list", async ({ page }) => {
  await page.goto("./saint/OS-0021/");
  // Works (profile titles) live in the blue icon rail.
  await expect(
    page.locator(".sv-rail .sv-rail-t", { hasText: "On the Holy Spirit" }),
  ).toBeVisible();
  // The story column no longer carries a works block.
  await expect(page.locator(".sv-main .sv-works")).toHaveCount(0);
});

test("Further Reading sits beneath the legacy band, grouped Ancient / Modern", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");
  const reading = page.locator(".sv-after .sv-reading");
  await expect(
    reading.locator("h2", { hasText: "Further Reading" }),
  ).toBeVisible();
  await expect(
    reading.locator(".sv-read-head", { hasText: "Ancient Sources" }),
  ).toBeVisible();
  await expect(
    reading.locator(".sv-read-by", { hasText: "Philip Rousseau" }),
  ).toBeVisible();
});

test("Basil's patronage sits in the story column beside themes / life experience", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");
  await expect(
    page.locator(".sv-patron .tag.intercession", { hasText: "Monastics" }),
  ).toBeVisible();
});

test("Basil's page shows one sourced public-domain quote", async ({ page }) => {
  await page.goto("./saint/OS-0021/");
  await expect(page.locator(".sv-quote blockquote")).toBeVisible();
  // Cited to the Hexaemeron, public-domain NPNF translation.
  await expect(page.locator(".sv-quote figcaption")).toContainText(
    "Hexaemeron",
  );
  await expect(page.locator(".sv-quote .sv-quote-trans")).toContainText("NPNF");
});
