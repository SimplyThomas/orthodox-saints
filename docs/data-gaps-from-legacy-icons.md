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

## A. Saints we did not have — **ALL ELEVEN NOW ADDED** ✅

Added on 2026-08-03 with blank ids, as **OS-3007 … OS-3017**. Every feast day, century
and repose was verified against sources before writing, and each row carries them in
`Sources`. Nothing here has clergy review (§9).

| id | Saint | Feast | Note |
|---|---|---|---|
| **OS-3007** | Hilda, Abbess of Whitby | Nov 17 | †680; sister of St Hereswith (OS-0167) |
| **OS-3008** | Ciarán of Saighir, Bishop of Ossory | Mar 5 | †c.530; the **elder** Ciarán |
| **OS-3009** | Martyr Roderick of Córdoba | Mar 13 | †857; Mozarab priest, martyred with Salomon |
| **OS-3010** | New Martyr Ia of Beijing | Jun 11 | †1900; the mission-school teacher, "twice-martyred" |
| **OS-3011** | Great Martyr Zlata of Meglen | Oct 13; Oct 18 | †1795; two dates because the Churches differ |
| **OS-3012** | Abercius, Bishop of Hierapolis | Oct 22 | †c.167; Equal-to-the-Apostles |
| **OS-3013** | Hieromartyr Eleutherius of Illyricum | Dec 15 | †c.120; with his mother Anthia |
| **OS-3014** | New Hieromartyr Philoumenos of Jacob's Well | Nov 16 | †1979; glorified by Jerusalem, 2009 |
| **OS-3015** | Venerable Barlaam the Desert-Dweller | Nov 19; Aug 26 | Slavic and Greek dates |
| **OS-3016** | Venerable Ioasaph, Prince of India | Nov 19; Aug 26 | split from Barlaam per §7 |
| **OS-3017** | Righteous Djan Darada the Ethiopian Eunuch | Jan 4; Jun 17; Aug 27 | Acts 8 |

### Two corrections to this document's own earlier claims

**"Theodora the Armenian of Constantinople" was never missing.** She is the Empress
Theodora who restored the icons — **OS-0637**, already in the data with a portrait, and
Armenian by descent, which is what the vendor's title was recording. This document listed
her as verified-absent on the strength of the product title alone, which is exactly the
mistake the rest of it warns against. The icon is a candidate *depiction card* for
OS-0637, not a new row.

**Djan Darada is in scope after all.** The earlier note hedged him as an Ethiopian-tradition
figure, and Ethiopian Tewahedo commemoration would indeed be out of scope (§1). But he is
commemorated in the **Eastern** Orthodox Church too, on Jan 4, Jun 17 and Aug 27, and
Irenaeus already records him preaching in Ethiopia. He is added.

### The name-collision pairs, now cross-referenced both ways (§6)

Three of the new rows sit beside a same-name saint, and one beside a sister. The
reciprocal Notes were written onto the **existing** rows too, so the link is findable
from either end rather than only from the newcomer:

| New | Existing | Relationship |
|---|---|---|
| OS-3010 Ia of **Beijing** (†1900) | OS-1823 Ia of **Persia** (†362) | different martyrs, 1,500 years apart |
| OS-3008 Ciarán of **Saighir** (Mar 5) | OS-0324 Kieran of **Clonmacnoise** (Sep 9) | the elder and the younger |
| OS-3016 Ioasaph, **Prince of India** | OS-0224 Ioasaph, **Bishop of Belgorod** | unrelated; the transliteration hides it |
| OS-3007 **Hilda** of Whitby | OS-0167 **Hereswith** of Northumbria | sisters |

Hilda remains the sharpest illustration of why this list had to be checked by hand. She
was *findable* in `saints.csv` all along — but only as a phrase inside her sister's
`Also Known As`, describing a saint who was not in the file.

### Still open — named, not added

Three more surfaced during the icon batches and are **not** added, because a vendor's
product title is not evidence that the Church commemorates someone on a given day:

- **Zlata's fellow candidates:** *Chloe of Corinth* (1 Cor 1:11), *Valentine of Silistria*,
  and the **women unmercenaries** ("The Holy Unmercenary Physicians", whose alt text reads
  "holy unmercenary women"). Each needs a feast date from a synaxarion before it can
  become a row.

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
