import { test, expect } from "@playwright/test";

/* The day panel's appointed readings (docs/lectionary.md).

   The block is filled asynchronously — the island reserves its slot and fetches
   the year's shard — so these also guard the ordering: a slow fetch must not
   drop the readings below the commemoration list. */

test.describe("calendar readings", () => {
  test("the selected day shows its appointed readings, named by usage", async ({
    page,
  }) => {
    await page.goto("calendar");

    const readings = page.locator(".cal-read");
    await expect(readings).toBeVisible();
    await expect(readings.locator(".cal-read-head")).toHaveText(
      "Readings for the day",
    );

    // At least one citation, and it links out to the passage rather than
    // reproducing it (§9).
    const refs = readings.locator(".cal-read-ref");
    expect(await refs.count()).toBeGreaterThan(0);

    // The usage is always named — there is no single Orthodox lectionary.
    await expect(readings.locator(".cal-read-trad")).toHaveText(
      "Byzantine-Greek usage",
    );

    // The readings sit with the liturgical block, above the day's saints.
    const panel = page.locator("#cal-panel");
    const order = await panel.evaluate((el) =>
      Array.from(el.children).map((c) => c.className),
    );
    const readIndex = order.findIndex((c) => c.includes("cal-read-slot"));
    const listIndex = order.findIndex((c) => c.includes("cal-list"));
    expect(readIndex).toBeGreaterThan(-1);
    if (listIndex > -1) expect(readIndex).toBeLessThan(listIndex);
  });

  test("the Old Calendar toggle switches to Slavic usage", async ({ page }) => {
    await page.goto("calendar");
    await expect(page.locator(".cal-read-trad")).toHaveText(
      "Byzantine-Greek usage",
    );

    await page.locator("#cal-style-old").click();
    await expect(page.locator(".cal-read-trad")).toHaveText("Slavic usage");
  });

  test("a passage link points at the citation, not at scripture text", async ({
    page,
  }) => {
    await page.goto("calendar");
    const link = page.locator("a.cal-read-ref").first();
    await expect(link).toHaveAttribute("href", /biblegateway\.com\/passage/);
    await expect(link).toHaveAttribute("target", "_blank");
  });
});
