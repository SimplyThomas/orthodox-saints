# Image Display Permission

**A Cloud of Witnesses — orthodoxsaintfinder.com**

Version 1.0 · 2026-08-07 · standard terms

> This is the document we send to an icon publisher, workshop, or shop when we ask
> to show their images. It is written to be read by the person who has to decide,
> not by a lawyer. It is **not** a commercial license and not a contract for
> services — it is a plain statement of what we do with an image, what we will
> never do with it, and how to make us stop.
>
> Internal counterpart: [`README.md`](README.md) explains how a grant is recorded
> and enforced in the codebase. Email wording: [`emails.md`](emails.md).

---

## 1. Who is asking

**A Cloud of Witnesses** (orthodoxsaintfinder.com) is a free reference site that
helps people — mostly catechumens, inquirers, and parishioners — find and read
about Orthodox saints. Someone comes looking for a patron who shares their name,
their trade, or their circumstances, and leaves knowing who that saint was.

Some facts that bear on this request:

- **It is free, and stays free.** No paywall, no membership tier, no subscription,
  no paid add-ons. Nothing on the site is sold.
- **It carries no advertising.** No banners, no sponsored placements, no affiliate
  revenue.
- **It is non-commercial.** The site earns nothing. It is built and paid for by one
  person as a service to the Church.
- **It is open-source.** The data and the code are public, so what we claim here can
  be checked rather than taken on trust.
- **It is not authoritative.** We say plainly on the site that the material has not
  been reviewed by competent clergy, and we correct errors when they are reported.

## 2. What we are asking for

Permission to **display images of icons from your catalogue** on the pages of this
site where they belong — a saint's page, a feast's page, or an angel's page — with
a visible credit naming you and a link back to that icon's own page on your site.

That is the whole of the ask. We are not asking for files to redistribute, for
rights to sell anything, or for exclusivity.

## 3. What we do with your images

Precisely this, and nothing else:

1. **We host our own copy.** We download the image once and serve it from our own
   site. We never hotlink your server, so this costs you no bandwidth and cannot
   break a page of yours by changing.
2. **We resize it.** Images are scaled to a maximum of 800 pixels and saved as JPEG
   at quality 80 — roughly 80 KB. A second, smaller copy (about 200 pixels) is made
   for list and avatar views. The result is good enough to recognise an icon and
   too small to be a substitute for buying a print from you.
3. **We may crop to fit.** Width is scaled first; if the image is still too tall it
   is cropped from the bottom, which preserves the face. We do **not** remove,
   crop out, or obscure a watermark, signature, or mark of your ownership — if our
   framing would do that on a particular image, tell us and we will reframe it or
   drop it.
4. **We place it on the relevant page** — either as the main portrait at the top, or
   as a card in that page's "Depictions & Icons" row, or both.
5. **The small copy also appears in listings** — search results, the patron-saint
   quiz, and card grids elsewhere on the site — always linking through to the page
   that carries your credit.
6. **Every placement credits you and links to you.** See §5.
7. **Link previews.** When someone shares a saint's page on social media, the
   preview thumbnail for that page is the saint's portrait. So your image may
   appear in a shared link preview — always attached to a page that names you and
   links to you.
8. **We count outbound clicks.** Clicks on the links back to your site are counted
   by privacy-respecting analytics (no personal data, no cross-site tracking). We
   are glad to share those numbers with you on request.

## 4. What we never do

- **We never sell, license, sublicense, or redistribute your images**, or pass them
  to anyone else for any purpose.
- **We never offer them for download.** No downloads, no bulk export, no data dump,
  no API returning your images. Our published spreadsheet and database exports carry
  **text only** — no image files and no image paths.
- **We never use them in print, on merchandise, in advertising, or in anything
  sold**, by us or by anyone else.
- **We never claim ownership**, and we never imply that you endorse the site, its
  contents, or anything said on it.
- **We never use them to train machine-learning models**, and we never supply them
  to a third party for that purpose.
- **We never alter them** beyond the resizing and cropping described in §3 — no
  filters, no recolouring, no overlaid text, no composites.
- **We never put them behind a paywall or a login.** The site has neither. If that
  ever changed, this permission would end (see §7).
- **We never relabel a permission as an open license.** Your images are marked in
  our data as used by permission, kept separate from the public-domain material, and
  are never emitted as though they were freely reusable.

## 5. Credit and link-back

Every image you permit carries, on the page it appears on:

- **a visible credit naming you** — by default: *"Icon used with permission from
  [your name]."*
- **a link to that specific icon's own page on your site**, labelled *"Original
  icon: View on [your name]"* — not a link to your homepage, and not a search
  result, but the page for that icon.

**You choose the wording.** If you would rather the credit read differently, name a
particular workshop or iconographer, or point somewhere else, tell us and we will
use what you ask for.

This is not merely a promise. Our build refuses to publish an image used by
permission unless it carries a link back to its source page — a missing link fails
the build rather than shipping quietly.

## 6. The shape of the permission

- **Non-exclusive.** You keep every right you have, and may grant the same or more
  to anyone else.
- **No money, in either direction.** No fee, no royalty, no affiliate commission, no
  obligation on us to buy and none on you to give. If you would prefer we route the
  outbound links through your own tracking or affiliate URLs, we are happy to — say
  the word.
- **Not transferable.** The permission is to this site as it stands. If it were ever
  handed to someone else, the permission would end and whoever took it over would
  have to ask you afresh.
- **Open-ended.** There is no term and no renewal. It lasts until you end it.
- **Only what is yours to give.** It covers images you own or control. If something
  in your catalogue belongs to a third party, tell us and we will not use it.
- **It creates no partnership** and obliges you to do nothing at all.

## 7. How to end it

**One email to contact@orthodoxsaintfinder.com.** No reason needed, no notice
period, no form to fill in.

What happens then:

1. We set your entry in our permission registry to `revoked`. That is a kill switch:
   the build then drops **every** image of yours from the published site at once,
   everywhere it appears. Nothing has to be found by hand.
2. We delete the image files.
3. We publish the change, and clear the cache in front of the site so the images
   stop being served.
4. We write back to confirm it is done.

In practice this is same-day; we commit to **within two business days**.

You can also ask for less than the whole: **a single image removed**, a group of
them, a different credit, a different link. Same address, same terms, no
explanation needed.

**And one obligation on us:** the ask above rests on this site being free. If that
were ever to change, we would tell you before it changed, and treat the permission
as ended unless you said otherwise.

## 8. What this is and is not

This is a courtesy between an icon shop and a small free reference site. It is not
drafted by a lawyer and does not try to be a commercial license. Nothing here
limits your legal rights in your own work, and nothing here asks you to warrant or
indemnify anything.

If your organisation would rather have a formal signed license, tell us and we will
produce one for your counsel to review.

## 9. How the grant is recorded

Every grant is written down publicly, in the open-source repository, under
`docs/permissions/` — the date, who granted it, what was asked, what conditions were
attached, and the exact steps to undo it. Personal contact details are kept out of
that public record; the original correspondence is retained privately.

This means the permission you gave does not depend on anyone remembering it, and it
can be checked, honoured, and reversed by someone who was never party to the
conversation.

## 10. Agreeing

**A reply saying yes is enough.** No signature, no returned document.

It helps if that reply tells us:

| | |
|---|---|
| **Name to credit** | how you want to be named on the page |
| **Scope** | any images or ranges you would rather we did not use |
| **Link target** | the product page, or somewhere else you prefer |
| **Contact** | the address to use if we need to ask about an image |

If you would rather sign something, this page serves — print it, sign below, return
it.

```
Granted by  ______________________________   Date  ______________

For (organisation)  ______________________________________________

Notes / restrictions  ____________________________________________

_________________________________________________________________
```

---

## Appendix — what is in place today

Two publishers have granted permission on these terms. Their full records are in
this folder.

| Publisher | Granted | Images used | Where they appear |
|---|---|---|---|
| [Theophany Works](theophany-works.md) | 2026-06-17, confirmed 2026-06-23 | 268 | 282 placements: 120 saint portraits, 121 saint carousel cards, 13 feast portraits, 19 feast cards, 4 angel portraits, 5 angel cards |
| [Legacy Icons](legacy-icons.md) | 2026-08-03 | 254 | 267 placements: 153 saint portraits, 4 saint carousel cards, 18 feast portraits, 74 feast cards, 2 angel portraits, 16 angel cards |

Counts as of 2026-08-07. Every publisher not listed here is **links-only**: we link
out to their catalogue from a saint's page, and reproduce nothing.

There is also one **text** permission, on the same revocable footing but governed
separately — the Orthodox Church in America granted the lives of the saints and the
liturgical texts, and stated that it cannot grant rights to the icons on its site.
See [`oca.md`](oca.md). Text grants and image grants are kept in separate registries
on purpose, so that one can never be mistaken for the other.
