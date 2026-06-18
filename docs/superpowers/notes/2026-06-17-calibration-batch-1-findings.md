# Profile-generation calibration batch 1 — findings

**Date:** 2026-06-17
**Branch:** `data/profilegen-calibration-batch-1`
**Plan:** `docs/superpowers/plans/2026-06-17-generation-pipeline.md` Task 10 (acceptance gate)
**Batch (15, highest finder-value, profile-less):** OS-0001, OS-0019, OS-0071, OS-0047,
OS-0050, OS-0004, OS-0012, OS-0069, OS-0064, OS-0070, OS-0695, OS-0006, OS-0013, OS-0038, OS-0049

**Verdict: DO NOT SCALE UP.** The Write(Opus)/Verify(Sonnet) tiers produce high-quality,
faithfully-grounded prose, but the pipeline glue has blocking defects: the production build is
**red**, grounding/external-fetch is thin, and the Emit(Haiku) stage is unreliable at the
deterministic bookkeeping the Python helpers were built to own. Fix the defects below, re-run a
clean calibration batch, and only then proceed to bulk (`make profile-run`).

---

## What worked (encouraging)

- **Prose quality is high.** Encyclopedic house voice, no devotional language, correct hedging
  ("by tradition…", "the synaxarion relates…"). Scope discipline is good: OS-0012 (George)
  correctly separates "Historically Documented" from "Traditional Accounts" and flags the
  dragon legend as a medieval *Western* addition.
- **Faithful to the anchor row.** Spot-checking OS-0012/0047/0050/0069/0070 against their
  `saints.csv` rows: every profile tracks its anchor (no fabrication detected against anchors).
- **Richness is good.** Nearly all 15 carry a timeline, 2–4 sections, and patronage.
- **Verifier flags at a sane rate:** 6/15 = **40% flagged** (OS-0047, OS-0050, OS-0012,
  OS-0069, OS-0070, OS-0049), driven by appropriate caution about claims that expand beyond the
  one-sentence anchor — correct adversarial behavior.

## Blocking defects (must fix before scaling)

1. **`sources: []` on all 15 → `npm run build` FAILS.** Zod: "draft profiles must list at least
   one source." Root cause: `PROFILE_SCHEMA` (schemas.py / the workflow's `PROFILE_SCHEMA_JSON`)
   has **no `sources` property**, and `emit.write_profile(... sources=p.get('sources', []))`
   therefore always defaults to empty. The dossier's anchor + external sources are never threaded
   into the written profile. **Highest-priority fix** — without it nothing can even build as a draft.

2. **Weak grounding / shallow external fetch.** Canonical coverage rows show mostly `none`/`thin`
   (OS-0006=0 external, OS-0071=0, OS-0070=1, OS-0695=1; only OS-0049 reached `full`=2). With empty
   `sources` and few external fetches, much prose rests on the anchor row + model parametric
   knowledge — exactly the §9 fabrication risk the pipeline exists to prevent, and unverifiable
   because sources aren't recorded. The Gather(Haiku) prompt needs to actually fetch the tiered
   sources (and the fetch needs to be confirmed reachable), not lean on the anchor alone.

3. **Emit(Haiku) is unreliable at deterministic bookkeeping.** It hand-wrote repo state instead of
   calling the unit-tested helpers:
   - **Freelanced 5 different coverage filenames** instead of the one canonical
     `dist/profilegen_2026-06-17.csv` (also saw `_coverage_`, `/coverage.csv`, `_coverage.csv`).
   - **Garbled coverage row schemas** — wrong column order, "reviewed" written into a coverage
     column, e.g. `OS-0012,reviewed,George the Trophy-bearer,Martyr,4th century,high`.
   - **Did not faithfully persist the verifier output**: all 15 verdict entries stored `claims` as
     plain strings, not the `{claim, supported, reason}` objects Sonnet returned — the `supported`
     booleans are lost, so the verdict log is not machine-usable downstream (Plan 3).

## Recommended fixes (next iteration, then re-run calibration)

- **Add `sources` to `PROFILE_SCHEMA`** and have Write populate it from the dossier (anchor
  `sources` + each external `source`). Make Emit pass them through (it already reads `p['sources']`).
- **Strengthen Gather**: require ≥1–2 external fetches per the §4 tiers before Write; confirm the
  source hosts are reachable in this environment; record every fetched URL as a dossier `source`.
- **Make Emit deterministic**: have it *invoke* `tools.profilegen.coverage.log_row` and
  `tools.profilegen.proposals.append` (and persist the raw Sonnet verdict JSON verbatim) rather
  than constructing CSV/JSON rows itself. Consider moving coverage/verdict writes out of the
  agent entirely and into the workflow's own Bash steps with the helper, so a stochastic model
  never authors the bookkeeping. Pin the one canonical coverage path.
- Re-run a fresh 15-saint calibration batch; require a **green `npm run build`** and clean
  coverage/verdict logs before promoting any profile or running bulk.

## Disposition of this batch

- Generated drafts are **not promoted** and **not committed to the build path** (they fail Zod).
  Retained for inspection under `dist/profilegen/` (git-ignored): the 15 profile JSONs are in
  `dist/profilegen/scratch/OS-*.json`; the emitted YAML still sits untracked in
  `src/content/profiles/OS-*.yaml` pending the decision below.
- No `data/saints.csv` facet merges occurred (the workflow never wired in `facets.merge`) — CSV
  is untouched; `make validate` is CLEAN.
- `dist/*_proposals.*` are empty (no PD quote/image proposals were generated).

## Workflow bug fixed in passing

`scripts/profilegen.workflow.js` crashed immediately on the first run with
`pipeline() expects an array as the first argument` — `args` did not arrive as a JS array. Hardened
the script to accept an array, a JSON-encoded array string, or a delimited string. (Committed.)
