# Cloudflare cache rules — orthodoxsaintfinder.com

Production is served by **GitHub Pages behind Cloudflare** (the apex is proxied — orange
cloud — because the corrections Worker needs it; see
[`docs/infrastructure.md`](../../docs/infrastructure.md) §2/§4). GitHub Pages can't set
per-route cache headers, and Cloudflare by default only edge-caches static file
extensions (`.js`, `.css`, …). So every HTML page and every `.json` data file returned
`cf-cache-status: DYNAMIC` and was proxied to the origin on *every* request. When the
origin was cold or busy, time-to-first-byte spiked to **8–15 seconds** — the "slow
production host" symptom. Already-cached assets (`cf-cache-status: HIT`) stayed a flat
~0.1s the whole time.

These rules make Cloudflare edge-cache the HTML and data too, so the slow origin stops
being on the critical path.

## What the rules do

`cache-rules.json` defines the `http_request_cache_settings` phase (what the dashboard
calls **Cache Rules**):

| Paths | Edge TTL | Browser TTL | Why |
|---|---|---|---|
| `/_astro/*`, `/finder-data/*`, `/card-data/*` | 1 year | 1 year | Content-hashed URLs — the filename changes when the bytes change, so they can never go stale. This is the "immutable" caching (the browser TTL replaces the immutable header GitHub Pages can't send). |
| everything else (HTML + `/search-index.json`), except `/api/*` | 1 day | 10 min | Stable URLs that change on deploy. Edge-cached to kill the origin spikes, kept fresh by the deploy purge (below). `serve_stale` keeps responses instant during revalidation. `/api/*` (the corrections Worker) is excluded. |

## Files here

- **`cache-rules.json`** — the desired cache ruleset (source of truth).
- **`apply.sh`** — pushes `cache-rules.json` to the zone (idempotent).
- **`README.md`** — this file.

The deploy-time cache purge lives in [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)
(step "Purge Cloudflare edge cache").

---

## First-time setup (manual, do once)

### 0. Prerequisite

The `orthodoxsaintfinder.com` zone already exists in Cloudflare and the apex is proxied
(orange cloud) — that was set up for the corrections form. Nothing to do here; if that
ever changes, the corrections form breaks first and this would stop applying too.

### 1. Create a Cloudflare API token

1. Cloudflare dashboard → **My Profile** (top-right avatar) → **API Tokens** →
   **Create Token** → **Create Custom Token** → *Get started*.

   > Use a **User API Token** (this is the *My Profile* area), **not** an Account API
   > Token. Account tokens default to account-level scope and return
   > `10000 Authentication error` on zone calls unless the zone is explicitly included,
   > and they don't validate against the `/user/tokens/verify` diagnostic.
2. Name it e.g. `orthodoxsaintfinder-cache`.
3. **Permissions** — add two rows (both **Zone** scope):
   - **Cache Rules → Edit**  *(lets `apply.sh` write the ruleset)*
   - **Cache Purge → Purge**  *(lets the deploy workflow purge the edge)*

   > **Edit** already includes read — you do **not** need a separate `Cache Rules: Read`
   > row. If your account doesn't offer a granular **Cache Rules** permission, use
   > **Zone → Zone Settings → Edit** instead — it also authorizes the cache ruleset.
4. **Zone Resources** → *Include* → *Specific zone* → `orthodoxsaintfinder.com`.
5. *Continue to summary* → *Create Token* → **copy the token now** (it's shown once).

Treat this token like a password. If it ever leaks (e.g. pasted into a chat), **roll or
delete it** on this same page and issue a new one — see [Rotating the token](#rotating-the-token).

### 2. Find the Zone ID

Dashboard → select **orthodoxsaintfinder.com** → **Overview** → right sidebar, **API**
section → **Zone ID** → *Copy*.

The current value is **`80a52d0e73ac12ef19b4df71bbfc777c`** (permanent for this zone; a
Zone ID isn't a credential). `apply.sh` still takes it via the `ZONE_ID` env var.

> ⚠️ Don't confuse it with the **Account ID** sitting right beside it in the same panel —
> pasting the Account ID makes zone calls fail with `9109: Invalid zone identifier`.

### 3. Apply the cache rules

From the repo root:

```sh
CF_API_TOKEN='<token from step 1>' ZONE_ID='<zone id from step 2>' ./infra/cloudflare/apply.sh
```

Idempotent — re-run any time; it converges the zone to exactly `cache-rules.json`.
Expect `✓ Applied. Zone now has 2 active cache rule(s).`

> ⚠️ `apply.sh` is the **source of truth** for this zone's Cache Rules. It replaces the
> whole cache-settings ruleset, so any cache rules added by hand in the dashboard get
> overwritten. Manage them here, not in the dashboard.

### 4. Add the deploy-purge secrets (GitHub Actions)

So each production deploy purges the edge and new HTML goes live instantly:

Repo → **Settings → Secrets and variables → Actions → New repository secret**, add:

- **`CF_API_TOKEN`** — the token from step 1 (needs **Cache Purge: Purge**).
- **`CF_ZONE_ID`** — the zone id from step 2.

If these are absent the deploy still succeeds and just skips the purge (the 1-day edge
TTL then bounds staleness).

### 5. Verify

```sh
# HTML is now edge-cached: warm once, second hit should be HIT
curl -sSI https://orthodoxsaintfinder.com/saint/OS-0192/ >/dev/null
curl -sSI https://orthodoxsaintfinder.com/saint/OS-0192/ | grep -i cf-cache-status
# expect: cf-cache-status: HIT
```

A hashed asset should report a long browser cache too:

```sh
curl -sSI https://orthodoxsaintfinder.com/finder-data/ -o /dev/null   # (use a real hash URL from page source)
```

---

## Updating the rules later

Edit `cache-rules.json`, then re-run `apply.sh` (step 3). That's the whole loop.

## Rolling back

Set `"rules": []` in `cache-rules.json` and re-run `apply.sh` to remove all cache rules
(reverts to Cloudflare's default extension-based caching), or edit the rules and re-apply.

## Rotating the token

Cloudflare dashboard → **My Profile → API Tokens** → the token's **⋯** → **Roll**
(new value, same permissions) or **Delete**. The cache *rules* already applied stay in
effect — the token is only needed to *change* them or to purge on deploy. After rolling,
update the GitHub Actions `CF_API_TOKEN` secret (step 4) with the new value.

## Troubleshooting

- **`apply.sh` prints `success: false` with an auth error** → the token lacks
  **Cache Rules: Edit** (or **Zone Settings: Edit**) on this zone, or the `ZONE_ID` is
  wrong.
- **Pages still show `cf-cache-status: DYNAMIC` after applying** → confirm the apex is
  **proxied (orange cloud)** in Cloudflare DNS; cache rules only apply to proxied traffic.
- **A deploy shipped but the old page is still served** → the purge step was skipped
  (missing `CF_API_TOKEN`/`CF_ZONE_ID` secrets) or the purge token lacks
  **Cache Purge: Purge**. Check the "Purge Cloudflare edge cache" step in the Deploy run.
- **Need to force-refresh everything now** →
  `curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" --data '{"purge_everything":true}'`
- **`apply.sh` fails with `unknown variant for set_cache_settings_browser_type`** → a
  `browser_ttl`/`edge_ttl` `mode` in `cache-rules.json` is invalid. The only accepted
  values are `override_origin`, `respect_origin`, and `bypass` — there is **no** bare
  `override`.
- **New edge takes a moment** → after `apply.sh`, the ruleset propagates across Cloudflare's
  edge in ~20–40s; during that window some anycast nodes still return `DYNAMIC`. It
  converges to `HIT` on its own — no action needed.
