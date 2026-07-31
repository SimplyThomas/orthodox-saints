import { test, expect } from "@playwright/test";

// Phone-overflow regression guard. Saint and witness pages (both the .saintview
// design system) must never scroll sideways at phone widths — the feast block's
// full-length month names, long collapsible section headings, and the depictions
// carousel have each caused this. Fixtures are reviewed pages picked to render
// those layouts (OS-0000 also carries the 10-card carousel and a Companions
// section; the witness pages carry long editorial section headings). This spec
// also runs under the WebKit engine iOS uses — see the `mobile-safari` project
// in playwright.config.ts.
const FIXTURES = [
  "/saint/OS-0000/",
  "/saint/OS-0001/",
  "/saint/OS-0009/",
  "/saint/OS-0024/",
  "/saint/OS-0038/",
  "/saint/OS-0021/",
  "/witness/mother-alexandra/",
];
const WIDTHS = [393]; // iPhone 16 Pro — the reported device

for (const path of FIXTURES) {
  for (const width of WIDTHS) {
    test(`no sideways scroll: ${path} @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 852 });
      await page.goto(`.${path}`);
      await expect(page.locator(".saintview")).toBeVisible();

      const { scrolls, offenders } = await page.evaluate(() => {
        const de = document.documentElement;
        const vw = de.clientWidth;
        const off: string[] = [];
        for (const el of Array.from(document.querySelectorAll("body *"))) {
          if (el.getBoundingClientRect().right <= vw + 1) continue;
          // Ignore anything inside a horizontal scroll container: the carousel
          // legitimately parks its off-screen cards past the edge.
          let n: HTMLElement | null = el.parentElement;
          let contained = false;
          while (n) {
            const ox = getComputedStyle(n).overflowX;
            if (ox === "auto" || ox === "scroll") {
              contained = true;
              break;
            }
            n = n.parentElement;
          }
          if (!contained) {
            off.push(
              typeof el.className === "string" && el.className
                ? el.className.slice(0, 50)
                : el.tagName.toLowerCase(),
            );
          }
        }
        return {
          scrolls: de.scrollWidth - de.clientWidth,
          offenders: [...new Set(off)],
        };
      });

      // The real signal is page-level horizontal scroll; the offender list is
      // only a debugging hint attached to the failure message.
      expect(
        scrolls,
        `page scrolls ${scrolls}px sideways; offenders: ${
          offenders.join(" | ") || "(none pinpointed)"
        }`,
      ).toBeLessThanOrEqual(1);
    });
  }
}

test("depictions carousel scrolls rather than hiding its extra cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("./saint/OS-0000/");
  const track = page.locator(".sv-deps-track");
  await expect(track).toBeVisible();

  const info = await track.evaluate((t) => {
    let clip: string | null = null;
    let n = t.parentElement;
    while (n) {
      const c = getComputedStyle(n);
      if (c.overflowX === "hidden" || c.overflow === "hidden") {
        clip = n.className;
        break;
      }
      n = n.parentElement;
    }
    return {
      overflowX: getComputedStyle(t).overflowX,
      scrollable: t.scrollWidth > t.clientWidth + 1,
      clip,
    };
  });

  // More cards than fit — they must be reachable by scrolling, not clipped away.
  expect(info.scrollable).toBe(true);
  expect(info.overflowX).toMatch(/auto|scroll/);
  expect(info.clip, `carousel clipped by ancestor .${info.clip}`).toBeNull();
  // The arrow affordance is kept on mobile (not display:none), so the strip
  // does not read as a dead-end of hidden content. (Absolute positioning
  // blockifies the base inline-flex to flex; the point is that it is not none.)
  const arrowDisplay = await page
    .locator(".sv-deps-arrow.next")
    .evaluate((el) => getComputedStyle(el).display);
  expect(arrowDisplay).not.toBe("none");
});

test("the Daily Dove index does not scroll sideways once opened", async ({
  page,
}) => {
  // The fold's compact index is the one part of a saint page that is not in the
  // DOM's visible layout on arrival, so the FIXTURES loop above cannot see it.
  // Its dateline column caused 80px of sideways scroll before it was capped.
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("./saint/OS-0020/");
  const rest = page.locator("details.dove-band-rest");
  await expect(rest).toHaveCount(1);
  await rest.locator("summary").click();
  await expect(rest.locator(".dbx-list a").first()).toBeVisible();

  const scrolls = await page.evaluate(() => {
    const de = document.documentElement;
    return de.scrollWidth - de.clientWidth;
  });
  expect(scrolls, `page scrolls ${scrolls}px sideways`).toBeLessThanOrEqual(1);

  // The pane is a vertical scroller, so `overflow-x: hidden` would now clip a
  // wide row away before it could reach the document — checking the page alone
  // no longer proves anything. Measure the pane's own horizontal scroll too.
  const pane = await rest.locator(".dove-band-idx").evaluate((el) => ({
    sideways: el.scrollWidth - el.clientWidth,
    overflowX: getComputedStyle(el).overflowX,
  }));
  expect(pane.overflowX).toBe("hidden");
  expect(
    pane.sideways,
    `index pane scrolls ${pane.sideways}px sideways`,
  ).toBeLessThanOrEqual(1);
});
