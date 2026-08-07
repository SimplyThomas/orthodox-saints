# Contributing to Cloud of Witnesses

Thank you for helping build a finder for Orthodox patron saints and intercessors. This
guide is the short version; the full operating contract is in [`CLAUDE.md`](CLAUDE.md).

## Ground rules

- **Source of truth is the CSV.** Edit `data/saints.csv` (one row per saint, 26 columns)
  and `data/vocabulary.csv`. Never edit generated output in `public/` or `dist/` — it's
  rebuilt from the CSVs and is git-ignored.
- **Controlled vocabulary is enforced.** To use a new facet term, add it to
  `data/vocabulary.csv` **first**, then use it. The build fails on unknown terms.
- **Don't invent facts.** Honest stubs and blanks are fine; fabrication is not. Keep
  `Sources` filled on every row. Tag `Life Experience` only when the saint's life supports
  it — these are pastoral facets, never clinical claims.
- **Respect copyright.** Don't paste a copyrighted translation and don't add an unlicensed
  image — the build derives link-out search URLs instead. Reproducing a text or an image is
  allowed only where it passes a gate the build enforces: a genuinely **public-domain**
  source (ANF/NPNF, an explicit `(PD)`, `CC0`), an **open licence** (`PD*`, `CC0`,
  `CC-BY*`, `CC-BY-SA*` — the last two need a credit), or a **`Permission:<slug>` token**
  resolved against `data/image_permissions.csv` / `data/text_permissions.csv`. Anything
  else fails validation, which is the point. A source link is not permission. See
  [`docs/permissions/README.md`](docs/permissions/README.md).
- **Saint IDs are permanent.** Add new rows with a **blank** Saint ID; the build assigns
  the next `OS-####` and writes it back. Never hand-pick, reuse, or renumber IDs.

> ⚠️ **The CSVs use Windows (CRLF) line endings** — `.gitattributes` tells git not to
> normalize them, but your editor still might. Before editing `data/*.csv`, run
> `git config core.autocrlf false` and use an editor that preserves CRLF; verify with
> `cat -A data/saints.csv | head -2` (lines must end in `^M$`). An editor that
> normalizes to LF silently corrupts the file or produces a huge noisy diff.
> (`make validate` now fails on a bare-LF CSV, so a mistake is caught before review.)
> Also: multi-value cells are separated by `"; "` (semicolon + space), never commas.

**Column meanings, required fields, join-file schemas, and the feast date grammar are
in [`docs/data-model.md`](docs/data-model.md)** — the human quick reference. The full
operating contract (sourcing strategy, guardrails, edge cases) is
[`CLAUDE.md`](CLAUDE.md) §§5–10.

## Workflow

`main` is branch-protected — changes land via pull request, gated by CI.

1. Branch off `main`.
2. Make your edits.
3. Build & check locally:
   ```bash
   make validate     # must be CLEAN (0 violations)   — or: make docker-validate
   make test         # if you changed build.py         — or: make docker-test
   make build        # sanity-check public/data.json   — or: make docker-build
   ```
   No local Python? Use the `docker-*` targets (see [README](README.md)).
4. Commit with a clear message and open a PR. Fill in the PR checklist.
5. CI (`validate`: unit tests + data validation) must pass. Then squash-merge.
   Deploy to GitHub Pages happens automatically on `main`.

## Licensing your contribution

The project publishes its own data as **CC0 1.0** (public domain) and its code as **MIT**
— see [`LICENSE-data`](LICENSE-data) and [`LICENSE`](LICENSE). For that to be true of the
whole, it has to be true of each part.

**By opening a pull request you agree that:**

- your contribution is **your own work**, or is material you have the right to contribute;
- your **data** contributions are released under **CC0 1.0**, and your **code**
  contributions under the **MIT License**, on the same terms as the rest of the project;
- you have **not** pasted in text or images belonging to someone else, unless they pass one
  of the gates in "Respect copyright" above — and if it is permission-based rather than
  openly licensed, you have said so in the PR so it can be recorded in
  [`docs/permissions/`](docs/permissions/) and revoked cleanly later.

No CLA to sign and nothing to send — opening the PR is the agreement. If any of it does not
hold for something you want to add, say so in the PR description rather than leaving it to
be discovered; a contribution we cannot license is worse than one we do not have.

## Standing caveat

This dataset is **not** authoritative and awaits review by competent clergy and sources.
Flag any canonization or judgment calls in your PR description.
