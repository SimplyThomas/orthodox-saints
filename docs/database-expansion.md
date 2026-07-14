# Database Expansion Register

A roadmap of **commemorated saints not yet represented in the database** that should potentially be
added in the future. It grows **organically** from actual relationship-authoring work — each entry
is a saint we encountered as a plain (href-less) card because no `OS-####` row exists for them yet.

This is the **fourth project stream**, distinct from the other three:

1. **Relationship Network** — current priority (authoring `family`/`companions`/`related`).
2. **Data Corrections** — `docs/data-issues.md` (duplicates, retirements, bad records in existing rows).
3. **Content Expansion** — enriching **existing** saints (biographies, works, patronages, facets).
4. **Database Expansion** — *this document* — adding **new** saints not yet in the database.

> This is **not** a data-issues document and **not** a content-enrichment list. It is purely a
> candidate list for *new rows*.

---

## What belongs here (and what does not)

**Include only genuine commemorated saints** encountered as plain cards during authoring.

**Do NOT include:**
- non-commemorated family members (e.g. a saint's lay parent or sibling who is not venerated);
- emperors / rulers / nobles who are not saints;
- historical figures (chroniclers, hagiographers) who are not commemorated;
- biblical figures intentionally outside the project's scope;
- uncertain identities, or figures whose canonization/veneration is genuinely disputed.

When in doubt, leave it out (the §9 canonization-caution guardrail applies). A short list of figures
**considered and excluded** this round is kept at the bottom for transparency.

## Fields

Each row records: **Name** · **Aliases** · **Region / Tradition** · **First Ref** (the first
`OS-####` profile that referenced it) · **Refs** (number of referencing profiles encountered so
far) · **Priority** · **Notes** (which folds in the *reason it was encountered* / network context).

## Priority guidelines
- **High** — repeatedly referenced across multiple unrelated profiles, or clearly central to a major
  relationship network.
- **Medium** — referenced occasionally, or important within one regional tradition (likely to recur).
- **Low** — referenced once, or only in a very specialized context.

## Updating protocol (do this during relationship authoring)
When authoring encounters a commemorated saint **not** in `data/saints.csv`:
1. Check whether they already appear below.
2. **If yes** — increment **Refs** and append the new referencing `OS-####` to the Notes (and bump
   Priority if the pattern now warrants it).
3. **If no** — add a new row.

(Subagents are told to *report* unmatched plain cards; the register is updated centrally during
consolidation. Counts reflect encounters from **OS-0401 onward**, when this stream began — earlier
plain cards can be backfilled opportunistically.)

---

## Register

| Name | Aliases | Region / Tradition | First Ref | Refs | Priority | Notes |
|---|---|---|---|--:|---|---|

_Register cleared (2026-07-04). Every figure surfaced during the relationship-network build has now been either added to the database or documented below as a §9 hold pending verification. New references discovered in future authoring should be appended here._

---

## Added to the database

Saints from this register that have since been given an `OS-####` row (their plain
cross-reference cards were wired to the new pages at the same time).

### Insular Celtic batch — Ireland · Wales · Scotland (issue #227)

- **Declan of Ardmore** → `OS-2806`
- **Fursey** → `OS-2807`
- **Palladius of Ireland** → `OS-2808`
- **Cainnech of Aghaboe** → `OS-2809`
- **Finnian of Clonard** → `OS-2810`
- **Adomnan of Iona** → `OS-2811`
- **Mochaemhoc** → `OS-2812`
- **Abban of Ireland** → `OS-2813`
- **Fanchea** → `OS-2814`
- **Erc of Slane** → `OS-2815`
- **Jarlath of Tuam** → `OS-2816`
- **Foillan of Fosses** → `OS-2817`
- **Sinell of Cleenish** → `OS-2818`
- **Serf (Servanus)** → `OS-2819`
- **Thenew** → `OS-2820`
- **Asaph of Wales** → `OS-2821`
- **Non of Wales** → `OS-2822`
- **Teilo** → `OS-2823`
- **Cybi of Holyhead** → `OS-2824`
- **Brychan of Brycheiniog** → `OS-2825`
- **Ismael of Wales** → `OS-2826`
- **Padarn** → `OS-2827`
- **Paulinus of Wales** → `OS-2828`


### Anglo-Saxon England batch — Canterbury · East Anglia · Northumbria (issue #227)

- **Honorius of Canterbury** → `OS-2829`
- **Laurence of Canterbury** → `OS-2830`
- **Justus of Rochester** → `OS-2831`
- **Mellitus of Canterbury** → `OS-2832`
- **Ceolfrith of Wearmouth** → `OS-2833`
- **Sigeberht of East Anglia** → `OS-2834`
- **King Anna of East Anglia** → `OS-2835`
- **Seaxburh of Ely** → `OS-2836`
- **Egwin of Worcester** → `OS-2837`

### Roman / Jerome ascetic circle — Rome · Milan (issue #227)

- **Marcella of Rome** → `OS-2838`
- **Eustochium** → `OS-2839`
- **Pope Damasus I** → `OS-2840`
- **Marcellina of Rome** → `OS-2841`
- **Satyrus of Milan** → `OS-2842`
- **Sabina of Rome** → `OS-2843`

### Gaulish Lérins school — Provence · Arles · Bourges (issue #227)

- **Hilary of Arles** → `OS-2844`
- **Caprasius of Lérins** → `OS-2845`
- **Leontius of Fréjus** → `OS-2846`
- **Austregisilus of Bourges** → `OS-2847`
- **Caesaria the Elder** → `OS-2848`
- **Caesaria the Younger** → `OS-2849`

### Frankish / Merovingian batch — Nivelles · Chelles (issue #227)

- **Itta of Metz** → `OS-2850`
- **Begga of Andenne** → `OS-2851`
- **Bathild of Chelles** → `OS-2852`

### Russian North monastics — Kola · Ustyug · Onega · Kozhe Lake (issue #227)

- **Theodorite of Kola** → `OS-2853`
- **Procopius of Ustyug** → `OS-2854`  _(the two register entries "Procopius of Ustyug" and "Procopius of Ustiug" were the same Lübeck-born fool-for-Christ; confirmed distinct from Procopius of Ustya/Vologda `OS-1495`, who shares the Jul 8 feast — a reciprocal cross-reference was added to both rows)_
- **Gury Shalochsky** → `OS-2855`  _(feast poorly attested; featless stub flagged for review)_
- **Abraham of Paleostrov** → `OS-2856`
- **Niphon of Kozhe Lake** → `OS-2857`  _(no separate feast attested; featless stub flagged for review)_

### Roman Popes (pre-schism) — Rome (issue #227)

- **Pope Cornelius of Rome** → `OS-2858`
- **Pope Julius I of Rome** → `OS-2859`
- **Pope Evaristus** → `OS-2860`
- **Pope Sixtus I** → `OS-2861`
- **Pope Leo II of Rome** → `OS-2862`
- **Pope Donus of Rome** → `OS-2863`

_(Pope Damasus I was added earlier with the Roman/Jerome-circle batch, `OS-2840`.)_

### Palestine / Judean-desert / Holy Land — Jerusalem · Caesarea · Gaza (issue #227)

- **Macarius of Jerusalem** → `OS-2866`
- **Maximus of Jerusalem** → `OS-2867`
- **Patriarch Elias of Jerusalem** → `OS-2869`
- **Cyril of Scythopolis** → `OS-2868`  _(featless stub flagged for review)_
- **Antony of Choziba** → `OS-2864`  _(featless stub flagged for review)_
- **Abba Seridos of Gaza** → `OS-2865`
- **Theodosia, mother of Procopius** → `OS-2870`
- **Theoteknus of Caesarea** → `OS-2871`  _(featless stub flagged for review)_
- **Theophilus of Caesarea** → `OS-2872`

### Egyptian desert & early-Eastern ascetics/companions (issue #227)

- **Amma Theodora** → `OS-2873`  _(featless stub flagged for review)_
- **Peter the Pionite** → `OS-2874`  _(featless stub flagged for review)_
- **Bryaena of Nisibis** → `OS-2875`
- **Athenodorus of Pontus** → `OS-2876`  _(featless stub flagged for review)_
- **Aedesius of Ethiopia** → `OS-2877`  _(featless stub flagged for review)_
- **Cyriacus the Executioner** → `OS-2878`
- **Martyr Isidore (with Jadorus)** → `OS-2879`

### Greek / Athonite / Aegean monastic saints (issue #227)

- **Nektarios of the Apsaras family** → `OS-2880`
- **Theophanes of the Apsaras family** → `OS-2881`
- **James of Kastoria** → `OS-2882`
- **Eleni (Susanna) of Lesbos** → `OS-2883`
- **Paul, Bishop of Corinth** → `OS-2884`  _(featless stub flagged for review)_
- **Arsenios of Crete** → `OS-2885`  _(featless stub flagged for review)_

### Russian / Rus' monastic saints, martyrs & princes (issue #227)

- **Mstislav-Theodore the Great** → `OS-2886`
- **Yaroslav the Wise** → `OS-2887`
- **Vassian Muromtsev** → `OS-2888`
- **Basil, Abbot of Mirozh** → `OS-2889`
- **Chariton of Kudinsk** → `OS-2890`  _(featless stub flagged for review)_
- **Barnabas of Gethsemane** → `OS-2891`
- **Nicephorus (Kuchin) of Solovki** → `OS-2892`
- **Daniel the Black (Chorny)** → `OS-2893`
- **Gregory the Faster of the Far Caves** → `OS-2894`
- **Mother Alexandra of Diveyevo** → `OS-2895`

_Held for a follow-up pass (uncertain individual glorification / hagiographer-writers, §9): **Theophanes the Greek** (no formal canonization found), **Epiphanius the Wise**, **Paisius Yaroslavov** — all remain in the register above._

### Iberian Visigothic & North-African (Augustine circle) saints (issue #227)

- **Fulgentius of Astigi** → `OS-2896`
- **Florentina of Cartagena** → `OS-2897`
- **Braulio of Saragossa** → `OS-2898`
- **Valerius of Saragossa** → `OS-2901`
- **Possidius of Calama** → `OS-2899`
- **Alypius of Thagaste** → `OS-2900`

### Italy & Italo-Greek saints — Campania · Nursia · Ravenna · Lucania · Calabria (issue #227)

- **Scholastica** → `OS-2903`
- **Romanus of Subiaco** → `OS-2904`
- **Felix of Nola** → `OS-2902`
- **Ursus of Ravenna** → `OS-2905`
- **Felix of Como** → `OS-2906`  _(featless stub — conflicting feast dates, flagged for review)_
- **Luke of Demena** → `OS-2907`
- **Elias Speleotes** → `OS-2908`

### Byzantine-East bishops, Apostolic Father & monastics (issue #227)

- **Papias of Hierapolis** → `OS-2912`
- **Nonnus of Heliopolis** → `OS-2911`
- **Ascholius of Thessalonica** → `OS-2909`  _(featless stub flagged for review)_
- **Theophilus of Gothia** → `OS-2910`  _(featless stub flagged for review)_
- **John the Acoemete** → `OS-2913`  _(featless stub flagged for review)_
- **Paul of Atroa** → `OS-2914`  _(featless stub flagged for review)_
- **Sabbas of Atroa** → `OS-2915`  _(featless stub flagged for review)_
- **Julian the Physician of Cyprus** → `OS-2916`
- **Eubolos of Cyprus** → `OS-2917`

### 20th-century New Martyrs — Estonia · Butovo · Paris (issue #227)

- **Michael Bleive** → `OS-2918`
- **Nikolai Bezhanitsky** → `OS-2919`
- **Theodosius (Bobkov)** → `OS-2920`
- **Nicholas Pospelov** → `OS-2921`
- **Yuri Skobtsov** → `OS-2922`
- **Ilya Fondaminsky** → `OS-2923`

### Serbian hierarchs, Byzantine confessors & early martyrs (issue #227)

- **St. Marcian the Emperor** (Feb 17, with St. Pulcheria) → `OS-2924`
- **Venerable Anthusa, Abbess of Mantineon** (Jul 27, +759) → `OS-2925`
- **St. Arsenije I, Archbishop of Serbia** (Oct 28) → `OS-2926`
- **St. Paisije, Patriarch of Serbia** (Oct 3; glorified 2017) → `OS-2927`
- **Martyrs Kodratos, Akakios & Stratonikos of Ptolemais** (Aug 17; Mar 4) → `OS-2928` (one group row — three undifferentiated soldier co-martyrs)

_Paisije's feast is Oct 3 (O.S.), not the "Nov 3" earlier noted in the register._

### Rus'/Karelian & Persian venerated companions (issue #227)

- **Martyr George the Hungarian** (Jul 24, with Passion-bearer Boris, +1015) → `OS-2929`
- **Righteous Anthony and Felix of Karelia** (Apr 18; May 21 Synaxis of Karelian Saints, +1418) → `OS-2930` (one group row — two undifferentiated brothers)
- **Righteous Shandulios of Persia** (Nov 3) → `OS-2931` (concealed the relics of the 120 Martyrs of Persia; a `related` card was added to OS-0953)

## Considered and excluded (this round)

Kept for transparency so the same figures aren't re-evaluated each pass:
- **Gennadius (George) Scholarius** (ref. OS-0486) — veneration/canonization not clearly established; excluded under the canonization-caution guardrail.
- **Theodoret of Cyrus** (ref. OS-0520/0535/0561/0564/0575/0626/0659/0660) — the 5th-c. bishop-historian who chronicled the Syrian solitaries; his Christology was condemned (Three Chapters / Constantinople II) and his veneration is disputed — excluded. (He appears only as a *chronicler*, never as a relationship card; note OS-0797 "Theodoritus the Presbyter" is a different person. A stray Theodoret companion card on OS-0660 was removed during the OS-0601–0700 consolidation.)
- **Pachomios of Chios** (ref. OS-0666) — Pachomios the New (1840–1905); locally venerated but pan-Orthodox glorification not confirmed; excluded under the canonization-caution guardrail (§9) pending verification.
- **Theodotus of Heliopolis** (ref. OS-0746) — bishop who baptized St. Eudokia; veneration/feast unconfirmed; excluded as uncertain pending source review.
- **Maria of Amnia** (ref. OS-2283) — granddaughter of St. Philaret the Merciful and first wife of Emperor Constantine VI; appears only as a historical figure in Philaret's life, with no independent commemoration/feast found. Held under the canonization-caution guardrail (§9).
- **Epiphanius, disciple of Andrew the Fool** (ref. OS-1938) — depicted beside St. Andrew in the Protection (Pokrov) icon, but no independent feast/veneration is established and his identity is uncertain. Held (§9).
- **Sansalas the priest** (ref. OS-1000) — companion of St. Sabbas the Goth; his own martyrdom/independent veneration is not clearly attested (Sabbas alone was drowned). Held pending verification (§9).
- **Eleutherios the Hesychast** and **Barsanuphius of Sihastria** (ref. OS-1663) — husband and spiritual guide of St. Theodora of Sihla; individual canonization not confirmed (St. Theodora herself was glorified 1992). Held pending verification (§9).
- **Macarius of Leteti** (ref. OS-1106) — 9th-c. Georgian monk; no feast day or clear independent veneration found. Held pending Georgian-source review (§9).
- **Varus (Uaros) the notary** (ref. OS-0615) — the servant who recorded the martyrdom of St. Theodore Stratelates; a figure within Theodore's passion but with no attested independent commemoration/feast of his own. Held (§9).
- **Nestor of Isauria** (ref. OS-0776) — father of St. Conon of Isauria, said in Conon's life to have received a martyr's crown, but with no independent feast and an uncertain identity. Held (§9).
- **Epiphanius the Wise** (ref. OS-1065) — the great Russian hagiographer of Sts. Sergius of Radonezh and Stephen of Perm (+c.1420); revered and sometimes listed among 15th-c. saints, but no formal glorification or feast day could be confirmed. Held pending verification (§9).
- **Paisius Yaroslavov** (ref. OS-1127) — elder of the Non-Possessor circle and hegumen of the Trinity-Sergius Lavra; associated with St. Nilus of Sora but not himself glorified. Held (§9).
- **Theophanes the Greek** (ref. OS-1469) — the master iconographer and collaborator of St. Andrei Rublev; venerated in memory as an artist but no canonization/feast established. Held (§9).

> **False-negative note (verify before logging):** several "absent" flags from subagents turned out to be already in the database under a different spelling/epithet — **Dionysius the Great of Alexandria = OS-1964**, **Jerome of Stridon = OS-1362**, **Modestus of Jerusalem = OS-0066**, **Arsen of Ninotsminda = OS-1618**. Always `grep data/saints.csv` to confirm true absence before adding a row here. **Two more found this round: Naucratius of Cappadocia (brother of St. Basil) = OS-2802** and **Abba Or / Hor of the Thebaid = OS-1659** — both were flagged for DB-expansion but already present; their cards were wired to the existing rows. **Also this round: Meletios the Younger of Myoupolis = OS-0113** ("St. Meletius the Younger of Thebes", feast Sep 1) — already present, card wired. **Also this round: Theosebios of Arsinoe = OS-2799** ("Theosebios the God-bearer of Arsinoe", Oct 12) — already present, card wired. (The erroneous Dionysius row was removed; OS-0625/OS-0706/OS-0807 were wired to the existing OS-1964 / OS-0066 / OS-1618.)

Also excluded as uncertain this round: **Theodosius of Cyzicus** (OS-0866) and **Prophet Jehu son of Hanani** (OS-0886) — commemoration/feast not established.
- **Faustus of Riez** (ref. OS-0468) — venerated locally but his orthodoxy was historically contested; excluded as disputed.
- **Gregory Tsamblak** (ref. OS-0500), **Constantine of Kostenets** (ref. OS-0500) — writers/clerics, not commemorated saints.
- **Theophilus of Alexandria** (ref. OS-0476), **Vukan Nemanjić** (ref. OS-0449), **Patriarch Nikon** (ref. OS-0442), various emperors/nobles — not commemorated.
- **Abba Isaiah** (OS-0475), **Eusebius** (OS-0479), **Gelasius** (OS-0451) — uncertain identity (multiple same-named saints; not securely identifiable).
- **Bořivoj I & Drahomíra** (kin of St. Ludmilla of Bohemia, ref OS-1853) — Bořivoj's pan-Orthodox veneration is unestablished; Drahomíra is remembered as Ludmilla's hostile daughter-in-law. Excluded as non-commemorated kin.
- **Đurađ Branković & Irene Kantakouzene** (parents of St. Stephen the Blind, ref OS-1989) — Serbian despot and his wife; not commemorated as saints. Excluded as non-commemorated rulers.
- **Vukan Nemanjić** (brother of St. Stephen the First-Crowned, ref OS-1904) — Grand Prince; not himself commemorated (his son is St. David of Serbia). Excluded as non-commemorated ruler.
- **Origen of Alexandria** (teacher of St. Dionysius the Great, ref OS-1964) — not a saint; his teachings were condemned. Excluded.

- **Michael of Tver = OS-2229** (Greatmartyr Prince Michael Yaroslavich of Tver): flagged absent during the OS-1939 (Anna of Kashin) authoring and wrongly added here, but he has a row at OS-2229. Removed; OS-1939's card wired to OS-2229.

- **Paulinus of Nola = OS-0522** (St. Paulinus the Merciful of Nola): flagged absent during the OS-2438 (Melania the Younger) authoring, but he has a row at OS-0522. NOT added; OS-2438's card wired to OS-0522.
