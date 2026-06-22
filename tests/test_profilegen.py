import unittest
import tempfile
import json
from pathlib import Path as _P
from unittest import mock

try:  # pyyaml is an authoring-only dep (kept out of requirements.txt); skip if absent
    import yaml as _yaml
except ImportError:
    _yaml = None
from tools.profilegen import prioritize
from tools.profilegen import dossier
from tools.profilegen import facets
from tools.profilegen import emit
from tools.profilegen import emit_one
from tools.profilegen import proposals
from tools.profilegen import schemas
from tools.profilegen import run as runner


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

    def test_draft_with_empty_sources_is_rejected(self):
        # The build's Zod gate rejects sources:[] on draft/flagged — fail fast
        # in the pipeline instead of emitting a YAML that breaks `npm run build`.
        d = _P(tempfile.mkdtemp())
        with self.assertRaises(ValueError):
            emit.write_profile(d, {"id": "OS-0042", "overview": ["x"]},
                               sources=[], generated="2026-06-17", status="draft")

    def test_reviewed_with_empty_sources_is_allowed(self):
        # Only draft/flagged must cite sources; a human-reviewed profile may not.
        d = _P(tempfile.mkdtemp())
        path = emit.write_profile(d, {"id": "OS-0042", "overview": ["x"]},
                                  sources=[], generated="2026-06-17",
                                  status="reviewed")
        self.assertEqual(_yaml.safe_load(path.read_text())["sources"], [])

    def test_writes_flag_reasons_when_given(self):
        d = _P(tempfile.mkdtemp())
        reasons = [{"claim": "Disputed date", "detail": "anchor says otherwise"}]
        path = emit.write_profile(d, {"id": "OS-0042", "overview": ["x"]},
                                  sources=["s"], generated="2026-06-17",
                                  status="flagged", flag_reasons=reasons)
        self.assertEqual(_yaml.safe_load(path.read_text())["flagReasons"], reasons)

    def test_omits_flag_reasons_when_absent(self):
        d = _P(tempfile.mkdtemp())
        path = emit.write_profile(d, {"id": "OS-0042", "overview": ["x"]},
                                  sources=["s"], generated="2026-06-17",
                                  status="draft")
        self.assertNotIn("flagReasons", _yaml.safe_load(path.read_text()))


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


DOSSIER = {
    "id": "OS-0001",
    "name": "Stephen the Protomartyr",
    "anchor": {
        "brief": "The first martyr, a deacon of Jerusalem.",
        "notes": "",
        "customs": "",
        "context": {"Region of Origin": "Jerusalem"},
        "sources": ["OCA Synaxarion (oca.org)", "Acts 6-7"],
    },
    "external": [
        {"text": "x" * 1200, "source": "https://en.wikipedia.org/wiki/Saint_Stephen"},
        {"text": "y" * 600, "source": "https://orthodoxwiki.org/Stephen"},
    ],
}


class EmitOnePathTests(unittest.TestCase):
    def test_coverage_path_is_pinned_canonical(self):
        self.assertEqual(emit_one.coverage_path("2026-06-17").name,
                         "profilegen_2026-06-17.csv")

    def test_verdicts_path_is_pinned_canonical(self):
        self.assertEqual(emit_one.verdicts_path("2026-06-17").name,
                         "profilegen_2026-06-17_verdicts.json")


class SourcesFromDossierTests(unittest.TestCase):
    def test_anchor_then_external_deduped_in_order(self):
        self.assertEqual(
            emit_one.sources_from_dossier(DOSSIER),
            ["OCA Synaxarion (oca.org)", "Acts 6-7",
             "https://en.wikipedia.org/wiki/Saint_Stephen",
             "https://orthodoxwiki.org/Stephen"],
        )

    def test_drops_blank_and_duplicate_sources(self):
        d = {"anchor": {"sources": ["OCA", "", "OCA"]},
             "external": [{"text": "t", "source": "OCA"},
                          {"text": "t", "source": "  "}]}
        self.assertEqual(emit_one.sources_from_dossier(d), ["OCA"])

    def test_empty_when_no_sources(self):
        self.assertEqual(
            emit_one.sources_from_dossier({"anchor": {}, "external": []}), [])


class CoverageRowFromDossierTests(unittest.TestCase):
    def test_counts_external_and_picks_region_and_full_verdict(self):
        row = emit_one.coverage_row(DOSSIER)
        self.assertEqual(row["saint_id"], "OS-0001")
        self.assertEqual(row["name"], "Stephen the Protomartyr")
        self.assertEqual(row["region"], "Jerusalem")
        self.assertEqual(row["external_sources"], 2)
        self.assertGreaterEqual(row["dossier_chars"], 1500)
        self.assertEqual(row["verdict"], "full")  # >=2 external, >=1500 chars

    def test_no_external_is_none_verdict(self):
        d = {"id": "OS-0002", "name": "X",
             "anchor": {"brief": "short", "context": {}, "sources": ["s"]},
             "external": []}
        row = emit_one.coverage_row(d)
        self.assertEqual(row["external_sources"], 0)
        self.assertEqual(row["verdict"], "none")

    def test_external_without_source_url_is_not_counted(self):
        d = {"id": "OS-0003", "name": "X",
             "anchor": {"brief": "b", "context": {}, "sources": ["s"]},
             "external": [{"text": "t", "source": ""}]}
        self.assertEqual(emit_one.coverage_row(d)["external_sources"], 0)

    def test_duplicate_external_urls_count_once(self):
        # Two extracts from the SAME url is one source, not two — otherwise the
        # grounding verdict ("full" needs >=2) is inflated.
        d = {"id": "OS-0003", "name": "X",
             "anchor": {"context": {}, "sources": ["s"]},
             "external": [{"text": "a" * 1000, "source": "http://one"},
                          {"text": "b" * 1000, "source": "http://one"}]}
        row = emit_one.coverage_row(d)
        self.assertEqual(row["external_sources"], 1)
        self.assertEqual(row["verdict"], "thin")  # 1 distinct source, not "full"


class ReanchorTests(unittest.TestCase):
    def test_refreshes_name_region_sources_from_csv(self):
        # The Gather agent may overwrite the seeded name/context/sources; reanchor
        # restores them from the authoritative saints.csv row (external[] kept).
        base = dossier.for_id("OS-0001")
        mangled = {"id": "OS-0001", "name": "Dossier for X",
                   "anchor": {"sources": ["http://a-fetched-url"]},
                   "external": [{"text": "t", "source": "http://ext"}]}
        d = emit_one.reanchor(mangled)
        self.assertEqual(d["name"], base["name"])
        self.assertEqual(d["anchor"]["context"], base["anchor"]["context"])
        self.assertEqual(d["anchor"]["sources"], base["anchor"]["sources"])
        self.assertEqual(d["external"], mangled["external"])  # gather kept

    def test_unknown_id_returns_dossier_unchanged(self):
        m = {"id": "OS-9999", "name": "x",
             "anchor": {"sources": ["s"]}, "external": []}
        self.assertEqual(emit_one.reanchor(m), m)


class AppendVerdictTests(unittest.TestCase):
    def test_creates_array_and_preserves_claim_objects(self):
        p = _P(tempfile.mkdtemp()) / "v.json"
        entry = {"id": "OS-0001", "status": "flagged",
                 "claims": [{"claim": "c", "supported": False, "reason": "r"}]}
        emit_one.append_verdict(p, entry)
        import json
        data = json.loads(p.read_text())
        self.assertEqual(len(data), 1)
        # The {claim, supported, reason} objects survive verbatim (not stringified).
        self.assertEqual(data[0]["claims"][0]["supported"], False)
        self.assertEqual(data[0]["claims"][0]["claim"], "c")

    def test_appends_to_existing_array(self):
        p = _P(tempfile.mkdtemp()) / "v.json"
        emit_one.append_verdict(p, {"id": "OS-0001", "status": "pass", "claims": []})
        emit_one.append_verdict(p, {"id": "OS-0002", "status": "pass", "claims": []})
        import json
        data = json.loads(p.read_text())
        self.assertEqual([e["id"] for e in data], ["OS-0001", "OS-0002"])


class ProfileTextTests(unittest.TestCase):
    def test_gathers_prose_from_every_field(self):
        profile = {
            "id": "OS-0001", "lifespan": "3rd century",
            "overview": ["An overview line."],
            "patronage": ["Travelers"],
            "timeline": [{"when": "303", "title": "Martyrdom", "body": "Beheaded."}],
            "sections": [{"heading": "Life", "body": ["Born in Egypt.", "A monk."]}],
        }
        txt = emit_one.profile_text(profile)
        for needle in ("3rd century", "An overview line.", "Travelers", "303",
                       "Martyrdom", "Beheaded.", "Life", "Born in Egypt.", "A monk."):
            self.assertIn(needle, txt)


class ReconcileStatusTests(unittest.TestCase):
    PROFILE = {
        "id": "OS-0695",
        "overview": ["Born Revoula Benizelos, an Athenian noblewoman."],
        "sections": [{"heading": "Life",
                      "body": ["Her mother descended from old Byzantine nobility."]}],
    }

    def test_all_supported_is_draft(self):
        verdict = {"status": "pass", "claims": [
            {"claim": "c", "quote": "Born Revoula Benizelos", "supported": True, "reason": "ok"}]}
        status, demoted = emit_one.reconcile_status(self.PROFILE, verdict)
        self.assertEqual(status, "draft")
        self.assertEqual(demoted, [])

    def test_phantom_flag_is_demoted(self):
        # Verifier flags text the profile never emitted ("Rigoula") -> phantom.
        verdict = {"status": "flagged", "claims": [
            {"claim": "birth name", "quote": "Born Revoula (Rigoula) Benizelos",
             "supported": False, "reason": "Rigoula unsourced"}]}
        status, demoted = emit_one.reconcile_status(self.PROFILE, verdict)
        self.assertEqual(status, "draft")          # demoted -> not flagged
        self.assertEqual(len(demoted), 1)

    def test_real_flag_is_honored(self):
        # Quote IS in the profile -> a genuine contradiction stays flagged.
        verdict = {"status": "flagged", "claims": [
            {"claim": "name", "quote": "Born Revoula Benizelos",
             "supported": False, "reason": "contradicts anchor"}]}
        status, demoted = emit_one.reconcile_status(self.PROFILE, verdict)
        self.assertEqual(status, "flagged")
        self.assertEqual(demoted, [])

    def test_missing_quote_is_trusted_not_demoted(self):
        # No quote to disprove -> honor the adversarial verifier (never silently
        # drop a flag just because the model omitted the quote).
        verdict = {"status": "flagged", "claims": [
            {"claim": "x", "supported": False, "reason": "r"}]}
        status, demoted = emit_one.reconcile_status(self.PROFILE, verdict)
        self.assertEqual(status, "flagged")
        self.assertEqual(demoted, [])

    def test_mixed_real_and_phantom_stays_flagged(self):
        verdict = {"status": "flagged", "claims": [
            {"claim": "phantom", "quote": "never written here",
             "supported": False, "reason": "r"},
            {"claim": "real", "quote": "old Byzantine nobility",
             "supported": False, "reason": "r"}]}
        status, demoted = emit_one.reconcile_status(self.PROFILE, verdict)
        self.assertEqual(status, "flagged")        # the real one keeps it flagged
        self.assertEqual(len(demoted), 1)          # only the phantom is demoted

    def test_quote_matches_across_smart_punctuation(self):
        profile = {"id": "OS-0016",
                   "overview": ["Barbara — a third-century maiden — was martyred."]}
        # ASCII hyphens/spacing in the quote still match the em-dashes in the profile.
        verdict = {"status": "flagged", "claims": [
            {"claim": "c", "quote": "Barbara - a third-century maiden - was martyred.",
             "supported": False, "reason": "r"}]}
        status, demoted = emit_one.reconcile_status(profile, verdict)
        self.assertEqual(status, "flagged")        # matched -> honored, not demoted
        self.assertEqual(demoted, [])


class RealFlagsTests(unittest.TestCase):
    """real_flags() turns honored unsupported claims into {claim, detail} rows for
    the flagged banner; phantom and supported claims are excluded (mirrors the
    real/phantom split in reconcile_status)."""
    PROFILE = {
        "id": "OS-0695",
        "overview": ["Born Revoula Benizelos, an Athenian noblewoman."],
        "sections": [{"heading": "Life",
                      "body": ["Her mother descended from old Byzantine nobility."]}],
    }

    def test_honored_claim_becomes_claim_detail_row(self):
        verdict = {"status": "flagged", "claims": [
            {"claim": "name", "quote": "Born Revoula Benizelos",
             "supported": False, "reason": "contradicts anchor"}]}
        self.assertEqual(
            emit_one.real_flags(self.PROFILE, verdict),
            [{"claim": "name", "detail": "contradicts anchor"}])

    def test_phantom_claim_excluded(self):
        verdict = {"status": "flagged", "claims": [
            {"claim": "x", "quote": "never written here",
             "supported": False, "reason": "r"}]}
        self.assertEqual(emit_one.real_flags(self.PROFILE, verdict), [])

    def test_supported_claims_excluded(self):
        verdict = {"status": "pass", "claims": [
            {"claim": "x", "quote": "Born Revoula Benizelos",
             "supported": True, "reason": "ok"}]}
        self.assertEqual(emit_one.real_flags(self.PROFILE, verdict), [])

    def test_quoteless_claim_is_honored(self):
        verdict = {"status": "flagged", "claims": [
            {"claim": "x", "supported": False, "reason": "no quote to disprove"}]}
        self.assertEqual(
            emit_one.real_flags(self.PROFILE, verdict),
            [{"claim": "x", "detail": "no quote to disprove"}])


class VerdictSchemaQuoteTests(unittest.TestCase):
    def test_claim_requires_a_quote(self):
        item = schemas.VERDICT_SCHEMA["properties"]["claims"]["items"]
        self.assertIn("quote", item["required"])
        self.assertIn("quote", item["properties"])


class ProfileSchemaSourcesTests(unittest.TestCase):
    def test_profile_schema_declares_sources(self):
        self.assertIn("sources", schemas.PROFILE_SCHEMA["properties"])
        self.assertEqual(
            schemas.PROFILE_SCHEMA["properties"]["sources"]["type"], "array")

    def test_dossier_schema_requires_external_items_have_source(self):
        ext = schemas.DOSSIER_SCHEMA["properties"]["external"]["items"]
        self.assertIn("source", ext["required"])
        self.assertIn("text", ext["required"])

    def test_profile_schema_declares_optional_liturgical_title(self):
        props = schemas.PROFILE_SCHEMA["properties"]
        self.assertEqual(props["liturgicalTitle"]["type"], "string")
        self.assertNotIn("liturgicalTitle", schemas.PROFILE_SCHEMA["required"])


@unittest.skipIf(_yaml is None, "pyyaml not installed")
class BackfillTitleTests(unittest.TestCase):
    """The backfill's deterministic core: the model only proposes a string; Python
    does the surgical one-line insert that must never disturb other fields."""

    def setUp(self):
        from tools.profilegen import backfill_titles
        self.bt = backfill_titles

    def test_inserts_after_lifespan_preserving_other_fields(self):
        src = "id: OS-0042\nlifespan: 4th c.\noverview:\n  - A life.\nstatus: reviewed\n"
        out = self.bt.insert_title(src, "The Holy Martyr Foo of Bar")
        obj = _yaml.safe_load(out)
        self.assertEqual(obj["liturgicalTitle"], "The Holy Martyr Foo of Bar")
        # status + overview must survive untouched (reviewed content is sacred)
        self.assertEqual(obj["status"], "reviewed")
        self.assertEqual(obj["overview"], ["A life."])
        # placed directly after the lifespan line
        self.assertTrue(out.splitlines()[2].startswith("liturgicalTitle:"))

    def test_falls_back_to_id_line_when_no_lifespan(self):
        out = self.bt.insert_title("id: OS-0042\noverview:\n  - A life.\n", "Holy Foo the Wise")
        self.assertTrue(out.splitlines()[1].startswith("liturgicalTitle:"))
        self.assertEqual(_yaml.safe_load(out)["liturgicalTitle"], "Holy Foo the Wise")

    def test_escapes_titles_with_yaml_metacharacters(self):
        # A colon-space would break an unquoted scalar; safe_dump must quote it.
        tricky = "Our All-holy Lady: the Theotokos, Ever-Virgin Mary"
        out = self.bt.insert_title("id: OS-0001\nlifespan: x\n", tricky)
        self.assertEqual(_yaml.safe_load(out)["liturgicalTitle"], tricky)

    def test_preserves_crlf_newlines(self):
        crlf = "id: OS-0042\r\nlifespan: 4th c.\r\n"
        out = self.bt.insert_title(crlf, "Holy Foo of Bar")
        self.assertIn("\r\n", out)
        self.assertNotIn("\n\n", out.replace("\r\n", "\n\n").replace("\n\n", "X"))

    def test_title_line_is_single_unfolded_line(self):
        long = "Our Father among the Saints " + "Very " * 40 + "Long of Everywhere"
        line = self.bt.title_line(long)
        self.assertEqual(line.count("\n"), 0)  # never folded/wrapped
        self.assertTrue(line.startswith("liturgicalTitle:"))


class ProfilesPresentTests(unittest.TestCase):
    def test_returns_only_existing_ids(self):
        with tempfile.TemporaryDirectory() as d:
            p = _P(d)
            (p / "OS-0001.yaml").write_text("x", encoding="utf-8")
            (p / "OS-0003.yaml").write_text("x", encoding="utf-8")
            got = runner.profiles_present(
                ["OS-0001", "OS-0002", "OS-0003"], profiles_dir=p
            )
            self.assertEqual(got, {"OS-0001", "OS-0003"})

    def test_empty_when_none_exist(self):
        with tempfile.TemporaryDirectory() as d:
            got = runner.profiles_present(["OS-0001"], profiles_dir=_P(d))
            self.assertEqual(got, set())


class WorkflowOutcomeTests(unittest.TestCase):
    def test_none_when_zero_produced(self):
        self.assertEqual(runner.classify_workflow_outcome(0, 40), "none")

    def test_partial_when_some_produced(self):
        self.assertEqual(runner.classify_workflow_outcome(12, 40), "partial")

    def test_ok_when_all_produced(self):
        self.assertEqual(runner.classify_workflow_outcome(40, 40), "ok")

    def test_ok_when_over_counted(self):
        self.assertEqual(runner.classify_workflow_outcome(41, 40), "ok")


class RunWorkflowTests(unittest.TestCase):
    def _fake_proc(self):
        class _R:
            stdout = '{"type":"result","subtype":"success"}'
            stderr = ""
            returncode = 0
        return _R()

    def test_invokes_workflow_tool_with_json_args(self):
        captured = {}

        def fake_run(argv, **kw):
            captured["argv"] = argv
            return self._fake_proc()

        with mock.patch.object(runner.subprocess, "run", fake_run):
            out, rc = runner.run_workflow(["OS-0007", "OS-0008"], "2026-06-20")

        argv = captured["argv"]
        allowed = argv[argv.index("--allowedTools") + 1]
        self.assertIn("Workflow", allowed)
        prompt = argv[2]
        self.assertIn(runner.WORKFLOW_SCRIPT, prompt)
        import re
        payload = json.loads(re.search(r"\{.*\}", prompt).group(0))
        self.assertEqual(payload["ids"], ["OS-0007", "OS-0008"])
        self.assertEqual(payload["date"], "2026-06-20")
        self.assertEqual(rc, 0)

    def test_returns_combined_stdout_stderr(self):
        with mock.patch.object(runner.subprocess, "run", lambda argv, **kw: self._fake_proc()):
            out, rc = runner.run_workflow(["OS-0007"], "2026-06-20")
        self.assertIn('"type":"result"', out)


class LegacyPromptTokenGuardTests(unittest.TestCase):
    def test_points_at_stage_prompts_not_the_60kb_plan(self):
        captured = {}

        def fake_run(argv, **kw):
            captured["argv"] = argv
            class _R:
                stdout = '{"type":"result"}'; stderr = ""; returncode = 0
            return _R()

        with mock.patch.object(runner.subprocess, "run", fake_run):
            runner.run_claude(["OS-0001"])
        prompt = captured["argv"][2]
        # must NOT re-read the heavy pipeline-design plan per saint
        self.assertNotIn("2026-06-17-generation-pipeline.md", prompt)
        # must point at the lean stage guides instead
        self.assertIn("prompts/gather.md", prompt)
        self.assertIn("prompts/write.md", prompt)
        self.assertIn("prompts/verify.md", prompt)


class RunnerLoopIntegrationTests(unittest.TestCase):
    """Drive runner.main() with mocked I/O to exercise multi-batch chaining,
    partial-batch resume, the zero-production→rate-limit synthesis, and the
    weekly-cap stop — the paths a live run can't easily force on demand."""

    def _run(self, backlog, plan, produced, calls, *, batch_size=2,
             weekly=2, exclude_produced=True):
        plan = list(plan)

        def fake_ranked(n):
            return [(s, 0) for s in backlog
                    if not (exclude_produced and s in produced)]

        def fake_present(ids, profiles_dir=None):
            return {i for i in ids if i in produced}

        def fake_run_workflow(ids, date):
            calls.append(list(ids))
            step = plan.pop(0) if plan else "all"
            out = ""                       # a step may be (action, orchestrator_output_text)
            if isinstance(step, tuple):
                step, out = step
            if step == "all":
                produced.update(ids)
            elif step == "none":
                pass
            elif isinstance(step, int):
                produced.update(list(ids)[:step])
            return (out, 0)  # rc 0; out drives limits.zero_production_etype on 0-production

        with mock.patch.multiple(
            runner,
            USE_WORKFLOW=True, BATCH_SIZE=batch_size, WEEKLY_AFTER_WAITS=weekly,
            RESUME_AFTER=0, MAX_ERR=3,
            log=lambda *a, **k: None, notify=lambda *a, **k: None,
            write_state=lambda *a, **k: None, format_profiles=lambda *a, **k: None,
            run_workflow=fake_run_workflow, profiles_present=fake_present,
        ), mock.patch.object(runner.prioritize, "ranked", fake_ranked), \
                mock.patch.object(runner.time, "sleep", lambda *_: None):
            return runner.main()

    def test_multi_batch_happy_path(self):
        produced, calls = set(), []
        rc = self._run(["A", "B", "C", "D"], ["all", "all"], produced, calls)
        self.assertEqual(rc, 0)
        self.assertEqual(len(calls), 2)            # one workflow call per batch
        self.assertEqual(produced, {"A", "B", "C", "D"})

    def test_partial_batch_then_resume_next_invocation(self):
        produced, calls = set(), []
        rc1 = self._run(["A", "B"], [1], produced, calls)   # produce only 1 of 2
        self.assertEqual(rc1, 0)
        self.assertEqual(len(produced), 1)                  # straggler left behind
        rc2 = self._run(["A", "B"], ["all"], produced, calls)  # fresh invocation
        self.assertEqual(rc2, 0)
        self.assertEqual(produced, {"A", "B"})
        # the resume invocation re-drove ONLY the missing id, not the done one
        self.assertEqual(len(calls[-1]), 1)

    _RL = "429 rate limit exceeded"          # orchestrator text → rate_limit_error
    _OVL = "Both gather stages hit 529 Overloaded errors"  # → overloaded_error (transient)

    def test_rate_limited_zero_production_retries_within_run(self):
        # genuine rate limit: 0 emitted WITH a 429 signal → wait → retry same ids
        produced, calls = set(), []
        rc = self._run(["A", "B"], [("none", self._RL), "all"], produced, calls, weekly=3)
        self.assertEqual(rc, 0)
        self.assertEqual(produced, {"A", "B"})
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[0], calls[1])       # same remaining ids both attempts

    def test_persistent_rate_limit_stops_weekly(self):
        produced, calls = set(), []
        rc = self._run(["A", "B"], [("none", self._RL)] * 3, produced, calls, weekly=2)
        self.assertEqual(rc, 2)                     # likely-weekly-cap exit
        self.assertEqual(len(calls), 3)            # 2 waits, then stop on the 3rd

    def test_transient_overload_backs_off_and_skips(self):
        # 529 Overloaded must NOT trigger the weekly-cap stop — back off, retry,
        # then skip the batch (MAX_ERR=3) and let the run finish cleanly.
        produced, calls = set(), []
        rc = self._run(["A", "B"], [("none", self._OVL)] * 3, produced, calls, weekly=2)
        self.assertEqual(rc, 0)                     # finished (not exit 2 weekly-cap)
        self.assertEqual(len(calls), 3)            # MAX_ERR attempts, then skip
        self.assertEqual(produced, set())          # nothing forced; batch skipped

    def test_silent_zero_production_backs_off_not_weekly(self):
        # 0 emitted with NO error signal → 'error' → backoff + skip, never weekly-cap
        produced, calls = set(), []
        rc = self._run(["A", "B"], ["none", "none", "none"], produced, calls, weekly=2)
        self.assertEqual(rc, 0)
        self.assertEqual(len(calls), 3)

    def test_already_complete_batch_is_skipped(self):
        produced, calls = {"A", "B"}, []
        rc = self._run(["A", "B"], [], produced, calls, exclude_produced=False)
        self.assertEqual(rc, 0)
        self.assertEqual(calls, [])                 # all on disk → workflow never called


class ZeroProductionClassifyTests(unittest.TestCase):
    def test_429_is_rate_limit(self):
        self.assertEqual(limits.zero_production_etype("hit 429 rate limit"), "rate_limit_error")

    def test_529_is_overloaded(self):
        self.assertEqual(
            limits.zero_production_etype("Both gather stages hit 529 Overloaded errors"),
            "overloaded_error")

    def test_unknown_is_error(self):
        self.assertEqual(limits.zero_production_etype("no profiles written"), "error")

    def test_empty_is_error(self):
        self.assertEqual(limits.zero_production_etype(""), "error")

    def test_rate_limit_wins_when_both_present(self):
        self.assertEqual(
            limits.zero_production_etype("429 rate limit; also 529 overloaded"),
            "rate_limit_error")
