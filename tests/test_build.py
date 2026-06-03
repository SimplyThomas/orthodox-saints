"""Unit tests for build.py — the validation/transform engine.

Run from the repo root:  python -m unittest discover -s tests
(or `make test` / `make docker-test`).
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import build  # noqa: E402


# Minimal vocabulary covering the terms used by the synthetic rows below.
TEST_VOCAB = {
    "Gender": {"Male", "Female"},
    "Rank / Type": {"Martyr", "Hierarch"},
    "Era": {"Modern", "Byzantine"},
    "Century": {"20th", "4th"},
    "Commonly Asked Intercessions": {"Healing"},
}


def valid_row(**overrides):
    """A row with all 26 columns; minimally valid by default."""
    row = {col: "" for col in build.HEADER}
    row.update({
        "Saint ID": "OS-0001",
        "Name": "Test Martyr",
        "Gender": "Male",
        "Rank / Type": "Martyr",
        "Era": "Modern",
        "Century": "20th",
        "Feast Day(s)": "Jan 1",
        "Short Prayer (Intercession)": "Holy Martyr Test, pray to God for us.",
        "Sources": "Test source",
    })
    row.update(overrides)
    return row


def errors_for(rows, vocab=None, header=None):
    errs, _warns = build.validate(header or build.HEADER, rows, vocab or TEST_VOCAB)
    return errs


class FeastParsingTests(unittest.TestCase):
    def test_parse_months_single(self):
        self.assertEqual(build.parse_months("Sep 4"), ["Sep"])

    def test_parse_months_multiple_and_dedupe(self):
        self.assertEqual(build.parse_months("Sep 4; Dec 10"), ["Sep", "Dec"])
        self.assertEqual(build.parse_months("Jan 1; Jan 7"), ["Jan"])

    def test_parse_months_ignores_prose(self):
        self.assertEqual(build.parse_months("Nativity Sep 8; Dormition Aug 15"),
                         ["Sep", "Aug"])

    def test_feast_sort_fixed(self):
        self.assertEqual(build.feast_sort("Sep 4"), 904)
        self.assertEqual(build.feast_sort("Jan 1"), 101)

    def test_feast_sort_min_across_dates(self):
        self.assertEqual(build.feast_sort("May 8; Sep 26"), 508)

    def test_feast_sort_movable_sorts_last(self):
        self.assertEqual(build.feast_sort("3rd Sunday of Pascha"), build.MOVABLE_SORT)

    def test_feast_recognized(self):
        self.assertTrue(build.feast_recognized("Aug 15"))
        self.assertTrue(build.feast_recognized("Sunday after the Nativity"))
        self.assertTrue(build.feast_recognized("3rd Sunday of Pascha"))
        self.assertFalse(build.feast_recognized("someday"))
        self.assertFalse(build.feast_recognized(""))


class SplitMultiTests(unittest.TestCase):
    def test_basic_split(self):
        self.assertEqual(build.split_multi("a; b; c"), ["a", "b", "c"])

    def test_strips_and_drops_empty(self):
        self.assertEqual(build.split_multi("a;  ; b "), ["a", "b"])
        self.assertEqual(build.split_multi(""), [])


class IdAssignmentTests(unittest.TestCase):
    def test_next_id_seed(self):
        rows = [{"Saint ID": "OS-0003"}, {"Saint ID": "OS-0010"}, {"Saint ID": ""}]
        self.assertEqual(build.next_id_seed(rows), 10)

    def test_assign_fills_blanks_sequentially(self):
        rows = [valid_row(**{"Saint ID": "OS-0005"}),
                valid_row(**{"Saint ID": "", "Name": "New A"}),
                valid_row(**{"Saint ID": "", "Name": "New B"})]
        changed = build.assign_ids(rows)
        self.assertTrue(changed)
        self.assertEqual(rows[1]["Saint ID"], "OS-0006")
        self.assertEqual(rows[2]["Saint ID"], "OS-0007")

    def test_assign_noop_when_no_blanks(self):
        rows = [valid_row(**{"Saint ID": "OS-0005"})]
        self.assertFalse(build.assign_ids(rows))
        self.assertEqual(rows[0]["Saint ID"], "OS-0005")


class ValidationTests(unittest.TestCase):
    def test_clean_row_has_no_errors(self):
        self.assertEqual(errors_for([valid_row()]), [])

    def test_unknown_controlled_term(self):
        errs = errors_for([valid_row(**{"Rank / Type": "Bogus"})])
        self.assertTrue(any("unknown term" in e and "Bogus" in e for e in errs))

    def test_multivalue_terms_ok_and_flagged(self):
        self.assertEqual(errors_for([valid_row(**{"Rank / Type": "Martyr; Hierarch"})]), [])
        errs = errors_for([valid_row(**{"Rank / Type": "Martyr; Nope"})])
        self.assertTrue(any("Nope" in e for e in errs))

    def test_missing_required_field(self):
        errs = errors_for([valid_row(**{"Name": ""})])
        self.assertTrue(any("missing required field 'Name'" in e for e in errs))

    def test_missing_era_and_century(self):
        errs = errors_for([valid_row(**{"Era": "", "Century": ""})])
        self.assertTrue(any("at least one of Era or Century" in e for e in errs))

    def test_century_only_is_ok(self):
        self.assertEqual(errors_for([valid_row(**{"Era": "", "Century": "20th"})]), [])

    def test_duplicate_id(self):
        errs = errors_for([valid_row(), valid_row(**{"Name": "Dup"})])
        self.assertTrue(any("duplicate Saint ID" in e for e in errs))

    def test_bad_id_format(self):
        errs = errors_for([valid_row(**{"Saint ID": "OS-12"})])
        self.assertTrue(any("does not match" in e for e in errs))

    def test_unparseable_feast(self):
        errs = errors_for([valid_row(**{"Feast Day(s)": "someday"})])
        self.assertTrue(any("unparseable Feast" in e for e in errs))

    def test_movable_feast_is_valid(self):
        self.assertEqual(errors_for([valid_row(**{"Feast Day(s)": "3rd Sunday of Pascha"})]), [])

    def test_header_mismatch_short_circuits(self):
        errs = errors_for([valid_row()], header=build.HEADER[:-1])
        self.assertTrue(any("Header/column mismatch" in e for e in errs))


class DeriveLinksTests(unittest.TestCase):
    def test_blank_inputs_derive_search_urls(self):
        hymn, icon, video = build.derive_links("St. Test", "", "", "")
        self.assertIn("google.com/search", hymn)
        self.assertIn("tbm=isch", icon)
        self.assertIn("youtube.com/results", video)
        self.assertIn("St.+Test", hymn)

    def test_non_blank_overrides(self):
        hymn, icon, video = build.derive_links(
            "St. Test", "https://h", "https://i", "https://v")
        self.assertEqual((hymn, icon, video), ("https://h", "https://i", "https://v"))


class ToRecordTests(unittest.TestCase):
    def test_arrays_singles_and_derived(self):
        rec = build.to_record(valid_row(**{
            "Rank / Type": "Martyr; Hierarch",
            "Commonly Asked Intercessions": "Healing",
            "Feast Day(s)": "Sep 4",
        }))
        self.assertEqual(rec["rank"], ["Martyr", "Hierarch"])      # multi -> array
        self.assertEqual(rec["gender"], "Male")                     # single -> string
        self.assertEqual(rec["intercession"], ["Healing"])
        self.assertEqual(rec["months"], ["Sep"])
        self.assertEqual(rec["feastSort"], 904)
        self.assertIn("google.com/search", rec["hymn"])

    def test_search_haystack_includes_name_and_facets(self):
        rec = build.to_record(valid_row(**{"Name": "Hermione",
                                            "Commonly Asked Intercessions": "Healing"}))
        self.assertIn("Hermione", rec["search"])
        self.assertIn("Healing", rec["search"])


class CoverageTests(unittest.TestCase):
    def test_coverage_stats_counts_filled(self):
        rows = [valid_row(**{"Commonly Asked Intercessions": "Healing"}),
                valid_row(**{"Commonly Asked Intercessions": ""})]
        stats = dict((c, (f, t, p)) for c, f, t, p in build.coverage_stats(rows))
        filled, total, pct = stats["Commonly Asked Intercessions"]
        self.assertEqual((filled, total), (1, 2))
        self.assertAlmostEqual(pct, 50.0)

    def test_report_writes_job_summary(self):
        import tempfile
        rows = [valid_row(**{"Vocation": "Physician"})]
        with tempfile.NamedTemporaryFile("w+", suffix=".md", delete=False) as tf:
            path = tf.name
        try:
            os.environ["GITHUB_STEP_SUMMARY"] = path
            build.report_coverage(rows)
            with open(path) as f:
                content = f.read()
            self.assertIn("## Finder coverage", content)
            self.assertIn("| Vocation |", content)
        finally:
            os.environ.pop("GITHUB_STEP_SUMMARY", None)
            os.unlink(path)


class SeedIntegrationTests(unittest.TestCase):
    """The committed seed data must always validate clean."""

    def test_committed_seed_validates_clean(self):
        vocab = build.load_vocab()
        header, rows = build.load_saints()
        errs, _warns = build.validate(header, rows, vocab)
        self.assertEqual(errs, [], "committed seed has validation errors:\n" +
                         "\n".join(errs))

    def test_seed_never_shrinks_below_initial(self):
        # The spine walk (CLAUDE.md §8) grows the dataset over time, so an exact
        # count would break on every data PR. Guard against catastrophic data
        # loss instead: the committed seed must never fall below its 372-saint
        # floor (84 originals + the Sep 1-10 comprehensive set).
        _header, rows = build.load_saints()
        self.assertGreaterEqual(len(rows), 372)


if __name__ == "__main__":
    unittest.main(verbosity=2)
