import { test, expect } from "@playwright/test";

// Root base path since the move to the orthodoxsaintfinder.com custom domain.
// Internal hrefs must still be absolute-from-root (withBase), never relative.
const BASE = "/";
const SITE = "https://orthodoxsaintfinder.com";

test("home loads with title and a resolvable logo", async ({ page }) => {
  const resp = await page.goto("./");
  expect(resp?.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/Cloud of Witnesses/);

  // The logo must resolve under the base path (not 404) — guards the #1 base-path bug.
  const logo = page.locator("header .brand img");
  const src = await logo.getAttribute("src");
  expect(src?.startsWith(BASE)).toBe(true);
  const logoResp = await page.request.get(new URL(src!, page.url()).href);
  expect(logoResp.status()).toBe(200);
});

test("home is a landing page: saint of the day, shuffle, news — no finder", async ({
  page,
}) => {
  await page.goto("./");
  // Saint of the day renders client-side for the visitor's real date.
  await expect(page.locator("#sotd .sotd-card")).toBeVisible();
  // The shuffle deck deals four cards and re-deals on click.
  await expect(page.locator("#featured .feat-card")).toHaveCount(4);
  await page.click("#shuffle");
  await expect(page.locator("#featured .feat-card")).toHaveCount(4);
  // News band is present; the full results list is not on this page.
  await expect(page.locator(".news-band .news-card")).toHaveCount(4);
  await expect(page.locator("#results")).toHaveCount(0);
});

test("hero search submits to the /search page with the query", async ({
  page,
}) => {
  await page.goto("./");
  await page.fill("#q", "Nicholas");
  await page.click("#hero-search-btn");
  await page.waitForURL(/\/search\/?\?q=Nicholas/);
  // The search page seeds its query from ?q= and filters.
  await expect(page.locator("#results-title")).toContainText("Nicholas");
  await expect(
    page.locator("#results .saint-row h3", { hasText: "Nicholas" }).first(),
  ).toBeVisible();
});

test("search page filters the results", async ({ page }) => {
  await page.goto("./search/");
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

test("search page lets the reader choose how many results show", async ({
  page,
}) => {
  await page.goto("./search/");
  await expect(page.locator("#results .saint-row").first()).toBeVisible();
  // Default page size, then narrow and widen it via the "Show" control.
  await expect(page.locator("#results .saint-row")).toHaveCount(24);
  await page.selectOption("#per-page", "12");
  await expect(page.locator("#results .saint-row")).toHaveCount(12);
  await page.selectOption("#per-page", "96");
  await expect(page.locator("#results .saint-row")).toHaveCount(96);
});

test("clicking a result navigates to the full saint page", async ({ page }) => {
  await page.goto("./search/");
  const first = page.locator("#results .saint-row").first();
  const href = await first.getAttribute("href");
  expect(href).toMatch(/\/saint\/OS-/);
  await first.click();
  // The quick-look modal is gone; the detail is its own data-driven page.
  await page.waitForURL(/\/saint\/OS-/);
  await expect(page.locator(".saintview .sv-name")).toBeVisible();
  await expect(page.locator(".saintview .sv-rail")).toBeVisible();
  // Reached from /search, the back link points to the saints list.
  await expect(page.locator(".sv-back-link .sv-back-label")).toHaveText(
    "Back to the saints",
  );
});

test("a saint reached from the America page links back to America", async ({
  page,
}) => {
  await page.goto("./america/");
  await page.locator(".pga-card.clickable").first().click();
  await page.waitForURL(/\/saint\/OS-/);
  // The back link is rewritten to point at the America page, by name and href.
  const back = page.locator(".sv-back-link");
  await expect(back.locator(".sv-back-label")).toHaveText(
    "Back to Saints of America",
  );
  await expect(back).toHaveAttribute("href", /\/america\/?$/);
  await back.click();
  await page.waitForURL(/\/america\/?$/);
});

test("static per-saint page is real, indexable HTML", async ({ page }) => {
  const resp = await page.goto("./saint/OS-0021/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("h1")).toContainText("Basil");
  // The full data-driven view: icon rail + the liturgical address.
  await expect(page.locator(".saintview .sv-rail")).toBeVisible();
  await expect(page.locator(".sv-address")).toBeVisible();
  const desc = await page
    .locator('meta[name="description"]')
    .getAttribute("content");
  expect(desc && desc.length).toBeTruthy();
  // Canonical URL is absolute and base-correct.
  const canon = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(canon).toBe(`${SITE}/saint/OS-0021/`);
});

test("quiz walks one question per screen to an illuminated patron", async ({
  page,
}) => {
  await page.goto("./quiz/");
  // Intro screen with the begin button; questions are hidden.
  await expect(page.locator(".qz-intro h1")).toContainText(
    "Find Your Patron Saint",
  );
  await expect(page.locator('[data-qstep="0"]')).toBeHidden();
  await page.click("#quiz-begin");

  // Step 1: pick an option (multi-select toggles a gold check).
  const step0 = page.locator('[data-qstep="0"]');
  await expect(step0).toBeVisible();
  await expect(step0.locator(".qz-prog-label")).toContainText("Question 1");
  await step0.locator(".qz-opt").first().click();
  await expect(step0.locator(".qz-opt.on")).toHaveCount(1);
  await step0.locator("[data-continue]").click();

  // Step 2: pick one more, then continue through the rest (skipping is allowed).
  const step1 = page.locator('[data-qstep="1"]');
  await expect(step1).toBeVisible();
  await step1.locator(".qz-opt").first().click();
  for (let i = 1; i < 6; i++) {
    await page.locator(`[data-qstep="${i}"] [data-continue]`).click();
  }

  // Result: illuminated patron panel, actions, and the benediction.
  const patron = page.locator(".qz-patron");
  await expect(patron).toBeVisible();
  await expect(patron.locator("h1")).not.toBeEmpty();
  await expect(page.locator(".qz-benediction")).toContainText(
    /pray to God for us/,
  );
  const readHref = await page.locator(".qz-read").getAttribute("href");
  expect(readHref).toContain(`${BASE}saint/OS-`);
});

test("about page tells the story; the personal email is removed", async ({
  page,
}) => {
  const resp = await page.goto("./about/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator(".ab-hero h1")).toHaveText("About");
  await expect(page.locator(".ab-scene")).toBeVisible();
  // The personal email has been removed pending a project address; the contact
  // card now carries a placeholder note rather than a mailto link.
  await expect(page.locator(".ab-contact .ab-email")).toBeVisible();
  expect(await page.locator("a[href^='mailto:']").count()).toBe(0);
});

test("america page shows three gilded carousels with arrows", async ({
  page,
}) => {
  const resp = await page.goto("./america/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator(".pga-movement")).toHaveCount(3);
  await expect(page.locator(".pga-card").first()).toBeVisible();
  // The witnesses panel keeps not-yet-glorified figures clearly set apart.
  await expect(
    page
      .locator(".pga-movement.plum .pga-card .tag", {
        hasText: "Not yet glorified",
      })
      .first(),
  ).toBeVisible();
  // Three full cards show per view at desktop width (none clipped).
  const firstTrack = page.locator(".pga-movement.garnet .pga-track");
  const m = await firstTrack.evaluate((t) => {
    const cards = [...t.querySelectorAll(".pga-card")];
    const tr = t.getBoundingClientRect();
    const fully = cards.filter((c) => {
      const r = c.getBoundingClientRect();
      return r.left >= tr.left - 1 && r.right <= tr.right + 1;
    }).length;
    const gap = parseFloat(getComputedStyle(t).columnGap);
    return { fully, stride: cards[0].getBoundingClientRect().width + gap };
  });
  expect(m.fully).toBe(3);
  // The "next" arrow advances a full page — three cards over.
  await expect(
    page.locator(".pga-movement.garnet .pga-arrow.next"),
  ).toHaveClass(/show/);
  await page.locator(".pga-movement.garnet .pga-arrow.next").click();
  await expect
    .poll(async () => firstTrack.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(m.stride * 2.5);
});

test("a Witness of Our Time opens a memorial page, set apart from the saints", async ({
  page,
}) => {
  await page.goto("./america/");
  // The not-yet-glorified cards link to their own /witness/<slug> memorial page.
  // (Roman Braga uses the simple memorial template — Ephraim & Seraphim have
  // their own comprehensive profiles, tested separately.)
  const card = page.locator('.pga-card[href*="/witness/roman-braga"]');
  await expect(card).toBeVisible();
  await card.click();
  await page.waitForURL(/\/witness\/roman-braga/);
  // Memorial framing — and clearly NOT a saint/veneration page.
  await expect(page.locator(".wt-name")).toBeVisible();
  await expect(page.locator(".wt-notice")).toContainText("Not yet glorified");
  await expect(page.locator(".sv-address")).toHaveCount(0); // no liturgical address
  expect(await page.getByText("pray to God for us").count()).toBe(0);
  // The back link returns to the America page.
  await page.locator(".wt-back-link").click();
  await page.waitForURL(/\/america\/?$/);
});

test("Elder Ephraim has a comprehensive, sourced profile — still set apart", async ({
  page,
}) => {
  const resp = await page.goto("./witness/ephraim-of-arizona/");
  expect(resp?.status()).toBe(200);
  // The rich profile renders its sections (not the simple memorial template).
  await expect(page.locator(".sv-name")).toContainText("Elder Ephraim");
  for (const h of [
    "Spiritual Lineage",
    "Monasteries Associated with Elder Ephraim",
    "Selected Teachings",
    "Sources",
  ]) {
    await expect(page.locator(".ep-sec h2", { hasText: h })).toBeVisible();
  }
  // Still a memorial, not a veneration page.
  await expect(page.locator(".ep-notice")).toContainText("Not yet glorified");
  expect(await page.getByText("pray to God for us").count()).toBe(0);
  // Sourced: the monastery/works tables and Sources list carry real links.
  expect(await page.locator(".ep-sources a").count()).toBeGreaterThanOrEqual(8);
  // An internal lineage/related link resolves to a real saint page.
  const related = page.locator('.ep-related a[href*="/saint/OS-"]').first();
  await expect(related).toBeVisible();
  // Back link returns to America.
  await page.locator(".sv-back-link").click();
  await page.waitForURL(/\/america\/?$/);
});

test("Father Seraphim Rose has a comprehensive, sourced profile — still set apart", async ({
  page,
}) => {
  const resp = await page.goto("./witness/seraphim-rose/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator(".sv-name")).toContainText("Hieromonk Seraphim");
  for (const h of [
    "From Spiritual Seeker to Orthodox Monk",
    "The Orthodox Word",
    "Works by Father Seraphim Rose",
    "Sources",
  ]) {
    await expect(page.locator(".sr-sec h2", { hasText: h })).toBeVisible();
  }
  // Still a memorial, not a veneration page.
  await expect(page.locator(".sr-notice")).toContainText("Not yet glorified");
  expect(await page.getByText("pray to God for us").count()).toBe(0);
  // Sourced, with a working lineage link to St John Maximovitch's saint page.
  expect(await page.locator(".sr-sources a").count()).toBeGreaterThanOrEqual(6);
  await expect(
    page.locator('.sr-lin-link[href*="/saint/OS-0050"]'),
  ).toBeVisible();
  // Related Witnesses links across to Elder Ephraim's witness profile.
  await expect(
    page.locator('.sr-related a[href*="/witness/ephraim-of-arizona"]'),
  ).toBeVisible();
  // Back link returns to America.
  await page.locator(".sv-back-link").click();
  await page.waitForURL(/\/america\/?$/);
});

test("news index shows a coming-soon placeholder", async ({ page }) => {
  const resp = await page.goto("./news/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator(".news-title")).toHaveText("Saints in the News");
  await expect(page.locator(".news-soon-label")).toHaveText("Coming soon");
  // The section is parked: none of the old archive UI renders.
  await expect(page.locator(".np-lead")).toHaveCount(0);
  await expect(page.locator(".np-river")).toHaveCount(0);
  // The placeholder's actions point at live pages.
  await expect(
    page.locator(".news-actions a", { hasText: "Browse the saints" }),
  ).toBeVisible();
  await expect(
    page.locator(".news-actions a", { hasText: "Find your patron" }),
  ).toBeVisible();
});

test("on mobile the nav collapses into a hamburger dropdown", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("./");
  const toggle = page.locator(".nav-toggle");
  await expect(toggle).toBeVisible();
  // Links are hidden in the closed dropdown, revealed on toggle, hidden on Escape.
  const link = page.locator(".site-nav a", { hasText: "Calendar" });
  await expect(link).toBeHidden();
  await toggle.click();
  await expect(link).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(link).toBeHidden();
});

test("primary nav links are base-prefixed and resolve", async ({ page }) => {
  await page.goto("./");
  const nav = page.locator(".site-nav");
  for (const label of [
    "Home",
    "Calendar",
    "Browse",
    "America",
    "News",
    "Patron Quiz",
    "About",
  ]) {
    const href = await nav
      .getByRole("link", { name: label, exact: true })
      .getAttribute("href");
    expect(href?.startsWith(BASE)).toBe(true);
  }
  // The header quick-search pill routes to the search page.
  const qs = await page.locator(".header-search").getAttribute("href");
  expect(qs).toContain(`${BASE}search`);
});

test("contribute page renders, validates, and is linked from the footer", async ({
  page,
}) => {
  const resp = await page.goto("./contribute/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator(".cb-title")).toHaveText("Contribute");
  await expect(page.locator("#cb-types .chip")).toHaveCount(7);
  // Empty submit reveals validation and does NOT navigate away (mailto guard).
  await page.locator(".cb-send").click();
  await expect(page.locator('.err[data-for="cb-name"]')).toBeVisible();
  await expect(page).toHaveURL(/\/contribute\/?$/);
  // Footer links here.
  await expect(
    page.locator('.cw-foot-links a[href$="/contribute"]'),
  ).toHaveCount(1);
});

test("corrections page renders, validates, and is linked from the footer", async ({
  page,
}) => {
  const resp = await page.goto("./corrections/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator(".cr-title")).toHaveText("Suggest a Correction");
  await expect(page.locator("#cr-types .chip")).toHaveCount(6);
  // Empty submit reveals validation (no GitHub tab opened on invalid input).
  await page.locator(".cr-send").click();
  await expect(page.locator('.err[data-for="cr-subject"]')).toBeVisible();
  // Footer links here.
  await expect(
    page.locator('.cw-foot-links a[href$="/corrections"]'),
  ).toHaveCount(1);
});
