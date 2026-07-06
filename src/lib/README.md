# src/lib — how the frontend data flows

Every file here has a header comment explaining itself; this page is the map that
ties them together for a human tracing a feature end-to-end.

## The three shapes of a saint

`types.ts` defines the projections, all derived from one `public/data.json` record:

- **`Saint`** — the full record. Only per-saint pages (`/saint/OS-####`) and other
  pre-rendered pages use it, at build time.
- **`FinderSaint`** — the trimmed projection the /search and /quiz islands work with
  (facets + search haystack, no long prose).
- **`CardSaint`** — lighter still (no haystack), for the home-page card band.

## How a page gets its data

```
python build.py  ──►  public/data.json
                          │
                 data.ts (fs read at BUILD time — never fetched at runtime;
                          restart `make serve` after a data rebuild)
                          │
        ┌─────────────────┼──────────────────────┐
   pages/saint/…      finder-payload.ts      card-payload.ts
   (full record,      emits /finder-data/    emits /card-data/
   pre-rendered)      <hash>.json            <hash>.json
                          │                      │
                 finder-data.client.ts      cloud-band.client.ts
                 (fetch + memoize; shared   (home island fetch)
                 by /search and /quiz)
```

The content hash in each payload URL ties a deployed page to exactly the data it was
built with. First page of /search results is SSR'd for instant paint / SEO / no-JS.

## The review gate (why a profile doesn't show in production)

Rich prose lives in YAML content collections (`src/content/profiles/`,
`src/content/feasts/`), validated by the Zod schemas in `src/content.config.ts`.
`profile-select.ts` implements the gate — production ships only `status: reviewed`;
dev and Cloudflare previews (`PUBLIC_SHOW_DRAFTS=true`) show all, behind banners —
and `saint-profiles.ts` applies it. The dove badge (`humanReviewed`) on finder/quiz
cards is derived from the same reviewed set in `finder-payload.ts`.

## Where to look, by task

| Task | Files |
|------|-------|
| Facet filtering / counts on /search | `filter.ts` (hand-rolled set intersection) |
| Text search ranking | `search.ts` (MiniSearch, unioned with a substring-filter recall floor) + `names.ts` |
| Header typeahead | `pages/search-index.json.ts` + `islands/site-search.client.ts` |
| Quiz scoring | `quiz.ts` (option groups + facet-overlap scoring; intercessions weigh most) |
| Theme pages / "related saints" | `themes.ts`, `theme-aliases.ts` (catalog comes from `public/themes.json`, built by `themes.py`) |
| Calendar | `calendar-grid.ts`, `feast-dates.ts`, `feasts.ts` (feast tokens arrive structured from `public/feasts.json` — never re-parse strings) |
| Groups (saint-profiles at `/saint/<groupId>`, `profile_type:"group"`) | `groups.ts` (reads `public/groups.json`; `GroupSaintProfile.astro` renders the members. Old `/group/<slug>` URLs 301 to `/saint/<groupId>` via astro.config) |
| URL building | `format.ts` — **always route internal URLs through `withBase()`** |
| Curated/editorial content | `witnesses.ts`, `america.ts`, `ephraim.ts`, `seraphim.ts`, `news.ts`, `icons-home.ts` — data-as-TypeScript, each self-documenting |
| Site chrome | `nav.ts` (header/footer links), `analytics.ts` |

Hydrated client JS lives only in `src/islands/` (vanilla TS, no framework); the
heaviest is `finder.client.ts` (the /search island: state, facets, URL sync,
pagination). Unit tests (`*.test.ts`, Vitest) sit next to what they test; Playwright
smoke tests are in `e2e/`.
