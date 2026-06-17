"""Additive controlled-vocab facet merge into ONE saints.csv row, editing only
that row's cells and preserving every other line byte-for-byte (CLAUDE.md: keep
CRLF, edit field substrings not whole lines)."""
import csv
import io
from pathlib import Path

MULTI_SEP = "; "


def load_vocab(vocab_csv: Path) -> dict[str, set[str]]:
    vocab: dict[str, set[str]] = {}
    with open(vocab_csv, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            vocab.setdefault(row["category"].strip(), set()).add(row["term"].strip())
    return vocab


def _serialize_row(cells: list[str]) -> str:
    buf = io.StringIO()
    csv.writer(buf, lineterminator="").writerow(cells)
    return buf.getvalue()


def merge(saints_csv: Path, sid: str, additions: dict[str, list[str]],
          vocab: dict[str, set[str]]) -> bool:
    """additions: {column: [terms]}. Returns True if the file changed. Raises
    ValueError on a term not in vocab[column]."""
    for col, terms in additions.items():
        for t in terms:
            if t not in vocab.get(col, set()):
                raise ValueError(f"{col!r}: {t!r} not in vocabulary")

    raw = saints_csv.read_bytes().decode("utf-8")
    # Keep line endings: split on \n but remember each line had \r\n.
    lines = raw.split("\n")
    header = next(l for l in lines if l.strip())
    cols = next(csv.reader([header.rstrip("\r")]))
    col_idx = {c: i for i, c in enumerate(cols)}

    changed = False
    for i, line in enumerate(lines):
        if not line.strip():
            continue
        had_cr = line.endswith("\r")
        body = line[:-1] if had_cr else line
        cells = next(csv.reader([body]))
        if cells[0].strip() != sid:
            continue
        for col, terms in additions.items():
            j = col_idx[col]
            existing = [x for x in cells[j].split(MULTI_SEP) if x.strip()]
            for t in terms:
                if t not in existing:
                    existing.append(t)
                    changed = True
            cells[j] = MULTI_SEP.join(existing)
        break
    else:
        raise KeyError(f"Saint ID {sid!r} not found in {saints_csv}")

    if changed:
        lines[i] = _serialize_row(cells) + ("\r" if had_cr else "")
        saints_csv.write_bytes("\n".join(lines).encode("utf-8"))
    return changed
