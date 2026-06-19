# PR preview deploys (Cloudflare Pages)

Every pull request gets a public, shareable **preview URL** so changes — new saint
profiles, layout, calendar, etc. — can be reviewed in a browser without checking out the
branch. Previews are served by **Cloudflare Pages** and cost nothing; production stays on
GitHub Pages (`orthodoxsaintfinder.com`) and is unaffected.

## How it works

- On every push to any branch and every PR, Cloudflare Pages runs
  [`scripts/cf-pages-build.sh`](../scripts/cf-pages-build.sh) and publishes the `_site/`
  output to a per-deploy URL (`<hash>.orthodox-saints.pages.dev`) **and** a stable
  per-branch alias: `https://<branch-alias>.orthodox-saints.pages.dev`, where `<branch-alias>`
  is the branch name lowercased, non-alphanumerics replaced by `-`, truncated to 28 characters
  (e.g. `feat/flagged-banner-and-preview-pr-process` → `feat-flagged-banner-and-prev`). Put the
  alias in the PR's `## Preview` section (see `CLAUDE.md` §12.7).
- The build mirrors production (`python build.py` → `astro build`) but skips the Excel
  export (`--no-xlsx`), so no `pip install` is needed.
- Previews set `PUBLIC_SHOW_DRAFTS=true`, so **draft and flagged** saint profiles render
  (behind a banner). That is deliberate — it lets reviewers see generated content before
  it is promoted to `reviewed`. Production still ships `reviewed`-only.
- `PUBLIC_UMAMI_WEBSITE_ID` is intentionally left unset on previews, so preview traffic
  never reaches production analytics.

## One-time setup (Cloudflare dashboard)

1. **Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.**
2. Authorize the GitHub app and select the `orthodox-saints` repository.
3. On the build-configuration screen set:
   - **Framework preset:** None / Astro (either is fine; the explicit settings below win).
   - **Build command:** `bash scripts/cf-pages-build.sh`
   - **Build output directory:** `_site`
   - **Root directory:** `/` (leave as the repo root)
4. **Environment variables** (Production *and* Preview): add
   `PUBLIC_SHOW_DRAFTS` = `true`.
5. Save and deploy. The first build runs against the production branch (`main`); subsequent
   PRs each get their own preview URL, shown as a check on the PR.

Node and Python versions are pinned by the repo: `.node-version` (`24`) gives previews the
same Node major as production; Cloudflare's default Python (3.13.x) already satisfies
`build.py` (needs 3.11+), so no Python pin is required.

## Notes

- **Production branch:** Cloudflare also builds `main` and serves it at the bare
  `<project>.pages.dev` URL. This is just a staging mirror — the canonical production site
  remains GitHub Pages on the custom domain. No DNS changes are needed.
- **If a Cloudflare build fails on the Node version:** Cloudflare installs any requested
  Node version on demand, but if `24` ever becomes unavailable, set a `NODE_VERSION`
  environment variable (e.g. `22`) in the dashboard, or edit `.node-version`. The Astro
  build also runs on Node 22.
- **Free-tier limits:** 500 builds/month, unlimited bandwidth and requests. No payment
  method is required on the account.

See `docs/superpowers/specs/2026-06-18-cloudflare-pages-pr-previews-design.md` for the
design rationale.
