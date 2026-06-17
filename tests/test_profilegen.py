import unittest
import tempfile
from pathlib import Path as _P

try:  # pyyaml is an authoring-only dep (kept out of requirements.txt); skip if absent
    import yaml as _yaml
except ImportError:
    _yaml = None
from tools.profilegen import prioritize
from tools.profilegen import dossier
from tools.profilegen import facets
from tools.profilegen import emit
from tools.profilegen import proposals


class FinderScoreTests(unittest.TestCase):
    def test_intercessions_weigh_most(self):
        row = {
            "Commonly Asked Intercessions": "Healing; Travelers",
            "Vocation": "Bishop",
            "Life Experience": "",
            "Virtue": "",
        }
        # 2 intercessions * 3 + 1 vocation * 1 = 7
        self.assertEqual(prioritize.finder_score(row), 7)

    def test_empty_row_scores_zero(self):
        row = {
            "Commonly Asked Intercessions": "",
            "Vocation": "",
            "Life Experience": "",
            "Virtue": "",
        }
        self.assertEqual(prioritize.finder_score(row), 0)


class DossierTests(unittest.TestCase):
    def test_baseline_from_row(self):
        row = {
            "Saint ID": "OS-0021",
            "Name": "Basil the Great",
            "Brief Life": "Archbishop of Caesarea.",
            "Notes": "",
            "Feast Day(s)": "Jan 1",
            "Region of Origin": "Cappadocia",
            "Sources": "OCA Synaxarion (oca.org)",
        }
        d = dossier.baseline(row)
        self.assertEqual(d["id"], "OS-0021")
        self.assertEqual(d["anchor"]["brief"], "Archbishop of Caesarea.")
        self.assertIn("OCA Synaxarion (oca.org)", d["anchor"]["sources"])
        self.assertEqual(d["external"], [])  # gather fills this


HEADER = "Saint ID,Name,Vocation,Commonly Asked Intercessions,Sources\r\n"


class FacetMergeTests(unittest.TestCase):
    def _csv(self, body: str) -> _P:
        d = _P(tempfile.mkdtemp())
        p = d / "saints.csv"
        p.write_bytes((HEADER + body).encode("utf-8"))
        return p

    def test_appends_term_and_preserves_crlf(self):
        p = self._csv("OS-0001,Anna,Bishop,Healing,OCA\r\n")
        facets.merge(p, "OS-0001", {"Vocation": ["Missionary"]},
                     vocab={"Vocation": {"Bishop", "Missionary"}})
        raw = p.read_bytes()
        self.assertIn(b"Bishop; Missionary", raw)
        self.assertTrue(raw.endswith(b"\r\n"))
        self.assertEqual(raw.count(b"\r\n"), 2)  # header + 1 row, CRLF intact

    def test_quotes_field_when_value_gains_a_comma(self):
        # Intercessions has no comma yet; adding a term keeps "; " sep (no comma),
        # but a term containing a comma must force quoting of the whole field.
        p = self._csv("OS-0001,Anna,Bishop,Healing,OCA\r\n")
        facets.merge(p, "OS-0001",
                     {"Commonly Asked Intercessions": ["Travelers, sailors"]},
                     vocab={"Commonly Asked Intercessions":
                            {"Healing", "Travelers, sailors"}})
        raw = p.read_bytes().decode("utf-8")
        self.assertIn('"Healing; Travelers, sailors"', raw)

    def test_skips_duplicate_terms(self):
        p = self._csv("OS-0001,Anna,Bishop,Healing,OCA\r\n")
        facets.merge(p, "OS-0001", {"Vocation": ["Bishop"]},
                     vocab={"Vocation": {"Bishop"}})
        self.assertIn(b"Bishop",
                      p.read_bytes())  # unchanged; still single "Bishop"
        self.assertEqual(p.read_bytes().decode().count("Bishop"), 1)

    def test_rejects_unknown_vocab_term(self):
        p = self._csv("OS-0001,Anna,Bishop,Healing,OCA\r\n")
        with self.assertRaises(ValueError):
            facets.merge(p, "OS-0001", {"Vocation": ["Astronaut"]},
                         vocab={"Vocation": {"Bishop"}})

    def test_leaves_other_rows_byte_for_byte(self):
        p = self._csv("OS-0001,Anna,Bishop,Healing,OCA\r\n"
                      "OS-0002,Bob,Monk,Peace,OCA\r\n")
        facets.merge(p, "OS-0001", {"Vocation": ["Missionary"]},
                     vocab={"Vocation": {"Bishop", "Missionary"}})
        self.assertIn(b"OS-0002,Bob,Monk,Peace,OCA\r\n", p.read_bytes())

    def test_returns_false_when_nothing_changes(self):
        p = self._csv("OS-0001,Anna,Bishop,Healing,OCA\r\n")
        before = p.read_bytes()
        result = facets.merge(p, "OS-0001", {"Vocation": ["Bishop"]},
                              vocab={"Vocation": {"Bishop"}})
        self.assertFalse(result)
        self.assertEqual(p.read_bytes(), before)  # bytes unchanged

    def test_raises_for_missing_sid(self):
        p = self._csv("OS-0001,Anna,Bishop,Healing,OCA\r\n")
        before = p.read_bytes()
        with self.assertRaises(KeyError):
            facets.merge(p, "OS-9999", {"Vocation": ["Bishop"]},
                         vocab={"Vocation": {"Bishop"}})
        self.assertEqual(p.read_bytes(), before)  # bytes unchanged


@unittest.skipUnless(_yaml is not None, "pyyaml not installed (authoring-only dep)")
class EmitTests(unittest.TestCase):
    def test_writes_yaml_with_metadata(self):
        d = _P(tempfile.mkdtemp())
        profile = {"id": "OS-0042", "overview": ["A life."]}
        path = emit.write_profile(
            d, profile, sources=["https://oca.org/x"],
            generated="2026-06-17", status="draft",
        )
        self.assertEqual(path.name, "OS-0042.yaml")
        obj = _yaml.safe_load(path.read_text())
        self.assertEqual(obj["id"], "OS-0042")
        self.assertEqual(obj["status"], "draft")
        self.assertEqual(obj["generated"], "2026-06-17")
        self.assertEqual(obj["sources"], ["https://oca.org/x"])
        self.assertEqual(obj["overview"], ["A life."])

    def test_refuses_bad_id(self):
        d = _P(tempfile.mkdtemp())
        with self.assertRaises(ValueError):
            emit.write_profile(d, {"id": "", "overview": ["x"]},
                               sources=["s"], generated="2026-06-17")


class ProposalGateTests(unittest.TestCase):
    def test_accepts_pd_quote_translation(self):
        self.assertTrue(proposals.quote_ok({
            "translation": "NPNF2", "source_url": "https://ccel.org/x", "quote": "y"}))

    def test_rejects_modern_translation_quote(self):
        self.assertFalse(proposals.quote_ok({
            "translation": "SVS Press 1980", "source_url": "https://x", "quote": "y"}))

    def test_accepts_open_image_license(self):
        self.assertTrue(proposals.image_ok({
            "license": "PD-art", "source": "https://commons.wikimedia.org/x",
            "image_path": "icons/OS-0001.jpg"}))

    def test_rejects_unlicensed_image(self):
        self.assertFalse(proposals.image_ok({
            "license": "All rights reserved", "source": "https://x",
            "image_path": "icons/x.jpg"}))


from tools.profilegen import coverage


class CoverageVerdictTests(unittest.TestCase):
    def test_none_when_no_external_text(self):
        self.assertEqual(coverage.verdict(dossier_chars=120, external_sources=0), "none")

    def test_thin_when_little_external(self):
        self.assertEqual(coverage.verdict(dossier_chars=300, external_sources=1), "thin")

    def test_full_when_rich(self):
        self.assertEqual(
            coverage.verdict(dossier_chars=4000, external_sources=3), "full")


from tools.profilegen import limits


class ErrorTypeTests(unittest.TestCase):
    def test_success_returns_none(self):
        self.assertIsNone(limits.parse_error_type('{"type":"result","result":"wrote 12"}'))

    def test_rate_limit_error_from_json(self):
        out = '{"type":"error","error":{"type":"rate_limit_error","message":"Request rejected (429)"}}'
        self.assertEqual(limits.parse_error_type(out), "rate_limit_error")

    def test_billing_error_from_json(self):
        out = '{"type":"error","error":{"type":"billing_error","message":"x"}}'
        self.assertEqual(limits.parse_error_type(out), "billing_error")

    def test_stream_json_picks_the_error_line(self):
        out = '{"type":"system"}\n{"type":"error","error":{"type":"rate_limit_error"}}\n'
        self.assertEqual(limits.parse_error_type(out), "rate_limit_error")

    def test_text_fallback_detects_429(self):
        self.assertEqual(
            limits.parse_error_type("API Error: Request rejected (429)"), "rate_limit_error")

    def test_success_text_mentioning_429_is_not_an_error(self):
        # "429 Martyrs" is a real commemoration; a success result mentioning it
        # must NOT be misread as a rate-limit error.
        out = '{"type":"result","result":"wrote a profile about the 429 Martyrs"}'
        self.assertIsNone(limits.parse_error_type(out))


class TerminalTests(unittest.TestCase):
    def test_billing_and_auth_are_terminal(self):
        self.assertTrue(limits.is_terminal("billing_error"))
        self.assertTrue(limits.is_terminal("authentication_error"))

    def test_rate_limit_is_not_terminal(self):
        self.assertFalse(limits.is_terminal("rate_limit_error"))

    def test_none_is_not_terminal(self):
        self.assertFalse(limits.is_terminal(None))


class RetryAfterTests(unittest.TestCase):
    def test_explicit_retry_after(self):
        self.assertEqual(limits.retry_after_seconds("retry-after: 90"), 90)

    def test_absent_returns_none(self):  # the common case for subscription limits
        self.assertIsNone(limits.retry_after_seconds("Request rejected (429)"))
