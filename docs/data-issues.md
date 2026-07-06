# Data Issues Register

Tracks **Data Corrections** (duplicates, retirements, merges, incorrect records) discovered
during other work — kept **separate** from the Relationship Network and Content Expansion
streams. Issues are logged here, not fixed inline, and resolved later in dedicated batched
data-cleanup passes.

**Four project streams (do not mix):**
1. **Relationship Network** — current priority.
2. **Data Corrections** — this document (fix bad records in existing rows).
3. **Content Expansion** — enrich existing saints (biographies, works, patronages, facets).
4. **Database Expansion** — add *new* saints not yet in the database — see `docs/database-expansion.md`.

Each entry: Saint ID(s) · Description · Recommended action · Reasoning · Priority (Low/Medium/High).
**Status** is `open` until resolved; **resolved entries are retained** (with a Resolution note)
so this register is a permanent historical record of corrections, not just an active task list.

**Triage policy for Data Corrections:**
- **Confirmed + low risk** → execute during periodic Data Correction sessions.
- **Requires additional historical verification** → remains here (Open) until verified.
- **Uncertain or disputed identifications** → never merge without source confirmation.

---

## DI-001 — Duplicate saint: Pope Gregory the Great

- **Status:** ✅ RESOLVED (2026-06-29) — §6 retirement executed; see Resolution below.
- **Saint IDs:** OS-0084, OS-0164
- **Description:** OS-0084 ("St. Gregory the Dialogist", AKA "Gregory the Great; Pope of Rome")
  and OS-0164 ("St. Gregory the Great, Pope of Rome", AKA "Gregory the Dialogist") are the same
  person — the 6th-century Pope Gregory I. Both carry the feast March 12.
- **Recommended action:** §6 retirement/merge. Keep **OS-0084** as canonical (lower-numbered,
  earlier entry; has the rich profile, and relationship links already point to it). Merge any
  unique facets/feasts/sources from OS-0164 into OS-0084; delete the OS-0164 row and any
  `OS-0164.yaml` profile; add an OS-0164 row to `data/retired_ids.csv` (canonical OS-0084);
  run `make validate`.
- **Reasoning:** Identical identity (name, AKA, office, feast day). Three independent profile-
  authoring agents flagged the pair during the OS-0101–0150 relationship batch. Relationship
  cross-links (OS-0106, OS-0124, OS-0132) were deliberately pointed at OS-0084 in anticipation.
- **Priority:** Medium — not build-breaking and links are already consolidated, but it is a true
  duplicate that should be retired before it accumulates more inbound references.
- **Review (verified 2026-06-29):** CONFIRMED duplicate — identical Mar 12 feast, identical
  short-prayer text, mutual AKA cross-reference, same office/era/region. Keeper **OS-0084**
  (richer profile; 4 inbound links — OS-0106, OS-0124, OS-0257, OS-0759 — vs 1 inbound to
  OS-0164; carries Hymnographer + Works + Customs). **Merge from OS-0164 → OS-0084:** the
  **Sep 3** second feast, the *Mercy* virtue, the "sent the mission that converted England"
  note, and the Roman Martyrology source. **Re-point** the one inbound link: OS-1243 (Augustine
  of Canterbury) href OS-0164 → OS-0084. Then delete the OS-0164 row + `OS-0164.yaml`, add a
  `retired_ids.csv` row (OS-0164 → OS-0084), `make validate`. Confidence: **certain**; effort:
  **low**. Ready to execute in a cleanup pass.
- **Resolution (2026-06-29):** §6 retirement completed.
  - Merged into **OS-0084**: Feast `Mar 12` → `Mar 12; Sep 3`; Virtue `+ Mercy`; Sources
    `+ Roman Martyrology`; Notes cross-reference "Merged with retired duplicate OS-0164."
  - Re-pointed inbound link: OS-1243 (Augustine of Canterbury) href OS-0164 → OS-0084.
  - Deleted the OS-0164 row from `data/saints.csv` (CRLF-preserving) + `src/content/profiles/OS-0164.yaml`.
  - Added `data/retired_ids.csv` row: OS-0164 → OS-0084.
  - Verified no stray OS-0164 references remain; validation **CLEAN — 2782 saints, 0 errors**.

## DI-002 — Possible partial duplicate: Edessa martyrs (Thathuil / Sarbellus)

- **Status:** open
- **Saint IDs:** OS-0190, OS-0191
- **Description:** OS-0190 "Martyrs Thathuil & Bebaia of Edessa" overlaps OS-0191 "Martyr
  Sarbellus of Edessa" — Sarbellus's baptismal name is given as *Thathuel*, and Bebaia is his
  sister, all martyred at Edessa under Bishop Barsimaeus. "Thathuil" and "Sarbellus" may be the
  same person, making OS-0190 a possible partial duplicate of the OS-0191 cluster.
- **Recommended action:** Review the two rows against the synaxarion (the Edessa martyrs under
  Barsimaeus). If Thathuil = Sarbellus, merge/retire per §6 (decide canonical keeper); if the
  tradition treats them as distinct commemorations, document the distinction in each Notes field.
- **Reasoning:** Flagged during the OS-0151–0200 relationship batch; the profiles were
  cross-linked (not merged) pending review, so the relationship layer is safe either way.
- **Priority:** Low — needs a source check; relationship links are non-destructive in the interim.
- **Review (verified 2026-06-29):** Strong overlap. Both rows describe a **pagan (high) priest
  of Edessa converted by Bishop Barsimaeus, martyred Sep 4** (2nd c.), each with a sister/
  companion **Bebaia** — and OS-0191's Notes explicitly cross-reference OS-0190's Bebaia as the
  *same* person. The well-attested tradition is **Sharbel (Sarbil/Sarbellus) and his sister
  Babai/Bebaia** under Trajan; "Thathuil" (OS-0190) appears to be a name-variant for the same
  priest. At minimum **Bebaia is duplicated** across both rows; most likely the whole pair is.
  **Action needs a synaxarion check** ("Acts of Sharbel / Martyrdom of Barsamya") to confirm
  Thathuil = Sharbel. If confirmed: consolidate into ONE row, "Martyrs Sharbel (Sarbellus) and
  his sister Bebaia of Edessa" — recommend keeping **OS-0191** (correct canonical name + AKA
  Sharbel/Sarvillos) and retiring OS-0190, *or* per §6 keep the lower OS-0190 and correct its
  name. If genuinely distinct, document the distinction in each Notes and de-duplicate Bebaia.
  Confidence: **medium-high**; effort: **low-medium** (source verification first). Inbound: the
  two only cross-link each other (no other refs, no group memberships) — safe to defer.

## DI-003 — Possible duplicate: virgin-martyr Rhais / Irais of Antinoe

- **Status:** open
- **Saint IDs:** OS-0226, OS-0779
- **Description:** OS-0226 "Virgin-Martyr Rhais of Alexandria" (AKA Iraida; Raissa) and OS-0779
  "Virgin-Martyr Irais of Antinoe" (AKA Irais; Rhais; Iraida) share the same name-variants, the
  same place (Antinoe / Antinoöpolis, Egypt), and overlapping dates (OS-0779 Mar 5; OS-0226 also
  lists Mar 5). Likely the same saint.
- **Recommended action:** Source-check (the virgin-martyr Irais/Rhais of Antinoe). If confirmed
  the same, merge/retire per §6 (decide canonical keeper — OS-0779's title "of Antinoe" matches
  the tradition more precisely; OS-0226 is lower-numbered). If distinct, document the distinction.
- **Reasoning:** Flagged during the OS-0201–0250 relationship batch; not linked (a relationship
  card would wrongly assert they are distinct people).
- **Priority:** Low — obscure, low-traffic; needs source verification (per triage policy, stays Open).

## DI-004 — Possible duplicate: Martyr Eupsychios of Caesarea (Hadrianic)

- **Status:** open
- **Saint IDs:** OS-0264, OS-1817
- **Description:** OS-0264 "Martyr Eupsychios of Caesarea" and OS-1817 "Martyr Eupsychius of
  Caesarea" (AKA Eupsychios) both describe a 2nd-c. martyr of Caesarea under Hadrian,
  commemorated Sep 7 — apparently the same saint. **Distinct from** OS-0966 "Eupsychius of
  Caesarea" (4th c., martyred under Julian the Apostate, Apr 9), which is correctly separate.
  OS-1817's Notes only distinguish it from OS-0966, not from OS-0264.
- **Recommended action:** Source-check the Hadrianic Eupsychios of Caesarea. If OS-0264 = OS-1817,
  merge/retire per §6 (keep lower-numbered OS-0264 unless OS-1817 is richer). Keep OS-0966 separate.
- **Reasoning:** Flagged during the OS-0251–0300 relationship batch; not linked (would falsely
  assert distinctness). Three Eupsychii of Caesarea exist in the data — verify which are real.
- **Priority:** Low — obscure; needs source verification (stays Open per triage policy).

## DI-005 — Doubtful kinship claim: Salvius of Albi & Desiderius of Cahors

- **Status:** open
- **Saint IDs:** OS-0354
- **Description:** OS-0354's existing `family` section calls **Desiderius (Didier) of Cahors** a
  "kinsman" of Salvius of Albi. This is historically doubtful: Desiderius of Cahors is a 7th-c.
  bishop, while Salvius of Albi died in 584; Salvius's recorded near-contemporary associate is
  Gregory of Tours (who reports his life), not Desiderius. The kinship card is a plain card
  (no href), so it asserts no cross-link, but the claim itself appears unsupported.
- **Recommended action:** Source-check Salvius of Albi (Gregory of Tours, *Historia Francorum*,
  and the Albi episcopal lists). If the kinship is unsupported, remove or recategorize the
  Desiderius card; if a different Desiderius/relative is meant, correct the name. Content stream,
  not a duplicate.
- **Reasoning:** Flagged during the OS-0351–0400 relationship batch by the authoring agent; left
  in place per the do-not-modify-existing-content rule, logged here for a later content pass.
- **Priority:** Low — single obscure profile; needs source verification (stays Open per triage policy).

## DI-006 — Conflated profile: two distinct Laurences of the Kiev Caves

- **Status:** open
- **Saint IDs:** OS-0496
- **Description:** OS-0496 "Laurence the Recluse of the Kiev Caves" appears to merge two distinct
  saints: **Laurence the Recluse of the Far Caves** (Jan 20, 13th–14th c.) and **Laurence, Bishop
  of Turov / Recluse of the Near Caves** (d. 1194, Jan 29). The profile is already `status: flagged`.
- **Recommended action:** Source-check (Kiev Caves Patericon + the Near/Far Caves synaxaria). If two
  people, split into two rows per §6 (assign a new ID to the second), each with its own caves/feast;
  re-point the relationship cards accordingly. If one person with two strands, document and resolve
  the flag.
- **Reasoning:** Surfaced during the OS-0491–0500 relationship batch; relationship links were
  authored to fit both strands without asserting the merge.
- **Priority:** Medium — a likely two-person conflation in a single row; needs source verification.
- **Audit note (2026-07-06):** Audited 2026-07-06 and **left OPEN** — this is a two-person **conflation requiring a SPLIT** (new ID for the Near-Caves/Turov Laurence), not a simple merge; deferred to a dedicated split pass with source verification.

## DI-007 — Possibly confusable: John of Zedazeni rows

- **Status:** open
- **Saint IDs:** OS-1128, OS-2340
- **Description:** OS-1128 "John of Zedazeni and his Twelve Disciples" (leader of the Thirteen
  Syrian Fathers of Georgia) and OS-2340 "Martyr John, Abbot of Zedazeni Monastery" may be the same
  John, or genuinely distinct (a later abbot-martyr of the same house). Not yet cross-linked.
- **Recommended action:** Source-check the Zedazeni abbots. If the same person, merge/retire per §6;
  if distinct, document the distinction in each Notes (and they may both belong to the Thirteen-
  Syrian-Fathers group taxonomy at different roles).
- **Reasoning:** Flagged during the OS-0491–0500 batch; deliberately not linked to avoid asserting
  a false identity either way.
- **Priority:** Low — obscure; needs source verification (stays Open per triage policy).

## DI-008 — Typo in Also Known As: "Neollina"

- **Status:** ✅ RESOLVED (2026-07-06)
- **Saint IDs:** OS-0439
- **Description:** OS-0439's "Also Known As" reads "Neollina" — an apparent typo for **Neonilla**
  (the virgin-martyr's name as it appears in the primary Name field).
- **Recommended action:** Trivial text fix in `data/saints.csv` (CRLF-preserving) during a cleanup
  pass; correct "Neollina" → "Neonilla".
- **Reasoning:** Spotted during the OS-0431–0440 batch.
- **Priority:** Low — trivial spelling fix; batched with the next Data Correction pass.
- **Resolution (2026-07-06):** Fixed typo 'Neollina' → 'Neonilla' in OS-0439 Also Known As.

## DI-009 — Possible duplicate: Righteous Nonna, mother of Gregory the Theologian

- **Status:** open
- **Saint IDs:** OS-1647, OS-2507
- **Description:** Two rows for "Righteous Nonna, mother of Gregory the Theologian," same feast (Aug 5)
  — likely an OCA/GOARCH merge duplicate.
- **Recommended action:** Source-check; if the same person, merge/retire per §6 (keep lower-numbered
  OS-1647 unless OS-2507 is richer).
- **Reasoning:** Surfaced during the OS-0501–0510 relationship batch.
- **Priority:** Low — needs verification (stays Open per triage policy).

## DI-010 — Duplicate: the Betania confessor (Giorgi-Ioane Mkheidze)

- **Status:** ✅ RESOLVED (2026-07-06)
- **Saint IDs:** OS-0511, OS-2746
- **Description:** OS-0511 "St. George (John) of Georgia" and OS-2746 "St. Giorgi-Ioane (Mkheidze)
  of Betania" are the same 20th-c. Georgian confessor (Mkheidze, Jan 21, co-glorified 2003 with
  Ioane Maisuradze OS-0317). OS-0511 carries the profile; OS-2746 carries the Notes cross-reference
  to OS-0317.
- **Recommended action:** §6 retirement/merge — reconcile to one row (decide canonical keeper;
  OS-0511 has the profile/relationships), re-point links, retire the other.
- **Reasoning:** Flagged during the OS-0511–0520 batch; relationship links point at OS-0511.
- **Priority:** Medium — a confirmed duplicate with a profile attached; resolve before more links accrue.
- **Resolution (2026-07-06):** §6 merge — retired OS-2746 into OS-0511 (Betania confessor Giorgi-Ioane Mkheidze); Sep 8 feast + confessor facets merged; 2 inbound profile links + 1 CSV note re-pointed to OS-0511.

## DI-011 — Possible duplicate: Plato of the Studion / Sakkoudion

- **Status:** open
- **Saint IDs:** OS-0940, OS-0948
- **Description:** Both "Plato of the Studion/Sakkoudion," confessor, uncle and spiritual father of
  Theodore the Studite (Constantinople, 9th c.) — OS-0940 feast Apr 4, OS-0948 feast Apr 5. Likely
  the same person.
- **Recommended action:** Source-check the feast; if the same, merge/retire per §6 (OS-0940 is the
  richer, linked row).
- **Reasoning:** Flagged during the OS-0541–0550 batch (OS-0547 Joseph of Thessalonica links OS-0940).
- **Priority:** Low — needs verification.

## DI-012 — Possible duplicate: Simeon the Ancient

- **Status:** open
- **Saint IDs:** OS-0546, OS-2443
- **Description:** OS-0546 "Simeon the Ancient of Mount Sinai" (Jan 26, 5th c.) and OS-2443
  "Venerable Simeon the Ancient" (Jan 26, Syria, 4th c.) — same name, same feast, same Syrian/Sinai
  ascetic profile (Symeon the Elder of Theodoret's *Religious History*). Likely the same person.
- **Recommended action:** Source-check; if the same, merge/retire per §6.
- **Reasoning:** Flagged during the OS-0551–0560 batch.
- **Priority:** Low — needs verification.

## DI-013 — Possible duplicate: Julius of Aegina / Julius of Novara

- **Status:** ✅ RESOLVED (2026-07-06)
- **Saint IDs:** OS-0573, OS-1402
- **Description:** OS-0573 "Julius of Aegina" (its own overview says "also known as Julius of
  Novara") overlaps OS-1402 "Saints Julius the Presbyter and Julian the Deacon of Novara" (Jun 21,
  Italy) — the same Julius and his brother Julian.
- **Recommended action:** Source-check; if the same Julius, merge/retire per §6 and consolidate the
  Julius+Julian pairing into one row.
- **Reasoning:** Flagged during the OS-0571–0580 batch; Julian left as a plain card on OS-0573 to
  avoid a circular link pending reconciliation.
- **Priority:** Low-Medium — needs verification.
- **Resolution (2026-07-06):** §6 merge — retired the standalone 'Julius of Aegina' OS-0573 into the Julius+Julian pair OS-1402 (Jan 31 feast + Aegina origin merged; OS-2859 cross-ref updated). Web-verified same saint (OCA/Wikipedia). Brother **Julian the Deacon** is preserved in the pair row — a future §7 split of Julian into his own row remains possible.

## DI-014 — Duplicate: Pancratius of Taormina (one-row violation)

- **Status:** open
- **Saint IDs:** OS-0623, OS-1499
- **Description:** Pancratius, Bishop of Taormina, appears both inside the grouped row OS-0623
  ("Hieromartyrs Marcellus, Philagrius & Pancratius of Sicily", Feb 9) AND as the standalone row
  OS-1499 ("Hieromartyr Pancratius, Bishop of Taormina", Jul 9 / Feb 9). Same person — a §6
  one-row-per-saint violation.
- **Recommended action:** Reconcile per §6 — either split Pancratius out of OS-0623 entirely (keep
  OS-1499 as canonical) or fold OS-1499's facets into the linkage; re-point cross-links.
- **Reasoning:** Flagged during the OS-0621–0630 batch (a related cross-link OS-0623 → OS-1499 was
  added in the interim).
- **Priority:** Low-Medium — needs reconciliation.
- **Audit note (2026-07-06):** Audited 2026-07-06 and **left OPEN** — reconciling Pancratius across the group row OS-0623 and the standalone OS-1499 is a one-row-per-saint **split/reconcile**, not a merge; deferred to a dedicated pass.

## DI-015 — Possible duplicate: David of Gareji

- **Status:** open
- **Saint IDs:** OS-1321, OS-2652
- **Description:** OS-1321 "Saints David of Gareji and Lucian" and OS-2652 "Venerable David of
  Gareja" both appear to be the same David — one of the Thirteen (Assyrian) Fathers of Georgia
  (6th c.).
- **Recommended action:** Source-check; if the same David, merge/retire per §6 and consolidate the
  Thirteen-Fathers group membership onto one row.
- **Reasoning:** Flagged during the OS-0621–0630 batch (Shio OS-0624 linked OS-2652).
- **Priority:** Low — needs verification.

## DI-016 — Possible duplicate: Anthony of Martqopi / Martkofeli

- **Status:** open
- **Saint IDs:** OS-0493, OS-1706
- **Description:** OS-0493 "Anthony of Martqopi" and OS-1706 "Anthony of Martkofeli" — same place
  (Martqopi) and both numbered among the Thirteen (Assyrian) Fathers of Georgia; likely the same
  person.
- **Recommended action:** Source-check; if the same, merge/retire per §6 (OS-0493 carries the
  authored Thirteen-Fathers links).
- **Reasoning:** Surfaced across the OS-0491–0500 (OS-0493 authored) and OS-0621–0630 (OS-1706
  linked) batches.
- **Priority:** Low — needs verification.

## DI-017 — Possible duplicate: Euphrosyne of Alexandria

- **Status:** open
- **Saint IDs:** OS-0664, OS-1905
- **Description:** OS-0664 "Paphnutius and his daughter Euphrosyne of Alexandria" (Feb 15;
  prose gives Greek principal feast Sep 25) and OS-1905 "Venerable Euphrosyne of Alexandria
  (Smaragdus)" (Sep 25) — the daughter in OS-0664 is the same 5th-c. Euphrosyne who lived disguised
  as the monk Smaragdus. Likely the same saint.
- **Recommended action:** Source-check; if the same, reconcile per §6 (decide whether to keep the
  father+daughter pairing OS-0664 or the standalone OS-1905, or model as two feasts of one saint).
- **Reasoning:** Flagged during the OS-0661–0670 batch; not cross-linked (same person).
- **Priority:** Low — needs verification.

## DI-018 — Possible duplicate: Domnina/Domnica of Syria

- **Status:** open
- **Saint IDs:** OS-0740, OS-0751
- **Description:** OS-0740 "Venerable Domnica of Syria" (AKA "Domnina of Syria", Feb 28) and OS-0751
  "Domnina the Younger of Syria" (Mar 1) both describe a 5th-c. Syrian virgin ascetic near Cyrrhus
  from Theodoret's *Historia Religiosa* (small hut, lentils only, continual weeping, reposed c. 460).
  OS-0751's Notes distinguish it only from the Oct 4 Domnina (OS-1955), not from OS-0740.
- **Recommended action:** Source-check Theodoret's *Religious History*; if the same Domnina, merge/
  retire per §6; if genuinely two, document the distinction in each Notes.
- **Reasoning:** Flagged during the OS-0751–0760 batch; kept distinct, not cross-linked.
- **Priority:** Low — needs verification.

## DI-019 — Possible duplicate / era error: Cosmas of Zographou

- **Status:** open
- **Saint IDs:** OS-1883, OS-1891
- **Description:** OS-1883 "Cosmas the Bulgarian of Zographou" (13th c., Sep 21) and OS-1891 "Cosmas
  of Zographou / the Anchorite" (Sep 22, but tagged **Modern/18th c.**) may be the same Athonite
  hesychast — and OS-1891's century tag looks inconsistent with the historical St. Cosmas of
  Zographou (Sep 22). Either a duplicate or an era-data error.
- **Recommended action:** Source-check; fix OS-1891's century if wrong, and merge/retire per §6 if
  the two are the same person.
- **Reasoning:** Flagged during the OS-0711–0720 batch (a Cosmas-of-Zographou plain card on OS-0717
  was left unlinked because the right row couldn't be settled).
- **Priority:** Low — needs verification.

## DI-020 — Duplicate: Sabinus / Sabinas of Egypt

- **Status:** ✅ RESOLVED (2026-07-06)
- **Saint IDs:** OS-0817, OS-2454
- **Description:** OS-0817 "Martyr Sabinus of Egypt" and OS-2454 "Martyr Sabinas of Egypt" (AKA
  "Sabinus of Hermopolis") both describe the administrator of Hermopolis who hid during Diocletian's
  persecution, was betrayed, and drowned in the Nile c. 287; both commemorated Mar 16 (OS-0817 adds
  Mar 13). Almost certainly the same saint.
- **Recommended action:** §6 merge/retire (decide canonical keeper — OS-2454 has the precise
  "of Hermopolis" AKA; OS-0817 is lower-numbered).
- **Reasoning:** Flagged during the OS-0811–0820 batch.
- **Priority:** Low-Medium — strong overlap; needs verification.
- **Resolution (2026-07-06):** §6 merge — retired OS-2454 into OS-0817 (Sabinus of Hermopolis); 'Sabinus of Hermopolis'/'Sabbas' AKA + Courage merged.

## DI-021 — Possible duplicate: Alexander of Pydna / Thessalonica

- **Status:** open
- **Saint IDs:** OS-0820, OS-2166
- **Description:** OS-0820 "Martyr Alexander of Pydna" (Mar 13) and OS-2166 "Alexander of
  Thessalonica" (Nov 9 / May 26) — OS-0820's own text says "some hagiographers identify him with"
  the Thessalonica Alexander. Both martyred under Maximian in Macedonia, but different epithets/
  feasts and the sources disagree.
- **Recommended action:** Source-check; if the same, merge/retire per §6; if distinct, document the
  distinction in each Notes.
- **Reasoning:** Flagged during the OS-0811–0820 batch; not linked (uncertain identity).
- **Priority:** Low — sources disputed; never merge without confirmation.

## DI-022 — Possible duplicate: the Virgin-Martyrs of Ancyra

- **Status:** open
- **Saint IDs:** OS-0853, OS-1199
- **Description:** OS-0853 "Virgin-Martyrs Alexandra & companions" (Mar 20) and OS-1199 "Theodotus
  of Ancyra and the Seven Virgin-Martyrs" (May 18; AKA Tecusa, Phaine, Claudia, Matrona, Julia,
  Alexandra, Euphrasia) appear to describe the same seven women of Ancyra from the Acts of
  Theodotus — differing only by feast date and by OS-0853 omitting Theodotus.
- **Recommended action:** Source-check the Acts of Theodotus of Ancyra; if the same martyrdom,
  merge/retire per §6 (or document distinct commemorations and de-duplicate the seven names).
- **Reasoning:** Flagged during the OS-0851–0860 batch; cross-linked (not merged) pending review.
- **Priority:** Low — needs verification.

## DI-023 — Possible duplicate: Avdas / Abdas of Persia

- **Status:** open
- **Saint IDs:** OS-0911, OS-0229
- **Description:** OS-0911 "Hieromartyr Avdas of Persia" and OS-0229 "Abdas of Persia" (Sep 5) —
  OS-0911's own Notes flag a possible identity with OS-0229. Both are Persian bishop-martyrs whose
  destruction of a fire-temple sparked persecution; possibly the same Abdas.
- **Recommended action:** Source-check; if the same, merge/retire per §6; if distinct (there were
  several Persian bishops named Abdas), document the distinction.
- **Reasoning:** Flagged during the OS-0911–0920 batch (already noted in OS-0911's Notes).
- **Priority:** Low — needs verification.

## DI-024 — Possible duplicate: Aeithalas the Deacon of Persia

- **Status:** open
- **Saint IDs:** OS-0093, OS-2134
- **Description:** Aeithalas the Deacon appears both as the standalone row OS-0093 (Sep 1) and as a
  member of the grouped row OS-2134 ("Hieromartyrs Akepsimas, Joseph & Aeithalas", Nov 3). Possibly
  the same saint under two feasts/representations.
- **Recommended action:** Source-check the Akepsimas/Joseph/Aeithalas group; if the standalone
  OS-0093 is the same Aeithalas, reconcile (likely keep the group row and document/retire the
  standalone, or vice versa).
- **Reasoning:** Flagged during the OS-0971–0980 batch.
- **Priority:** Low — needs verification.

## DI-025 — Possible overlap: Azades the Eunuch within Symeon of Persia's company

- **Status:** open
- **Saint IDs:** OS-0996, OS-1006
- **Description:** OS-0996 "Martyr Azades the Eunuch" may be the same "Azad the Eunuch" listed in the
  "Also Known As" of the grouped row OS-1006 ("Symeon of Persia / Symeon bar Sabba'e and companions").
  Possibly already commemorated within OS-1006.
- **Recommended action:** Source-check; if Azades is fully represented within OS-1006, decide whether
  the standalone OS-0996 should remain (his own feast Apr 14 vs. the group's) or be reconciled per §6.
- **Reasoning:** Flagged during the OS-0991–1000 batch.
- **Priority:** Low — needs verification.

## DI-026 — Possible duplicate: Pimen the Faster of the Kiev Caves

- **Status:** open · **Saint IDs:** OS-1133, OS-1788
- **Description:** OS-1133 "Pimen the Faster of the Far Caves" and OS-1788 (Kuksha & Pimen of the Near
  Caves, AKA "Pimen the Faster") may conflate two distinct Pimens, or be the same. OS-1133's own
  Identity section asserts distinctness.
- **Recommended action:** Source-check the Caves Patericon; document distinctness or merge per §6.
- **Reasoning:** Flagged OS-1121–1140 batch. **Priority:** Low.

## DI-027 — Possible triple-duplicate: Hilarion the Georgian

- **Status:** ✅ RESOLVED (2026-07-06) · **Saint IDs:** OS-0661, OS-2220, OS-2663
- **Description:** Three rows carry "Hilarion the Georgian"; OS-2220 and OS-2663 also share the epithet
  "Hilarion the Wonderworker of Thessalonica." Strong conflation/duplication risk among the three.
- **Recommended action:** Source-check; reconcile/merge per §6 (likely 2-3 rows → 1-2).
- **Reasoning:** Flagged OS-1101–1120 batch (drove a no-link decision on OS-1106). **Priority:** Medium.
- **Resolution (2026-07-06):** §6 merge — retired OS-2663 into OS-2220 (Hilarion the Georgian / Wonderworker of Thessalonica, †875, Nov 19). Web-verified (OCA / Sanidopoulos): OS-2220 = OS-2663 are one saint; the third row **OS-0661** (Hilarion *the New*, †1864, Feb 14) is a genuinely distinct 19th-c. namesake and was left untouched. Feast kept at Nov 19 (the 'Dec 2' seen in some sources is the Old-Calendar equivalent, not a second feast).

## DI-028 — Possible duplicate: George of Mytilene

- **Status:** open · **Saint IDs:** OS-0957, OS-1186
- **Description:** OS-0957 "George the Confessor of Mytilene" (Apr 7) and OS-1186 "George of Mytilene"
  (May 16) may be the same iconodule hierarch on two feasts; OS-1186 flags the identity as unresolved.
- **Recommended action:** Source-check the bishops of Mytilene; merge per §6 or document distinctness.
- **Reasoning:** Flagged OS-1181–1200 batch. **Priority:** Low.

## DI-029 — Possible duplicate: Alexander of Rome / Marcianopolis

- **Status:** open · **Saint IDs:** OS-1162, OS-2449
- **Description:** OS-1162 "Alexander of Rome" (May 13) and OS-2449 "Alexander of Marcianopolis"
  (Feb 25) both describe a young soldier-martyr under Maximian buried in Thrace by his mother Pimenia.
  Likely the same saint under two feasts.
- **Recommended action:** Source-check; merge per §6 or document distinctness.
- **Reasoning:** Flagged OS-1161–1180 batch. **Priority:** Low.

## DI-030 — Duplicate: Joanikije Lipovac, Metropolitan of Montenegro

- **Status:** ✅ RESOLVED (2026-07-06) · **Saint IDs:** OS-1287, OS-1291
- **Description:** OS-1287 "Hieromartyr Joannicius of Serbia" and OS-1291 "Hieromartyr Joanikije,
  Metropolitan of Montenegro" are the **same person** — Joanikije (Jovan) Lipovac, Metropolitan of
  Montenegro and the Littoral, b. Stoliv 1890, killed at Aranđelovac 18 Jun 1945, canonized 1999,
  feast Jun 4.
- **Recommended action:** Merge/retire per §6 (keep one canonical row).
- **Reasoning:** Flagged OS-1281–1300 batch; both left unlinked (self-reference would be wrong).
- **Priority:** Medium — confirmed same person.
- **Resolution (2026-07-06):** §6 merge — retired the OS-1287 stub into the correctly-identified OS-1291 (Joanikije Lipovac, Metropolitan of Montenegro; killed 1945, canonized 1999). Kept the richer/correctly-named row per §6's richness clause.

## DI-031 — Possible conflation: James the Penitent

- **Status:** open · **Saint IDs:** OS-1349, OS-0772
- **Description:** OS-1349 "James the Penitent" and OS-0772 "James the Faster of Phoenicia" share the
  same vita shape (renounced all, fell through pride, did long penance, restored with discernment).
  OS-1349 disclaims only James the Solitary (OS-2256), not OS-0772.
- **Recommended action:** Synaxarion check; merge per §6 or document distinctness. **Priority:** Low.

## DI-032 — Possible duplicate: Mark "John Mark"

- **Status:** open · **Saint IDs:** OS-1061, OS-1911
- **Description:** OS-1061 "Apostle & Evangelist Mark" and OS-1911 "Apostle Mark of the Seventy, Bishop
  of Byblos" both alias "John Mark." Likely a conflation/overlap of the Evangelist with the Seventy-Mark.
- **Recommended action:** Source-check; document distinctness or merge per §6. **Priority:** Low.

## DI-033 — Possible duplicate: Hippolytus of Rome

- **Status:** open · **Saint IDs:** OS-0562, OS-1697
- **Description:** OS-0562 "Hieromartyr Hippolytus of Rome and Companions" and OS-1697 "Hippolytus of
  Rome and those with him" (the Laurence-cycle martyr-jailer, Aug 13) may overlap/duplicate. Note the
  tradition itself conflates the martyr with Hippolytus the theologian.
- **Recommended action:** Source-check; document distinctness or merge per §6. **Priority:** Low.

## DI-034 — Possible duplicate: Eudokia / Ia of Persia

- **Status:** open · **Saint IDs:** OS-1640, OS-1823
- **Description:** OS-1640 "Martyr Eudokia of Persia" and OS-1823 "Ia of Persia" (both Aug 4, Persian
  captivity under Shapur II); OS-1640's own prose notes hagiographers suspect the two Passions are the
  same saint.
- **Recommended action:** Source-check; merge per §6 or document distinctness. **Priority:** Low.

## DI-035 — Possible duplicate: Gerasimus of Cephalonia

- **Status:** ✅ RESOLVED (2026-07-06) · **Saint IDs:** OS-0063, OS-1716
- **Description:** OS-0063 "St. Gerasimos of Kefalonia" and OS-1716 "Gerasimus the New Ascetic of
  Cephalonia" — same epithet, island, and feasts (Oct 20 + Aug 16 translation). Almost certainly the
  same saint.
- **Recommended action:** Merge/retire per §6 (keep OS-0063, the lower-numbered/richer). **Priority:** Medium.
- **Resolution (2026-07-06):** §6 merge — retired OS-1716 into OS-0063 (Gerasimos of Kefalonia); fuller Brief Life + Sources merged.

## DI-036 — Possible duplicate: Macarius of Pelekete

- **Status:** ✅ RESOLVED (2026-07-06) · **Saint IDs:** OS-0917, OS-1734
- **Description:** OS-0917 "Macarius the Confessor of Pelekete" (Apr 1) and OS-1734 "Macarius of
  Pelekete" (Aug 18) — both Makarios, igumen of Pelekete, b. c.785, orphaned, iconoclast confessor.
  OS-1734's own sources cite both OCA feast pages.
- **Recommended action:** Source-check; merge per §6 (keep OS-0917). **Priority:** Medium.
- **Resolution (2026-07-06):** §6 merge — retired OS-1734 into OS-0917 (Macarius the Confessor of Pelekete); Aug 18 feast + Exile merged (feast now Apr 1; Aug 18).

## DI-037 — Probable duplicate: the Bakhtrioni martyrs (Bidzina, Shalva, Elizbar)

- **Status:** ✅ RESOLVED (2026-07-06) · **Saint IDs:** OS-1863, OS-2658
- **Description:** OS-1863 "Bidzini, Elizabar, and Shalvi of Georgia" (Sep 18, 17th c.) and OS-2658
  "Bidzina, Elizbar, and Shalva" (Sep 18, 17th c., Bakhtrioni) are the same three Georgian princely
  martyrs of the Bakhtrioni uprising — same feast, century, region, and the same three names.
- **Recommended action:** Merge/retire per §6 (keep the lower/richer of the two). **Priority:** Medium.
- **Resolution (2026-07-06):** §6 merge — retired OS-2658 into OS-1863 (Bakhtrioni martyrs Bidzina/Elizbar/Shalva); Georgian-script + Cholokashvili/Ksani names, Faith virtue, and 1661 dating merged.

## DI-038 — Wrong cross-reference ID in OS-1814 Notes

- **Status:** ✅ RESOLVED (2026-07-06) · **Saint IDs:** OS-1814 (ref to Mamas)
- **Description:** OS-1814's CSV Notes cite "Martyr Mamas of Caesarea (OS-0120)", but Mamas is
  **OS-0065** and **OS-0120 does not exist** in saints.csv. (The OS-1814 *profile* correctly links
  OS-0065; only the CSV Notes ID is wrong.)
- **Recommended action:** Edit OS-1814 Notes: OS-0120 → OS-0065. **Priority:** Low (trivial fix).
- **Resolution (2026-07-06):** Corrected OS-1814 Notes cross-reference OS-0120 → OS-0065 (Mamas of Caesarea).

## DI-039 — Probable duplicate: Martyrs David and Constantine of Georgia

- **Status:** ✅ RESOLVED (2026-07-06) · **Saint IDs:** OS-1940, OS-2660
- **Description:** OS-1940 "Martyrs David and Constantine, Princes of Georgia" and OS-2660 "Martyrs David
  and Constantine of Argveti" — same two 8th-c. Georgian princely brothers (Oct 2) who resisted the
  Arab invasion under Marwan. Same feast, century, region, names.
- **Recommended action:** Merge/retire per §6 (keep the richer row). **Priority:** Medium.
- **Resolution (2026-07-06):** §6 merge — retired OS-2660 into OS-1940 (David & Constantine of Argveti); Georgian names + Motsameta note merged.

## DI-040 — Probable duplicate: Damaris of Athens

- **Status:** ✅ RESOLVED (2026-07-06) · **Saint IDs:** OS-1947, OS-2582
- **Description:** Both "Damaris of Athens," Convert, Greece, Apostolic Age (1st c.), feast Oct 3 — the
  woman converted by Apostle Paul at the Areopagus (Acts 17:34). Near-certain duplicate. (Note OS-1947
  has no profile YAML; OS-1942 hrefs OS-1947.)
- **Recommended action:** Merge/retire per §6 (keep OS-1947, the lower/referenced). **Priority:** Medium.
- **Resolution (2026-07-06):** §6 merge — retired OS-2582 into OS-1947 (Damaris of Athens, Acts 17:34); Pan-Orthodox + the OS-1942 commemoration note merged.

## DI-041 — Same person split: Simon the Monk / Stephen the First-Crowned of Serbia

- **Status:** ✅ RESOLVED (2026-07-06) · **Saint IDs:** OS-1902, OS-1904
- **Description:** OS-1902 "Venerable Simon the Monk of Serbia" is the monastic name (deathbed tonsure)
  of OS-1904 "Stephen the First-Crowned." OS-1902 already cross-references OS-1904 as "the same person
  honoured in his royal office." This may be an intentional documented-distinct pair OR a duplicate.
- **Recommended action:** Decide between §6 merge or documented-distinct (Notes cross-ref both ways).
  **Priority:** Medium.
- **Resolution (2026-07-06):** §6 merge — retired the OS-1902 'Simon the Monk' stub into OS-1904 (Stephen the First-Crowned; monastic name Simon). Web-verified as one saint (feast Sep 24); kept distinct from his father St Simeon the Myrrh-gusher (Stefan Nemanja).

## DI-042 — Probable duplicate: Thais of Egypt

- **Status:** ✅ RESOLVED (2026-07-06) · **Saint IDs:** OS-1142, OS-2747
- **Description:** OS-1142 "Blessed Thais of Egypt" and OS-2747 "Venerable Thais of Egypt (the Penitent)"
  — both Female, Egypt, feasts Oct 8 + May 10, the reformed courtesan converted by Abba (Paphnutius/
  Serapion). Likely the same saint.
- **Recommended action:** Source-check; merge per §6 (keep the richer/lower). **Priority:** Medium.
- **Resolution (2026-07-06):** Verified **NOT a duplicate** — kept as **documented-distinct**. Web-checked (OCA May 10 vs Oct 8): the **May 10** 'Blessed Taisia' follows the *Apophthegmata* Paësia story (converted by St John the Dwarf/Colobos), while the **Oct 8** 'Thais the Penitent' is the *Lausiac History* courtesan converted by St Paphnutius and enclosed three years — different converters, centuries, and life-arcs. The register's 'likely same' was mistaken. Mutual Notes cross-refs strengthened with the conflation note. (Content flag: OS-1142's Brief Life understates the fall/repentance in the OCA May 10 account — for a later content pass.)

## DI-043 — Benjamin the Deacon of Persia split across two rows

- **Status:** open · **Saint IDs:** OS-0911, OS-2014
- **Description:** OS-0911 "Hieromartyr Avdas… and Martyr Benjamin the Deacon" (Mar 31) already bundles
  Benjamin the Deacon into Avdas's commemoration, while OS-2014 is a standalone "Benjamin the Deacon of
  Persia" (Oct 13). The same 5th-c. Persian deacon-martyr appears as both a bundled name and a separate
  row. (NB: OS-0911 is also in DI-023 re: Avdas/Abdas.) Conflation guard: OS-0229 is a *different* Abdas.
- **Recommended action:** Source-check the two feasts; if one saint, keep OS-2014 standalone and remove
  Benjamin from OS-0911's name, OR document-distinct. **Priority:** Low.

## DI-044 — Possible duplicate: New Martyr Paisius (Belgrade 1814)

- **Status:** ✅ RESOLVED (2026-07-06) · **Saint IDs:** OS-2380, OS-2637
- **Description:** OS-2380 "New Martyr Paisius of Trnava" and OS-2637 "New Martyr Paisius the Hegumen of
  Serbia" — both 19th-c. Serbian neomartyrs commemorated Dec 17 alongside Deacon Avakum (martyred at
  Belgrade, 1814). OS-2379 (Avakum) links its companion Paisius to OS-2637; OS-2380 links back to OS-2379.
  May be the same hegumen-martyr (Paisije of Moštanica) under two place-epithets.
- **Recommended action:** Source-check; if same, merge per §6. **Priority:** Medium.
- **Resolution (2026-07-06):** §6 merge — retired OS-2637 into OS-2380 (New Martyr Paisius / Pajsije Ristović of Trnava, †Belgrade 1814 with Deacon Avakum OS-2379). Web-verified same saint; OS-2637's 'Hegumen of Moštanica' label was an error (Moštanica was Avakum's house — Paisius was hegumen of Trnava) and is corrected. Inbound link on OS-2379 re-pointed.

## DI-045 — Probable duplicate: Martyr Alexander of Thrace (the Pimenia legend)

- **Status:** ✅ RESOLVED (2026-07-06) · **Saint IDs:** OS-2449, OS-2480
- **Description:** OS-2449 "Martyr Alexander of Marcianopolis" (Feb 25) and OS-2480 "Martyr Alexander the
  Soldier of Rome" (May 13) — both Alexander of Thrace, a Roman soldier under Maximian whose mother
  **Pimenia** recovers and buries his body. The distinctive mother-Pimenia legend and near-identical
  profiles indicate the same saint under two feast days.
- **Recommended action:** Source-check; merge per §6 (record both feasts on the keeper). **Priority:** Medium.
- **Resolution (2026-07-06):** §6 merge — retired OS-2480 into OS-2449 (Alexander the Roman; the mother-Pimenia / River-Ergina martyrdom). Web-verified one saint under two dates; recorded both feasts **Feb 25** (Greek synaxaria) + **May 13** (Slavic). NB: a possible further overlap with 'Alexander of Rome' OS-1162 (DI-029) remains OPEN.

## DI-046 — Probable duplicate: Peter I (the Martyr), Archbishop of Alexandria

- **Status:** ✅ RESOLVED (2026-07-06) · **Saint IDs:** OS-2252, OS-2726
- **Description:** OS-2252 "Hieromartyr Peter, Archbishop of Alexandria" and OS-2726 "Hieromartyr Peter,
  Patriarch of Alexandria" — both Peter I "the Martyr" of Alexandria (martyred 311, feast Nov 25), the
  predecessor of Achillas (OS-2727). Achillas's companion card points to OS-2252; the OS-2726→OS-2727 link
  points the other way — an asymmetry caused by the duplicate.
- **Recommended action:** Merge/retire per §6 (keep the richer/lower OS-2252); reconcile Achillas's link to
  the survivor. **Priority:** Medium.
- **Resolution (2026-07-06):** §6 merge — retired OS-2726 into OS-2252 (Peter I 'the Martyr', Archbishop of Alexandria, †311, Nov 25). Achillas (OS-2727) already links to OS-2252, so the companion-link asymmetry is resolved.

