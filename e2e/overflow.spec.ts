import { test, expect } from "@playwright/test";

// Phone-overflow regression guard. Saint pages must never scroll sideways at
// phone widths — the feast block's full-length month names, long collapsible
// section headings, and the depictions carousel have each caused this. Fixtures
// are reviewed saints picked to render those layouts (OS-0000 also carries the
// 10-card carousel and a Companions section). This spec also runs under the
// WebKit engine iOS uses — see the `mobile-safari` project in
// playwright.config.ts.
const FIXTURES = [
  "OS-0000",
  "OS-0001",
  "OS-0009",
  "OS-0024",
  "OS-0038",
  "OS-0021",
];
const WIDTHS = [393]; // iPhone 16 Pro — the reported device

for (const id of FIXTURES) {
  for (const width of WIDTHS) {
    test(`no sideways scroll: ${id} @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 852 });
      await page.goto(`./saint/${id}/`);
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
