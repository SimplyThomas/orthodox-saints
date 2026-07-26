import { defineConfig, devices } from "@playwright/test";

// Smoke tests run against the real built site via `astro preview`, which honors
// the configured base path — the only way to catch base-path regressions.
// (Root "/" since the move to the orthodoxsaintfinder.com custom domain.)
const BASE = "/";
// E2E_PORT lets parallel checkouts/worktrees run the suite side by side —
// with a fixed port, reuseExistingServer latches onto whatever is already
// listening there (e.g. another session's dev server, dev toolbar and all)
// instead of this build's preview.
const PORT = Number(process.env.E2E_PORT) || 4321;

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
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // The phone-overflow guard also runs under the real WebKit/Safari engine at
    // iPhone width (iPhone 15 Pro ≈ the 16 Pro's 393px viewport; no 16 Pro
    // descriptor exists yet). Scoped to that one spec via testMatch so the full
    // suite stays chromium-only and fast, while the layout regressions we care
    // about get checked under the engine iOS actually renders with.
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 15 Pro"] },
      testMatch: /overflow\.spec\.ts/,
    },
  ],
  webServer: {
    // Preview serves the prebuilt _site/. The build must already have run
    // (python build.py --no-xlsx && npm run build) so data.json is inlined.
    command: `npm run preview -- --port ${PORT}`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
