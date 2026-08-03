"""Unit tests for lectionarylib.py — the daily lectionary pipeline.

Mirrors tests/test_feastlib.py and tests/test_hostlib.py: the pure parsing
helpers, the fail-loud validator, and the emitted record shape. Rows are
built in memory, so nothing here reads the real data/lectionary/ tree.

The parsing tests are the ones that matter most. The lectionary's own
punctuation is hostile to the house "; " separator — ONE appointed reading
routinely spans discontinuous passages ("Micah 4.6-7; 5.2-4") and a book name
can carry parentheses ("Jeremiah (Baruch 3.35-4.4)") — so these lock in that
a citation is never torn in half again.
"""

import os
import sys
import unittest
from calendar import isleap

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import lectionarylib  # noqa: E402


def row(date, tradition="greek", **overrides):
    r = {col: "" for col in lectionarylib.HEADER}
    r.update({"date": date, "tradition": tradition})
    r.update(overrides)
    return r


def full_year(year, **per_day):
    """Every civil day of `year` in both traditions — a validator-clean file."""
    import datetime

    rows = []
    day = datetime.date(year, 1, 1)
    while day.year == year:
        for tradition in lectionarylib.TRADITIONS:
            rows.append(row(day.isoformat(), tradition, **per_day))
        day += datetime.timedelta(days=1)
    return rows


class ParseReadingTests(unittest.TestCase):
    def test_plain_citation(self):
        self.assertEqual(lectionarylib.parse_reading("Colossians 2.8-12"),
                         {"ref": "Colossians 2.8-12"})

    def test_commemoration_annotation(self):
        self.assertEqual(
            lectionarylib.parse_reading("Galatians 4.4-7 ~ Nativity"),
            {"ref": "Galatians 4.4-7", "for": "Nativity"})

    def test_service_label(self):
        self.assertEqual(
            lectionarylib.parse_reading("6th Hour :: Isaiah 5.16-25"),
            {"service": "6th Hour", "ref": "Isaiah 5.16-25"})

    def test_service_and_commemoration_together(self):
        self.assertEqual(
            lectionarylib.parse_reading("1st Hour, Gospel :: Matthew 1.18-25 ~ Nativity"),
            {"service": "1st Hour, Gospel", "ref": "Matthew 1.18-25",
             "for": "Nativity"})

    def test_semicolons_inside_one_reading_are_kept(self):
        """'Micah 4.6-7; 5.2-4' is ONE Vespers reading, not two."""
        cell = "Genesis 1.1-13 || Micah 4.6-7; 5.2-4 || Isaiah 11.1-10"
        self.assertEqual([r["ref"] for r in lectionarylib.parse_cell(cell)],
                         ["Genesis 1.1-13", "Micah 4.6-7; 5.2-4",
                          "Isaiah 11.1-10"])

    def test_parenthesised_book_name_is_not_an_annotation(self):
        parsed = lectionarylib.parse_reading("Jeremiah (Baruch 3.35-4.4)")
        self.assertEqual(parsed, {"ref": "Jeremiah (Baruch 3.35-4.4)"})
        self.assertNotIn("for", parsed)

    def test_empty_cell(self):
        self.assertEqual(lectionarylib.parse_cell(""), [])


class CitationShapeTests(unittest.TestCase):
    def test_accepts_real_forms(self):
        for ref in ("Colossians 2.8-12", "1 Peter 1.1-2.6", "4[2] Kings 2.6-14",
                    "3 [1] Kings 7:51-8:1", "Jude 1-10",
                    "Wisdom of Solomon 4.7-15", "Jeremiah (Baruch 3.35-4.4)",
                    "Composite 1 - Genesis 17.1-2, 4",
                    "Luke 2.20-21, 40-52"):
            self.assertTrue(lectionarylib._citation_ok(ref), ref)

    def test_rejects_a_fragment_torn_at_the_wrong_delimiter(self):
        """The bug this check exists to catch."""
        for ref in ("5.2-4", "8.1-4, 9-10", "1.1-2", ""):
            self.assertFalse(lectionarylib._citation_ok(ref), repr(ref))


class ValidateTests(unittest.TestCase):
    def test_clean_year_passes(self):
        errors, warnings = lectionarylib.validate({2026: full_year(2026)})
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_no_data_warns_but_does_not_fail(self):
        errors, warnings = lectionarylib.validate({})
        self.assertEqual(errors, [])
        self.assertEqual(len(warnings), 1)

    def test_leap_year_day_count(self):
        self.assertTrue(isleap(2028))
        errors, _ = lectionarylib.validate({2028: full_year(2028)})
        self.assertEqual(errors, [])

    def test_missing_day_fails(self):
        rows = [r for r in full_year(2026) if r["date"] != "2026-06-15"]
        errors, _ = lectionarylib.validate({2026: rows})
        self.assertTrue(any("expected 365" in e for e in errors), errors)

    def test_unknown_tradition_fails(self):
        rows = full_year(2026) + [row("2026-06-15", "antiochian")]
        errors, _ = lectionarylib.validate({2026: rows})
        self.assertTrue(any("tradition must be one of" in e for e in errors))

    def test_duplicate_row_fails(self):
        rows = full_year(2026) + [row("2026-06-15", "greek")]
        errors, _ = lectionarylib.validate({2026: rows})
        self.assertTrue(any("duplicate row" in e for e in errors))

    def test_date_outside_the_files_year_fails(self):
        rows = full_year(2026) + [row("2027-01-01", "greek")]
        errors, _ = lectionarylib.validate({2026: rows})
        self.assertTrue(any("not in the file's year" in e for e in errors))

    def test_malformed_date_fails(self):
        rows = full_year(2026) + [row("15 June 2026", "greek")]
        errors, _ = lectionarylib.validate({2026: rows})
        self.assertTrue(any("must be YYYY-MM-DD" in e for e in errors))

    def test_impossible_date_fails(self):
        rows = full_year(2026) + [row("2026-02-30", "greek")]
        errors, _ = lectionarylib.validate({2026: rows})
        self.assertTrue(any("not a real calendar day" in e for e in errors))

    def test_gap_in_the_year_range_fails(self):
        errors, _ = lectionarylib.validate(
            {2026: full_year(2026), 2028: full_year(2028)})
        self.assertTrue(any("missing year file" in e for e in errors))

    def test_torn_citation_warns_but_does_not_fail(self):
        """A third-party refresh should flag oddities, never block the build."""
        rows = full_year(2026)
        rows[0]["gospel"] = "5.2-4"
        errors, warnings = lectionarylib.validate({2026: rows})
        self.assertEqual(errors, [])
        self.assertTrue(any("does not look like a citation" in w
                            for w in warnings))


class RecordTests(unittest.TestCase):
    def test_record_groups_and_annotates(self):
        rec = lectionarylib.to_record(row(
            "2026-01-01", "greek",
            title="Thursday of the 30th week after Pentecost",
            epistle="Colossians 2.8-12 ~ Circumcision || Hebrews 7.26-8.2 ~ St Basil",
            gospel="Luke 2.20-21, 40-52 ~ Circumcision",
            matins="John 10.9-16",
        ))
        self.assertEqual(rec["title"],
                         "Thursday of the 30th week after Pentecost")
        self.assertEqual(rec["epistle"], [
            {"ref": "Colossians 2.8-12", "for": "Circumcision"},
            {"ref": "Hebrews 7.26-8.2", "for": "St Basil"},
        ])
        self.assertEqual(rec["gospel"],
                         [{"ref": "Luke 2.20-21, 40-52", "for": "Circumcision"}])
        self.assertEqual(rec["matins"], [{"ref": "John 10.9-16"}])
        self.assertNotIn("vespers", rec)

    def test_empty_row_makes_an_empty_record(self):
        self.assertEqual(lectionarylib.to_record(row("2026-01-01")), {})


if __name__ == "__main__":
    unittest.main()
