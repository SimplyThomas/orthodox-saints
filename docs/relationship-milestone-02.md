# Relationship Network — Milestone 2 (OS-0101 – OS-0200)

*Second phase of the OrthodoxSaintFinder relationship project. Generated at the completion of
OS-0200. Covers the second hundred (OS-0101–OS-0200); cumulative totals span OS-0000–OS-0200.*

---

## 1. Phase-2 statistics (OS-0101–OS-0200)

| Metric | Value |
|---|---|
| Profiles in range (OS-0101–0200, less gaps OS-0120 & OS-0189) | **98** |
| Profiles with relationship data after this phase | 68 |
| Profiles intentionally left sparse/blank (no defensible links) | 30 |
| Authored/edited this phase vs. pre-authored & audited | ~55 authored · ~13 audited |
| New group taxonomies created | 1 (`martyrs-of-nicomedia`) |
| Reciprocity fixes | 1 (OS-0196 → OS-0195) |
| Duplicate relationship cards removed | 0 (range was generated without relationship sections) |
| Data issues discovered & logged (NOT actioned) | 2 (DI-001 Gregory; DI-002 Edessa) |
| Validation status | **CLEAN — 2783 saints, 0 errors** (every batch) |

## 2. Cumulative state at OS-0200

| Metric | Value |
|---|---|
| Saint profiles completed (OS-0000–OS-0200) | **~199** (OS-0120 & OS-0189 absent/retired) |
| Official relationship templates | 14 (incl. 6 Core) + v1.0 grouped families |
| Emerging templates | 8 |
| Candidate templates | 15 |
| Group taxonomies total | 19 |
| Data-issues register entries | 2 (open) |

## 3. What was built this phase

The OS-0101–0200 range is dominated by **obscure pre-schism Western/Gaulish & British saints**,
the **New Martyrs of Russia** (Soviet era), and clusters of **early martyrs** (Nicomedia,
Edessa, Ephesus). Because these profiles were generated *without* relationship sections, this
phase was **authoring-heavy** rather than audit-heavy.

Notable additions:
- **British Isles** (Emerging) substantially extended: Mac Nisse ← Patrick; the Northumbrian /
  English royal-house cluster (Hereswith, Edward the Martyr, Edwin, Oswald, Edmund, Paulinus,
  Aethelburh, Eanflaed, Dunstan).
- **New Martyrs of Russia**: co-martyr reciprocity wired; a tight **Semirechye/Turkestan
  (Sep 3)** sub-cohort cross-linked; all in-range members confirmed in the synaxis group.
- **Early-martyr clusters**: Nicomedia (Anthimus + companions, now a group), Edessa
  (Thathuil/Bebaia ↔ Sarbellus), Ephesus (Hermione, daughter of Philip the Deacon).
- **Successions & monasteries**: Lyon and Reims episcopal successions; Lerins (Aigulphus ←
  Honoratus); the Serbian patriarchate (Ioannicius ← Sava).
- Faithful application of **historical accuracy over symmetry** — 30 profiles correctly left
  sparse, and many real-but-absent saints rendered as plain cards rather than invented IDs.

## 4. New group taxonomy
- **`martyrs-of-nicomedia`** — Hieromartyr Anthimus OS-0150 + the Nicomedia martyrs OS-0151/
  0152/0153, commemorated together Sep 3 (feast-companions).

## 5. Methodology evolution (this phase)
The two hundred-blocks were executed with **parallel sub-range subagents** (five per batch, ten
across the phase), each authoring disjoint profile files under the frozen conventions, followed
by a **central consolidation** I performed: global `href`-resolves-to-a-real-row verification
(a wrong ID renders as a broken link but does not fail the build, so it is checked explicitly),
duplicate-card / self-reference / name–note sweeps, group wiring, backlog updates, and
validation. Every agent's output passed the global integrity sweep. This scaled the work ~5×
without loosening the quality bar.

A second process refinement: the **three project streams** were formally separated —
Relationship Network (this work), **Data Corrections** (now logged in `docs/data-issues.md`,
not fixed inline), and Content Expansion. Two data issues surfaced during relationship work
were logged and deliberately deferred.

## 6. Open items carried forward
- **Data issues (separate stream):** DI-001 (Gregory OS-0084/OS-0164 duplicate), DI-002 (Edessa
  Thathuil/Sarbellus possible duplicate) — for a future dedicated data-cleanup pass.
- **Retroactive Review:** English/Anglo-Saxon royal saints reciprocity; assorted out-of-range
  founder/monastery reciprocities — see `docs/relationship-backlog.md`.
- **Maturing candidates:** Semirechye New-Martyrs, English Royal Saints, Saints in Gregory's
  Dialogues, Ottoman-yoke New-Martyrs, and the candidate groups (Diveyevo, Thasos, Babylas+
  Christodoula Sep 4).

## 7. Reference documents
- `docs/relationship-standards.md` · `docs/relationship-templates.md` · `docs/relationship-backlog.md`
- `docs/data-issues.md` (Data Corrections stream)
- `docs/changelog/` (running changelog; entry 002 covers OS-0101–0200)
- `docs/relationship-milestone-01.md` (phase 1)

**Next phase:** continue in Saint-ID order from OS-0201; review the accumulated Data Issues
separately before deciding whether to schedule a data-cleanup phase.
