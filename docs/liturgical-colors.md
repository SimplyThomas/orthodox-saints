# Liturgical colors on the interactive calendar

`/calendar` tints each day with a **liturgical color commonly used in Orthodox
practice** and badges the recorded fasting rule. This document records the
editorial frame, the sources that inform the assignments, and the design rules
— read it before changing `src/lib/liturgical.ts`.

## The editorial frame (non-negotiable)

The Orthodox Church historically distinguishes broadly between **bright or
festal** colors and **dark or penitential** colors. More detailed assignments
— blue, green, red, purple, white, gold — vary by jurisdiction, diocese,
parish, local custom, and available vestments. **There is no official
universal Orthodox color code, and the site must never present one.**

- The feature is described as *"liturgical colors commonly used in Orthodox
  practice"* — a general educational guide, based primarily on commonly
  observed Greek Orthodox practice and other established Orthodox customs.
- The calendar legend carries the variation disclaimer and states that the
  guide does not replace the directions of a parish priest or bishop.
- When the data cannot responsibly support an assignment, the day shows
  **neutral** — the system prefers honesty over invention (mirroring the
  project's "blanks are honest, fabrication is not" rule, CLAUDE.md §13).
- Green is never labeled "Ordinary Time" (a Western category the Byzantine
  year does not use), and plain days are never green.

## Where the logic lives

- **`src/lib/liturgical.ts`** — the single source of truth: the
  `LITURGICAL_COLORS` palette (the island injects these values as CSS custom
  properties; the hexes are not duplicated in the stylesheet), the
  `FASTING_LEVELS` config keyed to the `Fasting Discipline` controlled
  vocabulary, the per-feast `OBSERVANCE_COLOR_RULES` keyed by **FF id**, the
  category/dedication fallbacks, precedence ranking, and the pure
  `activeObservances()` / `dayLiturgics()` resolvers. Unit-tested in
  `src/lib/liturgical.test.ts` (hermetic fixtures mirroring real FF rows).
- **`src/pages/calendar.astro`** inlines a trimmed Feasts & Fasts payload
  (same pattern as the /feasts island) plus the collapsible "Liturgical
  Colors & Fasting Guide" legend.
- **`src/islands/calendar.client.ts`** renders the layers: day tint + top
  accent strip (color), a small letter badge (fasting), a half-disc marker
  ("color changes by service"), and the expanded day panel's liturgical block
  (color, reason, variation notes, service exceptions, fasting row, category
  badges).

## Design rules

1. **Colors attach to feast records (FF ids), never to civil dates.** The
   New/Old Calendar toggle shifts fixed feasts and their colors together
   (a fixed date is kept 13 civil days later under the Julian reckoning);
   the Paschal cycle is identical under both reckonings and never shifts.
2. **Separate visual layers.** The tint/strip carries the liturgical color;
   fasting is a separate corner badge derived only from the data's own
   `Fasting Discipline` values (the weekly Wed/Fri rule is deliberately not
   inferred — CLAUDE.md §5a treats it as a rule, not an event); saint-rank
   dots in the day lists are an organizational site feature, not vestment
   claims. Nothing is communicated by color alone — every layer also appears
   in the cell's `aria-label`/tooltip, the day panel, and the legend.
   Where the data records `Varies` (the Great Lent season), the badge shows
   the **strictest traditional rule** ("Strict Fast (traditional rule)",
   glyph `S*`) rather than an unhelpful shrug, and every such day carries a
   consult-your-parish-priest note in the panel and legend.
3. **Precedence** (mirrors the spec's `COLOR_PRIORITY`): Pascha → Bright Week
   → Great Feasts of the Lord → of the Theotokos → named Holy Week days →
   Cross feasts → named observances with explicit rules → afterfeast/
   leavetaking inheritance → minor feasts → colored seasons (Great Lent,
   Holy Week Fast, Dormition Fast) → fast-free weeks → ordinary Sundays
   (gold) → neutral. A martyr's commemoration never turns a Theotokos feast
   red — rank accents stay at the saint-list level.
4. **Afterfeasts inherit the principal feast's color** (confidence demoted
   from high to medium) **but not its fasting rule** — a feast's fasting
   field describes the feast day itself.
5. **Service-level exceptions** (`serviceColors`) mark days whose color
   changes during the day — Great Saturday's dark→white at the Vesperal
   Divine Liturgy, Great Thursday's red Vesperal Liturgy in some traditions,
   Forgiveness Sunday's purple Vespers. The tile shows the primary color plus
   a "color changes by service" marker; the day panel explains.
6. **Confidence** (`high` | `medium` | `local-custom` | `unknown`) is stored
   on every rule; `medium`/`local-custom` assignments surface the variation
   note in the day panel, and known alternates render as "Local practice may
   use … instead" — never as a second simultaneous color.
7. **Jurisdictional flexibility:** the current single mode is the
   "general-orthodox" guide. Additional tradition mappings (greek,
   antiochian, oca-slavic, parish-custom) can be added later as alternate
   rule tables keyed to the same FF ids; no visible jurisdiction toggle
   ships until then.

## Sources informing the assignments

- Greek Orthodox Archdiocese of America (goarch.org) material on liturgical
  colors and the GOARCH calendar/planner conventions.
- Antiochian Orthodox Christian Archdiocese diocesan liturgical guidance.
- Orthodox Church in America (oca.org) liturgical rubrics, especially the
  description of the transition from dark to bright vestments at the
  Vesperal Divine Liturgy of Great and Holy Saturday.
- The site's own `data/feasts.csv` categories (Feast of Feasts / Great Feast
  / Feast / Fast Season / Fast Day / Fast-Free Week / Observance), dedications
  (Lord / Theotokos / Cross / …), fasting disciplines, and forefeast/apodosis
  spans — the existing structured taxonomy drives the rules; no parallel
  categorization was invented.

Blogs, Roman Catholic or Anglican color charts, and automatically generated
color calendars are **not** treated as authoritative Orthodox sources.
