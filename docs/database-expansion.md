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
| Theodorite of Kola | Feodorit of Kola; Theodoret | Russia (Kola / North) | OS-0464 | 1 | Medium | Enlightener of the Lapps (Sami); part of the northern-missionary network (distinct from Tryphon of Pechenga). |
| Procopius of Ustyug | Prokopy of Ustyug | Russia (Veliky Ustyug) | OS-0465 | 1 | Medium | First Russian fool-for-Christ; a major figure likely to recur in the fools-for-Christ and northern-saints clusters. |
| Naucratius | Naucratios | Cappadocia / Pontus | OS-0420 | 1 | Medium | Brother of St. Basil the Great; member of the Cappadocian household network (Basil-the-Great family). |
| Declan of Ardmore | Déclán | Ireland | OS-0462 | 1 | Medium | Pre-Patrician Irish bishop-saint; likely to recur across the Irish/Celtic cluster. |
| Hilary of Arles | Hilarius of Arles | Gaul (Provence) | OS-0468 | 1 | Medium | Lérins monk; successor of Honoratus at Arles — recurs in the Lérins-school network. |
| Serf (Servanus) | Servanus; Sair | Scotland | OS-0454 | 1 | Medium | Teacher of St. Kentigern (Mungo); Scottish saint likely to recur in the Brittonic/Pictish cluster. |
| Asaph of Wales | Asa | Wales | OS-0454 | 1 | Medium | Disciple/successor of Kentigern at Llanelwy; Welsh saint. |
| Michael Bleive | Mihail Bleive | Estonia | OS-0456 | 1 | Medium | New Martyr of Estonia (glorified 2000); co-martyr of Hieromartyr Platon of Tallinn (OS-0456). |
| Nikolai Bezhanitsky | Nikolai Bezhanitski | Estonia | OS-0456 | 1 | Medium | New Martyr of Estonia; co-martyr of Platon of Tallinn (OS-0456). |
| Antony of Choziba | Anthony of Choziba | Palestine (Judean desert) | OS-0404 | 1 | Low | Disciple and biographer of St. George the Chozebite; Choziba-monastery lineage. |
| Caprasius of Lérins | Caprais | Gaul | OS-0468 | 1 | Low | Co-founder of Lérins Abbey with Honoratus. |
| Leontius of Fréjus | Leontius of Frejus | Gaul | OS-0468 | 1 | Low | Bishop of Fréjus, friend of Honoratus and John Cassian; Lérins circle. |
| Thenew | Theneva; Thaney; St. Enoch | Scotland | OS-0454 | 1 | Low | Mother of St. Kentigern; venerated at Glasgow (commemorated, so listed despite being kin). |
| Ismael of Wales | Ysfael | Wales | OS-0447 | 1 | Low | Welsh bishop-saint associated with St. Elian of Cornwall. |
| Mochaemhoc | Mochoemoc; Pulcherius | Ireland | OS-0462 | 1 | Low | Irish abbot-saint connected to St. Ita of Killeedy (her foster-son by tradition). |
| Eustochium | Julia Eustochium | Rome / Bethlehem | OS-0550 | 1 | Medium | Daughter of St. Paula; abbess at Bethlehem, recipient of Jerome's Epistle 108; part of the Jerome/Roman-ascetic circle (likely to recur). Feast Sep 28. |
| Marcella of Rome | — | Rome | OS-0550 | 1 | Medium | Foundress of the Roman ascetic women's circle around Jerome; feast Jan 31. (Distinct from Markella of Chios, OS-1568.) |
| Cybi of Holyhead | Cybi the Tanned | Wales (Anglesey) | OS-0578 | 1 | Medium | 6th-c. Celtic monastic founder; friend of St. Seiriol — likely to recur in the Welsh/Celtic cluster. |
| Meletios the Younger | Meletios of Myoupolis | Greece (Boeotia) | OS-0551 | 1 | Medium | 11th-c. monastic founder of Mt. Myoupolis; among the Saints of Boeotia. Feast Sep 1. |
| Felix of Nola | — | Italy (Campania) | OS-0522 | 1 | Low | Confessor of Nola; the saint to whom St. Paulinus of Nola was devoted. Feast Jan 14. |
| Nektarios of the Apsaras family | Nektarios of Meteora | Greece (Meteora) | OS-0584 | 1 | Low | Co-founder (with brother Theophanes) of Barlaam Monastery, Meteora; disciple of Savva of Ioannina. Feast May 17. |
| Theophanes of the Apsaras family | Theophanes of Meteora | Greece (Meteora) | OS-0584 | 1 | Low | Co-founder (with brother Nektarios) of Barlaam Monastery, Meteora. Feast May 17. |
| Martyr Isidore (with Jadorus) | — | Roman East (Egypt?) | OS-0595 | 1 | Low | Fellow Decian-persecution martyr named with St. Jadorus; NOT Isidore of Pelusium. Feast Feb 4. |
| George the Hungarian | — | Rus' / Hungarian | OS-0554 | 1 | Low | Brother of Sts. Ephraim of Novy Torg and Moses the Hungarian; slain with St. Boris (1015). Borderline — venerated chiefly within the Boris & Gleb narrative; review independence before adding. |
| Emperor Marcian | Marcian | Constantinople (Byzantine) | OS-0681 | 2 | Medium | Co-convener of Chalcedon (451) with Pulcheria; commemorated Feb 17. (refs OS-0681, OS-0684) |
| Mstislav-Theodore the Great | Mstislav I of Kiev | Rus' (Kiev) | OS-0636 | 1 | Medium | Right-believing Grand Prince of Kiev (d. 1132), father of St. Vsevolod-Gabriel of Pskov. |
| Abba Seridos of Gaza | Seridus | Palestine (Gaza) | OS-0604 | 1 | Low | Abbot of the Gaza monastery of Sts. Barsanuphius & John; anchor of the Gaza monastic cluster. |
| Austregisilus of Bourges | Outrille | Gaul (France) | OS-0610 | 1 | Low | Bishop of Bourges (d. 624); teacher of St. Amand of Maastricht. Feast May 20. |
| Abban of Ireland | Abán | Ireland | OS-0639 | 1 | Low | 6th-c. Irish abbot connected to St. Gobnait of Ballyvourney. Feast Oct 27. |
| Pope Leo II of Rome | Leo II | Rome / Sicily | OS-0700 | 1 | Low | Pope (d. 683) who confirmed the Sixth Ecumenical Council; Western pre-schism. |
| Pope Donus of Rome | Donus | Rome | OS-0700 | 1 | Low | 7th-c. Pope (predecessor of Pope Agathon); Western pre-schism. |
| Vassian Muromtsev | — | Pskov, Rus' | OS-0698 | 1 | Low | Martyred disciple of St. Cornelius of the Pskov Caves (16th c.). |
| Theodosius (Bobkov) | — | Russia (Butovo) | OS-0678 | 1 | Low | New Martyr; co-martyr of Hieromartyr Nicholas Kandaurov (Feb 17 / Butovo). |
| Nicholas Pospelov | — | Russia (Butovo) | OS-0678 | 1 | Low | New Martyr of Bylovo; co-martyr of Hieromartyr Nicholas Kandaurov (Feb 17 / Butovo). |
| Varus the notary | — | Asia Minor (Heraclea) | OS-0615 | 1 | Low | Servant who recorded St. Theodore Stratelates's martyrdom; independent veneration to verify (borderline). |
| Fursey | Fursa | Ireland / East Anglia | OS-0798 | 1 | Medium | Irish monk and visionary; mission to East Anglia; feast Jan 16. |
| Honorius of Canterbury | — | Canterbury (Kent) | OS-0798 | 1 | Medium | Archbishop of Canterbury (d. 653); sent St. Felix to East Anglia. |
| Non of Wales | Nonna | Wales | OS-0753 | 1 | Medium | Mother of St. David of Wales; feast ~Mar 3. Recurs in the Welsh cluster. |
| Teilo | — | Wales | OS-0753 | 1 | Medium | Welsh bishop-saint, companion of St. David; feast Feb 9. |
| Fulgentius of Astigi | Fulgentius of Écija | Spain (Visigothic) | OS-0734 | 1 | Low | Bishop of Astigi; brother of Sts. Leander, Isidore & Florentina. |
| Florentina of Cartagena | — | Spain (Visigothic) | OS-0734 | 1 | Low | Abbess; sister of Sts. Leander, Isidore & Fulgentius. |
| Padarn | Paternus | Wales | OS-0753 | 1 | Low | Welsh abbot-bishop; feast Apr 15. |
| Paulinus of Wales | Paulinus Aurelian | Wales / Brittany | OS-0753 | 1 | Low | Teacher of St. David; feast Nov 22. (Not Paulinus of Nola OS-0522 or of York OS-2774.) |
| Sigeberht of East Anglia | — | East Anglia | OS-0798 | 1 | Low | Martyr-king who invited Sts. Felix & Fursey; 7th c. |
| Julian the Physician of Cyprus | — | Cyprus | OS-0788 | 1 | Low | Disciple of St. Arcadius of Cyprus, martyred under Julian the Apostate; feast Mar 6. |
| Eubolos of Cyprus | — | Cyprus | OS-0788 | 1 | Low | Disciple of St. Arcadius of Cyprus, martyr; feast Mar 6. |
| Basil, Abbot of Mirozh | — | Pskov, Rus' | OS-0768 | 1 | Low | Pskov hieromartyr (1299); co-sufferer of St. Joasaph of Snetogorsk. (Distinct from Abramius of Mirozh OS-1899.) |
| Kodratos, Akakios & Stratonikos of Ptolemais | — | Ptolemais (Phoenicia) | OS-0771 | 1 | Low | Soldier co-martyrs converted at the martyrdom of Sts. Paul & Juliana. |
| Nestor of Isauria | — | Isauria | OS-0776 | 1 | Low | Father of St. Conon of Isauria; remembered as a martyr (identity uncertain — borderline). |
| Scholastica | — | Italy (Nursia/Monte Cassino) | OS-0822 | 1 | Medium | Sister of St. Benedict of Nursia; foundress of Benedictine nuns; feast Feb 10. |
| Macarius of Jerusalem | — | Jerusalem | OS-0843 | 1 | Medium | Bishop of Jerusalem (d. ~335); ordained St. Cyril of Jerusalem; associated with the finding of the Cross. Feast Aug 16. |
| Romanus of Subiaco | — | Italy | OS-0822 | 1 | Low | The monk who clothed St. Benedict and supplied him at the cave of Subiaco; feast May 22. |
| Maximus of Jerusalem | — | Jerusalem | OS-0843 | 1 | Low | Bishop of Jerusalem; predecessor of St. Cyril of Jerusalem; feast May 5. |
| Itta of Metz | Iduberga | Francia (Belgium) | OS-0841 | 1 | Low | Mother of St. Gertrude of Nivelles; foundress of Nivelles Abbey; feast May 8. |
| Begga of Andenne | — | Francia (Belgium) | OS-0841 | 1 | Low | Sister of St. Gertrude of Nivelles; foundress of Andenne; feast Dec 17. |
| Foillan of Fosses | Faolán | Ireland / Francia | OS-0841 | 1 | Low | Irish abbot-martyr (brother of St. Fursey); abbey of Fosses; feast Oct 31. |
| Luke of Demena | Luke of Armento | Italo-Greek (Lucania) | OS-0803 | 1 | Low | 10th-c. Italo-Greek monastic founder; companion of St. Vitalius of Castronovo; feast Oct 13. |
| Fanchea | Fainche of Rossory | Ireland | OS-0861 | 1 | Low | Abbess; sister of St. Enda of Aran; feast ~Jan 1. |
| Gury Shalochsky | — | Russian North (Novgorod) | OS-0852 | 1 | Low | Co-founder of the Sinozero (Blue Jay Lake) hermitage with St. Euphrosynus. |
| Barnabas of Gethsemane | Varnava of Gethsemane | Russia (Sergiev Posad) | OS-0859 | 1 | Low | Hieroschemamonk of the Gethsemane Skete (d. 1906); spiritual father of St. Seraphim of Vyritsa. |
| Pope Evaristus | — | Rome | OS-0832 | 1 | Low | Early bishop of Rome (2nd c.); predecessor of St. Alexander I; Western pre-schism (weak/obscure). |
| Pope Sixtus I | Xystus I | Rome | OS-0832 | 1 | Low | Early bishop of Rome (2nd c.); successor of St. Alexander I; Western pre-schism (weak/obscure). |
| Cyril of Scythopolis | — | Palestine (Judean desert) | OS-0905 | 1 | Medium | 6th-c. monk-hagiographer of the great Judean-desert fathers (Sabbas, Euthymius, John the Silent); a major source-figure. |
| Palladius of Ireland | Palladius the Deacon | Ireland / Rome | OS-0965 | 1 | Medium | First bishop sent to the Irish (by Pope Celestine, 431), before St. Patrick; feast Jul 7. (Distinct from Palladius of Antioch OS-0556 / Thessalonica OS-2260.) |
| Braulio of Saragossa | — | Spain (Visigothic) | OS-0937 | 1 | Medium | Bishop of Saragossa (d. 651); disciple and literary executor of St. Isidore of Seville. |
| Ascholius of Thessalonica | Acholius | Thessalonica (Greece) | OS-1000 | 1 | Medium | 4th-c. bishop who baptized Emperor Theodosius; correspondent of St. Basil. |
| Patriarch Elias of Jerusalem | Elias I | Jerusalem | OS-0905 | 1 | Low | 5th–6th-c. Patriarch of Jerusalem; associated with St. John the Silent. |
| James of Kastoria | Iakovos of Kastoria | Greece (Kastoria / Athos) | OS-0938 | 1 | Low | New Martyr (d. 1519); spiritual father of St. Theonas of Thessalonica. |
| Nicephorus (Kuchin) of Solovki | — | Russia (Solovki) | OS-0941 | 1 | Low | New Hieromartyr (glorified 2000); co-martyr of St. Benjamin (Kononov), same Apr 4 feast. |
| Eleni (Susanna) of Lesbos | — | Lesbos (Aegean Greece) | OS-0971 | 1 | Low | Cousin of St. Irene; commemorated with the New Martyrs Raphael, Nicholas & Irene of Lesbos. |
| Anthusa of Mantineon | — | Asia Minor (Mantineon) | OS-0986 | 1 | Low | Abbess-confessor tortured under Constantine V; foretold the birth of St. Anthusa of Constantinople; feast Jul 27. |
| Sansalas | — | Gothia / Wallachia | OS-1000 | 1 | Low | Priest arrested with St. Sabbas the Goth; 4th-c. Gothic martyr (feast ~Apr 12). |
| Shandulios | — | Persia (Sasanian) | OS-0953 | 1 | Low | Concealed the relics of the Persian martyrs under Shapur II (borderline — verify veneration). |
| Epiphanius the Wise | — | Russia (Moscow) | OS-1065 | 1 | Medium | Hagiographer of Sts. Stephen of Perm and Sergius of Radonezh; major 14th–15th-c. writer. |
| Patriarch Paisius of Peć | Pajsije | Serbia | OS-1077 | 1 | Low | Patriarch of Serbia who consecrated St. Basil of Ostrog; feast Nov 3. |
| Anthony & Felix of Karelia | — | Russia (Karelia) | OS-1015 | 1 | Low | Righteous sons of Marfa Boretskaya; among the Synaxis of Karelian Saints (local veneration — verify). |
| Paisius Yaroslavov | — | Russia (Kirillo-Belozersk) | OS-1127 | 1 | Medium | Elder of St. Nilus of Sora; Trinity-Sergius hegumen; Non-Possessor circle (locally venerated). |
| Paul, Bishop of Corinth | — | Greece (Peloponnese) | OS-1104 | 1 | Low | Brother of St. Peter the Wonderworker of Argos; 10th c. |
| Macarius of Leteti | — | Georgia | OS-1106 | 1 | Low | 9th-c. Georgian monk who laboured with Ss. Michael & Arsenius of Ulompo in Palestine. |
| Erc of Slane | — | Ireland | OS-1191 | 1 | Low | Early Irish bishop; baptizer of St. Brendan the Navigator; feast Nov 2. |
| Jarlath of Tuam | — | Ireland | OS-1191 | 1 | Low | Irish saint, founder of Tuam; tradition links St. Brendan's schooling to him; feast Jun 6. |
| Chariton of Kudinsk | — | Russia (Pskov) | OS-1178 | 1 | Low | Disciple of St. Euphrosynus of Pskov. |
| Laurence of Canterbury | — | England (Kent) | OS-1243 | 1 | Medium | Companion and successor of St. Augustine of Canterbury; 2nd Archbishop. |
| Mellitus of Canterbury | Mellitus of London | England | OS-1243 | 1 | Low | Member of the Gregorian mission; first Bishop of London, later Archbishop of Canterbury. |
| Justus of Rochester | — | England | OS-1243 | 1 | Low | Member of the Gregorian mission; first Bishop of Rochester, later Archbishop of Canterbury. |
| Procopius of Ustiug | Prokopy of Veliky Ustyug | Russia (Ustyug) | OS-1260 | 1 | Medium | Lübeck-born first fool-for-Christ of Russia (d. 1303). NOTE: distinct from Procopius of Ustya/Vologda OS-1495 — earlier flagged for DB-expansion; confirm which (if either) is truly absent. |
| Abraham of Paleostrov | Abramius of Paleostrov | Russia (Olonets) | OS-1206 | 1 | Low | Co-founder with St. Cornelius of Paleostrov; feast Aug 21. |
| Pope Damasus I | — | Rome | OS-1362 | 1 | Medium | Pope who commissioned Jerome's Vulgate; correspondent of the Latin Fathers. |
| Cainnech of Aghaboe | Kenneth | Ireland | OS-1320 | 1 | Medium | Major Irish abbot; companion of Columba of Iona; feast Oct 11. |
| Finnian of Clonard | — | Ireland | OS-1320 | 1 | Medium | "Teacher of the saints of Ireland"; mentor of the Twelve Apostles of Ireland; feast Dec 12. |
| Adomnan of Iona | Adamnan | Iona / Ireland | OS-1320 | 1 | Medium | 9th abbot of Iona; biographer of St. Columba; feast Sep 23. |
| Brychan of Brycheiniog | — | Wales | OS-1080 | 2 | Medium | Welsh chieftain-saint, progenitor of many Cornish/Devon/Welsh saints (Nectan, Endellion); feast Apr 6. (refs OS-1080, OS-1376) |
| Possidius of Calama | — | North Africa | OS-1365 | 1 | Low | Disciple and biographer of St. Augustine of Hippo. |
| Alypius of Thagaste | — | North Africa | OS-1365 | 1 | Low | Friend of St. Augustine; bishop of Thagaste. |
| Ceolfrith of Wearmouth | — | England (Northumbria) | OS-1378 | 1 | Low | Abbot of Wearmouth-Jarrow; teacher of St. Bede; commissioned the Codex Amiatinus. |
| Ursus of Ravenna | — | Italy (Ravenna) | OS-1328 | 1 | Low | 4th–5th-c. Bishop of Ravenna; co-consecrator of St. Bassianus of Lodi. |
| Felix of Como | — | Italy (Como) | OS-1328 | 1 | Low | First Bishop of Como (4th c.). |
| King Anna of East Anglia | — | England (East Anglia) | OS-1416 | 1 | Low | Holy king; father of St. Etheldreda of Ely and a line of saintly daughters. |
| Seaxburh of Ely | Sexburga | England | OS-1416 | 1 | Low | Sister of St. Etheldreda; queen-abbess of Ely. |
| Daniel the Black (Chorny) | — | Russia (Moscow) | OS-1469 | 1 | Medium | Iconographer; co-worker of St. Andrei Rublev at the Andronikov & Trinity monasteries. |
| Theophanes the Greek | — | Byzantium / Russia | OS-1469 | 1 | Medium | Master iconographer; teacher/collaborator of St. Andrei Rublev (Novgorod, Moscow). |
| Theodosia, mother of Procopius | — | Palestine (Caesarea) | OS-1494 | 1 | Low | Martyred with her son, Great Martyr Procopius of Caesarea; feast Jul 8. |
| Gregory the Faster of the Far Caves | — | Russia (Kiev) | OS-1483 | 1 | Low | Kiev Far-Caves ascetic; co-commemorated with Sisoes the Schemamonk. |
| Abba Or (Hor) | — | Egypt (Scetis/Thebaid) | OS-1482 | 1 | Low | Egyptian Desert Father of the Apophthegmata. |
| Bryaena of Nisibis | — | Mesopotamia (Nisibis) | OS-1421 | 1 | Low | Abbess; aunt of St. Febronia of Nisibis; feast Jun 25. |
| Niphon of Kozhe Lake | — | Russia (North) | OS-1436 | 1 | Low | Co-founder of the Kozheozersky monastery with St. Serapion. |
| Amma Theodora | Theodora of the Apophthegmata | Egypt (Sketis) | OS-1526 | 1 | Medium | Desert Mother of the Alphabetical *Sayings*; distinct from the penitent Theodora OS-1820. |
| Yuri Skobtsov | George Skobtsov | France (Paris) | OS-1559 | 1 | Low | Son of St. Maria Skobtsova; glorified 2004 among the Paris/Western-European martyrs. |
| Ilya Fondaminsky | Elijah Fondaminsky | France (Paris) | OS-1559 | 1 | Low | Of the Rue de Lourmel circle; glorified 2004 with Sts. Maria Skobtsova & Demetrius Klepinin. |
| Cyriacus the Executioner | Kyriakos | Sebaste | OS-1537 | 1 | Low | Executioner converted at the martyrdom of St. Antiochus the Physician; venerated with him (Jul 16). |
| Sabina of Rome | — | Rome | OS-1601 | 1 | Low | Roman matron-martyr; convert/burier connected to St. Seraphima of Antioch. |
| Theoteknus of Caesarea | Theotecnus | Palestine (Caesarea) | OS-1657 | 1 | Low | 3rd-c. bishop; buried St. Marinus the Soldier (distinct from Theotecnus of Antioch OS-1993). |
| Theophilus of Caesarea | — | Palestine (Caesarea) | OS-1667 | 1 | Low | 2nd-c. bishop; co-president of the Palestinian Pascha council with St. Narcissus of Jerusalem. |
| Eleutherios the Hesychast | — | Romania (Sihla) | OS-1663 | 1 | Low | Husband/co-ascetic of St. Theodora of Sihla. |
| Barsanuphius of Sihastria | — | Romania | OS-1663 | 1 | Low | Spiritual guide of St. Theodora of Sihla. |
| Arsenios of Crete | — | Crete / Athos | OS-1671 | 1 | Low | Cretan teacher of St. Gregory of Sinai. |
| Mother Alexandra of Diveyevo | Agafia Melgunova | Russia (Diveyevo) | OS-1757 | 1 | Medium | Foundress/first superior of the Diveyevo convent; recurs across the Diveyevo saints. |
| Caesaria the Elder | — | Gaul (Arles) | OS-1794 | 1 | Low | Sister of St. Caesarius of Arles; first abbess of his convent; feast Jan 12. |
| Caesaria the Younger | — | Gaul (Arles) | OS-1794 | 1 | Low | Niece/successor of St. Caesarius of Arles as abbess. |
| Theosebios of Arsinoe | Theosebius the God-bearer | Cyprus (Arsinoe) | OS-1800 | 1 | Low | Cypriot ascetic; brother of St. Arkadios the Wonderworker of Arsinoe. |
| Paul of Atroa | Paul the Younger of Atroa | Bithynia (Atroa) | OS-1835 | 1 | Medium | Founder of the Atroa monastic circle; teacher of St. Peter of Atroa; iconodule. |
| Sabbas of Atroa | Sabas | Bithynia (Atroa) | OS-1835 | 1 | Low | Disciple and biographer of St. Peter of Atroa. |
| Theophilus of Gothia | Theophilus the Gothic Bishop | Gothia (Crimea/Danube) | OS-1839 | 1 | Medium | Gothic bishop, signatory of Nicaea (325); recurs with the Gothic martyrs (Niketas, Sabbas). |
| Elias Speleotes | Elias the Cave-Dweller of Calabria | Calabria (Italo-Greek) | OS-1805 | 1 | Low | Italo-Greek hermit; spiritual associate of St. Fantinus of Calabria. |
| Pope Cornelius of Rome | Cornelius, Bishop of Rome | Rome | OS-1810 | 1 | Medium | Mid-3rd-c. pope, correspondent of St. Cyprian of Carthage; recurs with Cyprian. |
| Nonnus of Heliopolis | Nonnus, Bishop of Edessa/Heliopolis | Syria (Heliopolis/Edessa) | OS-1977 | 1 | Medium | Bishop who converted and baptized St. Pelagia the Penitent; venerated (Nov 10). |
| Yaroslav the Wise | Yaroslav I, Grand Prince of Kiev | Kievan Rus' | OS-1949 | 1 | Low | Grand Prince, father of St. Vladimir Yaroslavich; locally venerated (UOC, 2008). |
| Epiphanius, disciple of Andrew the Fool | Epiphanius of Constantinople | Constantinople | OS-1938 | 1 | Low | Disciple who shared St. Andrew's vision of the Theotokos (Protection/Pokrov); identity sometimes linked to a later patriarch. |
| Papias of Hierapolis | Papias, Bishop of Hierapolis | Phrygia (Hierapolis) | OS-2061 | 1 | Medium | Apostolic Father, hearer of the Apostle John; predecessor of St. Averkios; venerated. |
| Peter the Pionite | Peter Pionites | Egypt (Scetis) | OS-2064 | 1 | Low | Desert Father, disciple of Abba Lot of Egypt; appears in the Apophthegmata. |
| Valerius of Saragossa | Valerius of Zaragoza | Spain (Saragossa) | OS-2178 | 1 | Medium | Bishop of Saragossa under whom St. Vincent served as deacon; arrested/tried with him; venerated (Jan 28). |
| Pope Julius I of Rome | Julius I, Bishop of Rome | Rome | OS-2153 | 1 | Medium | 4th-c. pope who defended St. Athanasius and St. Paul the Confessor against the Arians; venerated (Apr 12). Distinct from Julius of Aegina (OS-0573) and Julius of Novara (OS-1402). |
| Athenodorus of Pontus | Athenodorus, Bishop of Pontus | Pontus (Neocaesarea) | OS-2204 | 1 | Low | Brother of St. Gregory the Wonderworker; bishop in Pontus; venerated. Distinct from Athenodorus Martyr of Mesopotamia (OS-2316). |
| Aedesius of Ethiopia | Aedesius (Edesius) | Ethiopia (Axum) | OS-2278 | 1 | Low | Brother of St. Frumentius and co-evangelizer of Ethiopia; venerated. Distinct from Aedesius of Lycia (OS-2457). |
| Maria of Amnia | Empress Maria | Byzantium (Amnia) | OS-2283 | 1 | Low | Granddaughter of St. Philaret the Merciful; first wife of Emperor Constantine VI; locally venerated. |
| Marcellina of Rome | Marcellina, sister of St. Ambrose | Rome / Milan | OS-2312 | 1 | Low | Consecrated-virgin elder sister of St. Ambrose of Milan; venerated (Jul 17). |
| Satyrus of Milan | Uranius Satyrus | Milan | OS-2312 | 1 | Low | Brother of St. Ambrose, who preached his funeral oration; venerated (Sep 17). |
| John the Acoemete | John the Sleepless | Constantinople (Acoemetae) | OS-2426 | 1 | Medium | Founder-abbot of the Acoemetae ("Unsleeping Ones"); predecessor of St. Marcellus; venerated. |
| Naucratius of Cappadocia | Naucratius, brother of St. Basil | Cappadocia (Pontus) | OS-2474 | 1 | Medium | Brother of Sts. Basil the Great, Gregory of Nyssa, Macrina the Younger & Peter of Sebaste; hermit on the Iris; venerated (Jun 8). |
| Bathild of Chelles | Balthild, Queen of the Franks | Francia (Chelles) | OS-2694 | 1 | Medium | Anglo-Saxon slave who became Merovingian queen-regent and nun; contemporary of St. Eligius; venerated (Jan 30). |
| Sinell of Cleenish | Sinell of Cluaninis | Ireland (Lough Erne) | OS-2693 | 1 | Low | Abbot of Cleenish, teacher of St. Columbanus before his continental mission; venerated (Nov 12). |
| Egwin of Worcester | Ecgwine, Bishop of Worcester | England (Worcester) | OS-2707 | 1 | Medium | Third Bishop of Worcester, founder of Evesham Abbey; friend of St. Aldhelm; venerated (Dec 30). |

---

## Considered and excluded (this round)

Kept for transparency so the same figures aren't re-evaluated each pass:
- **Gennadius (George) Scholarius** (ref. OS-0486) — veneration/canonization not clearly established; excluded under the canonization-caution guardrail.
- **Theodoret of Cyrus** (ref. OS-0520/0535/0561/0564/0575/0626/0659/0660) — the 5th-c. bishop-historian who chronicled the Syrian solitaries; his Christology was condemned (Three Chapters / Constantinople II) and his veneration is disputed — excluded. (He appears only as a *chronicler*, never as a relationship card; note OS-0797 "Theodoritus the Presbyter" is a different person. A stray Theodoret companion card on OS-0660 was removed during the OS-0601–0700 consolidation.)
- **Pachomios of Chios** (ref. OS-0666) — Pachomios the New (1840–1905); locally venerated but pan-Orthodox glorification not confirmed; excluded under the canonization-caution guardrail (§9) pending verification.
- **Theodotus of Heliopolis** (ref. OS-0746) — bishop who baptized St. Eudokia; veneration/feast unconfirmed; excluded as uncertain pending source review.

> **False-negative note (verify before logging):** several "absent" flags from subagents turned out to be already in the database under a different spelling/epithet — **Dionysius the Great of Alexandria = OS-1964**, **Jerome of Stridon = OS-1362**, **Modestus of Jerusalem = OS-0066**, **Arsen of Ninotsminda = OS-1618**. Always `grep data/saints.csv` to confirm true absence before adding a row here. (The erroneous Dionysius row was removed; OS-0625/OS-0706/OS-0807 were wired to the existing OS-1964 / OS-0066 / OS-1618.)

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
