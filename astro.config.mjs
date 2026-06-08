// @ts-check
import { defineConfig } from "astro/config";

// GitHub Pages with the custom domain orthodoxsaintfinder.com: served at the
// root, so `base` is the default "/". `site` makes Astro emit correct absolute
// canonical URLs. (orthodoxsaintregistry.com / patronsaintfinder.com 301 here;
// the old simplythomas.github.io/orthodox-saints/ URLs redirect via Pages.)
// `outDir: _site` keeps Astro's output separate from `dist/` (the xlsx export).
export default defineConfig({
  site: "https://orthodoxsaintfinder.com",
  outDir: "./_site",
  // `public/` belongs to the Python pipeline (build.py writes data.json there and
  // copy_web() may dump the old SPA there). Point Astro's static dir elsewhere so
  // it doesn't copy those into the site. data.json is imported as a module, not
  // served from here. `static/` holds only genuinely-static assets (none yet).
  publicDir: "./static",
  trailingSlash: "ignore",
  build: { format: "directory" },
});
