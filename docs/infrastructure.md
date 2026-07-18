# Infrastructure inventory — what runs where, what breaks when it vanishes

This page is the operational map for a solo maintainer: every external service the live
site depends on, where each is configured, what fails if it disappears, and how to check
it's alive today. Every fact here traces to a file in this repo (cited inline). Facts only
the account owner can know — expiry dates, account emails, dashboard tenant — are marked
**`FILL-IN (owner)`**; fill them in and keep them current.

Quick mental model: **production is static files built by Astro and served from GitHub
Pages, with Cloudflare in front as the edge cache.** The apex is proxied through
Cloudflare (for the corrections form *and* the production cache); the origin is GitHub
Pages. If Cloudflare's edge cache vanished the site would keep serving from the origin —
just slower and spikier (see [Production edge caching](#1a-production-edge-caching-cloudflare)).
Cloudflare also powers *previews* and the *corrections form*. See
[If X dies](#7-if-x-dies--quick-answers) for the failure map.

**Contents:**

1. [Production hosting](#1-production-hosting)
1a. [Production edge caching (Cloudflare)](#1a-production-edge-caching-cloudflare)
2. [DNS / registrar](#2-dns--registrar)
3. [PR previews (Cloudflare Pages)](#3-pr-previews-cloudflare-pages)
4. [Corrections form backend (Cloudflare Worker)](#4-corrections-form-backend-cloudflare-worker)
5. [Analytics (Umami)](#5-analytics-umami)
6. [Credentials & expiry table](#6-credentials--expiry-table)
7. ["If X dies" — quick answers](#7-if-x-dies--quick-answers)

---

## 1. Production hosting

- **What it is:** the live site `https://orthodoxsaintfinder.com` — static HTML/CSS/JS
  built by Astro and served by **GitHub Pages**. There is no server or database in
  production; every page is pre-rendered at build time.
- **Where it's configured:**
  - Deploy pipeline: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) —
    on every push to `main` (or manual `workflow_dispatch`) it runs `pip install` →
    `python build.py` → `npm ci` → `npm run build` (Astro → `_site/`) → copies the xlsx
    into `_site/` → publishes `_site/` to Pages via `actions/deploy-pages`.
  - Site URL / canonical origin: [`astro.config.mjs`](../astro.config.mjs)
    (`site: "https://orthodoxsaintfinder.com"`, root `base`, `outDir: ./_site`).
  - Custom domain: the `orthodoxsaintfinder.com` CNAME/apex is set on the GitHub Pages
    side (repo **Settings → Pages → Custom domain**) — an owner-managed setting, not in a
    repo file. **`FILL-IN (owner)`** if you need to re-point it.
- **Redirect domains** (per [`CLAUDE.md`](../CLAUDE.md) §11):
  - `orthodoxsaintregistry.com` and `patronsaintfinder.com` **301-redirect** to the apex
    via **Namecheap** (see [DNS / registrar](#2-dns--registrar)).
  - The old `simplythomas.github.io/orthodox-saints/` URLs redirect via GitHub Pages.
- **What breaks if it vanishes:** GitHub Pages down = the whole public site is down. A
  broken `deploy.yml` (or a failing `python build.py`) means new commits stop deploying;
  the last good build stays live because Pages serves the last published artifact.
- **How to verify it's alive today:**
  - `curl -sI https://orthodoxsaintfinder.com/ | head -1` → expect `HTTP/2 200`.
  - GitHub → **Actions → Deploy** workflow: latest run on `main` is green.
  - GitHub → **Settings → Pages**: shows the custom domain, "Your site is live", DNS
    check passing.

## 1a. Production edge caching (Cloudflare)

- **What it is:** Cloudflare sits in front of the GitHub Pages origin (the apex is proxied
  — orange cloud) and **edge-caches production**. Without it, GitHub Pages/Cloudflare only
  cached hashed static assets by extension; HTML and `.json` data returned
  `cf-cache-status: DYNAMIC` and were proxied to the origin on every request, whose
  time-to-first-byte spiked to **8–15s** when cold. The cache rules make Cloudflare cache
  HTML and data at the edge, so the slow origin is off the critical path. **Live since
  2026-07-18** (verified: HTML flips `DYNAMIC → HIT`, the burst spikes are gone).
- **Zone:** `orthodoxsaintfinder.com`, **Zone ID `80a52d0e73ac12ef19b4df71bbfc777c`** (not
  a secret; distinct from the Account ID beside it in the dashboard).
- **Where it's configured:**
  - Cache rules as code: [`infra/cloudflare/`](../infra/cloudflare/) —
    `cache-rules.json` (the ruleset), `apply.sh` (idempotent push via the Cloudflare API),
    and a full first-time setup runbook in
    [`infra/cloudflare/README.md`](../infra/cloudflare/README.md). Two rules: content-hashed
    paths (`/_astro/*`, `/finder-data/*`, `/card-data/*`) cached 1 year immutable; all other
    HTML + `/search-index.json` cached at the edge 1 day (browser 10 min), `/api/*` excluded.
  - Deploy-time purge: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
    step **"Purge Cloudflare edge cache"** (`purge_everything` after the Pages deploy) so a
    new build goes live immediately instead of waiting out the edge TTL. Needs Actions
    secrets **`CF_API_TOKEN`** + **`CF_ZONE_ID`**; skips cleanly if unset.
  - Applying/rotating are owner tasks: create a Cloudflare API token (Zone **Cache Rules:
    Edit** + **Cache Purge: Purge**) and the zone id — full steps in the runbook.
- **What breaks if it vanishes / misconfigures:**
  - Cache rules removed / not applied → back to the slow, spiky DYNAMIC behavior, but the
    site still serves. Not an outage, a performance regression.
  - Deploy purge fails (missing/expired `CF_API_TOKEN`) → new HTML is delayed at the edge
    up to the 1-day TTL; hashed assets are unaffected (new URLs each build).
- **How to verify it's alive today:**
  - `curl -sSI https://orthodoxsaintfinder.com/saint/OS-0192/ >/dev/null && curl -sSI https://orthodoxsaintfinder.com/saint/OS-0192/ | grep -i cf-cache-status`
    → second hit `cf-cache-status: HIT` (was `DYNAMIC` before the rules).
  - The Deploy run's "Purge Cloudflare edge cache" step is green (or reports it skipped).

## 2. DNS / registrar

- **What it is:** DNS for `orthodoxsaintfinder.com` and the two redirect domains
  (`orthodoxsaintregistry.com`, `patronsaintfinder.com`), managed at **Namecheap**
  (per [`CLAUDE.md`](../CLAUDE.md) §11).
- **Where it's configured:** the **Namecheap** dashboard (owner account —
  **`FILL-IN (owner)`** account email). Records are not stored in the repo.
  - The apex `orthodoxsaintfinder.com` must resolve to GitHub Pages **and**, for the
    corrections form to work, be **proxied through Cloudflare (orange cloud)** so the
    Worker route can intercept `/api/report` (see
    [`workers/report/wrangler.toml`](../workers/report/wrangler.toml) and the
    [corrections form](#4-corrections-form-backend) section). This means the domain's
    authoritative DNS is delegated to **Cloudflare**, with the registrar remaining
    Namecheap — **`FILL-IN (owner)`** to confirm the current nameserver delegation.
  - The two redirect domains are configured at Namecheap to 301 to the apex.
- **What breaks if it vanishes:** wrong/expired DNS = the domain stops resolving (site
  unreachable even though Pages is fine) and/or the Cloudflare proxy drops, which also
  takes the corrections form's `/api/report` route offline.
- **How to verify it's alive today:**
  - `dig +short orthodoxsaintfinder.com` returns records;
    `curl -sI https://orthodoxsaintfinder.com/ | head -1` returns `HTTP/2 200`.
  - `curl -sI https://orthodoxsaintregistry.com/` and `.../patronsaintfinder.com/` →
    `301` to the apex.
  - Domain registration and any Cloudflare-zone expiry: **`FILL-IN (owner)`** (renewal
    dates live in the Namecheap / Cloudflare accounts, not the repo).

## 3. PR previews (Cloudflare Pages)

- **What it is:** every branch/PR gets a public preview URL on **Cloudflare Pages**
  (project **`orthodox-saints`**), served at
  `https://<branch-alias>.orthodox-saints.pages.dev`. Previews render `draft` and
  `flagged` profiles (behind a banner) so content can be reviewed before promotion.
  Separate from, and never affecting, production. Full detail:
  [`docs/cloudflare-pages-previews.md`](cloudflare-pages-previews.md).
- **Where it's configured:**
  - Build command: **`bash scripts/cf-pages-build.sh`** (`python build.py --no-xlsx` →
    `astro build`); output dir `_site` — set in the Cloudflare Pages dashboard.
  - Environment variables (Production + Preview): **`PUBLIC_SHOW_DRAFTS=true`**
    (dashboard). `PUBLIC_UMAMI_WEBSITE_ID` is intentionally left **unset** on previews so
    preview traffic never hits production analytics.
  - Node pinned to `24` via [`.node-version`](../.node-version).
  - This is a Git-connected Cloudflare Pages project (dashboard-configured); there is no
    `wrangler.toml` for it in the repo — the config lives in the Cloudflare account.
- **What breaks if it vanishes:** PR preview URLs stop building/serving. **Production is
  unaffected** — reviewers just lose the browser preview and must check out branches
  locally.
- **How to verify it's alive today:** open a recent PR → the **Cloudflare Pages** check is
  green → "Visit deployment" loads the branch at `*.orthodox-saints.pages.dev`. Free-tier
  cap is 500 builds/month (per the previews doc).

## 4. Corrections form backend (Cloudflare Worker)

- **What it is:** the **Suggest a Correction** form at `/corrections` posts to a
  **Cloudflare Worker** named **`cow-report`** ([`workers/report/`](../workers/report/)).
  The Worker verifies a **Cloudflare Turnstile** token, sanitizes the input, and files a
  GitHub issue labelled `data-quality` using a fine-grained GitHub token held as a Worker
  secret. Visitors never touch GitHub and need no account. Full detail:
  [`workers/report/README.md`](../workers/report/README.md).
- **Where it's configured:**
  - Worker code + non-secret config:
    [`workers/report/wrangler.toml`](../workers/report/wrangler.toml) — `name = cow-report`,
    `[vars]` `REPO_OWNER=SimplyThomas`, `REPO_NAME=orthodox-saints`, `ALLOWED_ORIGIN`
    (CORS allow-list), and the `routes` block mapping
    `orthodoxsaintfinder.com/api/report` to the Worker (requires the apex DNS record
    proxied through Cloudflare).
  - Secrets (set via `npx wrangler secret put NAME`, never in the repo): **`GITHUB_TOKEN`**
    (fine-grained PAT, Issues R/W on this repo only) and **`TURNSTILE_SECRET_KEY`**.
  - Turnstile **site key** (public) lives in `src/pages/corrections.astro`
    (`SITE_KEY` constant).
  - Deploy: from `workers/report/`, `npx wrangler deploy`.
  - **Auth note:** every `wrangler` command here (`deploy`, `secret put`, `tail`) needs
    prior Cloudflare auth — run `npx wrangler login` interactively, or set a
    `CLOUDFLARE_API_TOKEN` env var (see the Cloudflare access row in the
    [credentials table](#6-credentials--expiry-table)).
- **What breaks if it vanishes / misconfigures:**
  - Worker down or route unmapped → the form 500s / can't submit; **the rest of the site
    is unaffected** (GitHub Pages serves every path except `/api/report`).
  - `GITHUB_TOKEN` expired/revoked → the Worker's GitHub call fails and the submission
    errors (rotate it, below).
  - `TURNSTILE_SECRET_KEY` wrong → all submissions fail the bot check.
- **How to verify it's alive today:**
  - Submit a test correction on `/corrections` (or `curl` per the README's test recipe) →
    expect a `data-quality` issue in the repo.
  - `cd workers/report && npm test` runs the offline smoke suite (no secrets/network).
  - `cd workers/report && npm run tail` (i.e. `wrangler tail`) streams live Worker logs to
    watch the GitHub-call path.
  - Cloudflare dashboard → **Workers & Pages → cow-report**: recent invocations,
    route `orthodoxsaintfinder.com/api/report` present.

## 5. Analytics (Umami)

- **What it is:** **Umami** web analytics. The tracking script is emitted into every page
  only when the `PUBLIC_UMAMI_WEBSITE_ID` build variable is set; empty/unset omits it
  entirely (per the comment in [`deploy.yml`](../.github/workflows/deploy.yml) line 45).
  The id is **not secret** — it ships in page source.
- **Where it's configured:**
  - Production build reads it from `${{ vars.PUBLIC_UMAMI_WEBSITE_ID }}` in
    [`deploy.yml`](../.github/workflows/deploy.yml) — set under GitHub repo
    **Settings → Secrets and variables → Actions → Variables**.
  - Deliberately unset on Cloudflare Pages previews (so previews don't pollute stats).
  - The Umami instance itself (Umami Cloud or self-hosted) and the website id value are
    owner-managed: **`FILL-IN (owner)`** — Umami account/URL and the website id.
- **What breaks if it vanishes:** no visitor stats collected; **the site itself is
  unaffected** (the script is a no-op / omitted). If the Umami host is down, pages still
  render (the script tag just fails to load).
- **How to verify it's alive today:**
  - `curl -s https://orthodoxsaintfinder.com/ | grep -o 'data-website-id="[^"]*"'` — a
    match means the tracking script shipped with a website id (zero-dependency check).
  - Or `view-source` on a production page → the Umami `script` tag is present with the
    website id; the Umami dashboard shows live traffic (**`FILL-IN (owner)`** dashboard URL).

## 6. Credentials & expiry table

One row per secret/credential the infrastructure depends on. "Stored" = the authoritative
location; the repo never contains secret *values*. Expiry and account-owner facts are
**`FILL-IN (owner)`** because they live in the provider dashboards, not the repo.

| Credential | Stored where | Used by | Expiry / rotation |
|---|---|---|---|
| **GitHub fine-grained PAT** (`GITHUB_TOKEN`) — Issues R/W on `orthodox-saints` only | Cloudflare Worker secret (`wrangler secret put GITHUB_TOKEN`) | `cow-report` Worker → files `data-quality` issues | Set at token creation; fine-grained PATs expire. **`FILL-IN (owner)`** expiry date. Rotate: see [§7](#7-if-x-dies--quick-answers) |
| **Turnstile secret key** (`TURNSTILE_SECRET_KEY`) | Cloudflare Worker secret (`wrangler secret put`) | `cow-report` Worker → Turnstile siteverify | No expiry unless rotated in the Turnstile dashboard. **`FILL-IN (owner)`** |
| **Turnstile site key** (public) | `src/pages/corrections.astro` (`SITE_KEY`, committed) | Browser widget on `/corrections` | Public; rotates only if the widget is recreated |
| **Wikimedia bot password** (`WIKIMEDIA_BOT_PASSWORD`) | `.env` at repo root (git-ignored; template in [`.env.example`](../.env.example)); user `SimplyThomas@Cloud_of_Witnesses` | Authoring-only icon-download scripts in `scripts/` (higher API rate limits) | Managed at `Special:BotPasswords`. **Not used in production** — authoring convenience only. **`FILL-IN (owner)`** |
| **Cloudflare account access** (API token / dashboard login for `wrangler deploy`, Pages, Turnstile, DNS proxy) | Cloudflare account (owner login / `wrangler login`) | Deploying the Worker, managing Pages previews, Turnstile, DNS proxy | **`FILL-IN (owner)`** account email + any API-token expiry |
| **Cloudflare cache token** (`CF_API_TOKEN`) — Zone **Cache Rules: Edit** + **Cache Purge: Purge** on `orthodoxsaintfinder.com` | Passed to `infra/cloudflare/apply.sh` by hand (never stored in repo) **and** GitHub **Actions secret** `CF_API_TOKEN` (+ `CF_ZONE_ID`) for the deploy purge | Applying the production cache rules; purging the edge on each deploy | API tokens don't expire unless set/rolled. Rotate: dashboard → My Profile → API Tokens → Roll, then update the Actions secret. **`FILL-IN (owner)`** |
| **GitHub Pages custom domain / Actions permissions** | GitHub repo settings (owner) | Production deploy | No secret value; owner-managed settings. **`FILL-IN (owner)`** |
| **Namecheap registrar login** | Namecheap account (owner) | DNS + domain renewals for all three domains | **`FILL-IN (owner)`** account email + domain renewal dates |

## 7. "If X dies" — quick answers

- **All of Cloudflare goes away** → PR previews stop building, the corrections form
  (`/api/report`) stops working, **and** production loses its edge cache. The public site
  keeps serving from the GitHub Pages origin (the apex would need to be un-proxied /
  re-pointed off Cloudflare first), just slower and spikier than with the cache. Recovery:
  re-establish the Cloudflare zone/proxy, re-run `infra/cloudflare/apply.sh`, and redeploy
  the Worker.
- **Production feels slow / spiky again (multi-second TTFB)** → the cache rules were
  dropped or never applied. Confirm with the `cf-cache-status` check in
  [§1a](#1a-production-edge-caching-cloudflare); re-run `infra/cloudflare/apply.sh`
  (Cache Rules: Edit token). Check the apex is still proxied (orange cloud) — cache rules
  only apply to proxied traffic.
- **A deploy shipped but old pages persist** → the "Purge Cloudflare edge cache" step was
  skipped or failed. Confirm the `CF_API_TOKEN`/`CF_ZONE_ID` Actions secrets exist and the
  token has **Cache Purge: Purge**; or purge manually per `infra/cloudflare/README.md`.
- **The Worker's `GITHUB_TOKEN` expires** → corrections submissions error (the Worker
  can't create the issue). Rotate it:
  `cd workers/report && npx wrangler secret put GITHUB_TOKEN` (paste a fresh fine-grained
  PAT scoped Issues R/W on this repo), then re-test `/corrections`.
- **`TURNSTILE_SECRET_KEY` wrong / Turnstile widget deleted** → every submission fails the
  bot check. Recreate the widget in the Turnstile dashboard, update the site key in
  `src/pages/corrections.astro`, and `wrangler secret put TURNSTILE_SECRET_KEY`.
- **The corrections route breaks but the site is up** → check the apex DNS record is
  **proxied (orange cloud)** in Cloudflare; the `routes` block in `wrangler.toml` only
  intercepts proxied traffic. Re-`wrangler deploy` if the route was lost.
- **Deploy workflow fails** → `main` stops deploying; the last good build stays live. Read
  the failing **Actions → Deploy** log — usually `python build.py` caught a data
  validation error (fix the CSV) or the Astro build failed (fix the profile/YAML).
- **Umami disappears** → analytics stop; the site is otherwise fine. Unset
  `PUBLIC_UMAMI_WEBSITE_ID` (Actions variable) to drop the script cleanly, or point it at
  a new instance.
- **DNS / Namecheap lapses** → the domain stops resolving (whole site unreachable) even
  though Pages is healthy. Renew the domain and confirm nameserver delegation
  (Cloudflare) and the Pages custom-domain record.

---

*Cross-references:* production/build pipeline detail in [`CLAUDE.md`](../CLAUDE.md) §11;
no-AI operational runbook in [`docs/maintenance.md`](maintenance.md); previews in
[`docs/cloudflare-pages-previews.md`](cloudflare-pages-previews.md); corrections Worker in
[`workers/report/README.md`](../workers/report/README.md); image-permission grants under
[`docs/permissions/`](permissions/).
