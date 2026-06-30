# OrthodoxSaintFinder Relationship Templates

**Version 1.3** — reorganized by subject matter at the OS-0300 health review (was version-ordered).

When expanding a saint profile, first determine which templates apply, apply the standard
relationships they imply, then add the saint's unique historical relationships. Templates give
the *default* relationships shared by groups of saints — but always under the **historical
accuracy over symmetry** principle (`relationship-standards.md`): apply only where defensible.

- Each template is a **`related`/`companions` cross-link cluster**, NOT all-to-all. The relevant
  title is usually also a controlled-vocab facet, so links need only be internally consistent.
- Relationships that are **official liturgical commemorations** are wired through the group
  taxonomy (`data/groups.csv` + `data/saint_groups.csv`), not profile YAML. Group slugs are noted
  inline.
- **Promotion ladder:** Candidate → Recommended → Official. Only **Official** templates live in
  this file; Candidate/Recommended ones live in `relationship-backlog.md`. **Core** = the
  foundational templates (marked below); change only on explicit review.

---

## I. Scriptural & Apostolic

### Holy Family  · **Core**
Members: Jesus Christ, Most Holy Theotokos, Joseph the Betrothed, Righteous Joachim, Righteous
Anna, Righteous Elizabeth, Righteous Zechariah, John the Forerunner, James the Brother of the
Lord, Jude the Brother of the Lord, Simon/Joses (brethren). Cross-link via Family / Relative /
Cousin / Foster Parent. **See the Conflation Guard** (Standards) for Simon vs Simeon son of
Cleopas. Related groups: `joachim-and-anna`, `family-of-the-forerunner`.

### The Twelve Apostles  · **Core**
Peter OS-0004, Andrew OS-0003, James/Zebedee OS-1081, John OS-0005, Philip OS-2578, Bartholomew
OS-1330, Thomas OS-1969, Matthew OS-2201, James/Alphaeus OS-1982, Jude (Thaddaeus) OS-1384,
Simon the Zealot OS-1137, Matthias OS-1676.
- Each Apostle lists the **other eleven** as **Fellow Apostle** under `companions` (brothers —
  Peter↔Andrew, John↔James — stay in `family`, not double-listed).
- Also connect to Jesus, Theotokos, John the Baptist, Mary Magdalene, the Myrrh-bearers, the
  Seventy (where historically appropriate).
- **Commemorated With:** group `twelve-apostles` (Synaxis of the Twelve, Jun 30).

### The Seventy Apostles
Connect to Jesus, the Twelve, fellow missionaries/church-founders; relate to missionary and
Equal-to-the-Apostles saints. **Commemorated With:** group `seventy-apostles` (Jan 4).

### The Myrrh-bearers  · **Core**
Mary Magdalene, Mary of Bethany & Martha, Joanna, Salome, Mary wife of Clopas, Susanna, and
**Joseph of Arimathea & Nicodemus** (both commemorated on the Sunday of the Myrrh-bearers).
Theotokos numbered first. Cross-link to Jesus, Theotokos, the Twelve. Group: `myrrh-bearers`.

### The Seven Deacons
Acts 6 — Stephen, Philip, Prochorus, Nicanor, Timon, Parmenas. **Guardrail:** Nicolaus of
Antioch is excluded unless a commemorated saint record exists (tradition disputes his sanctity).
**Commemorated With:** group `seven-deacons` (Stephen OS-0009, Philip OS-1998, Prochorus/Nicanor/
Timon/Parmenas OS-1589).

### Holy Archdeacons / Deacon-Martyrs
The diaconal office joined to martyrdom (`related`): Stephen the Protomartyr OS-0009, Laurence of
Rome OS-1683, Philip the Deacon OS-1998, Prochorus/Nicanor/Timon/Parmenas OS-1589.

---

## II. Patristic & Theological

### The Three Hierarchs  · **Core**
Basil the Great OS-0021, Gregory the Theologian OS-0022, John Chrysostom OS-0023 — Church Father /
Three Hierarchs. **Commemorated With:** group `three-hierarchs` (Jan 30).

### Cappadocian Fathers  · **Core**
Basil OS-0021, Gregory the Theologian OS-0022, Gregory of Nyssa OS-0422 — Church Father /
Cappadocian Father / Nicene Theology. Family group: `holy-family-of-cappadocia`.

### Church Fathers, Ecumenical Councils & Defenders of Orthodoxy
Connect by **Council Participant / Defender of Orthodoxy / Theological heir / Opponent** (where
documented). Covers the patristic-theological web beyond the named trios above. Related group:
`patriarchs-of-alexandria` (Athanasius & Cyril). (The *Fathers of Nicaea* and *Three Theologians*
clusters are Candidates — see the backlog.)

---

## III. Martyric

### Great Martyrs  · (Core sub-clusters)
Cross-link in coherent **sub-clusters** under `related`, keeping each cluster's member set
*identical across all its member profiles* (consistency > maximizing). The broad "Great Martyr"
category is also a Rank facet, so the clusters need not be exhaustive — only internally consistent.
- **Soldier-martyrs:** George OS-0012, Demetrius OS-0013, Theodore the Recruit OS-0018, Theodore
  Stratelates OS-0615, Mercurius OS-2247, Menas OS-0059, Procopius OS-1494, Sebastian OS-2381,
  Eustathius OS-0064 (note: "Fellow soldier-martyr").
- **Virgin-martyrs:** Catherine OS-0015, Barbara OS-0016, Marina OS-0017, Irene OS-0072,
  Paraskevi OS-0060, Anastasia OS-0071, Lucy OS-2342 (note: "Fellow great virgin-martyr").
- Group `two-theodores` pairs the two Theodores.

### Holy Unmercenaries
The unmercenary physician-saints, cross-linked under `related`: Panteleimon OS-0014, Cosmas &
Damian (three pairs) OS-0036/OS-1474/OS-1475, Cyrus & John OS-0568, Hermolaus OS-1580, Sampson
the Hospitable OS-1434, Diomedes OS-1704, Tryphon OS-0061. **Decision:** there is no single
liturgical synaxis of all unmercenaries, so this stays a `related` cluster, **not** a
Commemorated-With group. (Family pairs like Cosmas & Damian with Theodota keep their own
household group, `family-of-cosmas-and-damian`.) The healer-martyr Panteleimon sits here, not in
the soldier/virgin Great-Martyr sub-clusters.

---

## IV. Monastic & Ascetic

### Desert Fathers  · **Core**
The monks of the Egyptian/Palestinian desert (3rd–5th c.): Anthony the Great OS-0026, Pachomius
OS-0028, Macarius the Great OS-0029, Moses the Black OS-0030, and the wider Scetis/Nitria/Thebaid
circle. Cross-link via **Teacher / Disciple / Fellow Desert Father / Same monastery / Same
monastic tradition**. Heir→founder links are one-directional (later figures cite Anthony; his
list stays curated). Geographic/federation sub-clusters (Pachomian Koinonia, Judean Desert
Fathers, David-Gareji) are **applications of this template** via "Same monastery" — see the
backlog for those candidate sub-clusters.

### Mount Athos
Saints who lived/founded/led on the Holy Mountain — Athanasius the Athonite, Peter the Athonite,
Gregory Palamas, and the modern Athonite elders. Cross-link via Same monastery / Same mountain /
Teacher-disciple. (Overlaps the **Wonderworkers** and Candidate **Hesychast** clusters.)

### Sinai
Saints of St Catherine's Monastery and the Sinai desert — John Climacus OS-0033, Anastasius of
Sinai OS-1029; Catherine of Alexandria OS-0015 by monastery association.

### Optina Elders
The Optina startsy. **Commemorated With:** group `optina-elders` (13 elders, Oct 11). Cross-link
elders by Teacher / Disciple / Successor within the eldership.

> Monastic communities generally link via the **"Same monastery: <name>"** relationship type;
> create a Commemorated-With group only where there is an actual liturgical synaxis.

---

## V. Mission & Enlighteners

### Equal-to-the-Apostles
Bearers of the title Isapostolos, cross-linked under `related`. Two sub-clusters:
- **Apostolic evangelists / women:** Mary Magdalene OS-0007, Photini OS-0008, Thekla OS-0010.
- **Enlightener-rulers / missionaries:** Constantine OS-0037 & Helen OS-2751, Cyril & Methodius
  OS-0038, Nina OS-0039, Vladimir OS-0040, Olga OS-0041, Photius the Great OS-0603, Innocent of
  Alaska OS-0054, Nicholas of Japan OS-0590, Patrick OS-0079, Gregory of Armenia OS-0089.
Group `constantine-and-helen` covers the two emperors.

### Mission to America / Alaska
The North American Orthodox mission (`related`): Herman OS-0044, Innocent OS-0054, Tikhon OS-0053,
Raphael of Brooklyn OS-0055, John of Shanghai & San Francisco OS-0050, Jacob Netsvetov OS-1579,
Peter the Aleut OS-1894, Alexis Toth OS-1125, Juvenaly, with Nicholas of Japan OS-0590 as the
parallel Far-East missionary.

### Missionaries (by region) & National New-Martyr Synaxes
Group regional missionaries (Rus', Georgia, Ireland/Britain, Japan, Alaska, …) and the national
new-martyr cohorts. **Commemorated With** groups: `new-martyrs-confessors-russia` (Soviet-era
synaxis); national synaxes for Greece/Serbia/Bohemia/etc. are Candidate groups in the backlog.

---

## VI. Wonderworkers

### Wonderworkers
The **modern** wonderworking elders/saints (≈18th–20th c.) as a recognizable devotional cluster
(`related`): Nektarios OS-0046, Paisios OS-0051, Porphyrios OS-0052, Iakovos OS-2585, Amphilochios
OS-2586, Sophrony OS-2587, Arsenios the Cappadocian OS-0070, Nicholas Planas OS-2600; with the
Russian wonderworkers John of Kronstadt OS-0045, Matrona OS-0048, Luke of Crimea OS-0049, John of
Shanghai OS-0050, and forerunner Seraphim of Sarov OS-0043.
- **Scope guard:** "Wonderworker" is a very broad Rank — do NOT all-to-all link every saint so
  titled. Keep this the modern elder devotional cluster. (The Candidate **Russian Eldership
  Revival** and **Hesychast Tradition** clusters overlap this — boundary to be defined on review.)

---

## VII. Cross-cutting reference families (v1.0)
For saints who don't fit a named cluster above, connect by the general v1.0 relationship types —
**Same Region / Same Era / Same Monastery / Same Mission / Same Council / Same Persecution** —
placing them under `related` unless they personally interacted. Standing household/pair groups:
`moses-aaron-miriam`, `mary-of-egypt-and-zosimas`, `family-of-cosmas-and-damian`,
`sunday-after-nativity`, `martyrs-of-nicomedia`.

---

## Candidates & revisits
Candidate (and Recommended) templates, Candidate Commemorated-With groups, future **Patronage
Collections**, and the **Retroactive Review** all live in **`docs/relationship-backlog.md`**.
Guardrails and the historical-accuracy principle live in **`docs/relationship-standards.md`**.

## Version history
- **v1.0** — owner's original templates.
- **v1.1** — Holy Archdeacons / Deacon-Martyrs, Seven Deacons; Holy Unmercenaries scope resolved.
- **v1.2** — promoted Equal-to-the-Apostles, Mission to America/Alaska, Wonderworkers (through OS-0059).
- **v1.3** — reorganized by subject matter; removed the duplicate Holy Unmercenaries entry; gave
  Desert Fathers / Mount Athos / Sinai / Optina proper headings (OS-0300 health review).
