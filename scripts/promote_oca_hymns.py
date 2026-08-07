#!/usr/bin/env python3
"""
Promote reviewed rows from dist/hymn_review.csv into data/saint_hymns.csv.

download_saint_hymns.py deliberately proposes rather than promotes: the join is
by SAINT IDENTITY and that is exactly what a name match gets wrong. This script
is the other half — it applies the guards that a reviewer would otherwise have
to apply 4,302 times by hand, and HOLDS BACK everything a guard trips on.

It is not a rubber stamp. Every held row is written to dist/hymn_held.csv with
the reason, because a row this script refuses is a row a human should look at,
not a row that has been dealt with.

THE GUARDS, and the real mis-join each one was written for:

  tier        Only --tier rows are eligible (default: exact). The `none` tier is
              never eligible at any setting: those rows scored 0.00 and simply
              took whichever saint happened to fall on that calendar day. On
              Feb 29 our data holds exactly one saint (OS-0642, Meletius of
              Kharkov), so all thirteen of that day's hymns — the Sunday of
              Orthodoxy, St David of Wales — landed on him.

  no-subject  The OCA commemoration is not an individual saint: an icon of the
              Mother of God, an afterfeast, a named Sunday. Those are FEAST
              hymns, and there is no feast-hymn join table yet, so they have
              nowhere correct to go. A relic translation or uncovering IS
              allowed through, but only when the matched saint's own name
              appears in the title — which is what separates "Translation of
              the relics of Saint Maximus" -> Maximus (right) from "Uncovering
              of the relics of Saint Gurias" -> Barsanuphius of Tver (wrong;
              they are commemorated together, so the day-restricted match found
              the wrong man).

  gender      The hymn's own words contradict the saint's Gender. St Mary of
              Egypt's troparion — "Having been a sinful woman, you became a
              Bride of Christ" — was matched onto John the Anchorite of Egypt,
              on the strength of the word "Egypt". A hymn that calls its subject
              a bride does not belong to a male anchorite.

  duplicate   Already present in data/saint_hymns.csv (495 rows arrived by the
              manual daily walk), or a repeat within this batch. Keyed exactly
              as build.py keys it: (saint_id, kind, first 60 chars of stanza 1),
              so a row this script emits can never trip the build's own
              duplicate error.

A GUARD THAT WAS TRIED AND REMOVED — do not re-add it. "Hold any hymn text
matched to two different saints on two different days" sounds like a
cross-contamination detector and is not one. Most of the corpus's shared texts
are the COMMONS: "By a flood of tears you made the desert fertile" is the common
troparion of a monastic saint and is appointed for three hundred of them, and
"Your holy martyr N, O Lord" is the martyr's common with a name dropped in. The
guard held 1,030 rows, essentially all of them correct. Sharing a text is what a
common IS. The Mary-of-Egypt mis-join it was meant to catch is caught by the
gender guard, which tests the words rather than their reuse.

Usage:
    python3 scripts/promote_oca_hymns.py                  # dry run, exact tier
    python3 scripts/promote_oca_hymns.py --write          # actually promote
    python3 scripts/promote_oca_hymns.py --tier exact strong --write
"""

import argparse
import csv
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REVIEW = ROOT / "dist" / "hymn_review.csv"
HELD = ROOT / "dist" / "hymn_held.csv"
HYMNS = ROOT / "data" / "saint_hymns.csv"
SAINTS = ROOT / "data" / "saints.csv"

HYMNS_HEADER = ["saint_id", "kind", "tone", "text", "translation", "source_url"]

# A commemoration that is an EVENT, not a person. These carry real hymns, but
# the hymns belong to the feast — and feasts have no hymn join table yet.
EVENT_RE = re.compile(
    r"\b(icon of|afterfeast|forefeast|leavetaking|sunday of|saturday of|"
    r"week of|synaxis of|consecration of|dedication of|commemoration of the|"
    r"council of|repose of the)\b", re.I)
# The one event class that is still legitimately a saint's own hymn — but only
# when the title names the saint we matched. See the no-subject guard above.
RELIC_RE = re.compile(
    r"\b(translation of the relics|uncovering of the relics|"
    r"translation of the relic|finding of the relics|return of the relics)\b",
    re.I)

# Words in a hymn that mark its SUBJECT's sex. Deliberately narrow, and learned
# by running the wide version first: pronouns, "father", "son", "shepherd" and
# "bridegroom" all had to come out, because a troparion to a female ascetic says
# she followed "Christ the Bridegroom", one to any saint says "O God of our
# Fathers", and "Him" is nearly always Christ. Those produced ~44 false holds
# and not one true one. What is left are nouns a hymn uses only of the person it
# addresses. Low recall on purpose: this guard exists to catch the Mary-of-Egypt
# class of mis-join, not to sex every hymn in the corpus.
FEMALE_RE = re.compile(
    r"\b(woman|women|handmaid|maiden|abbess|deaconess|nun|matron|widow|"
    r"bride of christ|bridegroom's bride)\b", re.I)
MALE_RE = re.compile(
    r"\b(monk|monks|abbot|hieromonk|archimandrite|bishop|hierarch|presbyter|"
    r"deacon|manly)\b", re.I)


def stanzas(text: str) -> list[str]:
    return [s.strip() for s in (text or "").split("||") if s.strip()]


def dedupe_key(saint_id: str, kind: str, text: str) -> tuple[str, str, str]:
    """Exactly build.py's duplicate key, so we can never emit one it rejects."""
    st = stanzas(text)
    return (saint_id, kind, st[0][:60] if st else "")


def name_tokens(name: str) -> set[str]:
    """Lowercase alphabetic tokens of 4+ chars — enough to spot a saint's own
    name inside a commemoration title without matching 'of' or 'the'."""
    return {t for t in re.findall(r"[a-z]{4,}", (name or "").lower())}


def load_saint_gender() -> dict[str, str]:
    out = {}
    with SAINTS.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            sid = (row.get("Saint ID") or "").strip()
            if sid:
                out[sid] = (row.get("Gender") or "").strip()
    return out


def gender_conflict(text: str, gender: str) -> str | None:
    """Return a reason string when the hymn's words contradict the saint's
    recorded Gender, else None. Only fires on an UNAMBIGUOUS clash: markers of
    one sex present and none of the other. A hymn carrying both is left alone —
    ambiguity here means the wording is about someone besides the subject."""
    if gender not in ("Male", "Female"):
        return None
    fem = set(m.group(0).lower() for m in FEMALE_RE.finditer(text or ""))
    mal = set(m.group(0).lower() for m in MALE_RE.finditer(text or ""))
    if gender == "Male" and fem and not mal:
        return f"female wording {sorted(fem)} on a Male saint"
    if gender == "Female" and mal and not fem:
        return f"male wording {sorted(mal)} on a Female saint"
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tier", nargs="+", default=["exact"],
                    choices=["exact", "strong", "weak"],
                    help="confidence tiers eligible for promotion "
                         "(default: exact). 'none' is never eligible.")
    ap.add_argument("--write", action="store_true",
                    help="actually append to data/saint_hymns.csv "
                         "(default: dry run)")
    args = ap.parse_args()

    if not REVIEW.exists():
        sys.exit(f"FATAL: {REVIEW} not found — run download_saint_hymns.py first.")
    rows = list(csv.DictReader(REVIEW.open(encoding="utf-8")))
    gender = load_saint_gender()

    # Existing rows, so a re-run is idempotent and the manual daily walk's 495
    # rows are never duplicated.
    existing: set[tuple[str, str, str]] = set()
    with HYMNS.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            existing.add(dedupe_key(row["saint_id"], row["kind"], row["text"]))
    print(f"{len(rows)} review rows; {len(existing)} hymns already in "
          f"data/saint_hymns.csv")

    promote: list[dict] = []
    held: list[dict] = []
    batch: set[tuple[str, str, str]] = set()
    reasons: Counter = Counter()

    def hold(r: dict, why: str) -> None:
        reasons[why] += 1
        held.append({**r, "held_reason": why})

    for r in rows:
        sid, kind, text = r["saint_id"], r["kind"], r["text"]
        title = r["oca_title"]
        st = stanzas(text)

        if r["confidence"] == "none":
            hold(r, "none tier — no real match")
            continue
        if r["confidence"] not in args.tier:
            hold(r, f"{r['confidence']} tier — not selected for this run")
            continue
        if not st:
            hold(r, "empty text")
            continue

        if EVENT_RE.search(title):
            hold(r, "commemoration is an event, not a saint (feast hymn)")
            continue
        if RELIC_RE.search(title) and not (
                name_tokens(r["saint_name"]) & name_tokens(title)):
            hold(r, "relic feast naming a different saint than the match")
            continue

        why = gender_conflict(text, gender.get(sid, ""))
        if why:
            hold(r, f"gender mismatch — {why}")
            continue

        key = dedupe_key(sid, kind, text)
        if key in existing:
            hold(r, "already in data/saint_hymns.csv")
            continue
        if key in batch:
            hold(r, "duplicate within this batch")
            continue

        batch.add(key)
        promote.append({"saint_id": sid, "kind": kind, "tone": r["tone"],
                        "text": text, "translation": r["translation"],
                        "source_url": r["source_url"]})

    print(f"\nPROMOTE {len(promote)} rows "
          f"({len({p['saint_id'] for p in promote})} saints)")
    print(f"HELD    {len(held)} rows")
    for why, n in reasons.most_common():
        print(f"  {n:5}  {why}")

    with HELD.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) + ["held_reason"])
        w.writeheader()
        w.writerows(held)
    print(f"\nwrote {HELD.relative_to(ROOT)} — every held row with its reason")

    if not args.write:
        print("DRY RUN — nothing written to data/saint_hymns.csv "
              "(pass --write to promote)")
        return 0

    # CRLF, like every other data CSV in this repo (CLAUDE.md §7).
    with HYMNS.open("a", encoding="utf-8", newline="") as f:
        csv.DictWriter(f, fieldnames=HYMNS_HEADER,
                       lineterminator="\r\n").writerows(promote)
    print(f"appended {len(promote)} rows to {HYMNS.relative_to(ROOT)} "
          "— now run `make validate`")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
