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
| Arsenije I Sremac of Serbia | Arsenios I; Arsenije Sremac | Serbia | OS-0449 | 1 | Medium | Successor of St. Sava as Archbishop of Serbia; recurs in Serbian archiepiscopal succession, so likely to be referenced again. |
| Michael Bleive | Mihail Bleive | Estonia | OS-0456 | 1 | Medium | New Martyr of Estonia (glorified 2000); co-martyr of Hieromartyr Platon of Tallinn (OS-0456). |
| Nikolai Bezhanitsky | Nikolai Bezhanitski | Estonia | OS-0456 | 1 | Medium | New Martyr of Estonia; co-martyr of Platon of Tallinn (OS-0456). |
| Felix of Nola | — | Italy (Campania) | OS-0522 | 1 | Low | Confessor of Nola; the saint to whom St. Paulinus of Nola was devoted. Feast Jan 14. |
| George the Hungarian | — | Rus' / Hungarian | OS-0554 | 1 | Low | Brother of Sts. Ephraim of Novy Torg and Moses the Hungarian; slain with St. Boris (1015). Borderline — venerated chiefly within the Boris & Gleb narrative; review independence before adding. |
| Emperor Marcian | Marcian | Constantinople (Byzantine) | OS-0681 | 2 | Medium | Co-convener of Chalcedon (451) with Pulcheria; commemorated Feb 17. (refs OS-0681, OS-0684) |
| Theodosius (Bobkov) | — | Russia (Butovo) | OS-0678 | 1 | Low | New Martyr; co-martyr of Hieromartyr Nicholas Kandaurov (Feb 17 / Butovo). |
| Nicholas Pospelov | — | Russia (Butovo) | OS-0678 | 1 | Low | New Martyr of Bylovo; co-martyr of Hieromartyr Nicholas Kandaurov (Feb 17 / Butovo). |
| Varus the notary | — | Asia Minor (Heraclea) | OS-0615 | 1 | Low | Servant who recorded St. Theodore Stratelates's martyrdom; independent veneration to verify (borderline). |
| Fulgentius of Astigi | Fulgentius of Écija | Spain (Visigothic) | OS-0734 | 1 | Low | Bishop of Astigi; brother of Sts. Leander, Isidore & Florentina. |
| Florentina of Cartagena | — | Spain (Visigothic) | OS-0734 | 1 | Low | Abbess; sister of Sts. Leander, Isidore & Fulgentius. |
| Julian the Physician of Cyprus | — | Cyprus | OS-0788 | 1 | Low | Disciple of St. Arcadius of Cyprus, martyred under Julian the Apostate; feast Mar 6. |
| Eubolos of Cyprus | — | Cyprus | OS-0788 | 1 | Low | Disciple of St. Arcadius of Cyprus, martyr; feast Mar 6. |
| Kodratos, Akakios & Stratonikos of Ptolemais | — | Ptolemais (Phoenicia) | OS-0771 | 1 | Low | Soldier co-martyrs converted at the martyrdom of Sts. Paul & Juliana. |
| Nestor of Isauria | — | Isauria | OS-0776 | 1 | Low | Father of St. Conon of Isauria; remembered as a martyr (identity uncertain — borderline). |
| Scholastica | — | Italy (Nursia/Monte Cassino) | OS-0822 | 1 | Medium | Sister of St. Benedict of Nursia; foundress of Benedictine nuns; feast Feb 10. |
| Romanus of Subiaco | — | Italy | OS-0822 | 1 | Low | The monk who clothed St. Benedict and supplied him at the cave of Subiaco; feast May 22. |
| Luke of Demena | Luke of Armento | Italo-Greek (Lucania) | OS-0803 | 1 | Low | 10th-c. Italo-Greek monastic founder; companion of St. Vitalius of Castronovo; feast Oct 13. |
| Braulio of Saragossa | — | Spain (Visigothic) | OS-0937 | 1 | Medium | Bishop of Saragossa (d. 651); disciple and literary executor of St. Isidore of Seville. |
| Ascholius of Thessalonica | Acholius | Thessalonica (Greece) | OS-1000 | 1 | Medium | 4th-c. bishop who baptized Emperor Theodosius; correspondent of St. Basil. |
| Anthusa of Mantineon | — | Asia Minor (Mantineon) | OS-0986 | 1 | Low | Abbess-confessor tortured under Constantine V; foretold the birth of St. Anthusa of Constantinople; feast Jul 27. |
| Sansalas | — | Gothia / Wallachia | OS-1000 | 1 | Low | Priest arrested with St. Sabbas the Goth; 4th-c. Gothic martyr (feast ~Apr 12). |
| Shandulios | — | Persia (Sasanian) | OS-0953 | 1 | Low | Concealed the relics of the Persian martyrs under Shapur II (borderline — verify veneration). |
| Epiphanius the Wise | — | Russia (Moscow) | OS-1065 | 1 | Medium | Hagiographer of Sts. Stephen of Perm and Sergius of Radonezh; major 14th–15th-c. writer. |
| Patriarch Paisius of Peć | Pajsije | Serbia | OS-1077 | 1 | Low | Patriarch of Serbia who consecrated St. Basil of Ostrog; feast Nov 3. |
| Anthony & Felix of Karelia | — | Russia (Karelia) | OS-1015 | 1 | Low | Righteous sons of Marfa Boretskaya; among the Synaxis of Karelian Saints (local veneration — verify). |
| Paisius Yaroslavov | — | Russia (Kirillo-Belozersk) | OS-1127 | 1 | Medium | Elder of St. Nilus of Sora; Trinity-Sergius hegumen; Non-Possessor circle (locally venerated). |
| Macarius of Leteti | — | Georgia | OS-1106 | 1 | Low | 9th-c. Georgian monk who laboured with Ss. Michael & Arsenius of Ulompo in Palestine. |
| Possidius of Calama | — | North Africa | OS-1365 | 1 | Low | Disciple and biographer of St. Augustine of Hippo. |
| Alypius of Thagaste | — | North Africa | OS-1365 | 1 | Low | Friend of St. Augustine; bishop of Thagaste. |
| Ursus of Ravenna | — | Italy (Ravenna) | OS-1328 | 1 | Low | 4th–5th-c. Bishop of Ravenna; co-consecrator of St. Bassianus of Lodi. |
| Felix of Como | — | Italy (Como) | OS-1328 | 1 | Low | First Bishop of Como (4th c.). |
| Theophanes the Greek | — | Byzantium / Russia | OS-1469 | 1 | Medium | Master iconographer; teacher/collaborator of St. Andrei Rublev (Novgorod, Moscow). |
| Yuri Skobtsov | George Skobtsov | France (Paris) | OS-1559 | 1 | Low | Son of St. Maria Skobtsova; glorified 2004 among the Paris/Western-European martyrs. |
| Ilya Fondaminsky | Elijah Fondaminsky | France (Paris) | OS-1559 | 1 | Low | Of the Rue de Lourmel circle; glorified 2004 with Sts. Maria Skobtsova & Demetrius Klepinin. |
| Eleutherios the Hesychast | — | Romania (Sihla) | OS-1663 | 1 | Low | Husband/co-ascetic of St. Theodora of Sihla. |
| Barsanuphius of Sihastria | — | Romania | OS-1663 | 1 | Low | Spiritual guide of St. Theodora of Sihla. |
| Theosebios of Arsinoe | Theosebius the God-bearer | Cyprus (Arsinoe) | OS-1800 | 1 | Low | Cypriot ascetic; brother of St. Arkadios the Wonderworker of Arsinoe. |
| Paul of Atroa | Paul the Younger of Atroa | Bithynia (Atroa) | OS-1835 | 1 | Medium | Founder of the Atroa monastic circle; teacher of St. Peter of Atroa; iconodule. |
| Sabbas of Atroa | Sabas | Bithynia (Atroa) | OS-1835 | 1 | Low | Disciple and biographer of St. Peter of Atroa. |
| Theophilus of Gothia | Theophilus the Gothic Bishop | Gothia (Crimea/Danube) | OS-1839 | 1 | Medium | Gothic bishop, signatory of Nicaea (325); recurs with the Gothic martyrs (Niketas, Sabbas). |
| Elias Speleotes | Elias the Cave-Dweller of Calabria | Calabria (Italo-Greek) | OS-1805 | 1 | Low | Italo-Greek hermit; spiritual associate of St. Fantinus of Calabria. |
| Nonnus of Heliopolis | Nonnus, Bishop of Edessa/Heliopolis | Syria (Heliopolis/Edessa) | OS-1977 | 1 | Medium | Bishop who converted and baptized St. Pelagia the Penitent; venerated (Nov 10). |
| Epiphanius, disciple of Andrew the Fool | Epiphanius of Constantinople | Constantinople | OS-1938 | 1 | Low | Disciple who shared St. Andrew's vision of the Theotokos (Protection/Pokrov); identity sometimes linked to a later patriarch. |
| Papias of Hierapolis | Papias, Bishop of Hierapolis | Phrygia (Hierapolis) | OS-2061 | 1 | Medium | Apostolic Father, hearer of the Apostle John; predecessor of St. Averkios; venerated. |
| Valerius of Saragossa | Valerius of Zaragoza | Spain (Saragossa) | OS-2178 | 1 | Medium | Bishop of Saragossa under whom St. Vincent served as deacon; arrested/tried with him; venerated (Jan 28). |
| Maria of Amnia | Empress Maria | Byzantium (Amnia) | OS-2283 | 1 | Low | Granddaughter of St. Philaret the Merciful; first wife of Emperor Constantine VI; locally venerated. |
| John the Acoemete | John the Sleepless | Constantinople (Acoemetae) | OS-2426 | 1 | Medium | Founder-abbot of the Acoemetae ("Unsleeping Ones"); predecessor of St. Marcellus; venerated. |

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

## Considered and excluded (this round)

Kept for transparency so the same figures aren't re-evaluated each pass:
- **Gennadius (George) Scholarius** (ref. OS-0486) — veneration/canonization not clearly established; excluded under the canonization-caution guardrail.
- **Theodoret of Cyrus** (ref. OS-0520/0535/0561/0564/0575/0626/0659/0660) — the 5th-c. bishop-historian who chronicled the Syrian solitaries; his Christology was condemned (Three Chapters / Constantinople II) and his veneration is disputed — excluded. (He appears only as a *chronicler*, never as a relationship card; note OS-0797 "Theodoritus the Presbyter" is a different person. A stray Theodoret companion card on OS-0660 was removed during the OS-0601–0700 consolidation.)
- **Pachomios of Chios** (ref. OS-0666) — Pachomios the New (1840–1905); locally venerated but pan-Orthodox glorification not confirmed; excluded under the canonization-caution guardrail (§9) pending verification.
- **Theodotus of Heliopolis** (ref. OS-0746) — bishop who baptized St. Eudokia; veneration/feast unconfirmed; excluded as uncertain pending source review.

> **False-negative note (verify before logging):** several "absent" flags from subagents turned out to be already in the database under a different spelling/epithet — **Dionysius the Great of Alexandria = OS-1964**, **Jerome of Stridon = OS-1362**, **Modestus of Jerusalem = OS-0066**, **Arsen of Ninotsminda = OS-1618**. Always `grep data/saints.csv` to confirm true absence before adding a row here. **Two more found this round: Naucratius of Cappadocia (brother of St. Basil) = OS-2802** and **Abba Or / Hor of the Thebaid = OS-1659** — both were flagged for DB-expansion but already present; their cards were wired to the existing rows. **Also this round: Meletios the Younger of Myoupolis = OS-0113** ("St. Meletius the Younger of Thebes", feast Sep 1) — already present, card wired. (The erroneous Dionysius row was removed; OS-0625/OS-0706/OS-0807 were wired to the existing OS-1964 / OS-0066 / OS-1618.)

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
