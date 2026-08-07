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

The grant is carried in the data as a **revocable permission token**, never folded
into the public-domain gates it has to pass. A permission is not a license, and the
two must stay distinguishable so a revocation can be executed mechanically rather
than by memory.

- **The registry** is `data/text_permissions.csv`, `source_slug` **`oca`** — the
  sibling of `data/image_permissions.csv`, and a **separate file on purpose**: the
  OCA granted its texts and said plainly it cannot grant its icons, so a text grant
  must never be reachable from the image gate.
- **Hymn texts** live in `data/saint_hymns.csv` with `translation = Permission:oca`.
  `build.py`'s `validate_saint_hymns()` resolves that token against the registry and
  **requires a `source_url`** — condition (a) is attribution *and* a link back, so a
  permission text with nowhere to link cannot honour the terms it was given under.
  The alternative arm of the same gate still accepts a genuinely public-domain
  translation, unchanged.
- **The attribution renders beside the text**, not in a page-level footnote: the
  saint page's "In the Church's hymns" block prints the registry's `attribution`
  line as a link to the hymn's own oca.org page. The credit is the condition the
  text is used under, so it travels with the text.
- **`status=revoked` is the kill-switch.** `to_record()` drops every hymn whose
  source is unknown or revoked, so the text stops shipping without touching a single
  saint row, and validation warns (rather than fails) listing what to delete.

Still to do as the grant is used further:

- OCA-sourced text should be excluded from, or clearly marked in, the bulk artifacts
  (`dist/Orthodox_Saints_Database.xlsx`, `public/saints.sqlite`), which are
  redistributable in a way a web page is not. Not yet needed — no OCA text reaches
  them today — but it must be settled before it does.
- Lives-of-the-saints text (the other half of the grant) has no join table yet;
  everything in `Brief Life` and the profile prose remains our own wording.

## Server access — separate from the grant, and not to be confused with it

**Permission to use the texts is not permission to crawl the server.** The two are
independent, and this project has already muddled them once.

### The 403s (2026-06 → 2026-08-07)

An early run of `scripts/download_saint_hymns.py` fetched all 366 day-pages in one
pass while **every** request returned 403. We read that as a burst having tripped a
rate limiter and earned an IP ban, wrote that account into the script, and stopped
harvesting — falling back to the manual daily walk, where each day's troparia are
pasted in by hand and joined to `OS-####` by us.

That diagnosis was wrong in both halves, and it cost roughly two months of a
workflow that did not need to be manual.

### What it actually was

Asked about the blocks, V. Rev. John Schroedel (Technical Manager, OCA) replied on
2026-08-07 that our address appeared on no block list, and asked what user agent we
were sending — noting the OCA also blocks by user agent. Testing from
`76.104.36.100` against `/saints/troparia/2015/08/07`:

| Request | Result |
|---|---|
| `CloudOfWitnesses/1.0 (+…; contact@…) permission-granted text harvest` | **403** |
| curl default UA | 200 |
| `CloudOfWitnesses/1.0` | 200 |
| `CloudOfWitnesses/1.0 (+…; contact@…)` | 200 |
| `CloudOfWitnesses/1.0 permission-granted text` | 200 |
| `CloudOfWitnesses/1.0 harvest` | **403** |
| `Mozilla/5.0 harvest` | **403** |
| urllib, clean UA / UA with `harvest` | 200 / **403** |

The trigger is a substring match on the single word **`harvest`**, from any client.
The response is a bare nginx 403 (146 bytes, no Cloudflare headers) — their origin,
refusing on the user-agent string, on every request independently. There was never a
rate limit and never an IP block.

A second belief fell with it: the script had shelled out to `curl` because `urllib`
was thought to be fingerprinted at the TLS layer. It is not. Both clients behave
identically; the earlier comparison must have used unlike UA strings. `fetch_day()`
is back on `urllib` and now prints the HTTP status, which is what would have made
this a one-request diagnosis instead of a two-month assumption.

### Standing rules

- **Never put `harvest` in the User-Agent**, nor `scrape`, `crawler`, `spider`, or
  `bot`. Identify who is calling, not what is being done to their server. The UA is
  now `CloudOfWitnesses/1.0 (+https://orthodoxsaintfinder.com; contact@…)`.
- **Read the response body and status before theorising.** A 403 is a message about
  this client. Ours said so from the first request.
- **The politeness brakes stay** — sequential fetches, the agreed delay, on-disk
  cache, abort after 3 consecutive failures.
- **12 seconds between requests is the OCA's own number, not ours.** See below. It is
  a floor, not a target: `--delay` may be raised, never lowered.

### The agreed rate (settled 2026-08-07)

The ambiguity in "one page per day" was put back to Fr. John directly, describing the
job as 366 pages in a single pass, four seconds apart. He replied:

> "Can you space this out a bit more, maybe once every 12 seconds?"

That settles both halves. **A full 366-page pass is acceptable**, and **12 seconds is
the spacing they asked for** — so the script's default `--delay` is now `12.0`. A
complete harvest therefore takes about 75 minutes, which is the correct trade: their
server's comfort against our convenience, decided by them.

This number came from asking rather than inferring, and that is the durable lesson of
this whole episode. Both prior beliefs about oca.org — the IP ban and the TLS
fingerprint — were confident inferences from a failure nobody had read, and they cost
two months. One email settled what months of theorising did not.

If a future job needs a different pattern (a second pass, a different section of the
site, anything materially heavier), **ask again**. The grant is a courtesy and so is
this rate; neither is a standing entitlement to whatever we decide is reasonable.

## To revoke (if permission is ever withdrawn, or the site ceases to be free)

1. Set `status=revoked` for `oca` in `data/text_permissions.csv`. The build then
   excludes every OCA text from output and warns, listing the rows to delete.
2. Delete the `Permission:oca` rows from `data/saint_hymns.csv` (and any later join
   table), and any OCA-sourced text from the profile YAML that carries it.
3. Set this record's status to `revoked`, with the date and reason.
4. Run `make validate` and confirm clean, then redeploy so the edge cache is purged.

## Provenance

Requested by email to the OCA Communications Team (2026-07-16), granted by reply
from Fr. Kyle Parrott (2026-07-18). Liturgical texts requested separately from the
Department of Liturgical Music and Translations (2026-07-30), granted by reply from
Fr. Phillip the same day, copying Fr. Kyle. Personal contact details are
intentionally omitted from this public record; the original correspondence is
retained privately by the site owner.

Server-access correspondence with V. Rev. John Schroedel, Technical Manager,
2026-08-07 (see "Server access" above), same convention: the reply is quoted where it
sets a rule, personal contact details omitted.

## Standing caveat

Permission to reproduce is not review. Everything §9 says about clergy review still
applies: an OCA text is reliably *sourced*, but its selection, placement, and framing
on this site remain ours to get right.
