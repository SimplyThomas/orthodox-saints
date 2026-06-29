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
  // OS-2166 (Martyr Alexander of Thessalonica) is a stub with no profile YAML,
  // so its page renders no rich-profile sections in any build mode.
  await page.goto("./saint/OS-2166/");
  await expect(page.locator(".saintview .sv-name")).toContainText("Alexander");
  await expect(page.locator(".sp-sec")).toHaveCount(0);
});

test("Basil's timeline, family, and companions render in separate sections", async ({
  page,
}) => {
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

  // The unified "companions & kin" grid is now three distinct collapsibles.
  // (They share a single-open accordion, so each is opened just before its
  // assertions.)

  // 1. Family — immediate kin only.
  const family = page.locator("details.sv-deep", {
    has: page.locator(".sv-deep-eb", { hasText: "Family" }),
  });
  await family.locator("summary").click();
  await expect(
    family.locator('a[href*="/saint/OS-0422"]').first(), // Gregory of Nyssa (brother)
  ).toBeVisible();
  // Naucratius is not in the dataset → a card with no link.
  const nau = family.locator(".sv-relcard", { hasText: "Naucratius" });
  await expect(nau).toBeVisible();
  await expect(nau.locator("a")).toHaveCount(0);

  // 2. Companions & Contemporaries — documented personal relationships.
  const comp = page.locator("details.sv-deep", {
    has: page.locator(".sv-deep-eb", { hasText: "Companions" }),
  });
  await comp.locator("summary").click();
  await expect(
    comp.locator('a[href*="/saint/OS-0022"]').first(), // Gregory the Theologian (friend)
  ).toBeVisible();
  // Emperor Valens is not a commemorated saint → "not commemorated", no link.
  const valens = comp.locator(".sv-relcard", { hasText: "Valens" });
  await expect(valens).toContainText("not commemorated");
  await expect(valens.locator("a")).toHaveCount(0);

  // 3. Related Saints — generated from theme tags ("More <theme>" links).
  const rel = page.locator("details.sv-deep", {
    has: page.locator(".sv-deep-eb", { hasText: "Related Saints" }),
  });
  await rel.locator("summary").click();
  expect(
    await rel.locator("a.sv-themelink[href*='theme=']").count(),
  ).toBeGreaterThan(0);
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
