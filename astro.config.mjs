// @ts-check
import { readFileSync } from "node:fs";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// The standalone /group/<slug> pages were replaced by group saint-profiles at
// /saint/<groupId> (build.py assigns each group its own OS-#### and emits it as
// a profile_type:"group" record). Redirect the old URLs to the new ones so
// existing links/bookmarks/search results keep resolving. Built from
// public/groups.json (emitted by build.py, which MUST run before astro build,
// like data.json); guarded so a missing file never breaks the config.
function groupRedirects() {
  /** @type {Record<string,string>} */
  const map = {};
  try {
    const groups = JSON.parse(readFileSync("public/groups.json", "utf8"));
    for (const g of groups) {
      if (g.slug && g.saint_id)
        map[`/group/${g.slug}`] = `/saint/${g.saint_id}`;
    }
  } catch {
    // groups.json not built yet — no redirects this run.
  }
  return map;
}

// Retired saint IDs (deduplicated rows, data/retired_ids.csv) 301 to their
// canonical page, so an old /saint/OS-#### link/bookmark keeps resolving instead
// of 404-ing. Parsed straight from the source CSV (retired_id = col 0,
// canonical_id = col 2 — both OS-#### tokens with no commas before them).
function retiredRedirects() {
  /** @type {Record<string,string>} */
  const map = {};
  try {
    const csv = readFileSync("data/retired_ids.csv", "utf8");
    for (const line of csv.split(/\r?\n/).slice(1)) {
      const cols = line.split(",");
      const retired = (cols[0] || "").trim();
      const canonical = (cols[2] || "").trim();
      if (/^OS-\d{4,}$/.test(retired) && /^OS-\d{4,}$/.test(canonical))
        map[`/saint/${retired}`] = `/saint/${canonical}`;
    }
  } catch {
    // retired_ids.csv absent — no redirects this run.
  }
  return map;
}

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
  // 301 the retired /group/<slug> URLs to the group's saint-profile page,
  // retired (deduplicated) saint IDs to their canonical page, and the three
  // short-lived Parish Resources sub-pages to the single page replacing them.
  redirects: {
    ...groupRedirects(),
    ...retiredRedirects(),
    "/visitors-catechumens": "/parish-resources",
    "/churches-bookstores": "/parish-resources",
    "/teachers-ministries": "/parish-resources",
  },
  // Emits sitemap-index.xml + sitemap-0.xml into _site/ (every static route,
  // including all /saint/OS-#### pages). Referenced from static/robots.txt.
  integrations: [sitemap()],
});
