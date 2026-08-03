import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

// The carousel renders one card per data/saint_depictions.csv row, so the
// expected counts are READ FROM THE BUILD rather than hard-coded — otherwise
// every icon added to a saint breaks this test (it did: #367).
// public/data.json is emitted by `python build.py`, which runs before the
// Astro build in both `make web-build` and CI.
type Depiction = { kind?: string };
type Hymn = {
  kind: string;
  text: string[];
  tone?: string;
  source?: string;
  permission?: boolean;
  attribution?: string;
  translation?: string;
};
const RECORDS: { id: string; depictions?: Depiction[]; hymns?: Hymn[] }[] =
  JSON.parse(readFileSync("public/data.json", "utf8"));
const depictionsOf = (id: string) =>
  RECORDS.find((r) => r.id === id)?.depictions ?? [];
const firstWithHymns = () => RECORDS.find((r) => r.hymns?.length);

test("Basil's page renders the rich profile biography", async ({ page }) => {
  const resp = await page.goto("./saint/OS-0021/");
  expect(resp?.status()).toBe(200);
  // Existing detail framing is intact.
  await expect(page.locator(".saintview .sv-rail")).toBeVisible();
  // The fixed feast (Jan 1) shows its Old Calendar civil day alongside the New.
  await expect(page.locator(".sv-fday-cal--old .sv-fday-date")).toHaveText(
    "January 14",
  );
  await expect(page.locator(".sv-fday-cal--old .sv-fday-cap")).toHaveText(
    "Old Calendar",
  );
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
  // OS-2924 (St. Marcian the Emperor) is a stub with no profile YAML,
  // so its page renders no rich-profile sections in any build mode.
  await page.goto("./saint/OS-2924/");
  await expect(page.locator(".saintview .sv-name")).toContainText("Marcian");
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

  // 3. Related Saints — curated cross-linked saints (profile.related), with the
  //    tag-derived "More <theme>" links demoted to a "Browse similar" sub-row.
  const rel = page.locator("details.sv-deep", {
    has: page.locator(".sv-deep-eb", { hasText: "Related Saints" }),
  });
  await rel.locator("summary").click();
  // Curated card: John Chrysostom links to his saint page.
  await expect(
    rel.locator('a.sv-relcard[href*="/saint/OS-0023"]').first(),
  ).toBeVisible();
  // Browse-similar theme links still render beneath the curated cards.
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
  // One card per data/saint_depictions.csv row for OS-0001.
  const rows = depictionsOf("OS-0001");
  expect(rows.length).toBeGreaterThan(0);
  await expect(deps.locator(".sv-dep")).toHaveCount(rows.length);
  // Permission cards carry the "shop" tone; PD masters the museum tone.
  await expect(deps.locator(".sv-dep-tag--shop")).toHaveCount(
    rows.filter((d) => d.kind === "shop").length,
  );
  await expect(deps.locator(".sv-dep-tag--museum")).toHaveCount(
    rows.filter((d) => d.kind === "museum").length,
  );
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

test("a saint with a long Daily Dove file folds it behind a compact index", async ({
  page,
}) => {
  // OS-0020 (St Spyridon) carries the paper's longest run on one saint, which
  // is what the fold exists for: three dispatches lead in full, the rest sit
  // behind one <details> as a one-line-each index grouped by era.
  const resp = await page.goto("./saint/OS-0020/");
  expect(resp?.status()).toBe(200);
  const band = page.locator(".dove-band");
  await expect(band.locator(".dove-band-ct")).toHaveText("23 dispatches");
  await expect(band.locator(".dove-band-list > li")).toHaveCount(3);

  // The remainder is collapsed on arrival — that is the whole point.
  const rest = band.locator(".dove-band-rest");
  await expect(rest.locator(".dbx-list a")).toHaveCount(20);
  await expect(rest.locator(".dbx-list a").first()).not.toBeVisible();

  // Native disclosure: no island, so it must work with the summary alone.
  await rest.locator("summary").click();
  await expect(rest.locator(".dbx-list a").first()).toBeVisible();

  // Opening it must not run the page down — the index is a fixed window that
  // scrolls within itself, so twenty rows stay inside a capped pane.
  const pane = await rest.locator(".dove-band-idx").evaluate((el) => ({
    clientH: el.clientHeight,
    scrollH: el.scrollHeight,
    overflowY: getComputedStyle(el).overflowY,
  }));
  expect(pane.overflowY).toBe("auto");
  expect(pane.clientH).toBeLessThanOrEqual(420);
  // …and there is genuinely more list below the fold of the pane.
  expect(pane.scrollH).toBeGreaterThan(pane.clientH + 20);
  // Era groups head the index, each row tagged with the desk that filed it.
  expect(await rest.locator(".dbx-era").count()).toBeGreaterThanOrEqual(2);
  await expect(rest.locator(".dbx-desk").first()).not.toBeEmpty();

  // A row links to its own dispatch, and the foot links into the archive
  // pre-filtered to this saint's file.
  await expect(rest.locator(".dbx-list a").first()).toHaveAttribute(
    "href",
    /\/daily-dove\/spyridon-/,
  );
  await expect(band.locator(".dove-band-arch")).toHaveAttribute(
    "href",
    /\/daily-dove\/archive#saint-Spyridon$/,
  );
});

test("a saint with a short Daily Dove file is left unfolded", async ({
  page,
}) => {
  // The fold must not fire on the ordinary case: OS-0067 (Charalampos) has a
  // single dispatch and should still show it outright.
  const resp = await page.goto("./saint/OS-0067/");
  expect(resp?.status()).toBe(200);
  const band = page.locator(".dove-band");
  await expect(band.locator(".dove-band-list > li")).toHaveCount(1);
  await expect(band.locator(".dove-band-rest")).toHaveCount(0);
  await expect(band.locator(".dove-band-ct")).toHaveCount(0);
});

// The hymn block reproduces text under a permission grant, so the assertion
// that matters is not "a hymn rendered" but "the credit rendered WITH it and
// links back" — that pairing is the condition the text is used under (§9,
// docs/permissions/oca.md). Driven off the build like the carousel above, so
// adding hymns never breaks this.
test("a saint with hymns shows the text and its required attribution", async ({
  page,
}) => {
  const rec = firstWithHymns();
  test.skip(
    !rec,
    "no saint carries a hymn yet (data/saint_hymns.csv is empty)",
  );
  const hymns = rec!.hymns!;

  const resp = await page.goto(`./saint/${rec!.id}/`);
  expect(resp?.status()).toBe(200);
  // The hymns are a folded `sv-deep` collapsible opening the reference
  // apparatus, so the summary states the count and a click reveals them.
  const deep = page.locator("details.sv-hymns-deep");
  await expect(deep).toHaveCount(1);
  await expect(deep.locator(".sv-deep-ct")).toHaveText(
    `${hymns.length} ${hymns.length === 1 ? "hymn" : "hymns"}`,
  );
  const block = deep.locator(".sv-hymns");
  await expect(block).not.toBeVisible();
  await deep.locator("summary").click();
  await expect(block).toBeVisible();
  await expect(block.locator(".sv-hymn")).toHaveCount(hymns.length);
  await expect(page.locator(".sv-fday")).toBeVisible();

  const first = block.locator(".sv-hymn").first();
  const h = hymns[0];
  await expect(first.locator(".sv-hymn-kind")).toHaveText(h.kind);
  if (h.tone && /^\d+$/.test(h.tone)) {
    await expect(first.locator(".sv-hymn-tone")).toHaveText(`Tone ${h.tone}`);
  }
  // Verbatim: the phrase-break slashes become <br>, the words are untouched.
  const rendered = (await first.locator(".sv-hymn-text").innerText())
    .replace(/\s+/g, " ")
    .trim();
  const expected = h.text.join(" ").replace(/ \/ /g, " ").replace(/\s+/g, " ");
  expect(rendered).toBe(expected);

  // The credit is non-negotiable, and a permission hymn must link its source.
  const credit = first.locator(".sv-hymn-credit");
  await expect(credit).toHaveText(h.attribution ?? h.translation ?? "");
  if (h.permission) {
    expect(h.source, "a permission hymn must carry a source URL").toBeTruthy();
    await expect(credit.locator("a")).toHaveAttribute("href", h.source!);
  }

  // The derived Google searches are ways to go LOOK for a troparion or an icon
  // elsewhere. With the real thing on the page they offer strictly less, so the
  // tiles are dropped rather than left to compete: the hymn search always here,
  // and the icon search whenever the saint has a portrait or a carousel.
  await expect(
    page.locator('.sv-reslinks a[data-umami-event-kind="hymn"]'),
  ).toHaveCount(0);
  const hasImagery = !!rec!.image || (rec!.depictions?.length ?? 0) > 0;
  await expect(
    page.locator('.sv-reslinks a[data-umami-event-kind="icon"]'),
  ).toHaveCount(hasImagery ? 0 : 1);
});

test("a saint without hymns keeps the Hymn / Apolytikion search link", async ({
  page,
}) => {
  // The converse of the test above — the link must only disappear when it is
  // genuinely superseded, not for everyone.
  const rec = RECORDS.find((r) => !r.hymns?.length && r.id === "OS-0021");
  expect(rec, "OS-0021 is expected to carry no hymn row").toBeTruthy();
  await page.goto("./saint/OS-0021/");
  await expect(page.locator(".sv-hymns")).toHaveCount(0);
  await expect(
    page.locator('.sv-reslinks a[data-umami-event-kind="hymn"]'),
  ).toHaveCount(1);
});
