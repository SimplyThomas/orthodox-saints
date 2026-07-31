# Text permission — Orthodox Church in America (oca.org)

**Grantor:** The Orthodox Church in America — <https://www.oca.org>
**Granted:** 2026-07-18 (lives of the saints) and 2026-07-30 (liturgical texts)
**Granted by:** Fr. Kyle Parrott, Director of Communications; Fr. Phillip, OCA
Department of Liturgical Music and Translations
**Requested by:** Shelby Krug, on behalf of A Cloud of Witnesses /
OrthodoxSaintFinder.com
**Status:** active
**Covers:** TEXT ONLY — the lives of the saints and the liturgical texts.
**Does NOT cover:** icons or any other imagery on oca.org (see "What is excluded").

This is the first **text** permission in the project; `data/image_permissions.csv`
and the vendor grants under this folder cover imagery only, and the OCA grant must
not be recorded there — the OCA explicitly cannot grant image rights.

## Grant

Two departments were asked in turn, because the first reply routed liturgical
material to a second office.

### 1. Lives of the saints — Fr. Kyle Parrott, 2026-07-18

> "The text of the lives of the saints may be used if a) an attribution is given to
> oca.org and b) the website is free, with no paywalls or other additional add-on
> services. If so, please feel free. We do not hold the copyrights to any of the
> icons used on oca.org and so we can't grant any specific permissions, however many
> are available from wikicommons. Permissions for use of liturgical music and texts
> should be given by the Department of Liturgical Music and Translations."

### 2. Liturgical texts — Fr. Phillip, 2026-07-30

> "You have permission to use the liturgical texts from the Orthodox Church in
> America with proper attribution, using whatever language or phrasing Fr. Kyle
> specified (if he gave specifics)."

Fr. Kyle was copied on the second reply, and it defers explicitly to his phrasing —
so **the two conditions from the first grant govern both**: attribution to oca.org,
and a site that is free with no paywalls or add-on services.

The request that was granted named "selected prayers, hymns, and liturgical texts …
such as troparia, kontakia, and other approved devotional texts," to be shown with
full attribution and links back to the original source.

## The two conditions

**1. Attribution to oca.org.** Every reproduced text carries a visible credit to the
Orthodox Church in America and, wherever the source page is known, a link back to it.
No text is presented as this site's own composition.

**2. The site stays free — no paywalls, no add-on services.** This is a standing
obligation on the **whole site**, not on the pages that carry OCA text, and it is the
condition most easily broken by a future decision rather than by a bad edit.
Introducing a paid tier, a members-only area, a subscription, or a paid add-on
service would **void this grant** — at which point either the arrangement is
renegotiated with the OCA or every OCA-sourced text comes down. Read this record
before any monetization work, however unrelated it looks.

Neither condition has an expiry, and neither grant is exclusive or transferable. Like
the vendor image grants, this is a **revocable courtesy, not an open license**: OCA
text must never be relicensed, redistributed as a dataset, or emitted into a
downloadable artifact as though it were public domain.

## What is excluded

- **Icons and imagery.** The OCA does not hold the copyrights to the icons on
  oca.org and stated plainly that it cannot grant permission for them. Nothing here
  loosens the §9 image gate: OCA icons may **not** be used. Fr. Kyle noted that many
  equivalents are on Wikimedia Commons, which is the route already used
  (`scripts/` downloader → `data/saint_images.csv`).
- **Liturgical music.** The request and the grant concern *texts*. Settings,
  scores, and recordings were not asked for and are not covered.
- **Third-party material appearing on oca.org.** The grant reaches what the OCA
  itself holds; a text on oca.org credited to another publisher is that publisher's
  to license.

## Terms as implemented

Not yet implemented — the grant is recorded here first so the terms are settled
before any text is ingested. When it is built, these are the requirements it must
satisfy:

- Every reproduced text is attributed to the Orthodox Church in America on the page
  where it appears, with a link to its oca.org source page.
- The copyright gates that currently admit only public-domain translations —
  `PD_TRANSLATION_RE` in `build.py` (saint quotes) and `PD_TRANSLATION` in
  `src/content.config.ts` (host-profile `prayers`) — must admit an explicit OCA
  permission token rather than being loosened generally. A permission is not a
  license, and the two must stay distinguishable in the data so a revocation can be
  executed mechanically.
- OCA-sourced text is excluded from, or clearly marked in, the bulk artifacts
  (`dist/Orthodox_Saints_Database.xlsx`, `public/saints.sqlite`), which are
  redistributable in a way a web page is not.

## To revoke (if permission is ever withdrawn, or the site ceases to be free)

1. Remove every row/field carrying the OCA permission token; the build's gates then
   reject anything left behind.
2. Delete the OCA-sourced text from the profile YAML that carries it.
3. Set this record's status to `revoked`, with the date and reason.
4. Run `make validate` and confirm clean, then redeploy so the edge cache is purged.

## Provenance

Requested by email to the OCA Communications Team (2026-07-16), granted by reply
from Fr. Kyle Parrott (2026-07-18). Liturgical texts requested separately from the
Department of Liturgical Music and Translations (2026-07-30), granted by reply from
Fr. Phillip the same day, copying Fr. Kyle. Personal contact details are
intentionally omitted from this public record; the original correspondence is
retained privately by the site owner.

## Standing caveat

Permission to reproduce is not review. Everything §9 says about clergy review still
applies: an OCA text is reliably *sourced*, but its selection, placement, and framing
on this site remain ours to get right.
