#!/usr/bin/env python3
"""
Harvest troparia and kontakia from oca.org into a REVIEW QUEUE.

The Orthodox Church in America has granted permission to reproduce its
liturgical texts, on condition of attribution to oca.org and a site that stays
free (docs/permissions/oca.md, CLAUDE.md §9). This script gathers them.

It does NOT write data/saint_hymns.csv. It writes dist/hymn_review.csv, which a
human promotes — the same propose-only pattern as the icon downloader and
profilegen, and for the same reason: the join is by SAINT IDENTITY, and identity
is exactly what an automated name match gets wrong. There are five Barlaams in
this dataset (CLAUDE.md §5c makes the point about the Daily Dove's joins); a
troparion filed against the wrong man is worse than no troparion, because it
looks right.

How it works, and why this way:

  1. Fetch ONE page per calendar day — https://www.oca.org/saints/troparia/
     <year>/<mm>/<dd> — which returns every commemoration for that day with its
     hymns. 366 requests covers the whole fixed calendar, instead of ~2,900
     per-saint lookups against URLs we would have to guess. (Guessing is how the
     first attempt at this pulled the wrong saint's troparion twice.)
  2. Parse each <h2> commemoration and its nested <h3>Troparion — Tone N</h3>
     + <p>text</p> articles.
  3. Match each commemoration against ONLY those saints whose Feast Day(s)
     include that day. Restricting the candidate pool to one day is what makes
     name matching tractable at all.
  4. Score the match and emit every row with its confidence, so a reviewer sorts
     by risk instead of reading 2,900 rows equally.

Cached HTML lives under dist/oca_troparia/ so re-runs are free and re-parsing
never re-fetches. Politeness: one request at a time, 12 seconds apart at the
OCA's own request, and a descriptive User-Agent — a grant to use the texts is
not a licence to hammer a church's server.

*** BEFORE YOU RUN THIS, READ THIS PARAGRAPH. ***

An earlier version of this script fetched all 366 days in one go while every
single request was failing, and we read that as having tripped a rate limiter
and earned an IP block. That diagnosis was WRONG, and the correction is worth
recording because it shaped this whole file.

On 2026-08-07 the OCA's technical manager confirmed our address was on no block
list and asked what user agent we send. Testing against
/saints/troparia/2015/08/07 from 76.104.36.100: our full UA returned a bare
nginx 403, the same request with the trailing word "harvest" removed returned
200, and "Mozilla/5.0 harvest" was refused too. It was a substring match on that
one word, from any client, on every request — never a rate limit, never an IP
ban. The word is gone from UA below; do not reintroduce it, or any synonym a
blocklist would read as a scraper ("scrape", "crawler", "spider", "bot").

The politeness brakes below are NOT part of that mistake and stay as they are.
The grant covers the TEXT; it is not consent to crawl their server. So:

  * Start with `--days 5`, confirm the pages parse, and only then widen.
  * THE 12-SECOND DELAY IS THEIRS, NOT OURS. Asked how to pace a full pass, Fr.
    John replied: "Can you space this out a bit more, maybe once every 12
    seconds?" That is the default below. It is a FLOOR — raise it freely, never
    lower it. A full 366-page pass therefore takes about 75 minutes; let it.
  * If it aborts on consecutive failures, WAIT. Do not re-run, do not swap HTTP
    client, do not route around it. Three refusals in a row mean they are
    refusing us, and the courteous reading is the correct one. (Read the
    response first, though — ours said 403 for a reason we could have found in
    one request and instead guessed at for months.)
  * A full pass is agreed. Anything materially heavier — a second pass, another
    section of the site — is a fresh question for the OCA. Both the grant and
    the rate are courtesies, not entitlements. Asking took one email and settled
    what two months of inference got wrong.

Usage:
    python3 scripts/download_saint_hymns.py --days 5     # ALWAYS start here
    python3 scripts/download_saint_hymns.py              # full calendar, ~75 min
    python3 scripts/download_saint_hymns.py --no-fetch   # re-parse the cache only
    python3 scripts/download_saint_hymns.py --delay 20   # be slower still
"""

import argparse
import csv
import html as htmllib
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DIST = ROOT / "dist"
CACHE = DIST / "oca_troparia"
OUT_CSV = DIST / "hymn_review.csv"

# Identifies us honestly and gives them somewhere to write. Keep it plain: the
# word "harvest" used to sit on the end of this string and oca.org's nginx 403'd
# every request that carried it (see the docstring). Say who we are, not what we
# are doing to their server.
UA = ("CloudOfWitnesses/1.0 (+https://orthodoxsaintfinder.com; "
      "contact@orthodoxsaintfinder.com)")
# Seconds between requests, at the OCA's own request (2026-08-07). A floor,
# enforced in main(); --delay may raise it but not go under it.
MIN_DELAY = 12.0
# The year in the URL only selects which movable feasts land on the day; the
# fixed-calendar commemorations we join against are the same every year.
YEAR = 2015
BASE = "https://www.oca.org/saints/troparia/{y}/{m:02d}/{d:02d}"

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]  # incl. Feb 29

# Hymn genres build.py accepts (HYMN_KINDS). Anything else on the page — an
# "Ikos" we do not model, a "Prokeimenon" — is skipped rather than coerced.
KINDS = {"troparion": "Troparion", "kontakion": "Kontakion",
         "apolytikion": "Apolytikion", "megalynarion": "Megalynarion",
         "ikos": "Ikos", "exapostilarion": "Exapostilarion",
         "sticheron": "Sticheron"}
TONE_WORDS = {"first": "1", "second": "2", "third": "3", "fourth": "4",
              "fifth": "5", "sixth": "6", "seventh": "7", "eighth": "8"}

# Honorifics and rank words carry no distinguishing power — every third entry is
# a "Venerable Martyr" — so they are stripped before comparing names. What is
# left is the person: their name and their place.
STOPWORDS = {
    "saint", "saints", "st", "sts", "holy", "venerable", "blessed", "righteous",
    "martyr", "martyrs", "hieromartyr", "hieromartyrs", "greatmartyr",
    "great", "new", "virgin", "virginmartyr", "passionbearer", "confessor",
    "confessors", "wonderworker", "wonderworkers", "unmercenary", "unmercenaries",
    "prophet", "apostle", "apostles", "equal", "apostles", "bishop", "archbishop",
    "patriarch", "metropolitan", "abbot", "abbess", "monk", "nun", "priest",
    "deacon", "hierarch", "the", "of", "and", "his", "her", "their", "with",
    "at", "in", "who", "de", "fool", "christ", "foolforchrist", "prince",
    "princess", "king", "queen", "emperor", "empress", "child", "children",
    "mother", "father", "son", "daughter", "brother", "sister", "companions",
    "enlightener", "wonder", "worker", "elder", "eldress", "ascetic", "recluse",
}


def fold(s: str) -> str:
    """Accent-naive, punctuation-free lowercase — the comparison form."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def tokens(name: str) -> set[str]:
    """Distinguishing tokens of a name: folded, stopworded, deduped."""
    return {t for t in fold(name).split() if t and t not in STOPWORDS}


def fetch_day(month: int, day: int, delay: float, force: bool) -> str | None:
    """Return the day's troparia HTML, from cache when present."""
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{month:02d}-{day:02d}.html"
    if path.exists() and not force:
        return path.read_text(encoding="utf-8", errors="replace")
    url = BASE.format(y=YEAR, m=month, d=day)
    # Plain urllib. This used to shell out to curl, on the belief that oca.org
    # fingerprinted urllib's TLS and 403'd it regardless of headers. It does
    # not: with the same UA both clients get 200, and both get 403 if the UA
    # carries "harvest". The 403 was always the UA, never the client.
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept": "text/html,*/*;q=0.8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        # Print the status: a 403 here is a message about us, not weather.
        print(f"  {month:02d}-{day:02d}: HTTP {e.code} {e.reason}",
              file=sys.stderr)
        return None
    except (urllib.error.URLError, OSError, TimeoutError) as e:  # noqa: BLE001
        print(f"  {month:02d}-{day:02d}: {e}", file=sys.stderr)
        return None
    if not body:
        print(f"  {month:02d}-{day:02d}: empty response", file=sys.stderr)
        return None
    path.write_text(body, encoding="utf-8")
    time.sleep(delay)                    # only sleep on a real request
    return body


def strip_tags(s: str) -> str:
    # Footnote markers first: oca.org prints them as <sup>1</sup> inside the
    # hymn, and deleting only the tags leaves the digit welded to the previous
    # word — "crushes the head of the Enemy,1 /" would ship as the hymn's own
    # text. The note itself lives after an <hr> below the hymn and never enters
    # this string, so the marker has nothing to point at here anyway.
    s = re.sub(r"<sup\b[^>]*>.*?</sup>", "", s, flags=re.I | re.S)
    # Tags become a SPACE, not nothing. oca.org closes and reopens a paragraph
    # between a podoben rubric and the hymn it belongs to, and deleting the tags
    # outright produced "(Podoben: “…”)The universe rejoices" — two words fused
    # across a structural boundary. The \s+ collapse below tidies the rest.
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", htmllib.unescape(s)).strip()


def parse_day(body: str) -> list[dict]:
    """[{title, hymns:[{kind, tone, text}]}] for one day's troparia page.

    The page nests one <article> per hymn inside the commemoration's <article>,
    each headed <h3>Troparion &mdash; Tone 8</h3>. We slice on the <h2> headers
    rather than parsing the tree — the markup is flat and regular, and a real
    parser would be a dependency for no gain.
    """
    out: list[dict] = []
    # Everything after the page <h1>, so the nav/footer cannot contribute.
    start = body.find("<h1>")
    if start == -1:
        return out
    body = body[start:]
    heads = [(m.start(), strip_tags(m.group(1)))
             for m in re.finditer(r"<h2>(.*?)</h2>", body, re.S)]
    for i, (pos, title) in enumerate(heads):
        end = heads[i + 1][0] if i + 1 < len(heads) else len(body)
        block = body[pos:end]
        hymns = []
        for m in re.finditer(
                r"<h3>(.*?)</h3>\s*<p>(.*?)</p>", block, re.S):
            head, text = strip_tags(m.group(1)), strip_tags(m.group(2))
            kind_m = re.match(r"([A-Za-z]+)", head)
            if not kind_m:
                continue
            kind = KINDS.get(kind_m.group(1).lower())
            if not kind:
                continue                       # a genre we do not model
            tone = ""
            t = re.search(r"tone\s+([1-8]|[a-z]+)", head, re.I)
            if t:
                raw = t.group(1).lower()
                tone = raw if raw.isdigit() else TONE_WORDS.get(raw, "")
            if re.search(r"plagal", head, re.I):
                tone = ""                      # not in our tone grammar as printed
            if text:
                hymns.append({"kind": kind, "tone": tone, "text": text})
        if hymns:
            out.append({"title": title, "hymns": hymns})
    return out


def load_saints() -> list[dict]:
    with (DATA / "saints.csv").open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def feast_days(cell: str) -> set[tuple[int, int]]:
    """(month_index, day) pairs named in a Feast Day(s) cell."""
    out = set()
    for m in re.finditer(r"\b([A-Z][a-z]{2})\s+(\d{1,2})\b", cell or ""):
        mon = m.group(1)
        if mon in MONTHS:
            out.add((MONTHS.index(mon) + 1, int(m.group(2))))
    return out


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def score(ctok: set[str], name: set[str], full: set[str]) -> float:
    """How well an OCA commemoration title matches one of our saints.

    Three readings, best wins, because they fail in different places:
      * jaccard vs the NAME alone — the honest measure when both sides say the
        same thing. Merging Also Known As into one set (the first version of
        this) inflates the union and scores an identical string at 0.67.
      * jaccard vs name + Also Known As — carries the transliteration cases,
        where OCA prints Joasaph and we hold Ioasaph.
      * containment vs name + aka, discounted — for when one side is simply
        more specific ("Martyr Gemellus" inside "Martyr Gemellus of
        Paphlagonia"). Discounted because containment is the loosest of the
        three and should never on its own beat a real jaccard agreement.
    Safe only because the candidate pool is already one calendar day, and
    because the caller demands a margin over the runner-up.
    """
    inter = len(ctok & full)
    contain = inter / min(len(ctok), len(full)) if ctok and full else 0.0
    return max(jaccard(ctok, name), jaccard(ctok, full), 0.9 * contain)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    # 12s is the OCA's own request (2026-08-07), not a guess of ours. Floor, not
    # target: raise it freely, never lower it. See the header note.
    ap.add_argument("--delay", type=float, default=12.0,
                    help="seconds between requests (default 12.0, the rate the "
                         "OCA asked for; raise but never lower)")
    ap.add_argument("--days", type=int, default=0, metavar="N",
                    help="fetch at most N new days this run (0 = no limit). "
                         "ALWAYS use a small N first — see the header note.")
    ap.add_argument("--no-fetch", action="store_true",
                    help="parse the cache only; make no network requests")
    ap.add_argument("--force", action="store_true",
                    help="re-fetch days already cached")
    args = ap.parse_args()

    # The floor is enforced, not merely documented. 12s is what the OCA asked
    # for; a promise about someone else's server should not be one careless
    # flag away from being broken.
    if args.delay < MIN_DELAY:
        print(f"--delay {args.delay:g} is below the {MIN_DELAY:g}s the OCA "
              f"asked for; using {MIN_DELAY:g}s.", file=sys.stderr)
        args.delay = MIN_DELAY

    saints = load_saints()
    # Index saints by the days they are commemorated, so each OCA commemoration
    # is only ever compared against that day's candidates.
    by_day: dict[tuple[int, int], list[dict]] = {}
    for r in saints:
        for key in feast_days(r.get("Feast Day(s)", "")):
            by_day.setdefault(key, []).append(r)
    print(f"{len(saints)} saints; {len(by_day)} calendar days carry at least one")

    rows: list[dict] = []
    stats = {"pages": 0, "commemorations": 0, "hymns": 0}
    # Two brakes. The first version of this script ground through all 366 days
    # while every single request 403'd — 366 refusals from the site of the
    # people who granted us the permission, for a reason printed in the very
    # first response. A request that fails 360 times is not a retry strategy,
    # whatever the cause turns out to be.
    consecutive = 0
    fetched = 0
    stop_fetching = False
    for mi in range(1, 13):
        for d in range(1, DAYS_IN[mi - 1] + 1):
            cached = (CACHE / f"{mi:02d}-{d:02d}.html").exists()
            may_fetch = not args.no_fetch and not stop_fetching and (
                args.days == 0 or fetched < args.days)
            if cached and not (args.force and may_fetch):
                body = fetch_day(mi, d, args.delay, False)   # cache read
            elif may_fetch:
                body = fetch_day(mi, d, args.delay, args.force)
                fetched += 1
                if body:
                    consecutive = 0
                else:
                    consecutive += 1
                    if consecutive >= 3:
                        # Stop fetching, keep parsing whatever is cached. Do NOT
                        # retry, change client, or route around it: three in a
                        # row means they are refusing us, and the answer is to
                        # read why, not to knock harder.
                        stop_fetching = True
                        print("\n*** ABORTING FETCH: 3 consecutive failures.\n"
                              "    oca.org is refusing requests. Read the "
                              "status printed above before re-running — a 403\n"
                              "    is a message about this client, not "
                              "congestion. Parsing the cached pages only.\n",
                              file=sys.stderr)
            else:
                body = None
            if not body:
                continue
            stats["pages"] += 1
            url = BASE.format(y=YEAR, m=mi, d=d)
            candidates = by_day.get((mi, d), [])
            cand_tok = [(c, tokens(c["Name"]),
                         tokens(c["Name"] + " " + c.get("Also Known As", "")))
                        for c in candidates]
            for comm in parse_day(body):
                stats["commemorations"] += 1
                ctok = tokens(comm["title"])
                scored = sorted(
                    ((score(ctok, nm, full), c) for c, nm, full in cand_tok),
                    key=lambda x: -x[0])
                best, second = (scored[0] if scored else (0.0, None)), \
                               (scored[1] if len(scored) > 1 else (0.0, None))
                sc, saint = best
                # Confidence: an exact token match that no runner-up ties is
                # safe to promote in bulk; everything else a human reads.
                if saint is None or sc == 0:
                    conf = "none"
                elif sc >= 0.999 and second[0] < 0.999:
                    conf = "exact"
                elif sc >= 0.6 and sc - second[0] >= 0.2:
                    conf = "strong"
                else:
                    conf = "weak"
                for h in comm["hymns"]:
                    stats["hymns"] += 1
                    rows.append({
                        "confidence": conf,
                        "score": f"{sc:.2f}",
                        "saint_id": (saint or {}).get("Saint ID", ""),
                        "saint_name": (saint or {}).get("Name", ""),
                        "oca_title": comm["title"],
                        "runner_up": (second[1] or {}).get("Name", "")
                                     if second[1] and second[0] > 0 else "",
                        "runner_up_score": f"{second[0]:.2f}" if second[1] else "",
                        "feast": f"{MONTHS[mi - 1]} {d}",
                        "kind": h["kind"],
                        "tone": h["tone"],
                        "text": h["text"],
                        "translation": "Permission:oca",
                        "source_url": url,
                    })

    DIST.mkdir(exist_ok=True)
    cols = ["confidence", "score", "saint_id", "saint_name", "oca_title",
            "runner_up", "runner_up_score", "feast", "kind", "tone", "text",
            "translation", "source_url"]
    order = {"exact": 0, "strong": 1, "weak": 2, "none": 3}
    rows.sort(key=lambda r: (order[r["confidence"]], r["saint_id"], r["kind"]))
    with OUT_CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, lineterminator="\r\n")
        w.writeheader()
        w.writerows(rows)

    tally: dict[str, int] = {}
    for r in rows:
        tally[r["confidence"]] = tally.get(r["confidence"], 0) + 1
    ids = {r["saint_id"] for r in rows
           if r["confidence"] in ("exact", "strong") and r["saint_id"]}
    print(f"\npages parsed      {stats['pages']}")
    print(f"commemorations    {stats['commemorations']}")
    print(f"hymns found       {stats['hymns']}")
    for k in ("exact", "strong", "weak", "none"):
        print(f"  {k:<15} {tally.get(k, 0)}")
    print(f"\ndistinct saints matched at exact/strong: {len(ids)}")
    print(f"wrote {OUT_CSV.relative_to(ROOT)} — REVIEW BEFORE PROMOTING (§9)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
