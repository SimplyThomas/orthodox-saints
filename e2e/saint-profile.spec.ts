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

test("Basil's timeline and companions & kin render", async ({ page }) => {
  await page.goto("./saint/OS-0021/");
  // Timeline sits in the band beneath the columns (beside the quote).
  await expect(
    page.locator(".sv-tl-title", { hasText: "Timeline" }),
  ).toBeVisible();
  expect(await page.locator(".sv-timeline li").count()).toBeGreaterThanOrEqual(
    5,
  );
  // The deep-dives start collapsed; open the Timeline panel to read it.
  await page.locator(".sv-tl-title").click();
  await expect(
    page.locator(".sv-timeline li", { hasText: "Consecrated Archbishop" }),
  ).toBeVisible();

  // Family + related are unified into one "companions & kin" avatar grid.
  const kin = page.locator(".sv-related");
  await expect(kin.locator(".sv-secthead")).toContainText("companions & kin");
  await expect(
    kin.locator('a[href*="/saint/OS-0422"]').first(), // Gregory of Nyssa (brother)
  ).toBeVisible();
  await expect(
    kin.locator('a[href*="/saint/OS-0023"]'), // John Chrysostom (fellow hierarch)
  ).toBeVisible();
  // Naucratius is not in the dataset → a card with no link.
  const nau = kin.locator(".sv-relcard", { hasText: "Naucratius" });
  await expect(nau).toBeVisible();
  await expect(nau.locator("a")).toHaveCount(0);
});

test("Basil's contributions & legacy render in the full-width band", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");
  await expect(
    page.locator(".sv-legacy-title", { hasText: "Contributions & Legacy" }),
  ).toBeVisible();
  // Collapsed by default — open the Legacy panel to read the cards.
  await page.locator(".sv-legacy-title").click();
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

test("Basil's Notable Works render beneath the legacy band", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");
  // Works & Further Reading is one collapsible — open it.
  await page.locator("details.sv-deep:has(.sv-works-after) summary").click();
  const works = page.locator(".sv-after .sv-works-after");
  await expect(works.locator("h2", { hasText: "Notable Works" })).toBeVisible();
  await expect(
    works.locator("li", { hasText: "On the Holy Spirit" }),
  ).toBeVisible();
});

test("Further Reading sits beneath the legacy band, grouped Ancient / Modern", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");
  // Works & Further Reading is one collapsible — open it.
  await page.locator("details.sv-deep:has(.sv-reading) summary").click();
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

test("Basil's themes, life experience, and patronage sit in the icon rail", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");
  const rail = page.locator(".sv-rail");
  // Themes badges (clickable) in the rail.
  await expect(
    rail.locator('.sv-themes a[href*="search?theme=bishops"]'),
  ).toBeVisible();
  // Patronage chips in the rail.
  await expect(
    rail.locator(".sv-patron .sv-rail-chip", { hasText: "Monastics" }),
  ).toBeVisible();
});

test("Basil's page shows sourced public-domain quotes in a collapsible", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");
  const words = page.locator(".sv-words");
  // "In his own words" — gender-aware label, collapsible (multiple quotes).
  await expect(words.locator("summary")).toContainText("In his own words");
  const quotes = words.locator(".sv-words-quote");
  expect(await quotes.count()).toBeGreaterThanOrEqual(3);
  // Collapsed by default — open it to read the quotes.
  await words.locator("summary").click();
  await expect(quotes.first().locator("blockquote")).toBeVisible();
  // Cited to On the Holy Spirit, public-domain NPNF translation.
  await expect(words.locator("figcaption").first()).toContainText(
    "On the Holy Spirit",
  );
  await expect(words.locator(".sv-quote-trans").first()).toContainText("NPNF");
});

test("the Theotokos page shows the vendor-permission icon attribution", async ({
  page,
}) => {
  const resp = await page.goto("./saint/OS-0001/");
  expect(resp?.status()).toBe(200);
  // The permission attribution caption renders the agreed wording.
  const cap = page.locator(".sv-icon-cap");
  await expect(cap).toContainText(
    "Icon used with permission from Theophany Works",
  );
  // "Original icon" links to the specific vendor icon page (the grant's condition).
  const link = cap.getByRole("link", { name: /View on Theophany Works/ });
  await expect(link).toHaveAttribute(
    "href",
    "https://theophanyworks.com/icon-of-the-sweet-kissing-theotokos-glykophiloussa-detail-21st-c-00vmt002/",
  );
});

test("the Theotokos page shows the Depictions & Icons carousel", async ({
  page,
}) => {
  const resp = await page.goto("./saint/OS-0001/");
  expect(resp?.status()).toBe(200);
  const deps = page.locator(".sv-deps");
  await expect(deps).toBeVisible();
  // One card per data/saint_depictions.csv row for OS-0001 (4 vendor + 2 PD).
  await expect(deps.locator(".sv-dep")).toHaveCount(6);
  // Permission cards carry the "shop" tone; PD masters the museum tone.
  await expect(deps.locator(".sv-dep-tag--shop")).toHaveCount(4);
  await expect(deps.locator(".sv-dep-tag--museum")).toHaveCount(2);
  // Each permission card links to its specific vendor icon page (grant condition).
  const vendorCard = deps
    .locator("a.sv-dep", {
      hasText: "The Holy Protection of the Mother of God",
    })
    .first();
  await expect(vendorCard).toHaveAttribute(
    "href",
    "https://theophanyworks.com/icon-of-the-holy-protection-of-the-mother-of-god-usa-21st-c-00vmt019/",
  );
});
