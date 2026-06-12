// One-off generator for static/og-default.png — the 1200x630 OpenGraph share
// card used by every page that has no portrait of its own (BaseLayout default).
// Re-run after a wordmark or tagline change:  node scripts/make_og_image.mjs
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const logo = readFileSync(path.join(root, "src/assets/logo-ivory.svg"), "utf8");

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Spectral:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    background: #0f2238;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: "Spectral", serif;
  }
  .frame {
    position: absolute; inset: 28px; border: 1px solid rgba(212, 175, 55, 0.45);
    pointer-events: none;
  }
  .logo svg { width: 760px; height: auto; display: block; }
  .rule {
    width: 320px; height: 1px; background: #d4af37; margin: 8px 0 26px;
    position: relative;
  }
  .rule::after {
    content: ""; position: absolute; left: 50%; top: 50%;
    width: 7px; height: 7px; background: #d4af37;
    transform: translate(-50%, -50%) rotate(45deg);
  }
  .tagline {
    color: #f5ebd8; opacity: 0.92; font-size: 30px; font-weight: 400;
    letter-spacing: 0.04em; text-align: center; max-width: 900px;
  }
</style></head>
<body>
  <div class="frame"></div>
  <div class="logo">${logo}</div>
  <div class="rule"></div>
  <div class="tagline">Find Orthodox saints by feast day, vocation, region, virtue, and intercession.</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.setContent(html, { waitUntil: "networkidle" });
// eslint-disable-next-line no-undef -- runs in the page (browser) context
await page.evaluate(() => document.fonts.ready);
const out = path.join(root, "static/og-default.png");
await page.screenshot({ path: out, type: "png" });
await browser.close();
console.log(`wrote ${out}`);
