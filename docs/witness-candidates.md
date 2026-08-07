# Witnesses of Our Time — candidates for new pages

> **WORKED 2026-08-05.** Peter Gillquist, Metropolitan Antony (Bashir) and
> Constance Tarasar are now live, and `/witnesses` exists as the section's index
> and as a second entry on `/collections`. **Three of this document's own claims
> turned out to be wrong when checked against sources** — they are corrected in
> place below and listed here so the corrections are not missed:
>
> 1. **Mother Gabriella (Ursache) is alive.** Listed below as reposed 2019. On
>    2 May 2025 Metropolitan Tikhon was received at Holy Dormition Monastery by
>    her, as abbess. She must not be given a memorial page.
> 2. **Constance Tarasar reposed on 7 November 2014**, not 2023.
> 3. **Fr Herman (Podmoshensky)'s difficulty was understated** as a suspension
>    and a disputed canonical standing. OrthodoxWiki gives the 1984 suspension as
>    "pending investigation into accusations of serious moral offences", and
>    survivor-advocacy sources describe those accusations as the sexual abuse of
>    minors. **Decision: excluded entirely.** He keeps no page and his
>    related-figure chip has been removed from Fr Seraphim Rose's entry. His name
>    still appears in the narrative of Rose's life, where it is a fact of the
>    record rather than a commendation — the St Herman Brotherhood, *The Orthodox
>    Word* and the Platina skete were founded by the two of them together, and
>    that cannot honestly be written any other way.
>
> **ALL THREE TIERS ARE NOW BUILT.** Tier 2 (Iakovos, Theodosius, Job) and Tier 3
> (Bloom, Ware, Aimilianos, Lossky, Gillet, Dobrev, Rodionov) followed, taking the
> section to **twenty-seven**. **The scope question below is answered: the section
> was widened to the whole Church in living memory on 2026-08-07.** `/america`
> keeps its own curated American roster of eleven, so the widening cost that page
> nothing; `/witnesses` is where the international entries live. The two Tier-3
> entries marked *verify* (Lossky, Gillet) were checked and are not canonized.
> This document is now spent apart from its cautions.
>
> The lesson is the one the document already states about vendor titles, turned
> on itself: a name and a year in a list are not a verified record.

**Question asked:** the Legacy Icons catalogue sells icons of several figures the Church
has **not** glorified. Do we already hold them in Witnesses of Our Time, and if not, who
else belongs there?

**Answer:** three of the five are already Witnesses; two are not. Beyond those, the
strongest candidates are people `src/lib/witnesses.ts` **already names but cannot link
to** — the cross-references are written and they dead-end.

Status checked 2026-08-03. **Glorification status is the whole game here** (§9): a figure
who has been canonized belongs in `data/saints.csv`, not in this section, and several
recent canonizations are listed at the bottom precisely because they are easy to get
wrong.

---

## The direct answer — the five from the catalogue

| Figure | Reposed | Status |
|---|---|---|
| Fr Seraphim (Rose) of Platina | 1982 | ✅ `/witness/seraphim-rose` |
| Archimandrite Roman Braga | 2015 | ✅ `/witness/roman-braga` |
| Archbishop Dmitri (Royster) of Dallas | 2011 | ✅ `/witness/dmitri-royster` |
| **Evgeny Rodionov** | 1996 | ❌ no page — see Tier 3 |
| **Dobri Dobrev** | 2018 | ❌ no page — see Tier 3 |

A sweep of all 996 catalogue products found **no other** non-glorified modern figure, so
that list is complete rather than a sample.

---

## First, a scope question that decides Tiers 1–2 vs Tier 3

The header of `src/lib/witnesses.ts` says these people "appear only on the **Saints of
America** page and on their own memorial pages", and all fourteen current Witnesses are
Orthodoxy-in-America figures. **The section is America-anchored today**, whether or not
that was ever decided explicitly.

Evgeny Rodionov (a Russian conscript) and Dobri Dobrev (a Bulgarian almsgiver) have no
American connection at all. Adding them means one of two things, and it is worth choosing
deliberately rather than by accident:

- ~~**Keep the section American** and leave them out~~ *(the scope question is now
  half-answered: `/witnesses` exists as an index, so the structural blocker is gone.
  The roster is still America-only by choice, not by accident.)*
- **Keep the section American** and leave them out — the two catalogue icons then simply
  stay unwired, which is already the case.
- **Widen it to "the whole Church in living memory"** — in which case `/america` stops
  being the only home for Witnesses and the section needs its own index page.

Tiers 1 and 2 below need no such decision. Tier 3 does.

---

## Tier 1 — already named in `witnesses.ts`, with nowhere to link (4)

These four are referenced as `RelatedFigure` chips **without an `href`**, because no page
exists. Every one of them is already part of a story the site tells.

| Candidate | Reposed | Why | Where already named |
|---|---|---|---|
| ~~**Fr Peter Gillquist**~~ ✅ **ADDED** `/witness/peter-gillquist` | 2012 | Led the Evangelical Orthodox Church — some two thousand people — into the Antiochian Archdiocese in 1987, the single largest convert reception in American Orthodox history. Wrote *Becoming Orthodox*. | `philip-saliba` (related figure + two works) |
| ~~**Metropolitan Antony (Bashir)**~~ ✅ **ADDED** `/witness/antony-bashir` | 1966 | Antiochian primate for 30 years, prolific translator and publisher who pushed English-language Orthodoxy decades before it was popular. | `philip-saliba` (ordained and succeeded him), `michael-gelsinger` (blessed the 1938 Sunday-school handbook) |
| ⛔ **Mother Gabriella (Ursache)** — **ALIVE, do not add** | *not reposed* | Abbess of Holy Dormition Monastery, Rives Junction, Michigan — one of very few American women's monasteries to take root, and a rare woman in a section that is currently thirteen men and one princess-nun. | `roman-braga`, `mother-alexandra` |
| ⛔ **Fr Herman (Podmoshensky)** — **EXCLUDED, see banner** | 2014 | Co-founder with Eugene Rose of the St Herman of Alaska Brotherhood, *The Orthodox Word*, and the Platina skete. ⚠️ **Handle carefully** — he was later suspended and his canonical standing was disputed for decades. That belongs in the page honestly or he stays off the list; it should not be quietly omitted. | `seraphim-rose` (four separate entries) |

**Recommendation: start here.** These four cost the least to justify and close real dead
links, and the first three carry no complications at all.

---

## Tier 2 — America-linked, not yet mentioned anywhere (4)

| Candidate | Reposed | Why |
|---|---|---|
| ~~**Archbishop Iakovos (Coucouzis) of America**~~ ✅ **ADDED** `/witness/iakovos-coucouzis` | 2005 | Primate of the Greek Archdiocese for 37 years and the most publicly visible Orthodox hierarch in American history — he marched at Selma beside Dr King in 1965 and appeared on the cover of *Life*. His absence is the largest single hole in this section. ⚠️ Not to be confused with **St Iakovos (Tsalikis) of Evia**, who *was* glorified in 2017 and is already OS-2585. |
| ~~**Metropolitan Theodosius (Lazor)**~~ ✅ **ADDED** `/witness/theodosius-lazor` | 2020 | OCA primate 1977–2002; presided over the glorifications of St Herman, St Innocent and others — the very saints this database carries. |
| ~~**Archbishop Job (Osacky)**~~ ✅ **ADDED** `/witness/job-osacky` | 2009 | OCA Midwest; a central figure in the accountability crisis of the 2000s, remembered for insisting on transparency at real cost to himself. |
| ~~**Constance Tarasar**~~ ✅ **ADDED** `/witness/constance-tarasar` | **2014** (not 2023) | OCA educator and historian; among the first women to teach at St Vladimir's and a principal chronicler of the American Church's own story. Would be the second woman in the section. |

---

## Tier 3 — international; only if the scope widens (7)

Listed with glorification status **verified**, because this is where the traps are.

| Candidate | Reposed | Canonized? | Note |
|---|---|---|---|
| ~~**Metropolitan Anthony (Bloom) of Sourozh**~~ ✅ **ADDED** `/witness/anthony-bloom` | 2003 | re-verified **not** canonized | Widely regarded as a saint in Britain and Russia; *Beginning to Pray* shaped a generation. |
| ~~**Metropolitan Kallistos (Ware) of Diokleia**~~ ✅ **ADDED** `/witness/kallistos-ware` | 2022 | re-verified **not** canonized | *The Orthodox Church* and *The Orthodox Way* are how most English speakers first met Orthodoxy — including many of this site's visitors. |
| ~~**Elder Aimilianos of Simonopetra**~~ ✅ **ADDED** `/witness/aimilianos-simonopetra` | 2019 | re-verified **not** canonized | Widely venerated; renewed Simonopetra and Ormylia. |
| ~~**Vladimir Lossky**~~ ✅ **ADDED** `/witness/vladimir-lossky` | 1958 | **verified** not canonized | Lay theologian of the Paris school; *The Mystical Theology of the Eastern Church*. |
| ~~**Fr Lev Gillet**~~ ✅ **ADDED** `/witness/lev-gillet` | 1980 | **verified** not canonized | "A monk of the Eastern Church". |
| ~~**Evgeny Rodionov**~~ ✅ **ADDED** `/witness/evgeny-rodionov` | 1996 | not glorified — Moscow has declined; the page says so | ⚠️ **The most sensitive name on this list.** A Russian conscript killed in Chechnya, said to have refused to remove his cross. Enormously venerated popularly; the Moscow Patriarchate has repeatedly declined to glorify him, and the account rests on his mother's testimony. A page would have to say all of that plainly. |
| ~~**Dobri Dobrev**~~ ✅ **ADDED** `/witness/dobri-dobrev` | 2018 | not glorified | The Bulgarian beggar who gave away everything he collected to restore churches. Beloved, uncontroversial, and easy to source. |

---

## Do NOT add these — they have been glorified, and belong in `saints.csv`

The obvious hazard in compiling a list like this is proposing someone the Church has
already canonized. These were checked; all but one are already in the data:

| Figure | Glorified | In our data |
|---|---|---|
| Elder Sophrony of Essex | 2019 | ✅ OS-2587 |
| Elder Ephraim of Katounakia | 2020 | ✅ OS-2588 |
| Elder Iakovos (Tsalikis) of Evia | 2017 | ✅ OS-2585 |
| St Cleopa (Ilie) of Sihăstria | 2024 (Romania) | ✅ OS-2622 |
| St Arsenie Boca | 2024 (Romania) | ✅ OS-2619 |
| St Dumitru Stăniloae | 2024 (Romania) | ✅ OS-2617 |
| Matushka Olga (Michael) of Alaska | 2023 (OCA) | ✅ OS-2083 |
| **Nun Gavrilia (Papagianni)** | **2023 (Constantinople)** | ❌ **MISSING — a saint gap, not a witness** |

### One finding that is not about Witnesses at all

**Nun Gavrilia (Papagianni) was canonized by the Ecumenical Patriarchate in 2023 and is
not in `data/saints.csv`.** "Mother Gavrilia" of *The Ascetic of Love* — the travelling
nun who nursed in India and kept an open door in Athens. She belongs in the canonical
dataset with a feast day, and should be added there rather than here.

The Romanian Church also canonized **16 men in 2024 and 16 women in 2025**, and the
Serbian Church a further group in 2025. Those decrees are worth walking through against
`saints.csv` as their own exercise; this list checked only the names it happened to
touch.
