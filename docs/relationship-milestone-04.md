# Relationship Network — Milestone 4 (OS-0301 – OS-0400)

*Fourth phase of the OrthodoxSaintFinder relationship project. Generated at the completion of
OS-0400. Covers the fourth hundred (OS-0301–OS-0400); cumulative totals span OS-0000–OS-0400.
First full phase run under the **v1.3** conventions adopted at the OS-0300 health review.*

---

## 1. Phase-4 statistics (OS-0301–OS-0400)

| Metric | Value |
|---|---|
| Profiles in range (OS-0301–0400, no gaps) | **100** |
| Profiles with relationship data after this phase | 67 |
| Profiles intentionally left sparse/blank (no defensible links) | 33 |
| New group taxonomies created | 0 (relevant memberships already wired) |
| Within-range reciprocity closed | Joasaph ↔ Cassian (0362↔0363); Twelve Priests ↔ Symeon Turkin (0368↔0369); Synkletike ↔ Mary of Egypt / Moses (0393↔0027/0030); Emilia → Basil the Elder (0374→2757) |
| Duplicate relationship cards removed | 0 |
| Bad hrefs / self-references | 0 / 0 (all sweeps clean) |
| Data issues discovered & logged | 1 (DI-005 Salvius/Desiderius kinship) |
| Validation status | **CLEAN — 2782 saints, 0 errors** (every batch) |

## 2. Cumulative state at OS-0400

| Metric | Value |
|---|---|
| Saint profiles completed (OS-0000–OS-0400) | **~397** (OS-0120, OS-0164, OS-0189 retired/absent) |
| Relationship templates — Official | the standing set in `relationship-templates.md` (incl. 6 Core) |
| Relationship templates — Recommended | 0 |
| Relationship templates — Candidate | grows to ~27 (Sinai Fathers, Desert Mothers, Women-Disguised-as-Monks added) |
| Group taxonomies total | 19 |
| `retired_ids.csv` rows | 16 (1 retired by this project: OS-0164) |
| Data-issues register | 5 entries (1 Resolved, 4 Open) |

## 3. What was built this phase

OS-0301–0400 mixes **pre-schism Western/Celtic local saints** (Lérins, Albi, Naples, Anglo-Saxon
Wessex), **early monastic and desert figures**, and large **New Martyrs of Russia** blocks:

- **Anglo-Saxon Wessex circle** — Sergius I of Rome (OS-0311) and Ine of Wessex (OS-0313) wired to
  Wilfrid, Aldhelm, and Willibrord; the Disibod profile (OS-0310) de-anachronized (Hildegard of
  Bingen, his 12th-c. biographer, removed as a "companion").
- **Lérins circle** — Veranus (OS-0352) linked to his master Vincent of Lérins and the founder
  Honoratus of Arles; Salvius ↔ Carissima (Albi) and Candida Younger ↔ Elder (Naples) geographic
  pairs.
- **Egyptian desert women** — the **Three Ammas** (Synkletike OS-0393, Theodora OS-1820, Sarah
  OS-1526) and the **Women Disguised as Monks** vita-cluster (Apollinaria OS-0395 ↔ Pelagia,
  Eugenia, Mary/Marinos) — two new candidate templates, kept distinct from one another and from
  the Penitents.
- **Sinai** — Menas of Sinai (OS-0397) linked to John Climacus (who recorded him in *The Ladder*,
  Step 4) and Anastasius of Sinai — a new Sinai-Fathers candidate under the Core Desert Fathers.
- **Kiev Caves** — Paul the Obedient (OS-0361) wired to the founders Anthony and Theodosius
  (one-directional founder links).
- **Cappadocian household** — Emilia (OS-0374) hub completed with the now-existing Basil the Elder
  (OS-2757) row.
- **New Martyrs of Russia** — Theodoritus of Ryazan → Hermogenes/Job; the Twelve Priests of 1937 ↔
  Symeon Turkin co-martyrdom; Tatiana Grimblit and the Butovo cluster (new group candidate).
- **Martyrs under Julian the Apostate** — Basil of Ancyra (OS-0373) authored the same-persecution
  links into the existing cluster (OS-0227/0966/0895/0896/0797/0690), maturing that candidate.

## 4. Data Corrections stream

- **New: DI-005 — Salvius of Albi ↔ Desiderius of Cahors (OS-0354): Open.** The existing `family`
  section calls the 7th-c. Desiderius a "kinsman" of the 6th-c. Salvius — chronologically
  improbable (Salvius's recorded associate is Gregory of Tours). Plain card, no cross-link; logged
  for a future content pass rather than edited inline.
- **Carried Open:** DI-002 (Edessa), DI-003 (Rhais/Irais), DI-004 (Eupsychios of Caesarea).
- Register at OS-0400: **5 entries — 1 Resolved (DI-001), 4 Open.**

## 5. Methodology

Unchanged from Milestone 3 and now fully under **v1.3**: each hundred ran as two 50-profile
batches, each fanned out to **five parallel sub-range subagents**, then a **central consolidation**
(global `href`-resolution, duplicate/self/name–note sweeps, group wiring, backlog/data-issues
updates, validation). A meaningful share of the range was **already authored at `status: reviewed`**
(notably OS-0381–0390), so agents audited rather than re-wrote — the workflow correctly left
reviewed prose untouched and only added missing defensible links. Adversarial judgment again held:
agents declined thin "same category / same desert" links and an uncertain abba identification, and
caught an anachronistic biographer card.

## 6. Open items carried forward

- **Data issues:** DI-002, DI-003, DI-004, DI-005 — a future dedicated cleanup pass.
- **Retroactive Review (OS-0301–0400 cross-range halves):** Columba ↔ Finnian (1320/0353);
  Lérins (Vincent/Honoratus → Veranus 0352); Carissima ↔ Salvius (0279/0354); Candida Elder ↔
  Younger (0202/0355); Paisios ↔ Tikhon (0051/0365); Julian-martyr halves (0373 → 0966/0895/
  0896/0797/0690); Three Ammas (0393 → 1820/1526); Women-disguised (0395 → 1977/2408/0643);
  Micah → Elisha (0394/1353); Sinai (0397 → 0033/1029); Basil the Elder OS-2757 → Cappadocian
  household when authored — all logged in `docs/relationship-backlog.md`.
- **New candidates:** Sinai Fathers, Desert Mothers / Three Ammas, Women Disguised as Monks;
  group candidates Butovo and Rmanj.

## 7. Reference documents

- `docs/relationship-standards.md` · `docs/relationship-templates.md` · `docs/relationship-backlog.md`
- `docs/data-issues.md` (Data Corrections stream) · `docs/changelog/` (entry 004 = OS-0301–0400)
- `docs/relationship-milestone-01.md` · `-02.md` · `-03.md`

**Next phase:** continue in Saint-ID order from OS-0401.
