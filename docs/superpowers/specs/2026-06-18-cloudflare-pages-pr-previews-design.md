# Cloudflare Pages PR Preview Deploys — Design

**Date:** 2026-06-18
**Status:** Approved (brainstorming) → implementing
**Goal:** Give every pull request a public, shareable preview URL so changes — especially
visual ones (new saint profiles, layout, calendar) — can be reviewed in a browser by the
author and outside reviewers, at **zero cost**.

## Context

- The site is an Astro static build. Production deploys to **GitHub Pages** on the custom
  domain `orthodoxsaintfinder.com` via `.github/workflows/deploy.yml` (push to `main`).
- Build pipeline: `python build.py` (emits `public/data.json`) → `astro build` → `_site/`.
  For previews, `python build.py --no-xlsx` is used: it skips the Excel export, so the
  only Python dep (`openpyxl`, the sole line in `requirements.txt`) is unnecessary and no
  `pip install` step is required. `build.py --no-xlsx` runs on the standard library alone.
- `astro.config.mjs`: `outDir: "./_site"`, `base` defaults to `/` (root), and
  `site: "https://orthodoxsaintfinder.com"`.
- Rich saint profiles carry `status: draft | reviewed | flagged`; production ships only
  `reviewed`. Drafts/flagged render when `PUBLIC_SHOW_DRAFTS=true` (behind a banner).

## Decision

Use **Cloudflare Pages** (not Netlify). Rationale: the free tier has **unlimited
bandwidth/requests** and 500 builds/month with **no payment method required**, so there is
no path to a charge — the strongest fit for the hard zero-cost constraint. (Netlify's free
tier caps build minutes and bandwidth; ample here but not unlimited.)

Build configuration lives in a **committed build script** (reviewable, reproducible),
with the Cloudflare dashboard holding only the connect + output dir + one env var.

## Architecture & flow

1. A Cloudflare Pages project is connected to the `SimplyThomas/orthodox-saints` GitHub repo
   (one-time, via the Cloudflare dashboard — user action).
2. On every push to any branch and every PR, Cloudflare clones, installs Node deps, runs the
   build command, and publishes the `_site/` output to a unique preview URL
   (`<hash>.<project>.pages.dev`). The deploy status + URL surface as a check on the PR.
3. Production (GitHub Pages → `orthodoxsaintfinder.com`) is **untouched**. Cloudflare never
   serves the production domain; the two systems run side by side.

## Repo changes

- **`scripts/cf-pages-build.sh`** — the preview build command:
  - resolve a Python interpreter defensively (`python3` then `python`),
  - `python build.py --no-xlsx` (emits `public/data.json`, no `pip` needed),
  - `npm ci` only if `node_modules` is absent (Cloudflare auto-installs Node deps first),
  - `npm run build` (Astro → `_site/`).
- **`.node-version`** → `24` — pins previews to the same Node major as production. Cloudflare
  installs any requested version on demand. (Does not affect `deploy.yml`, which sets the
  Node version explicitly via `setup-node`.) No `.python-version` file: the image default
  (Python 3.13.3) already satisfies build.py's 3.11+ requirement.
- **`docs/cloudflare-pages-previews.md`** — the dashboard walkthrough + how previews behave,
  so any maintainer can reproduce or modify the setup.

## Cloudflare dashboard configuration (one-time, user action)

| Setting | Value |
|---|---|
| Build command | `bash scripts/cf-pages-build.sh` |
| Build output directory | `_site` |
| Root directory | `/` (repo root) |
| Environment variable | `PUBLIC_SHOW_DRAFTS` = `true` |
| Production branch | `main` (its `*.pages.dev` build is just a staging mirror; the real prod stays on GitHub Pages) |

## Behavior decisions

- **Drafts visible:** previews set `PUBLIC_SHOW_DRAFTS=true` so draft + flagged profiles
  render (behind the existing banner). Reviewing unpublished generated content is the point.
- **No analytics on previews:** `PUBLIC_UMAMI_WEBSITE_ID` is left unset, so preview traffic
  never reaches production analytics.
- **SEO:** because `site` is hard-coded to the production domain, canonical/OG tags on
  previews point at production — previews won't compete in search. (Optional follow-up: a
  `noindex` guard for `*.pages.dev` hosts if belt-and-suspenders is wanted.)
- **Access:** preview URLs are public, consistent with production already being public.

## Cost

Entirely within Cloudflare Pages' free tier: 500 builds/month, unlimited bandwidth and
requests, no payment method on file. No realistic path to a charge.

## Out of scope (YAGNI)

- Custom preview subdomain (the default `*.pages.dev` URL is enough).
- Access-gating / password-protected previews.
- Migrating production off GitHub Pages.
- Cloudflare Pages Functions / SSR (the site is fully static).

## Verification

- Run `scripts/cf-pages-build.sh` locally and confirm it produces `_site/` with drafts
  visible (a known draft profile's prose appears in its built page).
- After the user connects the project, confirm the first preview deploy is green and the
  preview URL renders, with draft/flagged profiles showing behind the banner.
