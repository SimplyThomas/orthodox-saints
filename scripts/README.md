# scripts/ — authoring & infrastructure aids

Each script carries full usage docs in its own header; this is the index. None of
these are needed to build or deploy the site — the operational pipeline is
`build.py` + `astro build` (see the Makefile).

| Script | What it does | Needs | Cadence |
|--------|--------------|-------|---------|
| `download_saint_icons.py` | Bulk-fetch openly-licensed saint icons from Wikimedia Commons into `static/icons/` + a review queue in `dist/` | `pip install requests Pillow python-dotenv` (authoring-only, not in requirements.txt); optional Wikimedia bot creds in `.env` | One-time bulk pass done; re-run for new saints (`--force` to refetch). See `ICON_DOWNLOAD_README.md`. |
| `make_icon_contact_sheet.py` | HTML contact sheet for reviewing the downloaded-icon queue | stdlib only | With the downloader. |
| `make_icon_thumbs.py` | ~200 px avatar thumbs under `static/icons/thumbs/` | Pillow | **After any manually-added icon** (the downloader emits thumbs itself). |
| `make_og_image.mjs` | Regenerates `static/og-default.png` (1200×630 share card) | `npx playwright install chromium` | Only after a wordmark/tagline change. |
| `cf-pages-build.sh` | Cloudflare Pages preview build command | — (runs in CF's environment) | Infrastructure; referenced by the Pages project config, not run locally. |
| `bootstrap-wsl.sh` | One-shot WSL dev-environment setup | — | Onboarding aid. Step 5 installs Claude Code — optional, skip freely. |
| `profilegen.workflow.js` / `feastgen.workflow.js` | Per-stage orchestration for the bulk profile/feast generators | Claude Code subscription | **Historical** — generation is complete (see `docs/maintenance.md`). |
