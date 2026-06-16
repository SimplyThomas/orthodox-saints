# Thematic Browsing Implementation Plan (Feature B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make themes a first-class, system-wide facet — a derived `themes: string[]` on every saint, a "Browse by Theme" landing page, per-theme listing pages, clickable theme badges + theme-based related saints on saint pages, and natural-language search aliases.

**Architecture:** A declarative theme taxonomy in a new `themes.py` maps controlled-vocab facets to theme slugs; `build.py` computes `record["themes"]` for every saint (union with an optional `Themes` CSV override column) and emits a `public/themes.json` catalog with counts. Astro pages render from the catalog: `/themes` (grouped cards, count>0 only), `/themes/[slug]` (static saint lists), theme badges + related-by-theme on `saint/[id]`, and a search alias banner.

**Tech Stack:** Python 3.11 stdlib (`csv`, `json`, `unittest`), Astro SSG + TypeScript, Playwright e2e.

---

## Conventions (read once)

- Branch: already on `feat/thematic-browsing` (off `main`, which now has Feature A).
- Build/validate (host, no Docker): `make validate` or `python build.py --check-only`; `python build.py --no-xlsx` regenerates `public/data.json` **and** `public/themes.json`; `npm run build` regenerates `_site/` (needed before e2e).
- Python tests: `python -m unittest discover -s tests` (or a specific module). Test helpers in `tests/test_build.py`: `valid_row(**overrides)` returns a full 26-column row dict; `errors_for(rows, ...)` returns `build.validate()` errors.
- Frontend gates: `npm run lint`, `npm test` (Playwright). Internal links via `withBase()`.
- `data/saints.csv` has **no `Themes` column** and we do **NOT** add one (avoids a 2,737-row migration). The override is read with `row.get("Themes", "")`, so it's inert until someone adds the column later.
- `public/data.json` is a **bare array** of records (no wrapper). `to_record(r, ...)` builds each record; arrays are split on `"; "` via `split_multi`. Record facet fields: `gender, era, century` are **strings**; `rank, church, family, vocation, experience, virtue, intercession, origin, tradition` are **string arrays**.
- **No `innerHTML`** in client code — use `textContent` / `createElement` (a repo security-hook enforces this).

## File Structure

- **Create** `themes.py` — taxonomy + `compute_themes()` + `theme_catalog()` + `THEME_SLUGS`/`THEME_LABELS`.
- **Modify** `build.py` — call `compute_themes` in `to_record`; enrich `search`; validate override slugs; emit `public/themes.json`; print theme counts.
- **Modify** `tests/test_build.py` — theme unit tests.
- **Create** `src/lib/themes.ts` — catalog import + `themeBySlug`, `themesByGroup`, `THEME_GROUPS`, `relatedByThemes`.
- **Modify** `src/lib/types.ts` — add `themes: string[]` to `Saint`.
- **Create** `src/pages/themes.astro` (landing), `src/pages/themes/[slug].astro` (listing).
- **Modify** `src/components/SiteHeader.astro` — nav item + `active` union.
- **Modify** `src/components/SaintView.astro` — theme badges block + related-by-theme block.
- **Modify** `src/components/SaintProfile.astro` + `src/lib/saint-profiles.ts` — remove the editorial `themes` block/field (superseded by SaintView's derived badges).
- **Create** `src/lib/theme-aliases.ts` + **Modify** `src/components/Finder.astro` + `src/islands/finder.client.ts` — search alias suggestion banner.
- **Modify** `e2e/saint-profile.spec.ts` (the Feature-A themes assertion) + **Create** `e2e/themes.spec.ts`.

---

## PHASE 1 — Theme data foundation

### Task 1: `themes.py` — taxonomy, `compute_themes`, `theme_catalog`

**Files:**
- Create: `themes.py`
- Test: `tests/test_themes.py`

- [ ] **Step 1: Write failing tests** — Create `tests/test_themes.py`:

```python
import unittest
import themes


def rec(**kw):
    """A minimal record like to_record() emits (string + array facets)."""
    base = {
        "gender": "", "era": "", "century": "",
        "rank": [], "church": [], "family": [], "vocation": [],
        "experience": [], "virtue": [], "intercession": [],
        "origin": [], "tradition": [],
    }
    base.update(kw)
    return base


class ComputeThemesTests(unittest.TestCase):
    def test_single_facet(self):
        self.assertIn("bishops", themes.compute_themes(rec(church=["Clergy - Bishop"])))

    def test_and_combination_mothers(self):
        self.assertIn("mothers", themes.compute_themes(rec(gender="Female", family=["Parent"])))
        # a male parent is NOT a mother
        self.assertNotIn("mothers", themes.compute_themes(rec(gender="Male", family=["Parent"])))

    def test_or_across_rules_healers(self):
        self.assertIn("healers", themes.compute_themes(rec(rank=["Unmercenary"])))
        self.assertIn("healers", themes.compute_themes(rec(intercession=["Healing"])))

    def test_desert_fathers_triple_and(self):
        df = themes.compute_themes(rec(gender="Male", origin=["Egypt"], rank=["Ascetic"]))
        self.assertIn("desert-fathers", df)
        self.assertNotIn("desert-mothers", df)

    def test_override_union(self):
        out = themes.compute_themes(rec(church=["Clergy - Bishop"]), override="church-fathers; icon-defenders")
        self.assertIn("church-fathers", out)   # override-only theme
        self.assertIn("icon-defenders", out)
        self.assertIn("bishops", out)          # still derives

    def test_no_duplicate_when_override_repeats_derived(self):
        out = themes.compute_themes(rec(church=["Clergy - Bishop"]), override="bishops")
        self.assertEqual(out.count("bishops"), 1)

    def test_every_slug_unique(self):
        slugs = [t["slug"] for t in themes.THEMES]
        self.assertEqual(len(slugs), len(set(slugs)))

    def test_catalog_counts(self):
        records = [
            {"themes": ["bishops", "hierarchs"]},
            {"themes": ["bishops"]},
        ]
        cat = {c["slug"]: c for c in themes.theme_catalog(records)}
        self.assertEqual(cat["bishops"]["count"], 2)
        self.assertEqual(cat["hierarchs"]["count"], 1)
        self.assertEqual(cat["orphans"]["count"], 0)  # override-only, present in catalog at 0
        self.assertIn(cat["bishops"]["group"], themes.THEME_GROUPS)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run to verify failure** — `python -m unittest tests.test_themes -v` → FAIL (`No module named themes`).

- [ ] **Step 3: Implement `themes.py`** — Create `themes.py` with the engine and the full taxonomy:

```python
"""Theme taxonomy + derivation for Thematic Browsing (Feature B).

A theme is a named predicate over the controlled-vocab facets every saint
already carries. `match` is a list of RULES; a saint gets the theme if ANY rule
matches (OR). Within a rule, ALL field conditions must hold (AND); a field
condition holds if the saint's value(s) for that field intersect the listed
values. `match: []` = override-only (filled solely via the optional `Themes`
CSV column; renders only once it has saints). See
docs/superpowers/specs/2026-06-16-thematic-browsing-design.md for rationale.
"""

THEME_GROUPS = [
    "Life Circumstances", "Vocations", "Virtues", "Struggles & Trials",
    "Historical Themes", "Family & Relationships", "Miracles & Wonders",
    "Geographic Themes",
]

# Each theme: slug, group, label, desc, match (list of rule-dicts).
THEMES = [
    # ── Life Circumstances ─────────────────────────────────────────────
    {"slug": "converts", "group": "Life Circumstances", "label": "Converts",
     "desc": "Saints who came to the faith from outside it.",
     "match": [{"church": ["Convert"]}]},
    {"slug": "married-saints", "group": "Life Circumstances", "label": "Married Saints",
     "desc": "Saints who lived holiness within marriage.",
     "match": [{"family": ["Married"]}]},
    {"slug": "mothers", "group": "Life Circumstances", "label": "Mothers",
     "desc": "Holy women who raised children in the faith.",
     "match": [{"gender": ["Female"], "family": ["Parent"]}]},
    {"slug": "fathers", "group": "Life Circumstances", "label": "Fathers",
     "desc": "Holy men who raised children in the faith.",
     "match": [{"gender": ["Male"], "family": ["Parent"]}]},
    {"slug": "widows", "group": "Life Circumstances", "label": "Widows",
     "desc": "Holy women who served God in widowhood.",
     "match": [{"gender": ["Female"], "family": ["Widowed"]}]},
    {"slug": "children", "group": "Life Circumstances", "label": "Children",
     "desc": "Child saints and young martyrs.",
     "match": [{"rank": ["Child-Saint"]}, {"family": ["Child"]}]},
    {"slug": "youth", "group": "Life Circumstances", "label": "Youth",
     "desc": "Saints who came to holiness in their youth.",
     "match": [{"family": ["Teen"]}]},
    {"slug": "elderly-saints", "group": "Life Circumstances", "label": "Elderly Saints",
     "desc": "Saints honored in their old age.",
     "match": [{"family": ["Grandparent"]}]},
    {"slug": "missionaries", "group": "Life Circumstances", "label": "Missionaries",
     "desc": "Saints who carried the Gospel to new peoples.",
     "match": [{"rank": ["Missionary", "Equal-to-the-Apostles", "Enlightener"]},
               {"intercession": ["Missionary Work"]}]},
    {"slug": "royal-saints", "group": "Life Circumstances", "label": "Royal Saints",
     "desc": "Kings, queens, princes, and rulers who served God.",
     "match": [{"rank": ["Right-believing (Ruler)"]}, {"vocation": ["Ruler"]}]},
    {"slug": "former-slaves", "group": "Life Circumstances", "label": "Former Slaves",
     "desc": "Saints who lived in servitude or slavery.",
     "match": [{"vocation": ["Servant / Slave"]}, {"experience": ["Slavery"]}]},
    {"slug": "former-criminals", "group": "Life Circumstances", "label": "Former Criminals",
     "desc": "Saints who turned from grave sin to holiness.",
     "match": [{"experience": ["Repentance from grave sin"]}]},
    {"slug": "orphans", "group": "Life Circumstances", "label": "Orphans",
     "desc": "Saints who lost their parents young.", "match": []},
    {"slug": "former-pagans", "group": "Life Circumstances", "label": "Former Pagans",
     "desc": "Saints raised in paganism before their conversion.", "match": []},
    {"slug": "immigrants", "group": "Life Circumstances", "label": "Immigrants",
     "desc": "Saints who settled far from their homeland.", "match": []},
    {"slug": "refugees", "group": "Life Circumstances", "label": "Refugees",
     "desc": "Saints who fled persecution or danger.", "match": []},
    {"slug": "pilgrims", "group": "Life Circumstances", "label": "Pilgrims",
     "desc": "Saints known for sacred pilgrimage.", "match": []},

    # ── Vocations ──────────────────────────────────────────────────────
    {"slug": "bishops", "group": "Vocations", "label": "Bishops",
     "desc": "Hierarchs and shepherds of the Church.",
     "match": [{"church": ["Clergy - Bishop"]}, {"rank": ["Hierarch"]}]},
    {"slug": "priests", "group": "Vocations", "label": "Priests",
     "desc": "Saints who served as priests.",
     "match": [{"church": ["Clergy - Priest"]}]},
    {"slug": "deacons", "group": "Vocations", "label": "Deacons",
     "desc": "Saints who served as deacons.",
     "match": [{"church": ["Clergy - Deacon"]}]},
    {"slug": "monastics", "group": "Vocations", "label": "Monastics",
     "desc": "Monks and nuns of the Church.",
     "match": [{"church": ["Monastic"]}, {"rank": ["Venerable (Monastic)"]}]},
    {"slug": "hermits", "group": "Vocations", "label": "Hermits",
     "desc": "Saints who withdrew into solitude.",
     "match": [{"rank": ["Hermit"]}]},
    {"slug": "physicians", "group": "Vocations", "label": "Physicians",
     "desc": "Saints who healed the sick by their craft.",
     "match": [{"vocation": ["Physician", "Nurse"]}]},
    {"slug": "teachers", "group": "Vocations", "label": "Teachers",
     "desc": "Saints who taught and catechized.",
     "match": [{"vocation": ["Teacher"]}]},
    {"slug": "writers", "group": "Vocations", "label": "Writers",
     "desc": "Saints who wrote and translated.",
     "match": [{"vocation": ["Writer", "Translator"]}]},
    {"slug": "iconographers", "group": "Vocations", "label": "Iconographers",
     "desc": "Saints who painted holy icons.",
     "match": [{"vocation": ["Iconographer"]}]},
    {"slug": "musicians", "group": "Vocations", "label": "Musicians",
     "desc": "Hymnographers and singers of the Church.",
     "match": [{"vocation": ["Musician", "Hymnographer"]}]},
    {"slug": "judges", "group": "Vocations", "label": "Judges",
     "desc": "Saints who served in judgment and law.",
     "match": [{"vocation": ["Judge"]}]},
    {"slug": "craftsmen", "group": "Vocations", "label": "Craftsmen",
     "desc": "Saints who worked with their hands.",
     "match": [{"vocation": ["Craftsman", "Architect"]}]},
    {"slug": "farmers", "group": "Vocations", "label": "Farmers",
     "desc": "Saints who worked the land and tended flocks.",
     "match": [{"vocation": ["Farmer", "Shepherd"]}]},
    {"slug": "sailors", "group": "Vocations", "label": "Sailors",
     "desc": "Saints of the sea.",
     "match": [{"vocation": ["Sailor"]}]},
    {"slug": "soldiers", "group": "Vocations", "label": "Soldiers",
     "desc": "Saints who served in arms.",
     "match": [{"vocation": ["Soldier", "Officer / General"]}]},
    {"slug": "theologians", "group": "Vocations", "label": "Theologians",
     "desc": "Saints renowned for theological learning.",
     "match": [{"vocation": ["Scholar"]}]},
    {"slug": "abbots-abbesses", "group": "Vocations", "label": "Abbots & Abbesses",
     "desc": "Leaders of monastic communities.", "match": []},

    # ── Virtues ────────────────────────────────────────────────────────
    {"slug": "humility", "group": "Virtues", "label": "Humility",
     "desc": "Saints renowned for humility.", "match": [{"virtue": ["Humility"]}]},
    {"slug": "charity", "group": "Virtues", "label": "Charity",
     "desc": "Saints renowned for almsgiving and love.", "match": [{"virtue": ["Charity"]}]},
    {"slug": "courage", "group": "Virtues", "label": "Courage",
     "desc": "Saints renowned for courage.", "match": [{"virtue": ["Courage"]}]},
    {"slug": "patience", "group": "Virtues", "label": "Patience",
     "desc": "Saints renowned for patience.", "match": [{"virtue": ["Patience"]}]},
    {"slug": "obedience", "group": "Virtues", "label": "Obedience",
     "desc": "Saints renowned for obedience.", "match": [{"virtue": ["Obedience"]}]},
    {"slug": "wisdom", "group": "Virtues", "label": "Wisdom",
     "desc": "Saints renowned for wisdom.", "match": [{"virtue": ["Wisdom"]}]},
    {"slug": "repentance", "group": "Virtues", "label": "Repentance",
     "desc": "Saints whose lives witness to repentance.",
     "match": [{"virtue": ["Repentance"]}, {"experience": ["Repentance from grave sin"]}]},
    {"slug": "hospitality", "group": "Virtues", "label": "Hospitality",
     "desc": "Saints renowned for hospitality.", "match": [{"virtue": ["Hospitality"]}]},
    {"slug": "perseverance", "group": "Virtues", "label": "Perseverance",
     "desc": "Saints renowned for perseverance.", "match": [{"virtue": ["Perseverance"]}]},
    {"slug": "faithfulness", "group": "Virtues", "label": "Faithfulness",
     "desc": "Saints renowned for steadfast faith.", "match": [{"virtue": ["Faith"]}]},
    {"slug": "forgiveness", "group": "Virtues", "label": "Forgiveness",
     "desc": "Saints renowned for forgiveness.", "match": [{"virtue": ["Forgiveness"]}]},
    {"slug": "asceticism", "group": "Virtues", "label": "Asceticism",
     "desc": "Saints of rigorous ascetic struggle.",
     "match": [{"rank": ["Ascetic", "Stylite"]}, {"virtue": ["Self-Control"]}]},
    {"slug": "love-of-enemies", "group": "Virtues", "label": "Love of Enemies",
     "desc": "Saints who loved and forgave their persecutors.", "match": []},

    # ── Struggles & Trials ─────────────────────────────────────────────
    {"slug": "persecution", "group": "Struggles & Trials", "label": "Persecution",
     "desc": "Saints who endured persecution.", "match": [{"experience": ["Persecution"]}]},
    {"slug": "imprisonment", "group": "Struggles & Trials", "label": "Imprisonment",
     "desc": "Saints imprisoned for the faith.",
     "match": [{"experience": ["Imprisonment", "Captivity"]}]},
    {"slug": "exile", "group": "Struggles & Trials", "label": "Exile",
     "desc": "Saints sent into exile.", "match": [{"experience": ["Exile"]}]},
    {"slug": "poverty", "group": "Struggles & Trials", "label": "Poverty",
     "desc": "Saints who embraced or endured poverty.", "match": [{"experience": ["Poverty"]}]},
    {"slug": "illness", "group": "Struggles & Trials", "label": "Illness",
     "desc": "Saints who bore illness and pain.",
     "match": [{"experience": ["Illness", "Chronic Pain"]}]},
    {"slug": "physical-disability", "group": "Struggles & Trials", "label": "Physical Disability",
     "desc": "Saints who lived with disability or blindness.",
     "match": [{"experience": ["Disability", "Blindness"]}]},
    {"slug": "grief", "group": "Struggles & Trials", "label": "Grief",
     "desc": "Saints who bore bereavement and loss.",
     "match": [{"experience": ["Grief / Bereavement", "Loss of a Child"]}]},
    {"slug": "temptation", "group": "Struggles & Trials", "label": "Temptation",
     "desc": "Saints who overcame fierce temptation.", "match": [{"experience": ["Temptation"]}]},
    {"slug": "addiction-recovery", "group": "Struggles & Trials", "label": "Addiction Recovery",
     "desc": "Saints who overcame self-destructive habits.",
     "match": [{"experience": ["Addiction / Self-destructive habits"]},
               {"intercession": ["Addiction Recovery"]}]},
    {"slug": "doubt", "group": "Struggles & Trials", "label": "Doubt",
     "desc": "Saints who passed through doubt to faith.", "match": [{"experience": ["Doubt"]}]},
    {"slug": "martyrdom", "group": "Struggles & Trials", "label": "Martyrdom",
     "desc": "Saints who died for Christ.",
     "match": [{"rank": ["Martyr", "Great Martyr", "Hieromartyr", "New Martyr",
                         "Venerable-Martyr", "Passion-Bearer"]}]},
    {"slug": "torture", "group": "Struggles & Trials", "label": "Torture",
     "desc": "Saints who endured torture for the faith.", "match": [{"experience": ["Torture"]}]},
    {"slug": "family-conflict", "group": "Struggles & Trials", "label": "Family Conflict",
     "desc": "Saints who bore strife within the family.",
     "match": [{"experience": ["Difficult Marriage"]}]},
    {"slug": "spiritual-warfare", "group": "Struggles & Trials", "label": "Spiritual Warfare",
     "desc": "Saints who battled the passions and demons.", "match": []},

    # ── Historical Themes ──────────────────────────────────────────────
    {"slug": "apostolic-age", "group": "Historical Themes", "label": "Apostolic Age",
     "desc": "The apostles and the earliest Church.",
     "match": [{"era": ["Apostolic Age"]}, {"rank": ["Apostle", "Equal-to-the-Apostles"]}]},
    {"slug": "desert-fathers", "group": "Historical Themes", "label": "Desert Fathers",
     "desc": "The monastic fathers of the Egyptian desert.",
     "match": [{"gender": ["Male"], "origin": ["Egypt"],
                "rank": ["Venerable (Monastic)", "Ascetic", "Hermit"]}]},
    {"slug": "desert-mothers", "group": "Historical Themes", "label": "Desert Mothers",
     "desc": "The monastic mothers of the Egyptian desert.",
     "match": [{"gender": ["Female"], "origin": ["Egypt"],
                "rank": ["Venerable (Monastic)", "Ascetic", "Hermit"]}]},
    {"slug": "early-martyrs", "group": "Historical Themes", "label": "Early Martyrs",
     "desc": "Martyrs of the first Christian centuries.",
     "match": [{"rank": ["Martyr", "Great Martyr", "Hieromartyr"],
                "era": ["Apostolic Age", "Pre-Nicene"]}]},
    {"slug": "byzantine-saints", "group": "Historical Themes", "label": "Byzantine Saints",
     "desc": "Saints of the Byzantine era.", "match": [{"era": ["Byzantine"]}]},
    {"slug": "slavic-saints", "group": "Historical Themes", "label": "Slavic Saints",
     "desc": "Saints of the Slavic lands.",
     "match": [{"origin": ["Rus' / Russia", "Ukraine", "Serbia", "Bulgaria"]},
               {"tradition": ["Russian", "Serbian", "Bulgarian"]}]},
    {"slug": "celtic-saints", "group": "Historical Themes", "label": "Celtic Saints",
     "desc": "Saints of the Celtic British Isles.",
     "match": [{"origin": ["Ireland", "Scotland", "Wales", "British Isles"]}]},
    {"slug": "new-martyrs", "group": "Historical Themes", "label": "New Martyrs",
     "desc": "Martyrs of the modern era.", "match": [{"rank": ["New Martyr"]}]},
    {"slug": "saints-of-america", "group": "Historical Themes", "label": "Saints of America",
     "desc": "Saints of North America.",
     "match": [{"origin": ["North America", "Alaska"]}, {"tradition": ["North American"]}]},
    {"slug": "saints-of-alaska", "group": "Historical Themes", "label": "Saints of Alaska",
     "desc": "Saints who labored in Alaska.", "match": [{"origin": ["Alaska"]}]},
    {"slug": "saints-under-communism", "group": "Historical Themes", "label": "Saints Under Communism",
     "desc": "Saints who suffered under communist regimes.",
     "match": [{"era": ["Modern"], "rank": ["New Martyr"],
                "origin": ["Rus' / Russia", "Ukraine", "Romania", "Serbia", "Bulgaria", "Baltics", "Georgia"]},
               {"era": ["Modern"], "experience": ["Persecution"],
                "origin": ["Rus' / Russia", "Ukraine", "Romania", "Serbia", "Bulgaria", "Baltics", "Georgia"]}]},
    {"slug": "ottoman-era-saints", "group": "Historical Themes", "label": "Ottoman-Era Saints",
     "desc": "Saints under Ottoman rule.",
     "match": [{"era": ["Post-Byzantine"],
                "origin": ["Greece", "Constantinople", "Asia Minor", "Serbia", "Bulgaria", "Romania", "Thrace"]},
               {"era": ["Post-Byzantine"], "rank": ["New Martyr"]}]},
    {"slug": "confessors", "group": "Historical Themes", "label": "Confessors",
     "desc": "Saints who confessed the faith under pressure.", "match": [{"rank": ["Confessor"]}]},
    {"slug": "hierarchs", "group": "Historical Themes", "label": "Hierarchs",
     "desc": "The great hierarchs of the Church.", "match": [{"rank": ["Hierarch"]}]},
    {"slug": "defenders-of-orthodoxy", "group": "Historical Themes", "label": "Defenders of Orthodoxy",
     "desc": "Saints who defended the Orthodox faith.", "match": []},
    {"slug": "icon-defenders", "group": "Historical Themes", "label": "Icon Defenders",
     "desc": "Saints who defended the holy icons.", "match": []},
    {"slug": "anti-arian-saints", "group": "Historical Themes", "label": "Anti-Arian Saints",
     "desc": "Saints who opposed the Arian heresy.", "match": []},
    {"slug": "ecumenical-councils", "group": "Historical Themes", "label": "Ecumenical Councils",
     "desc": "Fathers of the Ecumenical Councils.", "match": []},
    {"slug": "apologists", "group": "Historical Themes", "label": "Apologists",
     "desc": "Saints who defended the faith in writing.", "match": []},
    {"slug": "church-fathers", "group": "Historical Themes", "label": "Church Fathers",
     "desc": "The Fathers whose teaching shaped the Church.", "match": []},

    # ── Family & Relationships (all override-only) ─────────────────────
    {"slug": "holy-families", "group": "Family & Relationships", "label": "Holy Families",
     "desc": "Families that gave many saints to the Church.", "match": []},
    {"slug": "saintly-siblings", "group": "Family & Relationships", "label": "Saintly Siblings",
     "desc": "Brothers and sisters who are both saints.", "match": []},
    {"slug": "married-couples", "group": "Family & Relationships", "label": "Married Couples",
     "desc": "Husband-and-wife saints.", "match": []},
    {"slug": "spiritual-fathers", "group": "Family & Relationships", "label": "Spiritual Fathers",
     "desc": "Elders who guided others in the faith.", "match": []},
    {"slug": "spiritual-mothers", "group": "Family & Relationships", "label": "Spiritual Mothers",
     "desc": "Eldresses who guided others in the faith.", "match": []},
    {"slug": "godparents", "group": "Family & Relationships", "label": "Godparents",
     "desc": "Saints honored as godparents.", "match": []},
    {"slug": "mentors-disciples", "group": "Family & Relationships", "label": "Mentors & Disciples",
     "desc": "Saints bound as teacher and disciple.", "match": []},

    # ── Miracles & Wonders ─────────────────────────────────────────────
    {"slug": "wonderworkers", "group": "Miracles & Wonders", "label": "Wonderworkers",
     "desc": "Saints through whom God worked wonders.", "match": [{"rank": ["Wonderworker"]}]},
    {"slug": "healers", "group": "Miracles & Wonders", "label": "Healers",
     "desc": "Saints through whom God healed body and soul.",
     "match": [{"rank": ["Unmercenary"]}, {"vocation": ["Physician"]},
               {"intercession": ["Healing"]}]},
    {"slug": "prophecy", "group": "Miracles & Wonders", "label": "Prophecy",
     "desc": "Prophets and saints of foresight.", "match": [{"rank": ["Prophet", "Forerunner"]}]},
    {"slug": "miracle-working-relics", "group": "Miracles & Wonders", "label": "Miracle-Working Relics",
     "desc": "Saints whose relics work wonders.", "match": []},
    {"slug": "miracle-working-icons", "group": "Miracles & Wonders", "label": "Miracle-Working Icons",
     "desc": "Saints associated with wonderworking icons.", "match": []},
    {"slug": "visions", "group": "Miracles & Wonders", "label": "Visions",
     "desc": "Saints granted holy visions.", "match": []},
    {"slug": "apparitions", "group": "Miracles & Wonders", "label": "Apparitions",
     "desc": "Saints who appeared after their repose.", "match": []},

    # ── Geographic Themes ──────────────────────────────────────────────
    {"slug": "holy-land", "group": "Geographic Themes", "label": "Holy Land",
     "desc": "Saints of Palestine and Sinai.",
     "match": [{"origin": ["Palestine / Holy Land", "Sinai"]}]},
    {"slug": "egypt", "group": "Geographic Themes", "label": "Egypt",
     "desc": "Saints of Egypt.", "match": [{"origin": ["Egypt"]}]},
    {"slug": "greece", "group": "Geographic Themes", "label": "Greece",
     "desc": "Saints of Greece and Constantinople.",
     "match": [{"origin": ["Greece", "Constantinople"]}]},
    {"slug": "asia-minor", "group": "Geographic Themes", "label": "Asia Minor",
     "desc": "Saints of Asia Minor.",
     "match": [{"origin": ["Asia Minor", "Pontus", "Thrace"]}]},
    {"slug": "balkans", "group": "Geographic Themes", "label": "Balkans",
     "desc": "Saints of the Balkans.",
     "match": [{"origin": ["Serbia", "Bulgaria", "Romania", "Thrace"]}]},
    {"slug": "russia", "group": "Geographic Themes", "label": "Russia",
     "desc": "Saints of Russia and Ukraine.",
     "match": [{"origin": ["Rus' / Russia", "Ukraine"]}]},
    {"slug": "georgia", "group": "Geographic Themes", "label": "Georgia",
     "desc": "Saints of Georgia.", "match": [{"origin": ["Georgia"]}]},
    {"slug": "romania", "group": "Geographic Themes", "label": "Romania",
     "desc": "Saints of Romania.", "match": [{"origin": ["Romania"]}]},
    {"slug": "serbia", "group": "Geographic Themes", "label": "Serbia",
     "desc": "Saints of Serbia.", "match": [{"origin": ["Serbia"]}]},
    {"slug": "antioch", "group": "Geographic Themes", "label": "Antioch",
     "desc": "Saints of Antioch and Syria.",
     "match": [{"origin": ["Syria"]}, {"tradition": ["Antiochian"]}]},
    {"slug": "western-europe", "group": "Geographic Themes", "label": "Western Europe",
     "desc": "Pre-schism saints of Western Europe.",
     "match": [{"origin": ["Italy / Rome", "Gaul / France", "Germany", "Spain"]}]},
    {"slug": "british-isles", "group": "Geographic Themes", "label": "British Isles",
     "desc": "Saints of the British Isles.",
     "match": [{"origin": ["British Isles", "Ireland", "Scotland", "Wales", "England"]}]},
    {"slug": "alexandria", "group": "Geographic Themes", "label": "Alexandria",
     "desc": "Saints of Alexandria.", "match": []},
]

THEME_SLUGS = {t["slug"] for t in THEMES}
THEME_LABELS = {t["slug"]: t["label"] for t in THEMES}

_SEP = "; "  # mirrors build.py's MULTI_SEP; inline to keep this module standalone


def _split(s):
    return [p.strip() for p in (s or "").split(_SEP) if p.strip()]


def _rule_matches(rule, rec):
    for field, allowed in rule.items():
        vals = rec.get(field, [])
        if isinstance(vals, str):
            vals = [vals] if vals else []
        if not (set(vals) & set(allowed)):
            return False
    return True


def compute_themes(rec, override=""):
    """Return ordered, de-duplicated theme slugs for a record dict.
    `rec` has facet fields as build.py emits them (strings + arrays).
    `override` is the raw `Themes` CSV cell (semicolon-separated slugs)."""
    slugs = []
    for t in THEMES:
        if any(_rule_matches(rule, rec) for rule in t["match"]):
            slugs.append(t["slug"])
    for s in _split(override):
        if s not in slugs:
            slugs.append(s)
    return slugs


def theme_catalog(records):
    """[{slug, group, label, desc, count}] in THEMES order; count over records."""
    counts = {}
    for r in records:
        for s in r.get("themes", []):
            counts[s] = counts.get(s, 0) + 1
    return [{"slug": t["slug"], "group": t["group"], "label": t["label"],
             "desc": t["desc"], "count": counts.get(t["slug"], 0)} for t in THEMES]
```

- [ ] **Step 4: Run tests** — `python -m unittest tests.test_themes -v` → all PASS.

- [ ] **Step 5: Commit**

```bash
git add themes.py tests/test_themes.py
git commit -m "feat(themes): theme taxonomy + compute_themes + theme_catalog"
```

---

### Task 2: Wire themes into `build.py` (records, catalog, search, validation)

**Files:**
- Modify: `build.py`
- Modify: `tests/test_build.py`

- [ ] **Step 1: Write failing tests** — Append to `tests/test_build.py` (uses the existing `valid_row`/`errors_for` helpers; `import build`):

```python
class ThemeIntegrationTests(unittest.TestCase):
    def test_record_has_derived_themes(self):
        r = valid_row(**{"Church Status": "Clergy - Bishop", "Rank / Type": "Hierarch"})
        rec = build.to_record(r)
        self.assertIn("themes", rec)
        self.assertIn("bishops", rec["themes"])
        self.assertIn("hierarchs", rec["themes"])

    def test_theme_labels_in_search_haystack(self):
        rec = build.to_record(valid_row(**{"Church Status": "Clergy - Bishop"}))
        self.assertIn("bishops", rec["themes"])
        self.assertIn("Bishops", rec["search"])  # label folded into search

    def test_unknown_override_slug_errors(self):
        row = valid_row()
        row["Themes"] = "bishops; not-a-real-theme"
        errs = errors_for([row])
        self.assertTrue(any("not-a-real-theme" in e for e in errs))

    def test_known_override_slug_ok(self):
        row = valid_row()
        row["Themes"] = "church-fathers"  # valid override-only slug
        errs = errors_for([row])
        self.assertEqual([e for e in errs if "church-fathers" in e], [])
```

(If `valid_row` strictly returns only `HEADER` keys, setting `row["Themes"]` afterward — as above — adds the extra key the code reads via `row.get("Themes","")`. Confirm `errors_for` passes the row dict through unchanged.)

- [ ] **Step 2: Run to verify failure** — `python -m unittest tests.test_build -v` → the four new tests FAIL.

- [ ] **Step 3: Implement in `build.py`:**

(a) Near the top imports add:
```python
import themes as themes_mod
```

(b) In `to_record()`, immediately before `return rec`, add:
```python
    rec["themes"] = themes_mod.compute_themes(rec, r.get("Themes", ""))
    if rec["themes"]:
        label_words = " ".join(themes_mod.THEME_LABELS[s] for s in rec["themes"]
                               if s in themes_mod.THEME_LABELS)
        rec["search"] = (rec["search"] + " " + label_words).strip()
```
(Confirm `rec["search"]` is assigned earlier in `to_record`; insert this after it, right before the return.)

(c) In `validate()`, inside the per-row loop, add an override-slug check (match the loop's row variable name — `r` or `row`):
```python
        for slug in themes_mod._split(r.get("Themes", "")):
            if slug not in themes_mod.THEME_SLUGS:
                errors.append(
                    f"{r.get('Saint ID', '?')}: unknown theme slug {slug!r} in Themes "
                    f"(valid slugs are defined in themes.py)"
                )
```

(d) Add an emitter near `emit_data_json`:
```python
def emit_themes_json(records: list[dict]) -> None:
    catalog = themes_mod.theme_catalog(records)
    with open(PUBLIC / "themes.json", "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, separators=(",", ":"))
    shown = sum(1 for c in catalog if c["count"] > 0)
    print(f"  wrote {PUBLIC.relative_to(ROOT)}/themes.json "
          f"({shown}/{len(catalog)} themes populated)")
```
In `main()`, capture the records from `emit_data_json` and call the emitter:
```python
    records = emit_data_json(rows)
    emit_themes_json(records)
```
(`emit_data_json(rows)` returns the records list per the codebase; if `main` currently discards it, capture it.)

- [ ] **Step 4: Run tests + build** — `python -m unittest tests.test_build tests.test_themes -v` → PASS. Then `python build.py --no-xlsx`; confirm it prints the themes.json line and `public/themes.json` exists. Spot-check: `python -c "import json;c=json.load(open('public/themes.json'));print(len(c), sum(1 for x in c if x['count']>0)); print(next(x for x in c if x['slug']=='bishops'))"` — expect ~80 populated and `bishops` count > 100.

- [ ] **Step 5: Validate clean** — `python build.py --check-only` → VALIDATION CLEAN, 0 errors.

- [ ] **Step 6: Commit**

```bash
git add build.py tests/test_build.py
git commit -m "feat(themes): derive per-saint themes in build, emit themes.json, validate overrides"
```

---

## PHASE 2 — Browse pages + nav

### Task 3: Frontend theme library + `Saint.themes` type

**Files:**
- Create: `src/lib/themes.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add `themes` to the `Saint` type** — In `src/lib/types.ts`, in the `Saint` interface, after `sources: string;` add:
```ts
  themes: string[];
```

- [ ] **Step 2: Create `src/lib/themes.ts`:**
```ts
import catalogRaw from "../../public/themes.json";
import type { Saint } from "./types";

export interface ThemeMeta {
  slug: string;
  group: string;
  label: string;
  desc: string;
  count: number;
}

export const THEME_CATALOG = catalogRaw as unknown as ThemeMeta[];

export const themeBySlug: Map<string, ThemeMeta> = new Map(
  THEME_CATALOG.map((t) => [t.slug, t]),
);

export const THEME_GROUPS = [
  "Life Circumstances",
  "Vocations",
  "Virtues",
  "Struggles & Trials",
  "Historical Themes",
  "Family & Relationships",
  "Miracles & Wonders",
  "Geographic Themes",
];

/** Catalog grouped (THEMES order preserved), keeping only themes with count >= min. */
export function themesByGroup(min = 1): { group: string; themes: ThemeMeta[] }[] {
  return THEME_GROUPS.map((group) => ({
    group,
    themes: THEME_CATALOG.filter((t) => t.group === group && t.count >= min),
  })).filter((g) => g.themes.length > 0);
}

/** Other saints ranked by count of shared theme slugs (desc), then feastSort. */
export function relatedByThemes(saint: Saint, all: Saint[], n = 6): Saint[] {
  const mine = new Set(saint.themes || []);
  if (mine.size === 0) return [];
  const scored: { overlap: number; s: Saint }[] = [];
  for (const s of all) {
    if (s.id === saint.id) continue;
    let overlap = 0;
    for (const t of s.themes || []) if (mine.has(t)) overlap++;
    if (overlap > 0) scored.push({ overlap, s });
  }
  scored.sort((a, b) => b.overlap - a.overlap || a.s.feastSort - b.s.feastSort);
  return scored.slice(0, n).map((x) => x.s);
}
```

- [ ] **Step 3: Typecheck** — `python build.py --no-xlsx && npm run build` → builds with no TS errors. (`public/themes.json` must exist from Task 2.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/themes.ts src/lib/types.ts
git commit -m "feat(themes): frontend theme catalog lib + Saint.themes type"
```

---

### Task 4: `/themes` landing page + nav item

**Files:**
- Create: `src/pages/themes.astro`
- Modify: `src/components/SiteHeader.astro`
- Test: `e2e/themes.spec.ts`

- [ ] **Step 1: Write failing test** — Create `e2e/themes.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("themes landing shows grouped cards with counts", async ({ page }) => {
  const resp = await page.goto("./themes/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("h1")).toContainText("Browse by Theme");
  await expect(page.locator(".th-group h2", { hasText: "Vocations" })).toBeVisible();
  const card = page.locator('.th-card[href*="/themes/bishops"]');
  await expect(card).toBeVisible();
  await expect(card).toContainText("Bishops");
  await expect(card.locator(".th-count")).toContainText(/\d/);
  // No zero-count card is rendered (override-only themes are hidden).
  await expect(page.locator('.th-card[href*="/themes/orphans"]')).toHaveCount(0);
});

test("Themes nav item is present and base-prefixed", async ({ page }) => {
  await page.goto("./");
  const href = await page
    .locator(".site-nav")
    .getByRole("link", { name: "Themes", exact: true })
    .getAttribute("href");
  expect(href).toContain("/themes");
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- themes` → FAIL.

- [ ] **Step 3: Add nav item** — In `src/components/SiteHeader.astro`:
  - In `NAV`, after the `search` entry add: `{ key: "themes", label: "Themes", href: withBase("themes") },`
  - In the `Props.active` union, add `| "themes"`.

- [ ] **Step 4: Create `src/pages/themes.astro`:**
```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import { themesByGroup } from "../lib/themes";
import { withBase } from "../lib/format";

const groups = themesByGroup(1);
const total = groups.reduce((n, g) => n + g.themes.length, 0);
---

<BaseLayout
  active="themes"
  title="Browse by Theme"
  description="Discover Orthodox saints by life experience, vocation, virtue, struggle, era, and region."
>
  <section class="th-hero">
    <div class="eyebrow">Explore</div>
    <h1>Browse by Theme</h1>
    <p class="th-lead">
      Find saints by the shape of their lives — their callings, their trials,
      the virtues they bore, and the lands and ages they belonged to.
      {total} themes across {groups.length} families.
    </p>
  </section>

  {
    groups.map((g) => (
      <section class="th-group">
        <h2>{g.group}</h2>
        <div class="th-grid">
          {g.themes.map((t) => (
            <a class="th-card" href={withBase("themes/" + t.slug)}>
              <span class="th-name">{t.label}</span>
              <span class="th-desc">{t.desc}</span>
              <span class="th-count">{t.count} saints</span>
            </a>
          ))}
        </div>
      </section>
    ))
  }
</BaseLayout>

<style>
  .th-hero {
    text-align: center;
    max-width: 60ch;
    margin: 0 auto 2rem;
  }
  .th-hero h1 {
    font-family: var(--serif);
    color: var(--byz-deep);
    font-size: 2.4rem;
    margin: 0.3rem 0;
  }
  .th-lead {
    color: var(--ink-soft);
    line-height: 1.7;
  }
  .th-group {
    margin: 2rem 0;
  }
  .th-group h2 {
    font-family: var(--serif);
    color: var(--byz);
    font-size: 1.4rem;
    border-bottom: 1px solid var(--line-gold);
    padding-bottom: 0.3rem;
    margin-bottom: 1rem;
  }
  .th-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.9rem;
  }
  .th-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.9rem 1rem;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 6px;
    box-shadow: var(--shadow-soft);
    text-decoration: none;
    color: var(--ink);
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  .th-card:hover {
    border-color: var(--line-gold);
    box-shadow: var(--shadow-card);
  }
  .th-name {
    font-family: var(--serif);
    font-size: 1.15rem;
    color: var(--byz-deep);
  }
  .th-desc {
    font-size: 0.9rem;
    color: var(--ink-soft);
    line-height: 1.5;
  }
  .th-count {
    font-size: 0.8rem;
    color: var(--gold-deep);
    margin-top: auto;
  }
</style>
```
(Uses a plain `.eyebrow` div — the established label idiom — rather than assuming `EyebrowRule`'s API. The `.eyebrow` class is global.)

- [ ] **Step 5: Build + test** — `python build.py --no-xlsx && npm run build && npm test -- themes`. The landing + nav assertions pass; do not click through to a theme page yet (Task 5). `npm run lint` clean.

- [ ] **Step 6: Commit**

```bash
git add src/pages/themes.astro src/components/SiteHeader.astro e2e/themes.spec.ts
git commit -m "feat(themes): Browse by Theme landing page + nav item"
```

---

### Task 5: `/themes/[slug]` per-theme listing

**Files:**
- Create: `src/pages/themes/[slug].astro`
- Test: `e2e/themes.spec.ts` (append)

- [ ] **Step 1: Append failing test** to `e2e/themes.spec.ts`:
```ts
test("a theme page lists its saints and links to detail pages", async ({ page }) => {
  await page.goto("./themes/bishops/");
  await expect(page.locator(".tl-head h1")).toContainText("Bishops");
  await expect(page.locator(".tl-count")).toContainText(/\d+ saints/);
  const first = page.locator(".tl-list a.tl-row").first();
  const href = await first.getAttribute("href");
  expect(href).toMatch(/\/saint\/OS-/);
  await page.goto("./themes/");
  await page.locator('.th-card[href*="/themes/bishops"]').click();
  await page.waitForURL(/\/themes\/bishops\/?$/);
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- themes` → the theme-page test FAILs (404).

- [ ] **Step 3: Create `src/pages/themes/[slug].astro`:**
```astro
---
import type { GetStaticPaths } from "astro";
import BaseLayout from "../../layouts/BaseLayout.astro";
import { SAINTS } from "../../lib/data";
import { THEME_CATALOG, themeBySlug } from "../../lib/themes";
import { primaryRank, rankSlug } from "../../lib/saints";
import { withBase } from "../../lib/format";

export const getStaticPaths = (() => {
  return THEME_CATALOG.filter((t) => t.count > 0).map((t) => ({
    params: { slug: t.slug },
    props: { slug: t.slug },
  }));
}) satisfies GetStaticPaths;

const { slug } = Astro.props as { slug: string };
const theme = themeBySlug.get(slug)!;
const saints = SAINTS.filter((s) => (s.themes || []).includes(slug)).sort(
  (a, b) => a.feastSort - b.feastSort || a.name.localeCompare(b.name),
);
---

<BaseLayout
  active="themes"
  title={`${theme.label} — Saints`}
  description={theme.desc}
>
  <div class="tl-head">
    <a class="tl-back" href={withBase("themes")}>&larr; All themes</a>
    <h1>{theme.label}</h1>
    <p class="tl-desc">{theme.desc}</p>
    <p class="tl-count">{saints.length} saints</p>
  </div>

  <ol class="tl-list">
    {
      saints.map((s) => (
        <li>
          <a class="tl-row" href={withBase("saint/" + s.id)}>
            <span class={`tag ${rankSlug(s)}`}>
              <i />
              {primaryRank(s)}
            </span>
            <span class="tl-name">{s.name}</span>
            <span class="tl-feast">{s.feast}</span>
          </a>
        </li>
      ))
    }
  </ol>

  <p class="tl-more">
    <a href={withBase("search")}>Browse all saints in the finder &rarr;</a>
  </p>
</BaseLayout>

<style>
  .tl-head {
    max-width: 60ch;
    margin-bottom: 1.5rem;
  }
  .tl-back {
    font-size: 0.85rem;
    color: var(--celest);
    text-decoration: none;
  }
  .tl-head h1 {
    font-family: var(--serif);
    color: var(--byz-deep);
    font-size: 2.2rem;
    margin: 0.4rem 0 0.2rem;
  }
  .tl-desc {
    color: var(--ink-soft);
    line-height: 1.6;
    margin: 0 0 0.3rem;
  }
  .tl-count {
    color: var(--gold-deep);
    font-size: 0.9rem;
  }
  .tl-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.3rem;
  }
  .tl-row {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.5rem 0.7rem;
    border-bottom: 1px solid var(--line);
    text-decoration: none;
    color: var(--ink);
  }
  .tl-row:hover {
    background: var(--paper);
  }
  .tl-name {
    font-family: var(--serif);
    font-size: 1.1rem;
    flex: 1;
  }
  .tl-feast {
    color: var(--ink-soft);
    font-size: 0.85rem;
  }
  .tl-more {
    margin-top: 1.5rem;
  }
  .tl-more a {
    color: var(--celest);
  }
</style>
```
(The `.tag ${rankSlug(s)}` markup mirrors rank-tag rendering elsewhere; global `.tag`/`.tag.t-*` styles apply. Confirm `primaryRank`/`rankSlug` signatures in `src/lib/saints.ts`.)

- [ ] **Step 4: Build + full themes test** — `python build.py --no-xlsx && npm run build && npm test -- themes` → all PASS. `npm run lint` clean.

- [ ] **Step 5: Commit**

```bash
git add "src/pages/themes/[slug].astro" e2e/themes.spec.ts
git commit -m "feat(themes): per-theme static listing pages"
```

---

## PHASE 3 — Saint-page integration

### Task 6: Theme badges on every saint page (+ retire the profile themes block)

**Files:**
- Modify: `src/components/SaintView.astro`
- Modify: `src/components/SaintProfile.astro`
- Modify: `src/lib/saint-profiles.ts`
- Modify: `e2e/saint-profile.spec.ts`
- Test: `e2e/themes.spec.ts` (append)

- [ ] **Step 1: Update the Feature-A themes assertion + add badge tests.**
  (a) In `e2e/saint-profile.spec.ts`, the test "Basil's profile shows works, further reading, patronage, and themes" asserts `.sp-themes .sp-badge` "Church Fathers". DELETE those two theme-badge assertion lines (themes move to SaintView). Keep the works/reading/patronage assertions. (Optionally rename the test to drop "and themes".)
  (b) Append to `e2e/themes.spec.ts`:
```ts
test("saint pages show clickable theme badges", async ({ page }) => {
  await page.goto("./saint/OS-0021/");
  const badges = page.locator(".sv-themes a.sv-theme");
  expect(await badges.count()).toBeGreaterThan(0);
  const bishops = page.locator('.sv-themes a[href*="/themes/bishops"]');
  await expect(bishops).toBeVisible();
  await bishops.click();
  await page.waitForURL(/\/themes\/bishops\/?$/);
});

test("a non-profiled saint also shows theme badges", async ({ page }) => {
  await page.goto("./saint/OS-0022/"); // Gregory the Theologian, no profile
  await expect(page.locator(".sv-themes a.sv-theme").first()).toBeVisible();
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- themes saint-profile` → new badge tests FAIL; the edited Feature-A test passes once the theme lines are removed.

- [ ] **Step 3: Add the badges block to `src/components/SaintView.astro`:**
  - Add import: `import { themeBySlug } from "../lib/themes";`
  - After the `{profile && <SaintProfile profile={profile} />}` line, add:
```astro
    {
      saint.themes && saint.themes.length > 0 && (
        <section class="sv-section sv-themes">
          <div class="eyebrow">Themes</div>
          <div class="sv-theme-row">
            {saint.themes.map((slug) => {
              const t = themeBySlug.get(slug);
              return t ? (
                <a class="sv-theme tag intercession" href={withBase("themes/" + slug)}>
                  {t.label}
                </a>
              ) : null;
            })}
          </div>
        </section>
      )
    }
```
  - Add styles (colocate with the other `.sv-*` rules — check whether they live in this file's `<style>` or in `src/styles/global.css` near `.sv-int-card`, and put them there):
```css
.sv-theme-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
a.sv-theme {
  text-decoration: none;
}
```

- [ ] **Step 4: Retire the profile themes block.**
  - In `src/components/SaintProfile.astro`, delete the entire `{ profile.themes && ... <section class="sp-sec sp-themes"> ... }` block, and remove the now-unused `.sp-badge` CSS rule (keep `.sp-chip`, used by Patronage).
  - In `src/lib/saint-profiles.ts`, remove the `themes?: string[]` field from the `SaintProfile` interface and delete the `themes: [...]` array from the `"OS-0021"` object.

- [ ] **Step 5: Build + tests** — `python build.py --no-xlsx && npm run build && npm test -- themes saint-profile` → all PASS (Basil's derived badges render and link; the profile no longer renders `.sp-themes`). `npm run lint` clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/SaintView.astro src/components/SaintProfile.astro src/lib/saint-profiles.ts e2e/saint-profile.spec.ts e2e/themes.spec.ts
git commit -m "feat(themes): clickable theme badges on every saint page; retire profile themes block"
```

---

### Task 7: Related saints by shared themes

**Files:**
- Modify: `src/components/SaintView.astro`
- Test: `e2e/themes.spec.ts` (append)

- [ ] **Step 1: Append failing test** to `e2e/themes.spec.ts`:
```ts
test("a non-profiled saint shows related saints by shared themes", async ({
  page,
}) => {
  await page.goto("./saint/OS-0022/"); // Gregory the Theologian (no curated related list)
  const rel = page.locator(".sv-related a[href*='/saint/OS-']");
  expect(await rel.count()).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- themes` → FAIL (no `.sv-related`).

- [ ] **Step 3: Implement in `src/components/SaintView.astro`:**
  - Add imports:
```ts
import { SAINTS } from "../lib/data";
import { relatedByThemes } from "../lib/themes";
```
  - In the frontmatter, after `const profile = ...`:
```ts
// Curated related (from a rich profile) wins; otherwise derive by shared themes.
const derivedRelated =
  profile && profile.related && profile.related.length
    ? []
    : relatedByThemes(saint, SAINTS, 6);
```
  - Near the end of the main content (just before the sources block), add:
```astro
    {
      derivedRelated.length > 0 && (
        <section class="sv-section sv-related">
          <div class="eyebrow">Related saints</div>
          <ul class="sv-related-list">
            {derivedRelated.map((s) => (
              <li>
                <a href={withBase("saint/" + s.id)}>{s.name}</a>
                <span class="sv-related-rank"> · {primaryRank(s)}</span>
              </li>
            ))}
          </ul>
        </section>
      )
    }
```
  (`primaryRank` is already imported in `SaintView.astro`.)
  - Add styles (colocate with the other `.sv-*` rules):
```css
.sv-related-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.25rem;
}
.sv-related-list a {
  color: var(--byz);
  text-decoration: none;
  font-weight: 600;
}
.sv-related-list a:hover {
  color: var(--celest);
}
.sv-related-rank {
  color: var(--ink-soft);
}
```

- [ ] **Step 4: Build + tests** — `python build.py --no-xlsx && npm run build && npm test -- themes saint-profile` → PASS. Verify Basil (OS-0021) still shows his **curated** "Related Saints" (from the profile) and NOT a second derived block. `npm run lint` clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/SaintView.astro e2e/themes.spec.ts
git commit -m "feat(themes): related saints by shared-theme overlap on saint pages"
```

---

## PHASE 4 — Search aliases

### Task 8: Natural-language theme aliases in search

**Files:**
- Create: `src/lib/theme-aliases.ts`
- Modify: `src/components/Finder.astro`
- Modify: `src/islands/finder.client.ts`
- Test: `e2e/themes.spec.ts` (append)

- [ ] **Step 1: Append failing test** to `e2e/themes.spec.ts`:
```ts
test("search surfaces a theme suggestion for natural-language queries", async ({
  page,
}) => {
  await page.goto("./search/");
  await page.fill("#q", "saints who were soldiers");
  const sug = page.locator("#theme-suggest a");
  await expect(sug).toBeVisible();
  await expect(sug).toHaveAttribute("href", /\/themes\/soldiers/);
  await expect(sug).toContainText("Soldiers");
});

test("search recognizes 'in america' as the Saints of America theme", async ({
  page,
}) => {
  await page.goto("./search/");
  await page.fill("#q", "saints in america");
  await expect(page.locator("#theme-suggest a")).toHaveAttribute(
    "href",
    /\/themes\/saints-of-america/,
  );
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- themes` → FAIL (no `#theme-suggest`).

- [ ] **Step 3: Create `src/lib/theme-aliases.ts`:**
```ts
/** Phrase fragments (lowercased) → theme slug. The finder shows a "Browse the
 *  <label> theme" banner when the query contains a fragment. Order matters: the
 *  first matching fragment wins, so list more specific phrases first. */
export const THEME_ALIASES: { phrase: string; slug: string }[] = [
  { phrase: "defended icons", slug: "icon-defenders" },
  { phrase: "icon defender", slug: "icon-defenders" },
  { phrase: "in america", slug: "saints-of-america" },
  { phrase: "in alaska", slug: "saints-of-alaska" },
  { phrase: "soldier", slug: "soldiers" },
  { phrase: "mother", slug: "mothers" },
  { phrase: "father", slug: "fathers" },
  { phrase: "convert", slug: "converts" },
  { phrase: "martyr", slug: "martyrdom" },
  { phrase: "exile", slug: "exile" },
  { phrase: "persecut", slug: "persecution" },
  { phrase: "physician", slug: "physicians" },
  { phrase: "doctor", slug: "physicians" },
  { phrase: "monk", slug: "monastics" },
  { phrase: "nun", slug: "monastics" },
  { phrase: "monastic", slug: "monastics" },
  { phrase: "bishop", slug: "bishops" },
  { phrase: "missionary", slug: "missionaries" },
  { phrase: "missionaries", slug: "missionaries" },
  { phrase: "wonderworker", slug: "wonderworkers" },
  { phrase: "healer", slug: "healers" },
];

export function matchThemeAlias(query: string): string | null {
  const q = query.toLowerCase();
  for (const a of THEME_ALIASES) if (q.includes(a.phrase)) return a.slug;
  return null;
}
```

- [ ] **Step 4: Add the banner element** — In `src/components/Finder.astro`, just before `<div class="active-chips" id="active-chips">`, add:
```astro
<div class="theme-suggest" id="theme-suggest" hidden></div>
```

- [ ] **Step 5: Wire the island (safe DOM, no innerHTML)** — In `src/islands/finder.client.ts`:
  - Add imports near the top:
```ts
import { matchThemeAlias } from "../lib/theme-aliases";
import { THEME_CATALOG } from "../lib/themes";
import { withBase } from "../lib/format";
```
  - Add a module-level label map: `const THEME_LABEL = new Map(THEME_CATALOG.map((t) => [t.slug, t.label]));`
  - Add a function that builds DOM nodes with `textContent` (NOT `innerHTML`):
```ts
function renderThemeSuggest() {
  const el = document.getElementById("theme-suggest");
  if (!el) return;
  const slug = query.trim() ? matchThemeAlias(query) : null;
  const label = slug ? THEME_LABEL.get(slug) : null;
  el.textContent = "";
  if (slug && label) {
    el.append("Looking for a theme? ");
    const a = document.createElement("a");
    a.href = withBase("themes/" + slug);
    a.textContent = `Browse the ${label} theme →`;
    el.append(a);
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}
```
  - Call `renderThemeSuggest()` inside the main `render()` (where `query` is applied and results re-render), so it updates as the user types.

- [ ] **Step 6: Build + tests** — `python build.py --no-xlsx && npm run build && npm test -- themes` → all PASS. `npm run lint` clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/theme-aliases.ts src/components/Finder.astro src/islands/finder.client.ts e2e/themes.spec.ts
git commit -m "feat(themes): natural-language theme suggestion banner in search"
```

---

## Final verification (after Task 8)

- [ ] `make validate` clean; `python -m unittest discover -s tests` all green (build + themes).
- [ ] `python build.py --no-xlsx` → `public/data.json` (2737 records, each with `themes`) + `public/themes.json` (~80 populated).
- [ ] `npm run lint` clean; `npm run build` succeeds; `npm test` (FULL suite — `smoke`, `saint-profile`, `themes`) all green.
- [ ] Manual: `/themes` reads like a library table of contents; a theme page lists the right saints; Basil's badges link and his curated Related Saints still shows; a non-profiled saint shows derived related saints; "saints who were soldiers" surfaces the banner.
- [ ] Push branch, open PR (CI `validate` + `frontend`), hand off to user for squash-merge (production deploy).

---

## Self-Review

**Spec coverage:** derived `themes` on every saint (T1–T2 ✓); `Themes` override + validation (T1–T2 ✓); `themes.json` catalog with counts (T2 ✓); search-haystack theme labels (T2 ✓); `/themes` landing grouped, count>0 only (T4 ✓); `/themes/[slug]` static lists (T5 ✓); "Browse by Theme" nav (T4 ✓); theme badges on every saint linking to `/themes/<slug>` + Basil repointed by retiring the profile block (T6 ✓); theme-based related saints, gated by curated `related` (T7 ✓); NL search aliases + banner (T8 ✓); taxonomy judgment calls/merges/override-only all encoded in T1's `THEMES` per the spec table. Phasing matches spec §8.

**Placeholder scan:** No TBD/TODO. The few "match the loop's row variable / confirm where `.sv-*` styles live / confirm `EyebrowRule` API" notes are concrete verification steps against named files, not deferred work — every code block is complete. No `innerHTML` (uses safe DOM).

**Type consistency:** `themes.compute_themes(rec, override)`, `theme_catalog(records)`, `THEME_SLUGS`, `THEME_LABELS` (T1) are used with identical names/signatures in T2. `ThemeMeta {slug,group,label,desc,count}`, `themeBySlug`, `themesByGroup`, `THEME_GROUPS`, `relatedByThemes` (T3) match their use in T4–T8. `Saint.themes: string[]` (T3) is read in T5/T6/T7. Selectors asserted by e2e (`.th-group h2`, `.th-card`, `.th-count`, `.tl-head h1`, `.tl-count`, `.tl-list a.tl-row`, `.sv-themes a.sv-theme`, `.sv-related`, `#theme-suggest a`) all exist in the markup added by the corresponding task.
