# Data-quality report Worker

A small Cloudflare Worker that backs the **Suggest a Correction** form on
[orthodoxsaintfinder.com](https://orthodoxsaintfinder.com)
(`/corrections`). It receives the form POST, verifies a Cloudflare **Turnstile**
token, validates and sanitizes the input, and files a **GitHub issue** labelled
`data-quality` using a fine-grained token held as a Worker secret.

**The visitor never touches GitHub and needs no account.**

```
Browser form  ──POST──▶  Worker  ──verify──▶  Turnstile siteverify
(/corrections)              │
                            └──create issue──▶  GitHub REST API  ──▶  data-quality issue
```

- Plain JavaScript, no build step (`src/index.js`).
- Accepts JSON **or** form-encoded POST bodies.
- Honeypot field (`website`) → silently dropped.
- Friendly JSON responses; the token and raw GitHub errors are never leaked.

---

## One-time setup (checklist for the maintainer)

You'll do these once. Items marked **[dashboard]** happen in the Cloudflare or
GitHub web UI; the rest are terminal commands run from this folder.

### 1. Create the GitHub token **[github.com]**

A **fine-grained personal access token** scoped to this ONE repo:

1. GitHub → **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. **Resource owner:** `SimplyThomas`. **Repository access:** *Only select
   repositories* → `orthodox-saints`.
3. **Permissions → Repository permissions → Issues: Read and write.** (Leave
   everything else at *No access*. Issues R/W is the only scope needed to create
   issues and apply the label.)
4. Set a sensible expiry and **Generate token**. Copy it (starts `github_pat_…`).

> The `data-quality` label is applied by the Worker. Create that label once in
> the repo (**Issues → Labels → New label**, name it exactly `data-quality`) so
> issues land pre-labelled. If the label doesn't exist, GitHub will create it on
> first use as a plain grey label.

### 2. Create the Turnstile widget **[dash.cloudflare.com]**

1. Cloudflare dashboard → **Turnstile → Add widget**.
2. **Hostnames:** add `orthodoxsaintfinder.com` (and `localhost` /
   `127.0.0.1` if you want the widget to render during local testing, plus your
   `*.pages.dev` preview host if desired).
3. **Widget mode:** *Managed* is fine.
4. Copy the **Site key** (public — goes in the HTML) and the **Secret key**
   (private — a Worker secret).

### 3. Install deps & set secrets

```bash
cd workers/report
npm install

# Secrets (you'll be prompted to paste each value):
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put TURNSTILE_SECRET_KEY
```

The non-secret vars (`REPO_OWNER`, `REPO_NAME`, `ALLOWED_ORIGIN`) live in
`wrangler.toml` — edit them there if anything changes.

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
truncation, the no-leak error path, and the CORS allow-list. No secrets required.

For an end-to-end run against the real Cloudflare runtime:

```bash
cp .dev.vars.example .dev.vars   # then paste your real token + Turnstile secret
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

# Full submit (creates a REAL issue if GITHUB_TOKEN is live — use a test repo):
curl -s localhost:8787 -H 'Content-Type: application/json' -d '{
  "type":"feast",
  "subject":"St. Nicholas",
  "description":"Feast shows Dec 6, should note Dec 19 (Old Calendar).",
  "cf-turnstile-response":"dummy"
}'
```

> With the always-passes testing secret, `dummy` passes siteverify, so the last
> call will create an issue. Point `GITHUB_TOKEN`/`REPO_NAME` at a throwaway repo
> while iterating.

### Manual test checklist

- [ ] Empty description → friendly 400, no issue.
- [ ] Honeypot `website` filled → 200 `{ok:true}`, **no** issue created.
- [ ] Bad email (`foo@bar`) → 400.
- [ ] Backticks / `@handle` / `#1` in fields → issue body shows them inert
      (inside a code fence; no mention/ref linkified, no broken formatting).
- [ ] Over-long description → truncated with `…`, issue still created.
- [ ] Valid submit → 200 `{ok:true, number:N}` and a `data-quality` issue appears.
- [ ] `GET` / other method → 405.
- [ ] Cross-origin call from a non-allow-listed origin → no
      `Access-Control-Allow-Origin` header (browser blocks it).

`npm run tail` streams live Worker logs (handy for the GitHub-error path).

---

## Configuration reference

| Name | Where | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | secret (`wrangler secret put`) | Fine-grained PAT, Issues R/W on this repo only. |
| `TURNSTILE_SECRET_KEY` | secret (`wrangler secret put`) | Turnstile server secret for siteverify. |
| `REPO_OWNER` | `wrangler.toml` `[vars]` | GitHub org/user (`SimplyThomas`). |
| `REPO_NAME` | `wrangler.toml` `[vars]` | Repo (`orthodox-saints`). |
| `ALLOWED_ORIGIN` | `wrangler.toml` `[vars]` | Comma-separated CORS allow-list (cross-origin only). |
| Turnstile **site key** | `src/pages/corrections.astro` | Public; rendered in the widget. |

## Security notes

- The PAT is least-privilege (Issues R/W, one repo) and lives only as a Worker
  secret — never in the form, the client JS, or git.
- All user text is length-capped, has backticks/control chars stripped, and is
  rendered inside fenced code blocks; `@`/`#` are defanged in the title. So a
  submission can't ping users, fabricate issue refs, or break out of the body.
- The form warns visitors that reports become **public GitHub issues** — they're
  told not to include private information.
- Scope guard: this Worker does Turnstile + honeypot only. If abuse appears,
  consider KV/Durable-Object rate limiting as a follow-up (not included here).
