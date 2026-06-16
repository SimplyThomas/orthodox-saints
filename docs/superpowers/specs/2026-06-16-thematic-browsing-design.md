# Thematic Browsing — Design Spec (Feature B)

**Date:** 2026-06-16
**Status:** Proposed — awaiting user review
**Relationship:** Feature B of two. Feature A (rich saint profiles, PR #157) shipped St. Basil's
profile with **non-linking** theme badges. Feature B makes themes a first-class, system-wide
facet and turns those badges into real links.

---

## 1. Goal

Help visitors discover saints by **theme** — life circumstances, vocations, virtues, struggles,
historical movements, relationships, miracles, and geography — rather than only by name or feast.
Concretely:

1. A derived `themes: string[]` on **every** saint record (the future-proofing the user asked for).
2. A **"Browse by Theme"** landing page of themed cards (name, description, saint count, link),
   grouped into the 8 theme groups.
3. A **per-theme listing** page (`/themes/<slug>`) — a filtered saint list reusing the finder.
4. **Theme badges on every saint page**, linking to `/themes/<slug>` (and repointing Basil's
   Feature-A profile badges to these links).
5. **Theme-based related saints** (by shared-theme overlap) on saint pages.
6. **Natural-language search aliases** so queries like "saints who were soldiers", "saints in
   america", "saints who defended icons" surface the matching theme.

## 2. Architecture (approved in brainstorm)

**Hybrid: derived + override.** Themes are computed at build time from a declarative taxonomy of
predicates over the controlled-vocab facets every saint already has. An optional `Themes` column in
`data/saints.csv` (semicolon-separated slugs) is **unioned in** for curated/non-derivable themes.

**Count-driven display.** The full taxonomy ships in code, but the landing page renders only themes
whose computed count > 0 — no dead "0 saints" cards. Override-only themes light up automatically as
the override column fills.

**Lightweight search aliases.** A small phrase→slug map folded into the existing client-side search;
no NLP, no new dependency.

```
data/saints.csv (facets + optional Themes override col)
      │
      ▼
build.py  ── compute_themes(record, TAXONOMY) ──► record["themes"] = [slug,…]   (every saint)
      │     └─ emits theme catalog: [{slug, group, label, desc, count}]          (themes.json or in data.json)
      ▼
public/data.json  ──(build-time import)──►  Astro:
      ├─ /themes               (landing: catalog grouped, counts)
      ├─ /themes/[slug]        (per-theme listing; reuses finder filtering on themes[])
      ├─ saint/[id]            (theme badges → /themes/<slug>; theme-based related saints)
      └─ search                (alias map: phrase → theme suggestion banner)
```

- The taxonomy + mapping is the **single source of truth**, authored once in Python (`build.py` or a
  new `themes.py` it imports). The catalog (slugs, labels, descriptions, groups, counts) is emitted
  to the frontend so pages render from data, not hardcoded lists.
- `themes` becomes a real **finder facet** (added to `FACETS` in `src/lib/filter.ts`), so `/themes/<slug>`
  is just the finder pre-seeded to one theme, and themes are also filterable on `/search`.

## 3. Rule schema

Each theme is `{ slug, group, label, desc, match }`. `match` is a list of **rules**; a saint gets the
theme if **any** rule matches (OR) — within a rule, **all** field conditions must hold (AND). A field
condition matches if the saint's value(s) for that field intersect the listed values. Fields are the
`data.json` record arrays/strings: `gender, rank, church, family, vocation, experience, virtue,
intercession, origin, tradition, era, century`.

```python
# themes.py
THEMES = [
  {"slug": "mothers", "group": "Life Circumstances", "label": "Mothers",
   "desc": "Holy women who raised children in the faith.",
   "match": [{"gender": ["Female"], "family": ["Parent"]}]},          # AND within rule
  {"slug": "healers", "group": "Miracles & Wonders", "label": "Healers",
   "desc": "Saints through whom God healed body and soul.",
   "match": [{"rank": ["Unmercenary"]}, {"vocation": ["Physician"]},   # OR across rules
             {"intercession": ["Healing"]}],
   ...},
  # override-only themes have "match": []  → populated solely via the Themes CSV column
]
```

A saint's final `themes` = `{slug for theme in THEMES if any_rule_matches(theme, record)} ∪ {slugs from the Themes override column}`. The override column is validated against the taxonomy slugs (unknown slug → build error, same as any vocab).

## 4. The taxonomy (complete; my judgment calls flagged ⚑)

Notation: `field∈{…}` means the saint's `field` intersects the set. Rules separated by `OR`.
**DERIVED** = has a `match`. **OVERRIDE** = `match: []`, filled only via the CSV column (renders once
populated; hidden at launch per the count>0 rule). **⚑** = a judgment call worth your review.

### Life Circumstances
| slug | label | mapping |
|---|---|---|
| converts | Converts | `church∈{Convert}` |
| married-saints | Married Saints | `family∈{Married}` |
| mothers | Mothers | `gender=Female AND family∈{Parent}` |
| fathers | Fathers | `gender=Male AND family∈{Parent}` |
| widows | Widows | `gender=Female AND family∈{Widowed}` |
| children | Children | `rank∈{Child-Saint} OR family∈{Child}` |
| youth | Youth | `family∈{Teen}` |
| elderly-saints | Elderly Saints | ⚑ `family∈{Grandparent}` (closest proxy; no "elderly" facet) |
| former-soldiers | Former Soldiers | ⚑ **merged into `soldiers`** (Vocations) — "former" not distinguishable from facets |
| former-slaves | Former Slaves | `vocation∈{Servant / Slave} OR experience∈{Slavery}` |
| former-criminals | Former Criminals | ⚑ `experience∈{Repentance from grave sin}` (loose proxy) |
| missionaries | Missionaries | `rank∈{Missionary, Equal-to-the-Apostles, Enlightener} OR intercession∈{Missionary Work}` (also covers "Missionary Saints", "Evangelism") |
| royal-saints | Royal Saints | `rank∈{Right-believing (Ruler)} OR vocation∈{Ruler}` (= "Rulers"; one theme) |
| orphans | Orphans | OVERRIDE ⚑ |
| former-pagans | Former Pagans | OVERRIDE ⚑ |
| immigrants | Immigrants | OVERRIDE ⚑ |
| refugees | Refugees | OVERRIDE ⚑ (Exile facet ≠ refugee; kept curated to avoid mislabeling) |
| pilgrims | Pilgrims | OVERRIDE ⚑ |

### Vocations
| slug | label | mapping |
|---|---|---|
| bishops | Bishops | `church∈{Clergy - Bishop} OR rank∈{Hierarch}` |
| priests | Priests | `church∈{Clergy - Priest}` |
| deacons | Deacons | `church∈{Clergy - Deacon}` |
| monastics | Monastics | `church∈{Monastic} OR rank∈{Venerable (Monastic)}` |
| hermits | Hermits | `rank∈{Hermit}` |
| physicians | Physicians | `vocation∈{Physician, Nurse}` |
| teachers | Teachers | `vocation∈{Teacher}` |
| writers | Writers | `vocation∈{Writer, Translator}` |
| iconographers | Iconographers | `vocation∈{Iconographer}` |
| musicians | Musicians | `vocation∈{Musician, Hymnographer}` |
| judges | Judges | `vocation∈{Judge}` |
| craftsmen | Craftsmen | `vocation∈{Craftsman, Architect}` |
| farmers | Farmers | `vocation∈{Farmer, Shepherd}` |
| sailors | Sailors | `vocation∈{Sailor}` |
| soldiers | Soldiers | `vocation∈{Soldier, Officer / General}` |
| theologians | Theologians | ⚑ `vocation∈{Scholar}` (proxy) **+ OVERRIDE** for true theologians (Basil, the Gregorys…) |
| abbots-abbesses | Abbots & Abbesses | OVERRIDE ⚑ (no facet) |

### Virtues
| slug | label | mapping |
|---|---|---|
| humility | Humility | `virtue∈{Humility}` |
| charity | Charity | `virtue∈{Charity}` |
| courage | Courage | `virtue∈{Courage}` |
| patience | Patience | `virtue∈{Patience}` |
| obedience | Obedience | `virtue∈{Obedience}` |
| wisdom | Wisdom | `virtue∈{Wisdom}` |
| repentance | Repentance | `virtue∈{Repentance} OR experience∈{Repentance from grave sin}` |
| hospitality | Hospitality | `virtue∈{Hospitality}` |
| perseverance | Perseverance | `virtue∈{Perseverance}` |
| faithfulness | Faithfulness | `virtue∈{Faith}` |
| forgiveness | Forgiveness | `virtue∈{Forgiveness}` |
| asceticism | Asceticism | `rank∈{Ascetic, Stylite} OR virtue∈{Self-Control}` |
| love-of-enemies | Love of Enemies | OVERRIDE ⚑ (virtue "Love" too broad to equate) |
| evangelism | Evangelism | ⚑ **merged into `missionaries`** |

### Struggles & Trials
| slug | label | mapping |
|---|---|---|
| persecution | Persecution | `experience∈{Persecution}` |
| imprisonment | Imprisonment | `experience∈{Imprisonment, Captivity}` |
| exile | Exile | `experience∈{Exile}` |
| poverty | Poverty | `experience∈{Poverty}` |
| illness | Illness | `experience∈{Illness, Chronic Pain}` |
| physical-disability | Physical Disability | `experience∈{Disability, Blindness}` |
| grief | Grief | `experience∈{Grief / Bereavement, Loss of a Child}` |
| temptation | Temptation | `experience∈{Temptation}` |
| addiction-recovery | Addiction Recovery | `experience∈{Addiction / Self-destructive habits} OR intercession∈{Addiction Recovery}` |
| doubt | Doubt | `experience∈{Doubt}` |
| martyrdom | Martyrdom | `rank∈{Martyr, Great Martyr, Hieromartyr, New Martyr, Venerable-Martyr, Passion-Bearer}` |
| torture | Torture | `experience∈{Torture}` |
| family-conflict | Family Conflict | ⚑ `experience∈{Difficult Marriage}` (loose) |
| spiritual-warfare | Spiritual Warfare | OVERRIDE ⚑ |

### Historical Themes
| slug | label | mapping |
|---|---|---|
| apostolic-age | Apostolic Age | `era∈{Apostolic Age} OR rank∈{Apostle, Equal-to-the-Apostles}` |
| desert-fathers | Desert Fathers | `gender=Male AND origin∈{Egypt} AND rank∈{Venerable (Monastic), Ascetic, Hermit}` |
| desert-mothers | Desert Mothers | `gender=Female AND origin∈{Egypt} AND rank∈{Venerable (Monastic), Ascetic, Hermit}` |
| early-martyrs | Early Martyrs | `rank∈{Martyr, Great Martyr, Hieromartyr} AND era∈{Apostolic Age, Pre-Nicene}` |
| byzantine-saints | Byzantine Saints | `era∈{Byzantine}` |
| slavic-saints | Slavic Saints | `origin∈{Rus' / Russia, Ukraine, Serbia, Bulgaria} OR tradition∈{Russian, Serbian, Bulgarian}` |
| celtic-saints | Celtic Saints | `origin∈{Ireland, Scotland, Wales, British Isles}` |
| new-martyrs | New Martyrs | `rank∈{New Martyr}` |
| saints-of-america | Saints of America | `origin∈{North America, Alaska} OR tradition∈{North American}` (= "North America"; one theme) |
| saints-of-alaska | Saints of Alaska | `origin∈{Alaska}` |
| saints-under-communism | Saints Under Communism | `era=Modern AND (rank∈{New Martyr} OR experience∈{Persecution}) AND origin∈{Rus' / Russia, Ukraine, Romania, Serbia, Bulgaria, Baltics, Georgia}` |
| ottoman-era-saints | Ottoman-Era Saints | `era=Post-Byzantine AND (origin∈{Greece, Constantinople, Asia Minor, Serbia, Bulgaria, Romania, Thrace} OR rank∈{New Martyr})` |
| confessors | Confessors | `rank∈{Confessor}` |
| hierarchs | Hierarchs | `rank∈{Hierarch}` (= "Great Hierarchs") |
| defenders-of-orthodoxy | Defenders of Orthodoxy | OVERRIDE ⚑ (= "Defenders of the Faith"; active defense, broader than the Confessor rank) |
| icon-defenders | Icon Defenders | OVERRIDE ⚑ (iconoclasm not a facet — prime curated theme) |
| anti-arian-saints | Anti-Arian Saints | OVERRIDE ⚑ |
| ecumenical-councils | Ecumenical Councils | OVERRIDE ⚑ |
| apologists | Apologists | OVERRIDE ⚑ |
| church-fathers | Church Fathers | OVERRIDE ⚑ (no "Father" facet; curated) |
| missionary-saints | — | ⚑ **merged into `missionaries`** |

### Family & Relationships — all OVERRIDE ⚑ (no facets encode these relations; hidden until curated)
`holy-families, saintly-siblings, married-couples, spiritual-fathers, spiritual-mothers, godparents, mentors-disciples`

### Miracles & Wonders
| slug | label | mapping |
|---|---|---|
| wonderworkers | Wonderworkers | `rank∈{Wonderworker}` |
| healers | Healers | `rank∈{Unmercenary} OR vocation∈{Physician} OR intercession∈{Healing}` |
| prophecy | Prophecy | `rank∈{Prophet, Forerunner}` |
| miracle-working-relics | Miracle-Working Relics | OVERRIDE ⚑ |
| miracle-working-icons | Miracle-Working Icons | OVERRIDE ⚑ |
| visions | Visions | OVERRIDE ⚑ |
| apparitions | Apparitions | OVERRIDE ⚑ |

### Geographic Themes
| slug | label | mapping |
|---|---|---|
| holy-land | Holy Land | `origin∈{Palestine / Holy Land, Sinai}` |
| egypt | Egypt | `origin∈{Egypt}` |
| greece | Greece | `origin∈{Greece, Constantinople}` |
| asia-minor | Asia Minor | `origin∈{Asia Minor, Pontus, Thrace}` |
| balkans | Balkans | `origin∈{Serbia, Bulgaria, Romania, Thrace}` |
| russia | Russia | `origin∈{Rus' / Russia, Ukraine}` |
| georgia | Georgia | `origin∈{Georgia}` |
| romania | Romania | `origin∈{Romania}` |
| serbia | Serbia | `origin∈{Serbia}` |
| antioch | Antioch | `origin∈{Syria} OR tradition∈{Antiochian}` |
| western-europe | Western Europe | `origin∈{Italy / Rome, Gaul / France, Germany, Spain}` |
| british-isles | British Isles | `origin∈{British Isles, Ireland, Scotland, Wales, England}` |
| alexandria | Alexandria | OVERRIDE ⚑ (no Alexandria-specific origin; Egypt covers the region) |

**Net:** ~80 themes derive from existing facets and will render at launch; ~30 are OVERRIDE-only
(hidden until curated) — concentrated in *Family & Relationships*, *Miracles* (relics/icons/visions),
and a handful of doctrine-specific Historical themes. Five requested names are merged duplicates
(`former-soldiers→soldiers`, `rulers→royal-saints`, `missionary-saints`/`evangelism→missionaries`,
`north-america→saints-of-america`, `defenders-of-the-faith→defenders-of-orthodoxy`).

## 5. Build changes (`build.py` / new `themes.py`)

- New `themes.py`: the `THEMES` taxonomy + `compute_themes(record) -> list[str]` + `theme_catalog(records) -> list[dict]` (slug/group/label/desc/count). Unit-tested.
- `build.py` `to_record()`: set `rec["themes"] = compute_themes(rec)` (union with the optional `Themes`
  override column, split on `"; "`).
- Add optional **`Themes`** as column 27 of `data/saints.csv` (back-compat: absent/blank = derived only).
  Validate override slugs against the taxonomy; unknown slug → build error with a "valid slugs are…" hint.
- Emit the theme catalog into `public/data.json` (e.g. a top-level `{ records: [...], themes: [...] }`
  OR a sibling `public/themes.json`). **Decision:** sibling `themes.json` to avoid touching the
  records-array shape the frontend already imports. ⚑ (open to in-data.json if preferred.)
- Coverage report: print theme counts (top N) like the existing finder-coverage report.

## 6. Frontend changes

- **`src/lib/types.ts`**: add `themes: string[]` to `Saint` (+ `FinderSaint`); add a `ThemeMeta`
  type `{slug, group, label, desc, count}`.
- **`src/lib/themes.ts`** (new): import the catalog; helpers `themeBySlug`, `themesByGroup`,
  `THEME_GROUPS` (ordered), `relatedByThemes(saint, all, n)` (rank others by shared-theme count).
- **`src/lib/filter.ts`**: add `{key:"themes", label:"Themes", multi:true}` to `FACETS` so the finder
  filters on `themes[]`.
- **`src/pages/themes.astro`** (new): landing — grouped theme cards (label, desc, count, link), each
  group with an Orthodox-manuscript accent. Count-driven: render only themes with count > 0.
- **`src/pages/themes/[slug].astro`** (new): `getStaticPaths` over the catalog; renders a themed
  header (label/desc/count) + the finder pre-seeded to that theme (reuse `Finder`/finder island, or a
  static list reusing the saint-row markup). Reuses existing pagination/sort.
- **`src/components/SiteHeader.astro`**: add nav `{ key:"themes", label:"Themes", href: withBase("themes") }`.
- **Saint pages — badges:** a "Themes" block on `SaintView` rendering `saint.themes` as `.tag`-style
  badges linking to `withBase("themes/"+slug)`. **Repoint Basil's Feature-A profile badges** in
  `SaintProfile.astro` to `/themes/<slug>` (map the profile's editorial labels to slugs; drop labels
  with no taxonomy slug or render them plain).
- **Saint pages — related:** a "Related saints" block from `relatedByThemes()` (top ~6 by shared-theme
  overlap), computed at build time (SSG has the full dataset; zero client payload). Complements Basil's
  curated `related` list.
- **Search aliases — `src/lib/theme-aliases.ts`** (new): `{ "soldiers":"soldiers", "in america":"saints-of-america",
  "defended icons":"icon-defenders", "mothers":"mothers", "exile":"exile", … }`. The finder island
  detects an alias hit in the query and shows a "Browse the **<label>** theme →" suggestion banner above
  results; theme labels also fold into the search haystack at build (append each saint's theme labels to
  its `search` string).

## 7. Testing

- **Python unit tests** (`tests/`): `compute_themes` on crafted records (each rule kind: single facet,
  AND-combination like Mothers/Desert-Fathers, OR-across-rules like Healers, override union, unknown
  override slug → error); `theme_catalog` counts; the OS-0021 Basil record carries expected derived
  slugs (bishops, hierarchs, monastics, theologians, asia-minor, byzantine-saints, …).
- **Playwright e2e** (`e2e/`): `/themes` renders grouped cards with counts and no count-0 card;
  clicking a card opens `/themes/<slug>` listing the right saints; a saint page shows theme badges
  linking to `/themes/<slug>`; Basil's profile badges now link; related-saints block renders; a search
  for "soldiers"/"in america" shows the theme suggestion banner. Nav "Themes" is base-prefixed.
- `make validate` clean; full build; lint; full e2e green; `data.json`/`themes.json` sane.

## 8. Build order (phased; each phase is shippable)

1. **Foundation** — `themes.py` taxonomy + `compute_themes` + `theme_catalog`, `Themes` override
   column, emit `themes.json`, Python tests, coverage report. (No UI yet.)
2. **Browse pages + nav** — `/themes` landing + `/themes/[slug]` + nav item + `themes` finder facet.
3. **Saint-page integration** — theme badges (+ repoint Basil's), theme-based related saints.
4. **Search aliases** — alias map + suggestion banner + haystack enrichment.

## 9. Guardrails / non-goals

- No new controlled-vocab *terms* in `vocabulary.csv` (themes are a separate taxonomy); the `Themes`
  override values are validated against the theme slugs.
- OVERRIDE-only themes stay hidden until curated — no empty cards (per the approved count>0 rule).
- Loose-proxy themes (⚑) are best-effort facets, not authoritative claims; same clergy/source-review
  caveat applies. The mapping is data, easily tuned later.
- Performance: `themes` adds a short string array per record; well within the ~5,000-saint inline
  ceiling noted in `search.astro`'s `TODO(scale)`.

## 10. Resolved decisions (user-reviewed 2026-06-16)

1. **Loose proxies (⚑): KEEP.** Elderly→Grandparent, former-criminals→Repentance-from-grave-sin,
   family-conflict→Difficult Marriage, theologians→Scholar render with best-effort membership now;
   the mapping is data and tunable later. Merges as listed stand.
2. **Override-only themes: SHIP but HIDDEN until curated.** All ~30 are defined in the taxonomy and
   render only once the `Themes` override column gives them count > 0. No empty cards.
3. **Catalog location: sibling `public/themes.json`** (records-array shape in `data.json` unchanged).
4. **`/themes/[slug]` listing: STATIC pre-rendered saint-row list** (no per-page finder island), with a
   "refine in the finder" link to `/search` pre-filtered to that theme.
5. **Scope: BUILD ALL FOUR PHASES** (§8): foundation → browse pages + nav → saint-page badges/related →
   search aliases.
