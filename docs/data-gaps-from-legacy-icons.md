# Data gaps found in the Legacy Icons catalog

**Source:** the full Legacy Icons catalog harvest, 2026-08-03 — 996 products across
`/icons/saints/`, `/icons/jesus-christ/`, `/icons/virgin-mary/` and `/icons/holy-trinity/`
(`scripts/download_legacy_icons.py`, queue in `dist/legacy_icons_review.csv`).

**What this is.** A vendor who has iconographers painting for a living turns out to be a
decent census of who the Church actually venerates. Where a product named someone our
databases do not hold, that is a candidate row. Every entry below was checked with
`make find` / `tools/find_saint.py` against `data/saints.csv` and by hand against
`data/feasts.csv` — the raw no-match list was 130 rows and **almost all of it was noise**
(Christ scenes, icon types, and saints we already hold under a different
transliteration). What survived that check is short, and it is below.

**What this is not.** Not a work order. Nothing here has been verified against a
synaxarion, and §9's canonization caution applies to every name. A vendor's product
title is a shop's copy, not a calendar.

---

## A. Saints we do not have — verified absent (5)

Each was searched by name, epithet, and plausible transliteration. The near-misses that
made each one worth double-checking are noted, because they are the reason a name search
alone would have said "we have this."

| # | Saint | Feast | Why in scope | Watch out for |
|---|---|---|---|---|
| 1 | **Rodrigo (Roderick) of Córdoba**, martyr | Mar 13 | †857, one of the Martyrs of Córdoba under the Umayyad emirate — **pre-schism Western**, squarely in scope (§1) | Nothing similar in the data at all |
| 2 | **Djan Darada of Ethiopia** — the Ethiopian eunuch of Acts 8, baptized by the Apostle Philip | Aug 27 (Ethiopian tradition) | A **scriptural** figure. Confirm which calendars commemorate him before choosing a feast date | Not *Moses the Ethiopian* (OS-0030), who is a different man entirely |
| 3 | **Ia of Beijing**, martyr | Jun 11 (1900) | Among the **222 Chinese Martyrs** of the Boxer Rebellion, glorified 1902 | **OS-1823 is Ia of *Persia*** (Sep 11, †362) — a different saint. This is the trap that makes the pair worth a §6 documented-distinct Notes cross-reference if both land |
| 4 | **Kieran (Ciarán) of Saighir**, bishop | Mar 5 | One of the Twelve Apostles of Ireland, pre-schism Western | **OS-0324 is Kieran of *Clonmacnoise*** (Sep 9, †c.549) — the *younger* Ciarán. Saighir is the elder. Same trap as above |
| 5 | **Theodora the Armenian of Constantinople** | to verify | Needs sourcing before adding — the vendor's title is the only lead | **OS-0637 is Theodora the Empress**, Restorer of the Icons (Feb 11). Not her |

Products: [Rodrigo S723](https://legacyicons.com/saint-rodrigo-whirledge-icon-s723/) ·
[Djan Darada S688](https://legacyicons.com/saint-djan-darada-of-ethiopia-whirledge-icon-s688/) ·
[Ia of Beijing S674](https://legacyicons.com/saint-ia-of-beijing-whirledge-icon-s674/) ·
[Kieran of Saighir S720](https://legacyicons.com/saint-kieran-of-saighir-whirledge-icon-s720/) ·
[Theodora the Armenian S669](https://legacyicons.com/saint-theodora-the-armenian-of-constantinople-whirledge-icon-s669/)

Three of the five are **name-collision traps** — Ia, Kieran, and Theodora each have a
same-name saint already in the data. Add them with a Notes cross-reference to the other
id, per the §6 documented-distinct convention, or the duplicate-name warning will be
re-investigated forever.

---

## B. Feasts & Fasts — verified absent (1)

**The Conception of the Theotokos by Righteous Anna — December 9.**

`data/feasts.csv` holds every other Marian station of the year — Nativity (FF-0002,
Sep 8), Entry (FF-0004, Nov 21), Annunciation (FF-0008, Mar 25), Dormition (FF-0013,
Aug 15), Protection (FF-0067), the two Depositions, and the Synaxis (FF-0084) — but not
the Conception. December in `feasts.csv` currently runs Dec 25, Dec 25, Dec 26 and stops.

The vendor surfaced it from the other side, with two Athonite icons of the annunciations
that precede it:
[Annunciation to Saint Anna F230](https://legacyicons.com/annunciation-to-saint-anna-athos-icon-f230/) ·
[Annunciation to Saint Joachim F229](https://legacyicons.com/annunciation-to-saint-joachim-athos-icon-f229/)

This is a clean §5a row: a Theotokos event-feast, fixed date, `Dedication: Theotokos`.

*Checked and correctly absent from `feasts.csv`:* the Protomartyr Stephen (Dec 27) and
the 14,000 Holy Innocents (Dec 29) are **saints' own feasts** and live in `saints.csv` as
OS-0009 and OS-2425 — that is §5a scope working as designed, not a gap. The Wedding at
Cana, the Harrowing of Hades, the Washing of the Feet and the rest of the Passion scenes
are **icon subjects, not calendar feasts**; they need no rows.

---

## C. Deliberately NOT added — §9 canonization caution (5)

Legacy Icons sells icons of several figures the Church has not glorified. That is their
call to make; ours is that **a saint row asserts sainthood**, so these stay out of
`saints.csv`. Recorded here so nobody "finds" them again in six months and adds them.

| Figure | Note |
|---|---|
| **Fr Seraphim Rose of Platina** (†1982) | Widely venerated, not glorified. The harvester auto-skips this one by name. A memorial belongs in **Witnesses of Our Time** (`/witness/[slug]`), which uses no liturgical address (§11) — not a saint row |
| **Evgeny Rodionov**, "New Martyr of Chechnya" (†1996) | Locally venerated; no formal glorification |
| **Archimandrite Roman Braga** (†2015) | Romanian-American confessor, not glorified |
| **Dobri Dobrev**, "the saint of Bailovo" (†2018) | Bulgarian almsgiver, popularly so called; not glorified |
| **Archbishop Dmitri (Royster) of Dallas** (†2011) | Not glorified. Another natural Witnesses candidate |

---

## D. One scope judgment call for you

**The 21 New Martyrs of Libya** (†2015) —
[S100](https://legacyicons.com/21-new-martyrs-of-libya-icon-s100/).

The Coptic Church glorified them, and CLAUDE.md §1 **excludes Oriental Orthodox
(non-Chalcedonian) saints**. But the Russian Orthodox Church added them to its own
calendar, which makes this genuinely a decision rather than a rule application. Twenty of
the twenty-one were Coptic; one, Matthew Ayariga, was Ghanaian and not Coptic at all.
Left out pending your call.

---

## E. Possible split candidates (not gaps)

Both are already *in* the data, inside a collective row. The vendor painting a solo icon
is weak evidence that they are venerated individually — worth a look under the §7
SPLIT-vs-GROUP test, not an action.

- **Martyr Larissa** — held inside **OS-0878**, the 26 Martyrs of the Goths in the
  Crimea (Mar 26), as one name in a 22-name `Also Known As` list.
  [S565](https://legacyicons.com/saint-larisa-davidovskiy-icon-s565/)
- **Grand Duchess Tatiana Romanov** — the Royal Martyrs are held as the household group
  **OS-1541**; the individual children do not have their own rows.
  [S613](https://legacyicons.com/saint-tatiana-the-princess-and-grand-duchess-of-russia-whirledge-icon-s613/)

Note the §7 rule cuts against splitting in both cases: these are collective
commemorations whose members share an undifferentiated facet profile. Recorded for
completeness, with the expectation that the answer is probably "leave them grouped."

---

## F. Checked and already present (so nobody re-checks)

The harvester flagged these as unmatched, but the saint **is** in the data under another
spelling. This list is the reason the section above is five rows and not twenty.

| Vendor title | We hold |
|---|---|
| Saints Fyodor and John the Varangians of Kiev | **OS-1515** Martyrs Theodore and John, the Varangians of Kiev (Jul 12) |
| Saint Bridget of Kildare | **OS-0080** St. Brigid of Kildare (Feb 1) — *Brigid*, not *Bridget* |
| Saint Cassiani | **OS-0268** Venerable Kassiani the Hymnographer (Sep 7) — *Kassiani* |
| Saint Paisy Velichkovsky of Neamt | **OS-2199** Venerable Paisios Velichkovsky (Nov 15) |
| Vision of Saint Romanos | **OS-1929** Venerable Romanus the Melodist (Oct 1) |
| Seven Sleepers of Ephesus | **OS-1639** The Seven Youths of Ephesus (Aug 4; Oct 22) |
| Three Holy Youths | **OS-2377** The Three Holy Youths (Dec 17) |
| Saint Justin Popovich of Chelije | **OS-2591** St Justin (Popovich) of Ćelije (Jun 1) |
| Saint John Kochurov of Chicago | **OS-2120** Hieromartyr John Kochurov (Oct 31) |
| Saint Brendan the Voyager | **OS-1191** Saint Brendan the Navigator |
| Saint Willibrord | **OS-2719** Saint Willibrord, Enlightener of Frisia |
| Saint Nectarios of Pentapolis | **OS-0046** St. Nektarios of Aegina |
| Saint Katherine | **OS-0015** Great Martyr Catherine |
| Saint Nicodemus the Secret Disciple | **OS-1624** Righteous Nikodemos (Aug 2) |
| Saint Christopher "the Dog Head" | **OS-1135** Great Martyr Christopher of Lycia |
| Miracle of Archangel Michael at Chonae | **FF-0073** (feast, already on file) |
| Synaxis of the Archangels | **FF-0071** / **FF-0072** (feasts, already on file) |

---

## How to redo this after a future harvest

Re-run `python3 scripts/download_legacy_icons.py` and read the `no-match` and `weak`
rows of `dist/legacy_icons_review.csv`. Filter out titles matching Christ scenes and icon
types first — they are the overwhelming majority — then run every surviving person-name
through `make find NAME="…"` before believing it is missing. Roughly one in twenty
survives that filter.
