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

| Missing Saint | Referenced By | Section | Relation | Feast | Notes | Status |
|---|---|---|---|---|---|---|
| Saint Basil the Elder | OS-0021 | Family | father | ~May 30 | Commemorated with his wife St Emilia (already `OS-0374`) | todo |
| Saint Naucratius | OS-0021 | Family | brother | ~Jun 8 | Brother of Basil the Great & St Macrina the Younger | todo |
| Saint Amphilochius of Iconium | OS-0021 | Companions | close friend & correspondent | Nov 23 | Bishop of Iconium; *On the Holy Spirit* was dedicated to him. Distinct from `OS-0291` / `OS-1991` / `OS-2006` | todo |
