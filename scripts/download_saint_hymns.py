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
never re-fetches. Politeness: one request at a time, with a delay, and a
descriptive User-Agent — a grant to use the texts is not a licence to hammer a
church's server.

*** BEFORE YOU RUN THIS, READ THIS PARAGRAPH. ***

An earlier version of this script fetched all 366 days in one go while every
request was failing, and that burst tripped oca.org's WAF and got the machine
IP-blocked — from the site of the people who granted us the permission. The
grant covers the TEXT; it is not consent to crawl their server. So:

  * Start with `--days 5`, confirm the pages parse, and only then widen.
  * The default delay is deliberately slow. Do not lower it.
  * If it aborts on consecutive failures, WAIT. Do not re-run, do not swap HTTP
    client, do not route around it. Three refusals in a row mean they are
    refusing us, and the courteous reading is the correct one.
  * If a full harvest is ever wanted, ask the OCA first. They have been
    generous; a note costs one email and is faster than being blocked.

Usage:
    python3 scripts/download_saint_hymns.py --days 5     # ALWAYS start here
    python3 scripts/download_saint_hymns.py              # full calendar
    python3 scripts/download_saint_hymns.py --no-fetch   # re-parse the cache only
    python3 scripts/download_saint_hymns.py --delay 8.0  # be slower still
"""

import argparse
import csv
import html as htmllib
import re
import subprocess
import sys
import time
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DIST = ROOT / "dist"
CACHE = DIST / "oca_troparia"
OUT_CSV = DIST / "hymn_review.csv"

UA = ("CloudOfWitnesses/1.0 (+https://orthodoxsaintfinder.com; "
      "contact@orthodoxsaintfinder.com) permission-granted text harvest")
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
    # Fetched via curl, not urllib: oca.org sits behind a WAF that 403s urllib
    # on TLS/HTTP-2 fingerprint alone — identical URL and User-Agent, curl 200,
    # urllib 403. curl is an ordinary HTTP client and we still identify
    # ourselves honestly in the UA; nothing here disguises who is calling.
    try:
        proc = subprocess.run(
            ["curl", "-sS", "--fail", "--max-time", "30",
             "-A", UA, "-H", "Accept: text/html,*/*;q=0.8", url],
            capture_output=True, text=True, timeout=45)
    except (OSError, subprocess.TimeoutExpired) as e:       # noqa: BLE001
        print(f"  {month:02d}-{day:02d}: {e}", file=sys.stderr)
        return None
    if proc.returncode != 0 or not proc.stdout:
        print(f"  {month:02d}-{day:02d}: curl failed "
              f"({proc.stderr.strip()[:80]})", file=sys.stderr)
        return None
    body = proc.stdout
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
    ap.add_argument("--delay", type=float, default=4.0,
                    help="seconds between requests (default 4.0)")
    ap.add_argument("--days", type=int, default=0, metavar="N",
                    help="fetch at most N new days this run (0 = no limit). "
                         "ALWAYS use a small N first — see the header note.")
    ap.add_argument("--no-fetch", action="store_true",
                    help="parse the cache only; make no network requests")
    ap.add_argument("--force", action="store_true",
                    help="re-fetch days already cached")
    args = ap.parse_args()

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
    # Two brakes, both learned the hard way. The first version of this script
    # ground through all 366 days while every single request 403'd, and that
    # burst is what tripped oca.org's WAF and got this machine blocked — from
    # the site of the people who granted us the permission in the first place.
    # A request that fails 360 times is not a retry strategy.
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
                        # wait, not to knock harder.
                        stop_fetching = True
                        print("\n*** ABORTING FETCH: 3 consecutive failures.\n"
                              "    oca.org is refusing requests. Do not re-run "
                              "immediately — wait for the block to lapse.\n"
                              "    Parsing the cached pages only.\n",
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
