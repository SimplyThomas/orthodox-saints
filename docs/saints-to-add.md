# Saints to Add

A working backlog of saints surfaced **during the saint-page review** — people
referenced as kin (the **Family** section) or as companions (the **Companions &
Contemporaries** section) who are commemorated saints but are **not yet in the
dataset** (`data/saints.csv`).

This is a hand-maintained annotation surface for the review pass: add a row
whenever you spot a gap, noting **which profile referenced them** so the link can
be wired once the saint is added.

> A *non-saint* figure (e.g. an emperor a saint confronted) is **not** a gap —
> mark those `commemorated: false` in the profile instead. This list is only for
> commemorated saints missing from the DB.

**When a saint is later added** to `data/saints.csv` (blank ID → build assigns
`OS-####`), add the `href` to the referencing profile's figure and set this
row's **Status** to `added`.

**Status values:** `todo` (not yet handled) · `added OS-####` (entered + href
wired) · `deferred — <reason>` (intentionally not added: no fixed feast, formal
glorification unclear per §9, or out of scope per §1). All rows are now resolved.

| Missing Saint | Referenced By | Section | Relation | Feast | Notes | Status |
|---|---|---|---|---|---|---|
| Saint Basil the Elder | OS-0021 | Family | father | ~May 30 | Commemorated with his wife St Emilia (already `OS-0374`) | added OS-2757 |
| Saint Naucratius | OS-0021 | Family | brother | ~Jun 8 | Brother of Basil the Great & St Macrina the Younger | deferred — no clear individual feast (§9) |
| Saint Amphilochius of Iconium | OS-0021 | Companions | close friend & correspondent | Nov 23 | Bishop of Iconium; *On the Holy Spirit* was dedicated to him. Distinct from `OS-0291` / `OS-1991` / `OS-2006` | added OS-2239 (was already in DB) |
| St Vincent Madelgarus | OS-0282 | Family | father | — | Founder of Hautmont Abbey; 7th c. Gaul | added OS-2766 |
| St Waldetrudis of Mons | OS-0282 | Family | mother | Apr 9 | Foundress of Mons Abbey; 7th c. | added OS-2767 |
| St Aldetrudis | OS-0282 | Family | sister | Feb 25 | Predecessor as abbess of Maubeuge | added OS-2768 |
| Landericus of Soignies | OS-0282 | Family | brother | — | 7th c. Gaul | added OS-2770 |
| Dentlin of Soignies | OS-0282 | Family | brother | — | 7th c. Gaul | added OS-2771 |
| St Aldegund | OS-0282 | Family | aunt | Jan 30 | Foundress of Maubeuge Abbey | added OS-2769 |
| King Aethelberht of Kent | OS-0309 | Family | father | Feb 24/25 | First Christian Anglo-Saxon king | added OS-2763 |
| Queen Bertha | OS-0309 | Family | mother | May 1 | Frankish Christian queen; 6th–7th c. | added OS-2772 |
| Eanflaed | OS-0309 | Family | daughter | Nov 24 | 7th c. Northumbria | added OS-2773 |
| Paulinus of York | OS-0309 | Companions | accompanied her to Northumbria | Oct 10 | 7th c.; distinct from Paulinus of Nola (`OS-0522`) | added OS-2774 |
| St Eucherius of Lyon | OS-0352 | Family | father | Nov 16 | Archbishop of Lyon, monk of Lérins, †c.449 | added OS-2759 |
| Salonius of Geneva | OS-0352 | Family | brother | — | Bishop of Geneva; 5th c. Gaul | added OS-2775 |
| David the Monk of Lesbos | OS-0097 | Family | brother | Feb 1 | Ascetic of Mt Ida, fellow Confessor of Lesbos; 9th c. | added OS-2777 |
| Eugene Botkin | OS-1541 | Companions | court physician who died with the Royal Family | Jul 17 | Canonized 2016 as righteous passion-bearer; 20th c. | added OS-2760 |
| Benedict of Aniane | OS-1259 | companions | Monastic reformer to whose direction William entrusted the new monastery of Gellone | Feb 11/12 | 9th-century Frankish monastic reformer; individually venerated saint, absent from dataset | added OS-2776 |
| Fronto (Frontonus) of Périgueux | OS-1282 | companions | Bishop of Périgueux who sent the four as missionaries and buried their relics | Oct 25 | Pre-schism Gallic saint venerated individually; absent from dataset | added OS-2788 |
| Martyr Basilides the Soldier | OS-1312 | companions | Soldier who escorted Potamiaena to execution and converted after she appeared to him; baptized and beheaded. | June 30 | Venerated individually as a martyr in his own right; absent from dataset. Existing 'Gerontius and Basilides' (OS-0918) is a distinct pair, not this person. | added OS-2792 |
| Amphibalus | OS-1408 | companions | The fleeing priest Alban sheltered and in whose place he was arrested | June 25 | Martyred afterward at Redbourn by tradition; venerated individually but absent from dataset | added OS-2790 |
| Gregory of Nazianzus the Elder | OS-1647 | family | Husband of Nonna; bishop of Nazianzus | Jan 1 | Venerated individually as a saint (commemorated Jan 1) but absent from the dataset. | added OS-2756 |
| Sabinian of Troyes | OS-1722 | companions | Convert brought to the faith by Patroclus | Jan 29 | 3rd-century martyr of Troyes, venerated individually; absent from dataset | added OS-2789 |
| Hieromartyr Euthymios Vlakhavas | OS-1727 | companions | Priest and leader of the 1808 Epirus/Thessaly revolt; contemporary whose suppression formed the backdrop to Demetrius's preaching and martyrdom | — | Individually venerated Hieromartyr, absent from dataset | deferred — no confirmed feast; formal glorification unclear (§9) |
| Venerable Fathers of the Kiev Near Caves | OS-1788 | companions | Kuksha and Pimen are buried among and commemorated with this synaxis | September 28 | Collective Synaxis of the Saints of the Near (Anthony) Caves, with its own distinct feast; absent from the dataset as a single row. | added OS-2797 (collective Synaxis row) |
| Saint Theosebios the God-bearer of Arsinoe | OS-1800 | family | brother of Arkadios | — | Venerated at Arsinoe in Cyprus; brother of Arkadios, absent from the dataset. | deferred — no clear individual feast |
| John Moschus | OS-1804 | companions | Compiler of The Spiritual Meadow, which preserves Christopher's account | Mar 11 | 6th–7th c. monk and writer, companion of St Sophronius of Jerusalem; venerated individually but absent from dataset | added OS-2761 |
| King Ethelbert of Kent | OS-1813 | family | Grandfather of Eanswythe; first Christian Anglo-Saxon king | Feb 25 | Venerated individually as a saint but absent from dataset | added OS-2763 |
| Venerable Basil, Founder of Batheos Ryako | OS-1818 | companions | First abbot and founder of the Deep Stream monastery where Luke later served as third abbot | Jul 1 | 10th-century Byzantine founder of the Batheos Ryako (Deep Stream) monastery near Triglia in Bithynia; venerated individually with own feast July 1; not in dataset (distinct from Basil the New OS-0880). | added OS-2783 |
| St. Palladius of Helenopolis | OS-1852 | companions | His disciple in youth and author of the Lausiac History, the principal source for his life. | Nov 28 | Bishop of Helenopolis, author of the Lausiac History; venerated individually but absent from dataset. Existing Palladius rows (OS-0556 Hermit of Antioch, OS-2260 of Thessalonica) are distinct persons. | deferred — venerated chiefly in non-Chalcedonian churches; out of scope (§1) |
| Saint Anthony, Bishop of Vologda | OS-1876 | companions | Bishop who blessed the founding of the Zaonikiev Monastery | October 26 | 16th-century bishop of Vologda; venerated individually but absent from the dataset (existing Russian Anthonys are abbots, not the Vologda bishop). | added OS-2795 |
| Venerable German of Solovki | OS-1910 | companions | Fellow founder of the Solovetsky Monastery who accompanied Sabbatius to the island | Jul 30; Aug 8 | Hermit co-founder venerated individually; not yet in dataset | added OS-2782 |
| Saint Basil of Batheos Ryakos | OS-1914 | companions | Founder and first igoumen of the Monastery of Christ the Savior; Ignatius's ascetic teacher | Jul 1 | Cappadocian father, founder of the Batheos Ryakos (Deep River) Monastery in Triglia of Bithynia; commemorated individually on July 1 but absent from the dataset. | added OS-2783 (same saint) |
| Palladius of Galatia | OS-2260 | companions | distinct earlier saint warned against confusion (not kin) | Jan 28 | 4th-century author of the Lausiac History; absent from dataset, venerated individually with own feast | deferred — same saint as OS-1852 (Lausiac History author); out of scope (§1) |
| Patriarch Judah | OS-2347 | family | Ancestor (son of Jacob); Hezron descends from Judah through Perez | Sunday of the Holy Forefathers | Old Testament forefather, son of the Patriarch Jacob; entered individually like other forefathers but absent from dataset | added OS-2764 |
| Righteous Perez (Pharez) | OS-2347 | family | Father of Hezron; son of Judah and Tamar | Sunday of the Holy Forefathers | Old Testament forefather in the line of David and Christ; absent from dataset | added OS-2765 |
| Martyrs Protus and Hyacinthus | OS-2408 | companions | Eugenia's two companions from Alexandria, baptized with her and martyred by beheading | Sep 11 | Roman martyrs venerated individually with their own feast (also commemorated with Eugenia on Dec 24); absent from dataset | added OS-2785 |
| Martyr Basilla of Rome | OS-2408 | companions | young Roman noblewoman converted by Eugenia, martyred for refusing a pagan marriage | Sep 11 | Roman virgin-martyr venerated individually; absent from dataset | added OS-2786 |
| Elder Zosima (Verkhovsky) | OS-2430 | companions | Fellow ascetic, disciple, and spiritual brother of Basilisk | Oct 24 / Jan 6 | Russian hesychast elder, shared the Siberian hermitage with Basilisk; glorified as a saint in 2004 with his own feast but not yet in the dataset. | added OS-2796 |
| Saint Eubiotus | OS-2433 | companions | Hermit on Prokonnesos who received and buried the exiled martyr | — | Venerated as a saint; not in dataset, no clear distinct feast found | deferred — no distinct feast found |
| Melania the Elder | OS-2438 | family | paternal grandmother of Melania the Younger | Jun 8 | Roman noblewoman venerated as a saint who supported monastic life in Egypt and Palestine; has her own distinct feast but is absent from the dataset. | added OS-2758 |
| Apostle Eubulus of the Seventy | OS-2451 | companions | Fellow Apostle of the Seventy, disciple of Paul; commemorated together with Nymphas | Feb 28 | Named in 2 Timothy 4:21; distinct from 4th-c. Martyr Eubulus of Caesarea (OS-0586) already in dataset | added OS-2784 |
| Euthymios Agritelis, Metropolitan of Zela | OS-2458 | companions | Hierarch of Asia Minor commemorated with Chrysostomos | Sunday before the Elevation of the Cross | Died 1921 after imprisonment and torture; one of the five hierarchs of Asia Minor | added OS-2778 |
| Gregorios, Metropolitan of Kydonia | OS-2458 | companions | Hierarch of Asia Minor commemorated with Chrysostomos | Sunday before the Elevation of the Cross | Martyred 1922; one of the five hierarchs of Asia Minor | added OS-2779 |
| Ambrosios, Metropolitan of Moschonisia | OS-2458 | companions | Hierarch of Asia Minor commemorated with Chrysostomos | Sunday before the Elevation of the Cross | Martyred 1922; one of the five hierarchs of Asia Minor | added OS-2780 |
| Prokopios, Metropolitan of Iconium | OS-2458 | companions | Hierarch of Asia Minor commemorated with Chrysostomos | Sunday before the Elevation of the Cross | One of the five hierarchs of Asia Minor | added OS-2781 |
| Eleuchadius of Ravenna | OS-2481 | companions | Predecessor as bishop of Ravenna in the traditional succession | Feb 14 | Third bishop of Ravenna; venerated individually as a saint but absent from the dataset. Has external Wikipedia link. | added OS-2787 |
| New Martyr Panagiotis of the Peloponnese | OS-2487 | companions | distinct namesake New Martyr (no documented relationship to host) | — | Suffered martyrdom in 1820; venerated individually with his own commemoration; absent from dataset. Included on host profile only to prevent confusion with Panagiotis of Caesarea. | deferred — no confirmed feast/glorification |
| Othmar | OS-2512 | companions | First abbot of the Abbey of Saint Gall (719), founded at the site of Gall's hermitage | Nov 16 | St Othmar of St Gall, 8th c. (c. 689-759); venerated individually with his own feast, absent from dataset | added OS-2762 |
| New Martyr Archpriest Milan Petkovic | OS-2649 | companions | Local New Martyr commemorated with Slobodan | — | Serbian archpriest New Martyr of the Drina valley region; commemorated together with Slobodan. Not in dataset. | deferred — local commemoration; no confirmed feast/glorification (§9) |
| New Martyr Archpriest Timotej Popovic | OS-2649 | companions | Local New Martyr commemorated with Slobodan | — | Serbian archpriest New Martyr commemorated together with Slobodan in his region. Not in dataset. | deferred — local commemoration; no confirmed feast/glorification (§9) |
| Saint Symeon Stylites the Younger | OS-2676 | family | Son of Martha; ascetic of the Wonderful Mountain near Antioch | May 24 | Individually venerated stylite saint, absent from dataset; kept external Wikipedia link on the family card. | added OS-1234 (was already in DB) |
| Saint Tetta | OS-2720 | companions | Abbess of Wimborne under whom Lioba was formed | — | Anglo-Saxon abbess of Wimborne, individually venerated; absent from dataset | added OS-2793 |
| Saint Thecla of Kitzingen | OS-2720 | companions | companion on the German mission | — | 8th-c. Anglo-Saxon nun, abbess of Kitzingen, individually venerated; absent from dataset | added OS-2794 |
| Phileas of Thmuis | OS-2731 | companions | Bishop of Thmuis, fellow-martyr beheaded together with Philoromus under Diocletian | — | 4th-century martyr venerated individually; absent from dataset. Not to be confused with Serapion of Thmuis (OS-0860), a distinct 4th-c. bishop. | added OS-2791 |
| Isaac of the Cells | OS-2734 | companions | Disciple of Cronius who succeeded him at Nitria in 395 | — | Egyptian Desert Father, 4th c.; venerated individually but absent from dataset | deferred — no distinct feast found |

## Collective-commemoration members (NOT separate rows)

Per §6/§7 (GROUP convention), members of an *undifferentiated collective
commemoration* stay on the host's single row — they render as unlinked figure
cards and are **not** added as their own `OS-####`. Recorded here only so we
don't mistake them for gaps. Promote one to the table above only if it turns out
to be venerated individually with its own feast.

| Member(s) | Host row | Commemoration |
|---|---|---|
| Celsus, Anthony the Presbyter, Anastasius, Marcionilla | OS-0413 | Martyrs Julian & Basilissa and companions (Jan 8) |
| Cyprian, Dionysius, Anectus, Paul, Crescens | OS-0804 | Martyr Quadratus and Companions at Corinth (Mar 10) |
| Lydia (wife), Macedonius & Theoprepius (sons), Amphilochius & Cronides (converts) | OS-0868 | Martyr Philetus the Senator and household (Mar 23) |

## Deferred (intentionally not added)

Entries reviewed and **deliberately left out of the dataset**, grouped by reason.
Revisit a row only if clergy/source review establishes a fixed feast, a formal
glorification, or in-scope (Chalcedonian) veneration — then promote it to the table
above and add the saint. (Same rows are marked `deferred` in the main table.)

**Out of scope — venerated chiefly in non-Chalcedonian churches (§1)**

| Deferred Saint | Referenced By | Note |
|---|---|---|
| Palladius of Helenopolis | OS-1852 | Author of the *Lausiac History*; Coptic/Syriac veneration. Same person as the row below. |
| Palladius of Galatia | OS-2260 | Same saint as Palladius of Helenopolis (one person, two profile refs). |

**No fixed individual feast (§10 minimum not met)**

| Deferred Saint | Referenced By | Note |
|---|---|---|
| Saint Naucratius | OS-0021 | Brother of Basil the Great; venerated but no clear individual feast day. |
| Saint Theosebios of Arsinoe | OS-1800 | Brother of Arkadios; no clear individual feast. |
| Isaac of the Cells | OS-2734 | Desert Father, disciple of Cronius; no distinct feast found. |
| Saint Eubiotus | OS-2433 | Hermit of Prokonnesos; no distinct feast found. |

**Canonization / feast unconfirmed (§9 caution)**

| Deferred Saint | Referenced By | Note |
|---|---|---|
| Hieromartyr Euthymios Vlakhavas | OS-1727 | 1808 revolt leader; no confirmed feast, formal glorification unclear. |
| New Martyr Panagiotis of the Peloponnese | OS-2487 | No confirmed feast/glorification. |
| New Martyr Archpriest Milan Petković | OS-2649 | Local Serbian commemoration; no confirmed feast/glorification. |
| New Martyr Archpriest Timotej Popović | OS-2649 | Local Serbian commemoration; no confirmed feast/glorification. |
