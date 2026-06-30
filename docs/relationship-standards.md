# OrthodoxSaintFinder Relationship Database Standards

**Version 1.3** (v1.0 owner; v1.1 guardrails; v1.2 the historical-accuracy principle; v1.3 — at
the OS-0300 health review — adds the note-prefix convention and the milestone-based reciprocity
sweep, and simplifies the promotion ladder to **Candidate → Recommended → Official**.)

## Purpose

The goal is to transform OrthodoxSaintFinder into a *relational* database of Orthodox
saints rather than simply a collection of biographies. Every saint page should connect
naturally to other saints through family, historical relationships, shared ministries,
common monastic traditions, geography, theology, and liturgical commemorations.

**Consistency is more important than maximizing the number of relationships.**

---

## The four relationship sections

Every saint profile contains four relationship sections. Their mapping onto the data model:

| Section | Where it lives | Field |
|---|---|---|
| **Family** | `src/content/profiles/OS-####.yaml` | `family.figures[]` |
| **Companions & Contemporaries** | `OS-####.yaml` | `companions[]` |
| **Related Saints** | `OS-####.yaml` | `related[]` |
| **Commemorated With** | `data/groups.csv` + `data/saint_groups.csv` | group join (NOT authored in YAML) |

Whenever possible, use the Saint ID from the master spreadsheet (`data/saints.csv`).
**Never invent Saint IDs.** If a person is not a commemorated saint, render a plain card
(`commemorated: false`, no `href`). If you cannot confidently match a saint to a row, leave
a plain card with no `href` and flag it for review.

Never omit an obvious historical relationship simply because it was not explicitly mentioned
in one biography.

---

## Formatting standard

Each `Relationship Type | Saint ID | Name` line becomes one object:

```yaml
companions:
  - name: Apostle Paul                 # Name
    note: Jointly commemorated June 29 as the Chief Apostles   # Relationship Type / reason
    href: saint/OS-2749                # Saint ID → saint/OS-####
  - name: Zebedee                      # not a commemorated saint
    note: Father
    commemorated: false                # quiet "not commemorated" marker, no link
```

- `note` carries the relationship type and/or its historical reason.
- Every relationship must have a clear historical or ecclesiastical reason.
- **Do not list the same saint twice on one profile.** If a saint qualifies for both
  `companions` and `related`, put them in the stronger/more specific bucket — `companions`
  when the saint personally knew them.

### Note-prefix convention (v1.3 — guidance, not a schema change)
Begin each `note` with a **standardized relationship-type phrase**, then free prose for the
reason. This keeps notes consistent and future-searchable across thousands of profiles. Prefer
these prefixes (extend only when none fits):
- **Family:** `Father` · `Mother` · `Brother` · `Sister` · `Son` · `Daughter` · `Spouse` ·
  `Betrothed` · `Grandfather/Grandmother` · `Foster father/mother` · `Cousin` · `Uncle/Aunt`
- **Companions:** `Teacher` · `Disciple` · `Spiritual father/child` · `Fellow <Apostle |
  soldier-martyr | virgin-martyr | monastic | hierarch | …>` · `Successor` · `Predecessor` ·
  `Ordained by` · `Consecrated by` · `Co-martyr` · `Correspondent` · `Persecutor`
  (with `commemorated: false`)
- **Related:** `Same monastery: <name>` · `Same see: <name>` · `Same city: <name>` ·
  `Same persecution: <name>` · `Fellow <category>` · `Equal-to-the-Apostles` · `Holy Unmercenary` ·
  `Inspired by` · `Prefigured by` / `Type of` · `Theological heir` · `Monastic model` (studied an
  earlier founder's Typikon/example) · `Translated` (rendered an earlier author's works) ·
  `Hagiographer` / `Hagiographer of` (wrote, or is the subject of, the other's Life) ·
  `Later patron` (a saint venerated/invoked by the other in a later era)
Example: `note: Fellow soldier-martyr; both suffered under Diocletian.`

---

## FAMILY

Only actual family relationships: Mother, Father, Brother, Sister, Grandfather,
Grandmother, Son, Daughter, Spouse, Betrothed, Foster Father/Mother, Stepbrother (when
appropriate), Cousin, Uncle, Aunt.

## COMPANIONS & CONTEMPORARIES

Only people whom the saint almost certainly knew personally or directly interacted with.
Types: Teacher, Disciple, Fellow Apostle, Fellow Bishop, Fellow Monk/Nun, Fellow Martyr,
Missionary Companion, Spiritual Father/Child, Mentor, Ordained/Consecrated By, Successor,
Predecessor, Emperor, Persecutor, Ruler, Miracle Witness, Benefactor, Correspondent.

## RELATED SAINTS

Saints connected historically, geographically, spiritually, or thematically but who may not
have personally known one another. Every related saint must have a stated reason. Types
include: Same Region/City/Monastery, Founder of Same Monastery, Same Mission/Era/Persecution,
Church Father, Desert Father/Mother, Wonderworker, Equal-to-the-Apostles, Holy Unmercenary,
Hesychast, Fool for Christ, Missionary, Martyr, Confessor, Hierarch, Ascetic, Theological
Influence, Inspired/Prefigured By, Ancestor, Shared Patronage, Shared Spiritual Tradition.

## COMMEMORATED WITH

**Only official liturgical commemorations**, handled through the group taxonomy
(`data/groups.csv` + `data/saint_groups.csv`), never authored manually inside profile YAML.
Do NOT include friends, teachers, disciples, or family members here unless they are
officially commemorated together.

---

## Guiding principle: historical accuracy over symmetry (v1.2)

**The goal is historical accuracy, not visual symmetry.** Not every saint should have the same
number of relationships. If a saint genuinely has only a few well-supported connections, leave
the profile **sparse** rather than inventing weak or speculative links to make the page feel
complete (e.g. Stylianos of Paphlagonia OS-0062 — left blank, no defensible links). Conversely,
major figures (Christ, the Apostles, Anthony the Great, Basil the Great, Nicholas, …) will
naturally become **hubs** with many links — that reflects history and is expected.

**Relationship quality — prefer** (each needs a clear historical / ecclesiastical / traditional
reason):
- historically documented relationships
- well-established Orthodox tradition
- direct teacher/disciple relationships
- family relationships
- participation in the same historical events
- shared monastic communities
- clearly defined spiritual traditions

**Insufficient on its own** (superficial similarity — do NOT link on these alone):
- same patronage alone
- same virtue alone
- similar reputation alone

When in doubt, omit the link.

## Guardrails (v1.1 — discovered during Batch 1)

These are binding conventions to keep cross-linking historically defensible.

### Conflation Guard
Do **not** equate two figures who share a name absent a clear dataset identity. Specifically:
**Simon, the brother of the Lord** (step-son of Joseph the Betrothed) is **not** to be
equated with **Simeon son of Cleopas** (OS-1069, the cousin/kinsman tradition, 2nd bishop of
Jerusalem) unless the dataset clearly identifies them as the same person. Leave uncertain
figures (e.g. Joses, Simon) as **plain cards with no `href`.**

### Emmaus Tradition Guard
Luke may be linked to **Cleopas of Emmaus** (OS-2513), but the `note` must make clear this is
a **traditional identification, not explicit Scripture** (e.g. "By tradition the companion
with whom he met the risen Christ on the road to Emmaus"). Apply the same care to any link
that rests on tradition rather than the biblical text.

### Deacon-saint inclusion guard
Do **not** include **Nicolaus of Antioch** among the saints (in the Seven Deacons or the
Holy Archdeacons templates) unless the dataset explicitly carries a commemorated saint
record for him — tradition disputes his sanctity. Absent such a row, omit him (do not even
render a plain card implying sainthood).

### Reciprocity convention (v1.3 — milestone sweeps)
**Intentionally one-directional links are correct and are preserved.** A later figure may cite a
**founder**, an **inspiration**, or a **typological** forebear (e.g. Moses the Black → Anthony
the Great; Joshua → Christ, "the new Joshua") without the hub linking back. Do **not** force
return links on these — founders/hubs stay curated to their peers and contemporaries.

For **peer** relationships and **teacher↔disciple** pairs reciprocity is expected, but it is **no
longer tracked link-by-link**:
- **Within a batch** — complete reciprocity whenever both ends fall in the current Saint-ID range.
- **Across batches** — out-of-range reciprocity is resolved in a **milestone reciprocity sweep**
  at each hundred-boundary (covering that hundred's clusters), not as an ever-growing per-link
  to-do list.
The bucket may differ across the two profiles (a contemporary can be a `companion` on one side
and a parallel-founder `related` on the other).

### No duplicate cards (reinforced — Batch 3)
A saint must not appear in more than one of `family`/`companions`/`related` on the *same*
profile (it renders the same card twice). Put them in the single strongest bucket. (Batch 3
fixed this in OS-0031, OS-0034, OS-0035.)

### Tradition-vs-Scripture notes generally
When a relationship rests on tradition, hagiography, or apocryphal sources (e.g. the
Protoevangelium of James) rather than canonical Scripture, the `note` should signal it
("by tradition", "traditional"). Never present a traditional identification as fact.
