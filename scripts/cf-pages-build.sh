#!/usr/bin/env bash
#
# Cloudflare Pages preview build for Cloud of Witnesses.
#
# Set this as the Pages project's "Build command" (output directory: _site).
# It mirrors the production pipeline (python build.py -> astro build) but skips the
# Excel export, so the only Python dependency (openpyxl) is unnecessary and no
# `pip install` is required: `build.py --no-xlsx` runs on the standard library alone.
#
# Previews show draft/flagged saint profiles when PUBLIC_SHOW_DRAFTS=true is set in the
# Pages environment variables — that is the point of the preview, so reviewers can see
# generated content before it is promoted to `reviewed`.
set -euo pipefail

# Cloudflare's build image ships Python (3.13.x by default), but resolve defensively:
# build.py only needs the standard library on 3.11+.
PY="$(command -v python3 || command -v python || true)"
if [ -z "$PY" ]; then
  echo "error: no python3/python on PATH (build.py needs Python 3.11+)" >&2
  exit 1
fi
echo "Using Python: $PY ($("$PY" --version 2>&1))"

# 1. Validate the data and emit public/data.json (Astro imports it at build time).
#    --no-xlsx skips the openpyxl-only Excel export.
"$PY" build.py --no-xlsx

# 2. Node dependencies. Cloudflare installs these automatically before running this
#    script; the guard makes the script self-sufficient if run elsewhere (e.g. locally).
if [ ! -d node_modules ]; then
  npm ci
fi

# 3. Astro static build -> _site/ (PUBLIC_SHOW_DRAFTS from the Pages environment).
npm run build
