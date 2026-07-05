"""Unit tests for feastlib.py — the Feasts & Fasts pipeline."""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import feastlib  # noqa: E402


FEAST_VOCAB = {
    "Feast Category": {"Feast of Feasts", "Great Feast", "Feast", "Fast Season",
                       "Fast Day", "Fast-Free Week", "Observance"},
    "Dedication": {"Lord", "Theotokos", "Cross", "Forerunner", "Apostles",
                   "Angels", "Saints", "Departed"},
    "Fasting Discipline": {"Strict Fast", "Wine & Oil", "Fish Allowed",
                           "Dairy Allowed", "Fast-Free", "Varies"},
    "Tradition of Veneration": {"Russian", "Greek", "Serbian"},
}


def valid_feast(**overrides):
    """A row with all 19 columns; minimally valid by default."""
    row = {col: "" for col in feastlib.FEASTS_HEADER}
    row.update({
        "Feast ID": "FF-0001",
        "Name": "Nativity of Christ",
        "Category": "Great Feast",
        "Dedication": "Lord",
        "Begins": "Dec 25",
        "Brief": "The feast of the Incarnation.",
        "Sources": "OCA",
    })
    row.update(overrides)
    return row


class TestDateTokens(unittest.TestCase):
    def test_fixed(self):
        parsed, err = feastlib.parse_date_token("Dec 25")
        self.assertIsNone(err)
        self.assertEqual(parsed, {"type": "fixed", "month": 12, "day": 25})

    def test_paschal(self):
        parsed, err = feastlib.parse_date_token("P+49")
        self.assertIsNone(err)
        self.assertEqual(parsed, {"type": "paschal", "offset": 49})
        parsed, err = feastlib.parse_date_token("P-48")
        self.assertIsNone(err)
        self.assertEqual(parsed["offset"], -48)

    def test_pascha_itself(self):
        parsed, err = feastlib.parse_date_token("P+0")
        self.assertIsNone(err)
        self.assertEqual(parsed, {"type": "paschal", "offset": 0})

    def test_anchored(self):
        parsed, err = feastlib.parse_date_token("Sun before Dec 25")
        self.assertIsNone(err)
        self.assertEqual(parsed, {"type": "anchored", "dow": 0,
                                  "rel": "before", "month": 12, "day": 25})
        parsed, err = feastlib.parse_date_token("Sat before Oct 26")
        self.assertIsNone(err)
        self.assertEqual(parsed["dow"], 6)

    def test_bad_tokens(self):
        for tok in ("Dec 32", "P+90", "P-100", "Funday before Dec 25",
                    "25 Dec", "P49", "Sun near Dec 25", "Feb 30", ""):
            parsed, err = feastlib.parse_date_token(tok)
            self.assertIsNotNone(err, f"{tok!r} should be rejected")
            self.assertIsNone(parsed)

    def test_feb_29_allowed(self):
        parsed, err = feastlib.parse_date_token("Feb 29")
        self.assertIsNone(err)


class TestCycle(unittest.TestCase):
    def test_fixed(self):
        self.assertEqual(feastlib.derive_cycle(
            {"Begins": {"type": "fixed", "month": 12, "day": 25}}), "fixed")

    def test_anchored_counts_as_fixed(self):
        self.assertEqual(feastlib.derive_cycle(
            {"Begins": {"type": "anchored", "dow": 0, "rel": "before",
                        "month": 12, "day": 25}}), "fixed")

    def test_paschal(self):
        self.assertEqual(feastlib.derive_cycle(
            {"Begins": {"type": "paschal", "offset": -48},
             "Ends": {"type": "paschal", "offset": -9}}), "paschal")

    def test_hybrid_apostles_fast(self):
        self.assertEqual(feastlib.derive_cycle(
            {"Begins": {"type": "paschal", "offset": 57},
             "Ends": {"type": "fixed", "month": 6, "day": 28}}), "hybrid")


class TestValidate(unittest.TestCase):
    def _validate(self, rows, saint_ids=frozenset({"OS-0001"})):
        return feastlib.validate(rows, FEAST_VOCAB, set(saint_ids))

    def test_valid_row_clean(self):
        errors, _ = self._validate([valid_feast()])
        self.assertEqual(errors, [])

    def test_required_fields(self):
        errors, _ = self._validate([valid_feast(Brief="")])
        self.assertTrue(any("Brief" in e for e in errors))

    def test_unknown_vocab_term(self):
        errors, _ = self._validate([valid_feast(Category="Mega Feast")])
        self.assertTrue(any("Mega Feast" in e for e in errors))

    def test_unknown_observance_tradition(self):
        errors, _ = self._validate(
            [valid_feast(**{"Tradition of Observance": "Klingon"})])
        self.assertTrue(any("Klingon" in e for e in errors))

    def test_single_value_no_multi(self):
        errors, _ = self._validate([valid_feast(Category="Great Feast; Feast")])
        self.assertTrue(any("single-value" in e for e in errors))

    def test_bad_date_token(self):
        errors, _ = self._validate([valid_feast(Begins="Dec 32")])
        self.assertTrue(any("Dec 32" in e for e in errors))

    def test_bad_id_format(self):
        errors, _ = self._validate([valid_feast(**{"Feast ID": "OS-0001"})])
        self.assertTrue(any("FF-####" in e for e in errors))

    def test_related_saint_must_exist(self):
        errors, _ = self._validate([valid_feast(**{"Related Saints": "OS-9999"})])
        self.assertTrue(any("OS-9999" in e for e in errors))

    def test_related_feast_must_exist_and_not_self(self):
        rows = [valid_feast(),
                valid_feast(**{"Feast ID": "FF-0002", "Name": "Theophany",
                               "Begins": "Jan 6",
                               "Related Feasts": "FF-0002; FF-0777"})]
        errors, _ = self._validate(rows)
        self.assertTrue(any("itself" in e for e in errors))
        self.assertTrue(any("FF-0777" in e for e in errors))

    def test_duplicate_id(self):
        rows = [valid_feast(), valid_feast(Name="Other")]
        errors, _ = self._validate(rows)
        self.assertTrue(any("duplicate" in e.lower() for e in errors))

    def test_duplicate_name_warns(self):
        rows = [valid_feast(),
                valid_feast(**{"Feast ID": "FF-0002"})]
        _, warnings = self._validate(rows)
        self.assertTrue(any("duplicate" in w.lower() for w in warnings))

    def test_span_category_without_ends_warns(self):
        _, warnings = self._validate(
            [valid_feast(Category="Fast Season", Name="Great Lent",
                         Begins="P-48", **{"Fasting Discipline": "Varies"})])
        self.assertTrue(any("Ends" in w for w in warnings))

    def test_fast_without_discipline_warns(self):
        _, warnings = self._validate(
            [valid_feast(Category="Fast Day", Name="Eve of Theophany",
                         Begins="Jan 5")])
        self.assertTrue(any("Fasting Discipline" in w for w in warnings))


class TestAssignIds(unittest.TestCase):
    def test_assigns_sequential_after_max(self):
        rows = [valid_feast(),
                valid_feast(**{"Feast ID": "FF-0007", "Name": "B"}),
                valid_feast(**{"Feast ID": "", "Name": "C"})]
        changed = feastlib.assign_ids(rows)
        self.assertTrue(changed)
        self.assertEqual(rows[2]["Feast ID"], "FF-0008")

    def test_no_change_when_all_assigned(self):
        rows = [valid_feast()]
        self.assertFalse(feastlib.assign_ids(rows))


class TestRecord(unittest.TestCase):
    def test_to_record_shapes(self):
        rec = feastlib.to_record(valid_feast(**{
            "Also Known As": "Christmas; Winter Pascha",
            "Related Saints": "OS-0001",
            "Ends": "",
            "Forefeast": "Dec 20",
            "Apodosis": "Dec 31",
        }))
        self.assertEqual(rec["id"], "FF-0001")
        self.assertEqual(rec["aka"], ["Christmas", "Winter Pascha"])
        self.assertEqual(rec["begins"], {"type": "fixed", "month": 12, "day": 25})
        self.assertEqual(rec["forefeast"], {"type": "fixed", "month": 12, "day": 20})
        self.assertNotIn("ends", rec)          # empty optionals are omitted
        self.assertEqual(rec["cycle"], "fixed")
        self.assertIn("orthodox+icon", rec["icon"])
        self.assertEqual(rec["relatedSaints"], ["OS-0001"])

    def test_sort_fixed_before_paschal(self):
        fixed = feastlib.to_record(valid_feast())
        paschal = feastlib.to_record(valid_feast(
            **{"Feast ID": "FF-0002", "Name": "Pascha", "Begins": "P+0",
               "Category": "Feast of Feasts"}))
        self.assertLess(feastlib._sort_key(fixed), feastlib._sort_key(paschal))


if __name__ == "__main__":
    unittest.main()
