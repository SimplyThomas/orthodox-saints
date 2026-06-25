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
| St Vincent Madelgarus | OS-0282 | Family | father | — | Founder of Hautmont Abbey; 7th c. Gaul | todo |
| St Waldetrudis of Mons | OS-0282 | Family | mother | Apr 9 | Foundress of Mons Abbey; 7th c. | todo |
| St Aldetrudis | OS-0282 | Family | sister | Feb 25 | Predecessor as abbess of Maubeuge | todo |
| Landericus of Soignies | OS-0282 | Family | brother | — | 7th c. Gaul | todo |
| Dentlin of Soignies | OS-0282 | Family | brother | — | 7th c. Gaul | todo |
| St Aldegund | OS-0282 | Family | aunt | Jan 30 | Foundress of Maubeuge Abbey | todo |
| King Aethelberht of Kent | OS-0309 | Family | father | Feb 24/25 | First Christian Anglo-Saxon king | todo |
| Queen Bertha | OS-0309 | Family | mother | May 1 | Frankish Christian queen; 6th–7th c. | todo |
| Eanflaed | OS-0309 | Family | daughter | Nov 24 | 7th c. Northumbria | todo |
| Paulinus of York | OS-0309 | Companions | accompanied her to Northumbria | Oct 10 | 7th c.; distinct from Paulinus of Nola (`OS-0522`) | todo |
| St Eucherius of Lyon | OS-0352 | Family | father | Nov 16 | Archbishop of Lyon, monk of Lérins, †c.449 | todo |
| Salonius of Geneva | OS-0352 | Family | brother | — | Bishop of Geneva; 5th c. Gaul | todo |
| David the Monk of Lesbos | OS-0097 | Family | brother | Feb 1 | Ascetic of Mt Ida, fellow Confessor of Lesbos; 9th c. | todo |
| Eugene Botkin | OS-1541 | Companions | court physician who died with the Royal Family | Jul 17 | Canonized 2016 as righteous passion-bearer; 20th c. | todo |

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
