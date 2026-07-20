# Data-quality report Worker

A small Cloudflare Worker that backs the **Suggest a Correction** form on
[orthodoxsaintfinder.com](https://orthodoxsaintfinder.com)
(`/corrections`). It receives the form POST, verifies a Cloudflare **Turnstile**
token, validates and sanitizes the input, and files a **GitHub issue** labelled
`data-quality`.

GitHub auth is a **GitHub App**, not a personal access token: the Worker signs a
short-lived JWT with the App's private key, exchanges it for a **1-hour
installation token**, and uses that to create the issue. The private key never
expires, so **there is nothing to rotate on a schedule** (unlike a PAT, which
caps at 366 days).

**The visitor never touches GitHub and needs no account.**

```
Browser form ─POST─▶ Worker ─verify─▶ Turnstile siteverify
(/corrections)         │
                       ├─sign JWT─▶ POST /app/installations/{id}/access_tokens ─▶ 1h token
                       └─create issue (Bearer token)─▶ GitHub REST API ─▶ data-quality issue
```

- Plain JavaScript, no build step (`src/index.js`). JWT is signed with WebCrypto.
- Accepts JSON **or** form-encoded POST bodies.
- Honeypot field (`website`) → silently dropped.
- Friendly JSON responses; the private key and raw GitHub errors are never leaked.
- **The reporter's email is never published.** It's left out of the public issue
  entirely; if supplied, the maintainer gets a private notification email (via a
  Cloudflare `send_email` binding) so they can reply. The optional **name** may
  still appear in the issue.

---

## One-time setup (checklist for the maintainer)

You'll do these once. Items marked **[dashboard]** happen in the Cloudflare or
GitHub web UI; the rest are terminal commands run from this folder.

### 1. Create the GitHub App **[github.com]**

A **GitHub App** owned by your account, installed on this ONE repo. Unlike a PAT,
its private key doesn't expire — set it once, never rotate on a schedule.

1. GitHub → **Settings → Developer settings → GitHub Apps → New GitHub App**.
2. Fill in:
   - **GitHub App name:** e.g. `cow-report` (must be globally unique)
   - **Homepage URL:** `https://orthodoxsaintfinder.com`
   - **Webhook:** **uncheck "Active"** (this App needs no webhooks).
   - **Repository permissions → Issues: Read and write.** (Leave everything else
     at *No access* — Issues R/W is all that's needed to create + label issues.)
   - **Where can this app be installed?** *Only on this account.*
3. **Create GitHub App.** On the App's page, note the **App ID** (a number) →
   this is `APP_ID` in `wrangler.toml`.
4. Scroll to **Private keys → Generate a private key.** A `.pem` downloads
   (PKCS#1: it begins `-----BEGIN RSA PRIVATE KEY-----`). Keep it safe.
5. **Install App** (left sidebar) → install it on `SimplyThomas`, **Only select
   repositories → `orthodox-saints`**. After installing, the URL is
   `.../installations/<NUMBER>` — that `<NUMBER>` is `INSTALLATION_ID` in
   `wrangler.toml`. (Or find it later via **Settings → Applications → (App) →
   Configure**.)

**Convert the key to PKCS#8** (WebCrypto can't import the PKCS#1 GitHub gives you):

```bash
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
  -in cow-report.<...>.private-key.pem -out cow-report.pk8.pem
```

`cow-report.pk8.pem` now begins `-----BEGIN PRIVATE KEY-----` — that's what you
store as the `APP_PRIVATE_KEY` secret in step 3.

> The `data-quality` label already exists in the repo. If it's ever deleted,
> recreate it (**Issues → Labels → New label**, named exactly `data-quality`);
> GitHub also auto-creates a missing label as plain grey on first use.

### 2. Create the Turnstile widget **[dash.cloudflare.com]**

1. Cloudflare dashboard → **Turnstile → Add widget**.
2. **Hostnames:** add `orthodoxsaintfinder.com` (and `localhost` /
   `127.0.0.1` if you want the widget to render during local testing, plus your
   `*.pages.dev` preview host if desired).
3. **Widget mode:** *Managed* is fine.
4. Copy the **Site key** (public — goes in the HTML) and the **Secret key**
   (private — a Worker secret).

### 3. Set the App IDs, install deps & set secrets

First put the two **identifiers** (not secret) into `wrangler.toml` `[vars]`:
`APP_ID` and `INSTALLATION_ID` from step 1.

```bash
cd workers/report
npm install

# TURNSTILE_SECRET_KEY: paste the Turnstile secret when prompted.
npx wrangler secret put TURNSTILE_SECRET_KEY

# APP_PRIVATE_KEY: pipe in the PKCS#8 key file (avoids paste/multiline issues).
npx wrangler secret put APP_PRIVATE_KEY < cow-report.pk8.pem
```

The other non-secret vars (`REPO_OWNER`, `REPO_NAME`, `ALLOWED_ORIGIN`) also live
in `wrangler.toml` — edit them there if anything changes.

**Rotation:** there's nothing to do on a schedule. If you ever need to roll the
key (e.g. it leaked), GitHub App → **Generate a private key**, convert to PKCS#8,
re-run the `wrangler secret put APP_PRIVATE_KEY < …` line, then delete the old key
in the App settings. `APP_ID`/`INSTALLATION_ID` never change.

### 3a. Enable the private reporter-email notification **[dash.cloudflare.com]**

The reporter's email never appears in the public issue. When a reporter supplies
one, the Worker sends **you** a private notification (from
`reports@orthodoxsaintfinder.com`) so you can reply. This uses a Cloudflare
`send_email` binding named `EMAIL` (already declared in `wrangler.toml`) plus a
`REPORT_NOTIFY_TO` secret — the address you want the notifications delivered to.
**This step is optional:** if you skip it, correction reports are still filed as
issues; only the reply-notification is skipped (silently).

1. Cloudflare dashboard → your zone → **Email → Email Routing** → enable it if it
   isn't already (this also adds the required MX/TXT records for the zone).
2. **Destination addresses → Add** the address you want notifications sent to
   (e.g. your personal inbox) and **verify** it via the confirmation email
   Cloudflare sends. Email Workers can only send to a *verified* destination.
3. If Cloudflare prompts you to declare an **allowed sender / verified sender**
   for Email Workers, add `reports@orthodoxsaintfinder.com`. (No
   `destination_address` is hardcoded in `wrangler.toml` on purpose — the
   recipient lives only in the secret below.)
4. Set the recipient(s) as a Worker secret — a single address, or a
   comma-separated list to notify several people (each address must be its own
   *verified destination*; a zone routing address like `contact@…` is NOT a
   destination and the binding rejects it):

   ```bash
   npx wrangler secret put REPORT_NOTIFY_TO   # e.g. "you@example.com, other@example.com"
   ```

   Each recipient gets its own copy; one rejected/unverified address doesn't
   block the others (failures are logged, visible via `npm run tail`).

If `EMAIL` or `REPORT_NOTIFY_TO` is absent (e.g. before this step, or in local
dev), the Worker skips the notification without erroring.

### 4. Put the **Site key** in the form

Open `src/components`… actually the site key lives in the Astro page:
`src/pages/corrections.astro`, in the `SITE_KEY` constant near the top. Replace
the placeholder `0xAAAAAAAAAAAAAAAAAAAAAA` with your real Turnstile **site key**.
(It's public — safe to commit.)

### 5. Deploy the Worker

```bash
npx wrangler deploy
```

This publishes to a `https://cow-report.<your-subdomain>.workers.dev` URL. Test
against that first (see below).

### 6. Map the same-origin route **[dash.cloudflare.com]** (recommended)

So the form can POST to `https://orthodoxsaintfinder.com/api/report` (no CORS):

1. In `wrangler.toml`, uncomment the `routes = [...]` block and confirm
   `zone_name` matches your zone. Re-run `npx wrangler deploy`.
   *(Or add it in the dashboard: **Workers & Pages → cow-report → Settings →
   Domains & Routes → Add route** → `orthodoxsaintfinder.com/api/report`.)*
2. Ensure the apex domain's DNS record in Cloudflare is **proxied** (orange
   cloud) — the route only intercepts proxied traffic. GitHub Pages still serves
   every other path; only `/api/report` hits the Worker.

The form already posts to `/api/report` (same-origin) by default. If you instead
keep the `workers.dev` URL, set `ENDPOINT` in `src/pages/corrections.astro` to
that URL and make sure your origin is in `ALLOWED_ORIGIN` (the Worker enforces a
CORS allow-list for cross-origin calls).

---

## Local development & testing

```bash
npm test                         # offline smoke tests (no network/secrets needed)
```

`npm test` runs `smoke.test.mjs`, which stubs the network and exercises the
handler directly: method guard, honeypot drop, Turnstile pass/fail, validation,
the `data-quality` label, injection neutralization (backticks / `@` / `#`),
truncation, the no-leak error path, and the CORS allow-list. It also covers the
private reporter-email path — email never in the public body, the notification's
From/To/Subject/URL when a mock `EMAIL` binding is injected, the no-email and
missing-binding/secret skips, and send-failure isolation. The `cloudflare:email`
module only exists in the Workers runtime, so the tests inject a fake
`EmailMessage` + `EMAIL` binding via `env` (the Worker prefers `env.EmailMessage`
when present and otherwise dynamically imports the real module). No secrets required.

For an end-to-end run against the real Cloudflare runtime:

```bash
cp .dev.vars.example .dev.vars   # then fill in the PKCS#8 key + Turnstile secret
npx wrangler dev                 # serves on http://localhost:8787
```

### Turnstile in dev

Real Turnstile tokens are origin-bound and single-use, which is awkward for
`curl`. Two options:

- **Test the happy path end-to-end** by running the site (`make serve` at the
  repo root) and pointing the form's `ENDPOINT` at `http://localhost:8787`
  temporarily. Use Cloudflare's **testing keys** (always-passes site key
  `1x00000000000000000000AA` + secret `1x0000000000000000000000000000000AA`) so
  the widget and siteverify both succeed locally.
- **Test validation/sanitization** without Turnstile by temporarily using the
  always-passes secret above in `.dev.vars`, then:

```bash
# Honeypot → silent success, no issue created:
curl -s localhost:8787 -H 'Content-Type: application/json' \
  -d '{"website":"bot","description":"x","cf-turnstile-response":"dummy"}'

# Missing description → 400:
curl -s localhost:8787 -H 'Content-Type: application/json' \
  -d '{"cf-turnstile-response":"dummy"}'

# Full submit (creates a REAL issue if the App creds are live — use a test repo):
curl -s localhost:8787 -H 'Content-Type: application/json' -d '{
  "type":"feast",
  "subject":"St. Nicholas",
  "description":"Feast shows Dec 6, should note Dec 19 (Old Calendar).",
  "cf-turnstile-response":"dummy"
}'
```

> With the always-passes testing secret, `dummy` passes siteverify, so the last
> call will create an issue. Point `INSTALLATION_ID`/`REPO_NAME` at a throwaway
> repo (install the App there) while iterating.

### Manual test checklist

- [ ] Empty description → friendly 400, no issue.
- [ ] Honeypot `website` filled → 200 `{ok:true}`, **no** issue created.
- [ ] Bad email (`foo@bar`) → 400.
- [ ] Backticks / `@handle` / `#1` in fields → issue body shows them inert
      (inside a code fence; no mention/ref linkified, no broken formatting).
- [ ] Over-long description → truncated with `…`, issue still created.
- [ ] Valid submit → 200 `{ok:true, number:N}` and a `data-quality` issue appears.
- [ ] Reporter email is **never in the public issue** — even when supplied, the
      body has no `Email:` line (the optional name may still show).
- [ ] With `EMAIL` + `REPORT_NOTIFY_TO` set and a reporter email supplied, a
      private notification arrives at `REPORT_NOTIFY_TO` from
      `reports@orthodoxsaintfinder.com` with the reporter's address + issue link.
- [ ] Email-send failure (or missing binding/secret) does **not** fail the
      request — the issue is still filed and the caller gets `{ok:true}`.
- [ ] `GET` / other method → 405.
- [ ] Cross-origin call from a non-allow-listed origin → no
      `Access-Control-Allow-Origin` header (browser blocks it).

`npm run tail` streams live Worker logs (handy for the GitHub-error path).

---

## Configuration reference

| Name | Where | Purpose |
|---|---|---|
| `APP_PRIVATE_KEY` | secret (`wrangler secret put`) | GitHub App private key, **PKCS#8 PEM**. Signs the App JWT. |
| `TURNSTILE_SECRET_KEY` | secret (`wrangler secret put`) | Turnstile server secret for siteverify. |
| `REPORT_NOTIFY_TO` | secret (`wrangler secret put`) | Verified Email Routing destination(s) that receive the private reporter-email notification; comma-separated for more than one. Optional — omit to disable notifications. |
| `EMAIL` | `send_email` binding (`wrangler.toml`) | Cloudflare Email Workers binding used to send the notification from `reports@orthodoxsaintfinder.com`. |
| `APP_ID` | `wrangler.toml` `[vars]` | GitHub App ID (identifier, not secret). |
| `INSTALLATION_ID` | `wrangler.toml` `[vars]` | The App's installation id on the repo (identifier). |
| `REPO_OWNER` | `wrangler.toml` `[vars]` | GitHub org/user (`SimplyThomas`). |
| `REPO_NAME` | `wrangler.toml` `[vars]` | Repo (`orthodox-saints`). |
| `ALLOWED_ORIGIN` | `wrangler.toml` `[vars]` | Comma-separated CORS allow-list (cross-origin only). |
| Turnstile **site key** | `src/pages/corrections.astro` | Public; rendered in the widget. |

## Security notes

- Auth is a least-privilege **GitHub App** (Issues R/W, one repo). Only the
  App **private key** is secret; it lives solely as a Worker secret — never in
  the form, the client JS, or git. Requests use ephemeral 1-hour installation
  tokens minted per invocation, so no long-lived token is ever transmitted.
- All user text is length-capped, has backticks/control chars stripped, and is
  rendered inside fenced code blocks; `@`/`#` are defanged in the title. So a
  submission can't ping users, fabricate issue refs, or break out of the body.
- The form warns visitors that reports become **public GitHub issues** — they're
  told not to include private information.
- Scope guard: this Worker does Turnstile + honeypot only. If abuse appears,
  consider KV/Durable-Object rate limiting as a follow-up (not included here).
