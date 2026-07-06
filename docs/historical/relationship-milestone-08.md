# Relationship Network — Milestone 8 (OS-0701 – OS-0800)

*Eighth phase of the OrthodoxSaintFinder relationship project. Generated at the completion of
OS-0800. Covers the eighth hundred (OS-0701–OS-0800); cumulative totals span OS-0000–OS-0800.*

---

## 1. Phase-8 statistics (OS-0701–OS-0800)

| Metric | Value |
|---|---|
| Profiles in range (OS-0701–0800, no gaps) | **100** |
| Profiles with relationship data after this phase | 67 |
| Profiles intentionally left sparse/blank | 33 |
| New group taxonomies created | 0 (candidates routed to backlog) |
| Within-range reciprocity closed | Thalassius/Limnaeus ↔ Baradates (0709↔0710); Marina/Kyra ↔ Domnina (0739↔0740); Cassian ↔ Germanus (0741↔0745); Titus ↔ Anastasius (0728↔0514); Arsenius ↔ Sabbatius of Tver (0755↔0760); Paul of Plousias ↔ Theophylact (0791↔0793); Lazarus ↔ Athanasius of Murom (0794↔0795) |
| Central fixes | removed stray Theodoret cards (OS-0660 prior, OS-0739); resolved Modestus→OS-0066 (OS-0706); wired Apollonia OS-0625→OS-1964 |
| Bad hrefs / duplicate cards / self-refs | 0 / 0 / 0 (all sweeps clean) |
| Database-Expansion candidates logged | 14 (register → 50) |
| Data issues discovered & logged | 2 (DI-018, DI-019) |
| Validation status | **CLEAN — 2782 saints, 0 errors** (every batch) |

## 2. Cumulative state at OS-0800

| Metric | Value |
|---|---|
| Saint profiles completed (OS-0000–OS-0800) | **~797** (OS-0120, OS-0164, OS-0189 retired/absent) |
| Relationship templates — Official | the standing set in `relationship-templates.md` (incl. 6 Core) |
| Relationship templates — Recommended | 0 |
| Relationship templates — Candidate | ~57 (5 new clusters this phase) |
| Group taxonomies total | 19 |
| Database-Expansion register | 50 entries |
| Data-issues register | 19 entries (1 Resolved, 18 Open) |

## 3. What was built this phase

OS-0701–0800 is dense with the Syrian and Egyptian ascetic worlds, the Christological-council
hierarchy, the Slavic princes, and the Celtic/Anglo-Saxon West:

- **Syria & Egypt** — the large Theodoret *Historia Religiosa* solitary network (Maron as common
  father); the Desert Fathers of the *Apophthegmata* (Agathon of Egypt, Paul the Simple); the
  Acoemetae order (Alexander the Sleepless).
- **Councils & hierarchy** — Tarasius (7th Council), the Chalcedon defenders (Proterius, Leo,
  Anatolius), the iconoclasm confessors (Theophylact, Paul of Plousias, Athanasius the Confessor),
  Eustathius of Antioch (Nicaea).
- **Apostolic & early** — the Smyrna succession (Polycarp, Irenaeus), John Cassian & Germanus,
  Hermes of the Seventy, the Martyrs-under-Julian (Theodoritus).
- **Family hubs** — the **Nazianzus family** (Gorgonia, Gregory the Theologian, Nonna, Caesarius,
  Gregory the Elder) and **Leander of Seville**'s Hispano-Roman siblings.
- **Slavic princes** — Daniel of Moscow (Nevsky line), Vasilko of Rostov ↔ Roman of Uglich,
  Wenceslas ↔ Ludmila.
- **The West** — David of Wales and the Welsh circle; Felix of Burgundy and the East-Anglian mission.
- **Collective commemorations** — the 40 Martyrs of Sebaste, the 42 of Ammoria, the Hieromartyrs of
  Cherson, the Valaam martyrs.

## 4. Database Expansion stream

**14 candidates** logged (register → **50**). The phase also produced the stream's first systematic
**false-negative correction**: subagents had flagged Dionysius the Great, Jerome, and Modestus of
Jerusalem as "absent," but all three already exist (OS-1964, OS-1362, OS-0066). The erroneous
Dionysius row was removed, the two affected profiles re-wired to the existing rows, and the updating
protocol now requires a `grep` absence-check before logging. A note to that effect was added to
`database-expansion.md`.

## 5. Methodology & quality

Unchanged v1.3 pipeline. Adversarial judgment again corrected multiple cluster hints (Nine Children
of Kola = Georgian; John IV = Georgian Catholicos; Paul of Plousias ≠ the Patriarch; Christodoulos
the martyr ≠ of Patmos). The conflation guard held across an unusually dense same-name field (two
Gerasimi, two Pauls, three Conons, two Domninas, two Damians, two Tituses, two Sabbatii, the two
Poshekhonye founders). Two stray Theodoret-of-Cyrus chronicler cards were removed (OS-0660 last
phase, OS-0739 this phase).

## 6. Data Corrections stream

Two new flags: **DI-018** (Domnina/Domnica of Syria OS-0740/OS-0751) and **DI-019** (Cosmas of
Zographou OS-1883/OS-1891 — duplicate or era-data error). Register at OS-0800: **19 entries — 1
Resolved, 18 Open.** The open-duplicate backlog (18) now strongly warrants a dedicated
duplicate-audit/cleanup pass — it can be run as its own stream whenever the owner wishes to pause
relationship authoring.

## 7. Open items carried forward

- **Data issues:** DI-002 … DI-019 (18 open) — a future dedicated cleanup pass (increasingly due).
- **Database Expansion:** 50 candidates — the roadmap for future new-saint additions (Welsh and
  Anglo-Saxon clusters now well represented).
- **Retroactive Review (OS-0701–0800 cross-range halves):** the Theodoret solitary reciprocity, the
  Nazianzus family reverse cards, the iconoclasm cohort, the Slavic-prince kin webs, the Julian
  martyrs, and the Welsh circle — all logged in `docs/relationship-backlog.md`.
- **Ready-to-create groups:** the 40 Martyrs of Sebaste, 42 of Ammoria, and Hieromartyrs of Cherson
  (each a single collective row) join the Novgorod Hierarchs, Sinai/Raithu, and Basil-the-Great
  household as cleanly-bounded candidates.

## 8. Reference documents

- `docs/relationship-standards.md` · `docs/relationship-templates.md` · `docs/relationship-backlog.md`
- `docs/data-issues.md` (Data Corrections) · `docs/database-expansion.md` (Database Expansion)
- `docs/changelog/` (entry 008 = OS-0701–0800) · milestone reports `-01.md` … `-07.md`

**Next phase:** continue in Saint-ID order from OS-0801.
