# Relationship Network — Milestone 1 (OS-0000 – OS-0100)

*First phase of the OrthodoxSaintFinder relationship project. Generated at the completion of
the first 101 saint profiles (OS-0000 through OS-0100).*

This report documents both the **progress** of the relationship build and the **evolution of
the system** that produced it.

---

## 1. Statistics at the milestone

| Metric | Count |
|---|---|
| Saint profiles completed (OS-0000–OS-0100) | **101** |
| Profiles authored from scratch (no prior relationship sections) | ~28 (mostly OS-0060+) |
| Profiles primarily audited / enhanced (had prior data) | ~68 (mostly OS-0000–0059) |
| Profiles intentionally left sparse/blank (no defensible links) | 5 (Stylianos, Euphrosynos, Callista, Evanthia, Vibiana) |
| Official relationship templates | 14 (incl. 6 Core) + the v1.0 grouped reference families |
| Emerging templates (backlog) | 8 |
| Candidate templates (backlog) | 11 |
| New group taxonomies created | 3 (+1 extended) |
| Group taxonomies total (project-wide) | 18 |
| Legacy corrections (mis-categorizations fixed) | 5 |
| Duplicate relationship cards removed | ~38 (integrity reviews, Batches 3–5) |
| Retroactive Review items logged | ~16 (several already resolved) |
| **Validation status** | **CLEAN — 2783 saints, 0 errors** (every batch) |

---

## 2. Templates by status at milestone

**Core (6)** — foundational, change only on review: Holy Family, Twelve Apostles,
Myrrh-bearers, Desert Fathers, Three Hierarchs, Cappadocian Fathers.

**Official (additional)** — Seventy Apostles, Holy Unmercenaries, Great Martyrs (with the
soldier-martyr and virgin-martyr sub-clusters), Holy Archdeacons / Deacon-Martyrs, Seven
Deacons, **Equal-to-the-Apostles**, **Mission to America / Alaska**, **Wonderworkers** (the
last three promoted from the backlog at OS-0059). Plus the v1.0 grouped reference families
(Mount Athos, Sinai, Optina Elders, Ecumenical Councils, Missionaries, New Martyrs,
Geographic / Monastery / Era).

**Emerging (8)** — Fathers of Nicaea, The Three Theologians, Hesychast Tradition, Penitent
Saints, Syriac Ascetical Tradition, Fools-for-Christ, Russian Eldership Revival, British Isles
/ Celtic & Anglo-Saxon Saints.

**Candidate (11)** — Forefathers / Ancestors of God, Old Testament Prophets, Stylites,
Protectors of Animals/Livestock, Protectors against Epidemics, Martyred Households, Protectors
of Children, Ionian Island Wonderworkers, Judean Desert Fathers, Iconoclast Confessors,
Persian Martyrs under Shapur II.

---

## 3. Group taxonomies created by the project

Built and build-validated this phase (`data/groups.csv` + `data/saint_groups.csv`):

1. **`twelve-apostles`** — Synaxis of the Holy Twelve Apostles (Jun 30), all twelve wired (Batch 1).
2. **`sunday-after-nativity`** — Joseph the Betrothed, David the King, James the Brother of the Lord (Batch 7).
3. **`optina-elders`** — Synaxis of the Optina Elders (Oct 11), 13 elders (Batch 7).

Extended: **`myrrh-bearers`** gained Joseph of Arimathea and Nicodemus (Batch 1).

---

## 4. Integrity work (Database Integrity Review)

**Legacy corrections:**
- OS-0027 Mary of Egypt — removed "Mary Magdalene as a forerunner among penitent women" (the
  Western penitent conflation Orthodoxy rejects; contradicted OS-0007).
- OS-0036 Cosmas & Damian — the other two same-named pairs moved companions → related (distinct
  saints centuries apart who never met).
- OS-0042 Sergius — two combined-commemoration card collisions consolidated (Cyril+Maria → one
  card; Peresvet+Oslyabya → one card).
- OS-0081 Genevieve — saints she never met (Brigid, Radegund, Melania, Caesarius) moved
  companions → related; added her true contacts (Germanus, Symeon the Stylite correspondent).

**Duplicate relationship cards (~38):** the profile generator frequently placed the same saint
in both `companions` and `related` (or also `family`). The per-batch duplicate-`href` sweep
caught and removed these across Batches 3–5 (notably the modern-saint and Holy-Family clusters).

**Method:** every batch ends with `python3 build.py --check-only` (CLEAN throughout) and a
duplicate/self-reference sweep.

---

## 5. Evolution of the relationship system

The process matured over eight batches and is now frozen:

1. **Batch 1–2:** established the four-section model (Family / Companions / Related /
   Commemorated With → `family` / `companions` / `related` + group taxonomy) and the first Core
   templates; created the master `relationship-standards.md` and `relationship-templates.md`.
2. **Batch 2–3:** introduced **consistency harmonization** of sub-clusters (soldier-martyrs,
   virgin-martyrs) and the **no-duplicate-cards** and **reciprocity** conventions; added
   guardrails (Conflation, Emmaus, deacon-inclusion).
3. **Batch 3:** split the **Relationship Backlog** from the official templates — candidate
   templates staged separately — and added the **Retroactive Review** list.
4. **Batch 4:** added the permanent **Database Integrity Review** step.
5. **Batch 5:** formalized the **promotion workflow** (Candidate → Emerging → Stable → Core).
6. **Batch 6:** promoted the first three templates to Official (Stable → Official on review),
   with an **impact assessment** feeding the Retroactive Review.
7. **Batch 7:** adopted the **guiding principle — historical accuracy over symmetry** (sparse
   is acceptable; hubs are expected; superficial similarity alone is insufficient).
8. **Batch 8:** process frozen; pure consistent application to the milestone.

**Key insight:** profiles OS-0000–0059 were generated *with* relationship data (so early
batches were audits), while OS-0060+ were generated *without* it (so later batches are genuine
authoring). The network is therefore densest among the foundational saints — which is also
historically correct, since Christ, the Theotokos, the Apostles, and the great Fathers are
natural hubs.

---

## 6. Reference documents

- `docs/relationship-standards.md` — rules, guardrails, the historical-accuracy principle.
- `docs/relationship-templates.md` — official/Core templates (v1.2).
- `docs/relationship-backlog.md` — Emerging/Candidate templates, groups-to-create, Retroactive Review.
- `docs/relationship-milestone-01.md` — this report.

**Next phase:** continue in Saint-ID order from OS-0101, applying the frozen process; let the
Emerging and Candidate templates mature toward promotion; work the Retroactive Review list at
milestones.
