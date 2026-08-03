# The daily readings on the interactive calendar

`/calendar` shows the **scripture appointed to be read** on the selected day —
the Epistle and Gospel, and on the days that carry them the Vespers, Matins
and Hours readings too. This document records the editorial frame, where the
data comes from, and the known limits. **Read it before changing
`lectionarylib.py`, `src/lib/lectionary.ts`, or the harvest script.**

## The editorial frame (non-negotiable)

**There is no single Orthodox lectionary, and the site must never present
one.** Byzantine-Greek and Slavic usage diverge on roughly two days in three.
The differences are real and ordinary, not errors:

- Greek usage layers the **commemorated saint's own readings** onto ordinary
  weekdays far more often than Slavic usage does.
- On the Old (Julian) calendar a **different saint is kept on the day** to
  begin with, so the fixed-cycle readings differ before anything else does.
- The two traditions replay the Sunday Gospels displaced by the **Lukan jump**
  differently: the Slavic books reserve the skipped Gospels and re-read them
  between Theophany and the Triodion; the Greek books do not.

So the panel **names the usage it is showing**, and closes with the standing
caveat that a parish may transfer or add a commemoration and that the parish's
own bulletin is authoritative. This is the same discipline as the liturgical
colors (`docs/liturgical-colors.md`): where practice genuinely varies, say so
rather than inventing a single answer.

**References only — never scripture text.** Which pericope is appointed on
which day is a fact of the Church's ordering and not a copyrightable work. A
*translation* is somebody's copyright (CLAUDE.md §9), so we cite and link out.
Nothing in `data/lectionary/` contains scripture text, and nothing should.

### How the toggle picks a usage

The calendar's existing New/Old toggle selects it:

| Toggle | Usage shown | Whose practice |
|---|---|---|
| **New Calendar** | `greek` — Byzantine-Greek usage, Revised Julian dates | Greek, Antiochian and other New-calendar parishes |
| **Old Calendar** | `slavic` — Slavic usage, Julian dates | Russian, Serbian and other Old-calendar parishes |

This is a **real correlation, not an identity**. The notable exception is the
**OCA — Slavic usage on the New calendar** — which falls between the two
columns. The panel says so in `TRADITIONS[].note` rather than letting a reader
assume the toggle knows their parish. If a third option is ever wanted, the
harvest already supports `slavic/gregorian`; it is one entry in `TRADITIONS`
in `scripts/harvest_lectionary.py` plus a control on the page.

## Where the data comes from

The reckoning is a substantial piece of liturgical computation — the movable
Paschal cycle indexed by distance from Pascha, shifted each autumn by the
Lukan jump, interleaved with the fixed Menaion cycle of feasts and saints —
and **we do not reimplement it.**

**Source: [orthocal.info](https://orthocal.info) by Brian Glass**, MIT
licensed ([orthocal-python](https://github.com/brianglass/orthocal-python)),
whose reckoning descends from Paul Kachur's `orthodox_calendar`. Its
`calendarium` fixture carries `greek` and `slavic` tradition variants
natively, which is what makes the two-usage presentation sourced rather than
invented.

`scripts/harvest_lectionary.py` pulls a resolved day-by-day table from its
month endpoints and writes `data/lectionary/<year>.csv`. **Those files are
committed and are the source of truth**, exactly like `data/saints.csv` — so
`python build.py` stays fully offline and the table is reviewable in a pull
request. The harvest script is the only part of the pipeline that touches the
network, and it is re-run only to extend the year range or refresh the table.

### Refreshing or extending the range

```sh
python scripts/harvest_lectionary.py                    # 2020-2040, both usages
python scripts/harvest_lectionary.py --years 2041 2045   # extend
python scripts/harvest_lectionary.py --years 2026 2026 --force  # refresh one year
```

It is polite by default (~1 request/second, descriptive User-Agent, retry with
backoff) and skips years already on disk unless `--force`. The range matches
`pascha_table()` in `pascha.py`; outside it the calendar shows **no readings
rather than a guess**.

## The file format, and the delimiter that matters

`data/lectionary/<year>.csv` — CRLF, one row per (civil date, usage):

```
date,tradition,title,epistle,gospel,matins,vespers,other
```

- `date` is always the **civil (Gregorian) date**, in both usages. The Julian
  reckoning is what the server resolves internally for the `slavic` rows; it
  is not what the file is keyed on.
- `title` is the day's place in the cycle — "Monday of the 25th week after
  Pentecost" — the reader's bearing on the liturgical year.

**The reading cells do NOT use the house `"; "` separator**, for the same
reason hymn stanzas split on `||` (CLAUDE.md §5). The lectionary's own
punctuation is hostile to it:

| Token | Means | Why not the obvious choice |
|---|---|---|
| ` \|\| ` | between readings | ONE appointed reading routinely spans discontinuous passages printed semicolon-separated — `Micah 4.6-7; 5.2-4` is a single Vespers reading of Micah, not two |
| ` :: ` | service label | `6th Hour :: Isaiah 5.16-25` |
| ` ~ ` | the commemoration a reading belongs to | `Galatians 4.4-7 ~ Nativity`; a blank annotation means the continuous daily cycle. Parentheses would collide with book names like `Jeremiah (Baruch 3.35-4.4)` |

All three tokens are verified absent from every source string, and
`_assert_clean()` **fails the harvest loudly** if that ever stops being true.
`tests/test_lectionarylib.py` locks in that a citation is never torn in half.

## Where the logic lives

- **`lectionarylib.py`** — loads, validates fail-loud (real dates, known
  usage, no duplicates, **every civil day of every year in both usages**, a
  contiguous year range), and emits `public/lectionary/<year>.json` plus an
  `index.json` of harvested years. Unit-tested in
  `tests/test_lectionarylib.py`. Orchestrated by `build.py`, like `feastlib`
  and `hostlib`.
- **`src/lib/lectionary.ts`** — pure and client-safe: the shipped types, the
  `TRADITIONS` table with its per-usage note, `readingsFor()`,
  `readingGroups()`, and the link-out builders. Unit-tested in
  `src/lib/lectionary.test.ts`.
- **`src/lib/lectionary-data.ts`** — server-only fs loader (the `lib/feasts.ts`
  pattern).
- **`src/pages/lectionary-data/[year].json.ts`** — one static shard per year,
  fetched on demand by the island. Deliberately **not** content-hashed: the
  island derives the URL from whichever year the reader navigated to, so the
  filename must be predictable, and a harvested year is effectively immutable.
- **`src/islands/calendar.client.ts`** — `reserveReadings()` puts a slot in
  the panel synchronously and fills it when the shard lands, so a slow fetch
  cannot drop the block below the saints list.

## Display rules

- **Epistle and Gospel lead.** That is what "the readings" means to almost
  everyone asking. Vespers, Matins and the Hours fold into a collapsed "Also
  read this day".
- **Except on a day with no Liturgy** — a Lenten weekday — where the Vespers
  Old-Testament readings are not a supplement, they are the whole of what is
  read, and `readingGroups()` promotes them.
- **A reading's commemoration is shown beside it.** A second Gospel is not
  noise; it is the saint's own reading, and the reader should see which.
- **Links go to the passage, never the text.** BibleGateway, NKJV — the
  translation most widely used from the ambo in English-speaking Orthodox
  parishes.

## Known limits

- **The Old Testament is a compromise.** The Orthodox Old Testament follows
  the **Septuagint**, whose versification and text differ from the Masoretic
  basis of every mainstream English Bible, and which contains books such a
  Bible may not carry at all. `passageNote()` says so on the readings where it
  bites (Wisdom, Sirach, Baruch, Tobit, Judith, Maccabees, the Kingdoms)
  rather than letting a reader trip over it silently. A better long-term
  answer is linking to a public-domain English Septuagint (Brenton, 1851).
- **Composite paremias are not linked.** A stitched reading names several
  passages at once and would resolve to the wrong one, so it is shown as plain
  text with a note to look it up in a service book.
- **Nothing here has clergy review** (CLAUDE.md §9). The table is a
  third-party computation we have spot-checked, not an authority.
- **Only the Slavic side has been independently verified.** The OCA is Slavic
  usage on the New calendar, so `orthocal`'s `slavic/gregorian` reckoning can
  be checked directly against **oca.org/readings/daily/**. On a 16-date sample
  spanning 2022–2030 — ordinary weekdays, a Lenten weekday with no Liturgy,
  Pascha, Peter & Paul, the Exaltation, Theophany, the Dormition and a Lukan-
  jump Sunday — 15 matched exactly and one differed by a single verse boundary
  (Ephesians 5:8-19 against the OCA's 5:9-19, a real variance between editions
  of the Apostol). Reproduce it with the snippet in this file's git history or
  by diffing the two sources for a date range.
  **The Greek side has no such check**: goarch.org returns 403 to automated
  requests and the Antiochian calendar renders client-side with no reachable
  endpoint. It rests on orthocal's `greek` tradition rows alone, which are
  documented in that project against byzcath.org and the Greek service books.
  If a Greek-usage source ever becomes reachable, verify against it.
- **The range is 2020–2040.** Outside it the block simply does not appear.
