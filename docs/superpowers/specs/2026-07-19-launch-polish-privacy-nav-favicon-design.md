# Launch polish: privacy page, nav cleanup, favicon, private reporter email, Turnstile fallback

**Date:** 2026-07-19 · **Status:** approved (brainstormed with the user 2026-07-18/19)
**Context:** Soft launch to the local parish. A launch-readiness audit found untracked
gaps; this spec covers the approved fixes. `contact@orthodoxsaintfinder.com` is
confirmed working (send + receive) via Cloudflare Email Routing.

## 1. Privacy page (`/privacy`)

New `src/pages/privacy.astro`, standard `BaseLayout`, prose page in the site's voice
(plain-language, warm, no legalese). Approved copy (adjust §-references to flow as
prose, keep wording substantively as approved):

> **Your Privacy**
>
> This site is a reference, not a service. You don't create an account, you don't
> sign in, and we'd like to keep what we know about you as close to nothing as
> possible.
>
> **What we don't do.** We set no cookies. We use no advertising, no tracking
> pixels, and no social-media embeds. Nothing you do here is stored in your
> browser, and we never sell or share data with anyone. Searching and the
> patron-saint quiz run entirely on your own device — your searches and quiz
> answers never leave it.
>
> **Visit counts.** We use [Umami](https://umami.is), a privacy-focused analytics
> tool, to count page visits — which pages are read, roughly where in the world
> visitors are, and what kind of device they use. It sets no cookies, collects no
> personal information, and cannot identify or follow you. We look at it only to
> learn which saints and pages people find helpful.
>
> **The corrections form.** Submissions are checked by Cloudflare Turnstile (a
> spam filter that replaces CAPTCHAs). What you write becomes a **public
> correction report** in our project tracker on GitHub, so please don't include
> personal details you wouldn't want visible. If you share your email address so
> we can reply, **it is never published** — it is forwarded privately to the
> maintainer and stored nowhere else.
>
> **Email.** If you write to contact@orthodoxsaintfinder.com, your message goes
> to the site's maintainer and is used only to reply to you.
>
> **Calendar feeds.** Subscribing to a calendar feed means your calendar app
> periodically fetches a public file from us; we receive nothing about you.
>
> **Infrastructure.** The site is served by GitHub Pages and Cloudflare, which
> keep standard, short-lived server logs (such as IP addresses) to run and
> protect the service, under their own privacy policies (link both).
>
> Questions? Write to us — contact@orthodoxsaintfinder.com.

Links to the page:
- **Footer legal bar** (`SiteFooter.astro`): add a "Privacy" link beside the © line.
- **About nav group** (see §2).
All internal hrefs via `withBase()` (CLAUDE.md §11).

## 2. Nav changes (`src/lib/nav.ts` — footer columns follow automatically)

- About group gains three entries (after Contact): **Report a Correction** →
  `corrections`, **Contribute** → `contribute`, **Privacy** → `privacy`.
- Remove from nav (pages stay live at their URLs with their ComingSoon content):
  - `liturgical-living` (from The Orthodox Home group)
  - `extra-biblical-angels` (from Heavenly Hosts group)
- File two tracking issues patterned after #348: "Restore Liturgical Living to nav
  once content ships" and "Restore Extra-Biblical Angels to nav once content ships"
  (label: enhancement).

## 3. Favicon / app icons

User-supplied bundle at `public/cloud-of-witnesses-favicon-cross/` (drop location
only — `public/` is git-ignored build output). Install:
- Copy to `static/` root: `favicon.ico`, `favicon.svg`, `favicon-16x16.png`,
  `favicon-32x32.png`, `favicon-48x48.png`, `apple-touch-icon.png`, `icon-192.png`,
  `icon-512.png`, `site.webmanifest`. (Do NOT copy `head-snippet.html`/`README.txt`.)
- `BaseLayout.astro` `<head>` gains (all hrefs through `withBase()`):
  icon links (ico sizes=any, svg, 32, 16), apple-touch-icon (180), manifest link,
  `<meta name="theme-color" content="#152848">`.
- The webmanifest's `/icon-192.png`, `/icon-512.png` src paths are root-absolute —
  correct for the production root base path; leave as shipped.
- e2e: assert `favicon.ico` and `site.webmanifest` serve 200 from the built site.
- After install + verification, delete the drop folder from `public/`.
- **Addendum (user feedback post-install):** the shipped artwork read too small at tab
  size (cross ≈41% of canvas width + a thin inner ring). The tab-size assets only —
  `favicon.svg`, `favicon.ico`, `favicon-16/32/48` — were redrawn bolder (cross scaled
  ~1.38× with thicker bars, ring dropped; rasters regenerated from the SVG via sharp,
  ICO is a PNG-in-ICO container). `apple-touch-icon`/`icon-192`/`icon-512` keep the
  original padded, ringed artwork: iOS and Android maskable icons require that safe zone.

## 4. Corrections worker: private reporter email (`workers/report/`)

Behavior change — the reporter's email must never appear in the public GitHub issue:
- `buildBody()` omits the email line entirely (name stays; it remains public).
- After the issue is created, **if** an email was provided, send a private
  notification via a Cloudflare [`send_email` binding](https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/):
  - `wrangler.toml`: `[[send_email]]` binding named `EMAIL`, with
    `destination_address` NOT hardcoded in the file — the recipient comes from a
    Worker secret/var `REPORT_NOTIFY_TO` (a verified Email Routing destination).
    The binding itself may declare `allowed_destination_addresses` only if that
    can be done without committing the personal address; otherwise leave the
    binding unrestricted and rely on the secret.
  - From: `reports@orthodoxsaintfinder.com` (zone domain — required for
    E_SENDER_NOT_VERIFIED). Subject: `Correction report #<issue> — reply to <email>`.
    Body: reporter email, issue URL, subject line of the report. Plain text.
  - Uses MIME via the `mimetext` approach or a minimal hand-built RFC 822 string +
    `EmailMessage` from `cloudflare:email` (match current no-build, plain-JS style —
    no new npm runtime deps; hand-built MIME preferred).
- **Failure isolation:** the email send is wrapped in try/catch; a send failure is
  `console.error`-logged and never fails the request (the issue is already filed).
  If `env.EMAIL` or `REPORT_NOTIFY_TO` is absent (e.g. local/test), skip silently.
- Frontend (`corrections.astro`): inline hint under the email field — "Never
  published — used only so we can reply." Remove/replace any copy implying the
  email appears in the report.
- Tests (`workers/report/` smoke tests): body-builder omits email; email path
  invoked with a mocked `EMAIL` binding when email present; no-email and
  missing-binding paths don't throw. Keep the existing no-network style.
- **Deployment (user-run, post-merge):** enable Email Workers on the zone, add
  `reports@…` as a verified sending address if required, `wrangler secret put
  REPORT_NOTIFY_TO`, `npx wrangler deploy`. Documented in `workers/report/README.md`.

## 5. Turnstile-timeout messaging (`src/islands/corrections.client.ts` + `corrections.astro`)

- Watchdog: if the Turnstile widget hasn't rendered/become ready ~8 s after load,
  OR the script `onerror` fires, OR Turnstile's `error-callback` fires, show an
  inline notice in the form: "The spam-check didn't load (an ad blocker or network
  hiccup may be blocking it). You can still reach us by email:
  contact@orthodoxsaintfinder.com" (mailto link), and disable the submit button.
- If Turnstile later becomes ready, clear the notice and re-enable submit.
- e2e: block the Turnstile script request via Playwright routing, assert the
  notice appears and submit is disabled.

## 6. Out of scope

Favicon-adjacent PWA work beyond the manifest; a private-reply channel beyond the
notification email; the orphaned `archangels.astro` stub; #348–#351, #228/#229.

## 7. Definition of done

One PR from branch `launch-polish`: `make validate` clean; `make web-lint`,
`make web-unit`, `make web-test` green; worker smoke tests green; two nav-restore
issues filed; PR body notes the user-run worker deployment steps and includes the
Cloudflare Pages preview link placeholder per the PR template.
