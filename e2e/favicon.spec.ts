import { test, expect } from "@playwright/test";

// The favicon / app-icon bundle installed at the site root. The head links are
// emitted from BaseLayout via withBase(), so they resolve under the base path.

test("core favicon and manifest assets serve 200", async ({ page }) => {
  await page.goto("./");
  for (const rel of [
    "favicon.ico",
    "favicon.svg",
    "apple-touch-icon.png",
    "site.webmanifest",
  ]) {
    const url = new URL(rel, page.url()).href;
    const resp = await page.request.get(url);
    expect(resp.status(), rel).toBe(200);
  }
});

test("home head carries the manifest link and theme-color", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#152848",
  );
});
