"""Unit tests for tools/feastgen — dossier seeding + deterministic Emit logic.

Mirrors tests/test_profilegen.py's approach: pure functions tested on synthetic
rows/dossiers; no filesystem or network."""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:  # pyyaml is an authoring-only dep (kept out of requirements.txt); skip if absent
    import yaml as _yaml
except ModuleNotFoundError:
    _yaml = None

from tools.feastgen import dossier, emit_one  # noqa: E402
import feastlib  # noqa: E402


def feast_row(**overrides):
    row = {col: "" for col in feastlib.FEASTS_HEADER}
    row.update({
        "Feast ID": "FF-0001",
        "Name": "Nativity of Christ",
        "Category": "Great Feast",
        "Dedication": "Lord",
        "Begins": "Dec 25",
        "Brief": "The feast of the Incarnation of the Lord.",
        "Customs & Traditions": "Festal Liturgy; homes are blessed.",
        "Sources": "OCA; GOARCH",
    })
    row.update(overrides)
    return row


class TestDossier(unittest.TestCase):
    def test_baseline_shape(self):
        d = dossier.baseline(feast_row())
        self.assertEqual(d["id"], "FF-0001")
        self.assertEqual(d["name"], "Nativity of Christ")
        self.assertEqual(d["anchor"]["brief"],
                         "The feast of the Incarnation of the Lord.")
        self.assertEqual(d["anchor"]["sources"], ["OCA", "GOARCH"])
        self.assertEqual(d["anchor"]["context"]["Begins"], "Dec 25")
        self.assertEqual(d["external"], [])


class TestEmitOne(unittest.TestCase):
    def _dossier(self):
        d = dossier.baseline(feast_row())
        d["external"] = [
            {"text": "x" * 800, "source": "https://en.wikipedia.org/wiki/A"},
            {"text": "y" * 900, "source": "https://oca.org/b"},
        ]
        return d

    def test_sources_from_dossier_dedup_order(self):
        d = self._dossier()
        d["external"].append({"text": "z", "source": "https://oca.org/b"})
        self.assertEqual(emit_one.sources_from_dossier(d),
                         ["OCA", "GOARCH",
                          "https://en.wikipedia.org/wiki/A", "https://oca.org/b"])

    def test_coverage_row_full(self):
        row = emit_one.coverage_row(self._dossier())
        self.assertEqual(row["feast_id"], "FF-0001")
        self.assertEqual(row["category"], "Great Feast")
        self.assertEqual(row["external_sources"], 2)
        self.assertEqual(row["verdict"], "full")

    def test_coverage_verdict_none_and_thin(self):
        self.assertEqual(emit_one.coverage_verdict(chars=5000, external_sources=0),
                         "none")
        self.assertEqual(emit_one.coverage_verdict(chars=200, external_sources=2),
                         "thin")

    def _profile(self):
        return {
            "id": "FF-0001",
            "overview": ["The Nativity of Christ is kept on December 25."],
            "history": ["The feast emerged in the fourth century."],
            "meaning": ["It celebrates the Incarnation."],
            "sections": [{"heading": "Services",
                          "body": ["A vigil is served."]}],
        }

    def test_reconcile_all_supported_is_draft(self):
        verdict = {"claims": [
            {"claim": "date", "quote": "kept on December 25", "supported": True},
        ]}
        status, demoted = emit_one.reconcile_status(self._profile(), verdict)
        self.assertEqual(status, "draft")
        self.assertEqual(demoted, [])

    def test_reconcile_honored_flag_is_flagged(self):
        verdict = {"claims": [
            {"claim": "century", "quote": "emerged in the fourth century",
             "supported": False, "reason": "no dossier support"},
        ]}
        status, _ = emit_one.reconcile_status(self._profile(), verdict)
        self.assertEqual(status, "flagged")
        flags = emit_one.real_flags(self._profile(), verdict)
        self.assertEqual(flags, [{"claim": "century",
                                  "detail": "no dossier support"}])

    def test_reconcile_phantom_flag_demoted_to_draft(self):
        verdict = {"claims": [
            {"claim": "invented", "quote": "text the profile never says",
             "supported": False, "reason": "…"},
        ]}
        status, demoted = emit_one.reconcile_status(self._profile(), verdict)
        self.assertEqual(status, "draft")
        self.assertEqual(len(demoted), 1)

    def test_profile_text_covers_feast_fields(self):
        text = emit_one.profile_text({
            "overview": ["a"], "history": ["b"], "meaning": ["c"],
            "iconography": ["d"], "hymnography": ["e"], "fastingPractice": ["f"],
            "customs": ["g"],
            "timeline": [{"when": "300s", "title": "h", "body": "i"}],
            "sections": [{"heading": "j", "body": ["k"]}],
            "scripture": [{"ref": "John 1:1", "note": "l"}],
        })
        for token in "abcdefghijkl":
            self.assertIn(token, text)
        self.assertIn("John 1:1", text)


@unittest.skipUnless(_yaml is not None, "pyyaml not installed (authoring-only dep)")
class TestEmitGate(unittest.TestCase):
    def test_write_profile_rejects_bad_id(self):
        from tools.feastgen import emit
        with self.assertRaises(ValueError):
            emit.write_profile(None, {"id": "OS-0001"}, sources=["x"],
                               generated="2026-07-05")

    def test_write_profile_rejects_sourceless_draft(self):
        from tools.feastgen import emit
        with self.assertRaises(ValueError):
            emit.write_profile(None, {"id": "FF-0001"}, sources=[],
                               generated="2026-07-05")


if __name__ == "__main__":
    unittest.main()
