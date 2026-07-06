# Infrastructure inventory — what runs where, what breaks when it vanishes

This page is the operational map for a solo maintainer: every external service the live
site depends on, where each is configured, what fails if it disappears, and how to check
it's alive today. Every fact here traces to a file in this repo (cited inline). Facts only
the account owner can know — expiry dates, account emails, dashboard tenant — are marked
**`FILL-IN (owner)`**; fill them in and keep them current.

Quick mental model: **production is just static files on GitHub Pages.** Cloudflare only
powers *previews* and the *corrections form*; if all of Cloudflare vanished, the site keeps
serving. See [If X dies](#7-if-x-dies--quick-answers) for the failure map.

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
  - `dig +short orthodoxsaintfinder.com` returns records; `curl -sI` (above) returns 200.
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
  entirely (per the comment in [`deploy.yml`](../.github/workflows/deploy.yml) line ~42).
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
- **How to verify it's alive today:** `view-source` on a production page → the Umami
  `script` tag is present with the website id; the Umami dashboard shows live traffic
  (**`FILL-IN (owner)`** dashboard URL).

## 6. Credentials & expiry table

One row per secret/credential the infrastructure depends on. "Stored" = the authoritative
location; the repo never contains secret *values*. Expiry and account-owner facts are
**`FILL-IN (owner)`** because they live in the provider dashboards, not the repo.

| Credential | Stored where | Used by | Expiry / rotation |
|---|---|---|---|
| **GitHub fine-grained PAT** (`GITHUB_TOKEN`) — Issues R/W on `orthodox-saints` only | Cloudflare Worker secret (`wrangler secret put GITHUB_TOKEN`) | `cow-report` Worker → files `data-quality` issues | Set at token creation; fine-grained PATs expire. **`FILL-IN (owner)`** expiry date. Rotate: `cd workers/report && npx wrangler secret put GITHUB_TOKEN` |
| **Turnstile secret key** (`TURNSTILE_SECRET_KEY`) | Cloudflare Worker secret (`wrangler secret put`) | `cow-report` Worker → Turnstile siteverify | No expiry unless rotated in the Turnstile dashboard. **`FILL-IN (owner)`** |
| **Turnstile site key** (public) | `src/pages/corrections.astro` (`SITE_KEY`, committed) | Browser widget on `/corrections` | Public; rotates only if the widget is recreated |
| **Wikimedia bot password** (`WIKIMEDIA_BOT_PASSWORD`) | `.env` at repo root (git-ignored; template in [`.env.example`](../.env.example)); user `SimplyThomas@Cloud_of_Witnesses` | Authoring-only icon-download scripts in `scripts/` (higher API rate limits) | Managed at `Special:BotPasswords`. **Not used in production** — authoring convenience only. **`FILL-IN (owner)`** |
| **Cloudflare account access** (API token / dashboard login for `wrangler deploy`, Pages, Turnstile, DNS proxy) | Cloudflare account (owner login / `wrangler login`) | Deploying the Worker, managing Pages previews, Turnstile, DNS proxy | **`FILL-IN (owner)`** account email + any API-token expiry |
| **GitHub Pages custom domain / Actions permissions** | GitHub repo settings (owner) | Production deploy | No secret value; owner-managed settings. **`FILL-IN (owner)`** |
| **Namecheap registrar login** | Namecheap account (owner) | DNS + domain renewals for all three domains | **`FILL-IN (owner)`** account email + domain renewal dates |

## 7. "If X dies" — quick answers

- **All of Cloudflare goes away** → PR previews stop building **and** the corrections form
  (`/api/report`) stops working. **Production is unaffected** — GitHub Pages serves the
  site directly. Recovery: re-establish the Cloudflare zone/proxy and redeploy the Worker,
  or temporarily accept "corrections form down" (it's non-critical).
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
