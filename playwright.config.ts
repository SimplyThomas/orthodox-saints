import { defineConfig, devices } from "@playwright/test";

// Smoke tests run against the real built site via `astro preview`, which honors
// the configured base path — the only way to catch base-path regressions.
// (Root "/" since the move to the orthodoxsaintfinder.com custom domain.)
const BASE = "/";
const PORT = 4321;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Preview serves the prebuilt _site/. The build must already have run
    // (python build.py --no-xlsx && npm run build) so data.json is inlined.
    command: `npm run preview -- --port ${PORT}`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
