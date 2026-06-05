// @ts-check
import { defineConfig } from "astro/config";

// GitHub Pages PROJECT site: served under the `/orthodox-saints/` base path.
// `site` + `base` make Astro emit correct canonical URLs and asset paths.
// `outDir: _site` keeps Astro's output separate from `dist/` (the xlsx export).
export default defineConfig({
  site: "https://simplythomas.github.io",
  base: "/orthodox-saints",
  outDir: "./_site",
  // `public/` belongs to the Python pipeline (build.py writes data.json there and
  // copy_web() may dump the old SPA there). Point Astro's static dir elsewhere so
  // it doesn't copy those into the site. data.json is imported as a module, not
  // served from here. `static/` holds only genuinely-static assets (none yet).
  publicDir: "./static",
  trailingSlash: "ignore",
  build: { format: "directory" },
});
