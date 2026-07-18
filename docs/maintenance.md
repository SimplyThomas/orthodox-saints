# Maintaining this project without AI assistance

Everything the site needs to keep running — data validation, the Astro build, CI/CD,
deploys, the corrections Worker — is plain Python/Node and needs **no AI tooling**.
Claude was used as an *authoring accelerator* for bulk content generation, and that
work is essentially finished. This page records what depends on what, and how to do
each remaining job by hand.

For the external services the live site leans on — hosting, DNS, PR previews, the
corrections Worker, analytics, and where each credential lives — see
[`docs/infrastructure.md`](infrastructure.md) ("what runs where, what breaks when it
vanishes").

## What needs no AI (the whole operational surface)

| Area | Entry point | Notes |
|------|-------------|-------|
| Data build + validation | `make build` / `make validate` (`build.py`, `feastlib.py`) | Pure Python stdlib (+ `openpyxl` for the xlsx only). |
| Frontend | `make serve` / `make web-build` (Astro, `src/`) | Node 24+, vanilla-TS islands, no framework. |
| CI/CD | `.github/workflows/ci.yml`, `deploy.yml` | Actions SHA-pinned; deploy = python build → astro build → Pages. |
| PR previews | Cloudflare Pages (`scripts/cf-pages-build.sh`) | See `docs/cloudflare-pages-previews.md`. |
| Corrections form backend | `workers/report/` (Cloudflare Worker) | Fully documented in `workers/report/README.md`. |
| Icon tooling | `scripts/` (downloader, thumbs, contact sheet, OG card) | See `scripts/README.md`. |

New component styles go in scoped `<style>` blocks; `global.css` is tokens + shared primitives only.

## What used Claude, and where it stands

| Tool | Purpose | Status (July 2026) |
|------|---------|--------------------|
| profilegen (`tools/profilegen/`, `make profile-run`) | Bulk-generate saint profile YAMLs | **Done.** 2,893 of 2,916 saints have a profile; the ~23 without are recent adds. |
| feastgen (`tools/feastgen/`, `make feast-run`) | Bulk-generate feast profile YAMLs | **Done.** All 83 feasts have a profile. |
| `tools/profilegen/backfill_titles.py` | One-time title-facet backfill | Done; historical. |
| `scripts/*.workflow.js` | Per-stage orchestration for the two above | Only used by the generators. |

These runners call the `claude` CLI and fail without a subscription/OAuth token. That
is fine: **nothing operational depends on them.** Keep them for a possible future bulk
pass; don't run them casually. (`scripts/bootstrap-wsl.sh` installs Claude Code as its
step 5 — skip or ignore that step.)

The corpus itself is plain YAML in `src/content/profiles/` and `src/content/feasts/`,
editable by hand like any other file.

## The actual remaining work is human work

Generation is done. **At the 2026-07-18 parish launch (PR #352) every `draft` profile was
promoted to `reviewed`, so nearly all profiles are now public** (the 141 `flagged` stay
hidden until resolved — issue #349). Visibility is no longer the lever. The ongoing human
work is **vetting**: reading a published profile against its sources and, when it holds up,
setting **`humanReviewed: true`** — that earns the **dove seal** in the finder/quiz, the
site's signal of a personally-checked entry (CLAUDE.md §8). It was always a human job; no AI
is needed for any of it.

### Reviewing and sealing a profile (the dove)

1. Pick a profile: `src/content/profiles/OS-####.yaml` (start with high-traffic,
   well-known saints).
2. Read it against its `sources` and the saint's CSV row (`data/saints.csv` is the
   trusted anchor). Check every factual claim; fix or delete anything unsupported.
   Watch the §9 guardrails: no copyrighted hymn/prayer translations, no invented
   facts, canonization caution.
3. A **flagged** profile may carry its verifier concerns in a `flagReasons` list
   (`claim` + `detail`, rendered on the preview banner) — resolve each by fixing the
   text or confirming the claim against a source, then delete the resolved entries.
   A flagged profile without `flagReasons` is reviewed like any draft, just with
   extra suspicion.
4. Add **`humanReviewed: true`** to mark it personally vetted (this earns the dove).
   Most profiles are already `status: reviewed` since launch; if you're working a
   `flagged` one, also change `status: flagged` → `status: reviewed` to publish it.
5. `npm run build` (schema check) or just push the branch — the PR's Cloudflare
   preview renders drafts behind a banner, so a reviewer can read the page as it will
   ship.
6. PR as usual. Note anything needing clergy judgment in the description.

### Adding a saint entirely by hand

1. `make find NAME="…"` — confirm the saint isn't already present under a variant
   spelling (enrich the existing row if so; never a second row).
2. Add a row to `data/saints.csv` with a **blank** Saint ID, following
   [`docs/data-model.md`](data-model.md) (mind CRLF and the `"; "` separator).
3. `python build.py --no-xlsx` — assigns the ID, writes it back, validates.
4. Optionally write `src/content/profiles/OS-####.yaml` by hand: copy a `reviewed`
   profile as a template; the Zod schema in `src/content.config.ts` is the contract
   and `astro build` enforces it. Set `status: draft` until it has been reviewed.
5. `make validate`, then PR.

Adding a feast/fast works the same way against `data/feasts.csv` and
`src/content/feasts/FF-####.yaml`.

### Everything else

- **Icons:** the Wikimedia review queue and promotion flow are in
  `scripts/ICON_DOWNLOAD_README.md`; the license gate is build-enforced (see
  data-model.md). Adding one icon = one row in `data/saint_images.csv` + the file
  under `static/icons/` + a thumb.
- **Corrections issues:** the `/corrections` form files GitHub issues labeled
  `data-quality`; triage them like any bug report and fix the CSV. The form's
  backend is a Cloudflare Worker (Turnstile → GitHub App → issue); if the form
  itself stops working (e.g. submissions error), its setup, secrets, and
  troubleshooting runbook are in `workers/report/README.md`. It needs no
  scheduled maintenance — the GitHub App key doesn't expire.
- **Where the backlogs live:** `docs/database-expansion.md` (saints to add),
  `docs/data-issues.md` (corrections register), `docs/relationship-backlog.md`
  (relationship network).

## Dependency upgrades

Weekly Dependabot PRs cover patch/minor (auto-merged once CI is green). **Major
versions are ignored by Dependabot on purpose** — the Node toolchain (Astro
especially) ships breaking majors, and chasing them weekly is the biggest
recurring maintenance tax. Instead, once or twice a year:

1. Branch, run `npm outdated`, bump majors one at a time starting with Astro
   (read its migration guide first — the content-collections API has changed
   across majors before).
2. Gates: `make web-lint && make web-unit && make web-build && make web-test`.
   The Playwright e2e suite is the safety net for behavior.
3. One PR per major (or one PR for the batch if all green), reviewed via the
   Cloudflare preview.

A pinned, year-old Astro that builds is stability, not debt. The Python side is
stdlib-only and has no equivalent problem.
