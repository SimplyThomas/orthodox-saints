"""Unit tests for build.py — the validation/transform engine.

Run from the repo root:  python -m unittest discover -s tests
(or `make test` / `make docker-test`).
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

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

    def test_wrong_column_term_gets_cross_category_hint(self):
        # "Healing" is a valid Intercession but not a Rank — the error should say so.
        errs = errors_for([valid_row(**{"Rank / Type": "Healing"})])
        self.assertTrue(any("Healing" in e and "Commonly Asked Intercessions" in e
                            and "wrong column?" in e for e in errs))

    def test_truly_unknown_term_gets_no_hint(self):
        errs = errors_for([valid_row(**{"Rank / Type": "Bogus"})])
        self.assertTrue(any("Bogus" in e and "wrong column?" not in e for e in errs))

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

    def test_impossible_feast_day_is_an_error(self):
        for feast in ("Feb 30", "Apr 31", "Jan 0", "Sep 4; Nov 31"):
            errs = errors_for([valid_row(**{"Feast Day(s)": feast})])
            self.assertTrue(any("impossible feast date" in e for e in errs),
                            f"{feast!r} should be rejected: {errs}")

    def test_month_boundary_feast_days_are_valid(self):
        for feast in ("Jan 31", "Feb 29", "Apr 30", "Dec 31"):
            self.assertEqual(errors_for([valid_row(**{"Feast Day(s)": feast})]),
                             [], f"{feast!r} should be accepted")

    def test_duplicate_name_warns(self):
        rows = [valid_row(), valid_row(**{"Saint ID": "OS-0002"})]
        _errs, warns = build.validate(build.HEADER, rows, TEST_VOCAB)
        self.assertTrue(any("possible duplicate saint" in w for w in warns))

    def test_documented_distinct_duplicate_name_is_suppressed(self):
        # Same normalized name, but the rows cross-reference each other in
        # Notes ("Distinct from ... (OS-####)") — verified-distinct, no warning.
        rows = [
            valid_row(**{"Notes": "Distinct from the other Test Martyr (OS-0002)."}),
            valid_row(**{"Saint ID": "OS-0002"}),
        ]
        _errs, warns = build.validate(build.HEADER, rows, TEST_VOCAB)
        self.assertFalse(any("possible duplicate saint" in w for w in warns))

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


class WorksAndVendorsTests(unittest.TestCase):
    def test_work_link_shape_and_query(self):
        w = build.work_link("On the Holy Spirit", "St. Basil")
        self.assertEqual(w["t"], "On the Holy Spirit")
        self.assertIn("google.com/search", w["u"])
        self.assertIn("Holy+Spirit", w["u"])
        self.assertIn("Basil", w["u"])

    def test_vendor_links_substitute_name(self):
        vendors = [{"vendor": "Test Shop", "url_template": "https://x/?q={q}"}]
        links = build.vendor_links("St. Test", vendors)
        self.assertEqual(links, [{"vendor": "Test Shop", "url": "https://x/?q=St.+Test"}])

    def test_to_record_works_become_link_objects(self):
        rec = build.to_record(
            valid_row(**{"Works by the Saint": "Book A; Book B"}),
            vendors=[{"vendor": "V", "url_template": "https://v/{q}"}])
        self.assertEqual([w["t"] for w in rec["works"]], ["Book A", "Book B"])
        self.assertTrue(all("u" in w for w in rec["works"]))
        self.assertEqual(rec["vendors"], [{"vendor": "V", "url": "https://v/Test+Martyr"}])


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


class PriorityReportTests(unittest.TestCase):
    """Icon-priority scorer/ranking (issue #83): rank icon-less saints."""

    def test_score_weights_factors(self):
        score, parts = build.priority_score(valid_row(**{
            "Tradition of Veneration": "Russian; Greek; Pan-Orthodox",  # 3 -> 6
            "Commonly Asked Intercessions": "Healing",                  # +3
            "Vocation": "Physician",                                    # +1
            "Life Experience": "Illness",                              # +1
            "Feast Day(s)": "Jan 1; Sep 4",                            # +2
        }))
        self.assertEqual(score, 13)
        self.assertEqual(parts["traditions"], 3)
        self.assertTrue(parts["intercession"])
        self.assertEqual(parts["feasts"], 2)

    def test_score_bare_stub_is_low(self):
        # Minimal row: no traditions, no facets, one feast -> just feast_count.
        score, parts = build.priority_score(valid_row())
        self.assertEqual(score, 1)
        self.assertFalse(parts["intercession"])

    def test_ranking_excludes_covered_saints(self):
        rows = [valid_row(**{"Saint ID": "OS-0001", "Name": "Has Icon"}),
                valid_row(**{"Saint ID": "OS-0002", "Name": "No Icon"})]
        images = {"OS-0001": {"path": "icons/a.jpg"}}
        ranked = build.priority_ranking(rows, images)
        ids = [r["Saint ID"] for _s, r, _p in ranked]
        self.assertEqual(ids, ["OS-0002"])

    def test_ranking_sorts_by_score_then_id(self):
        rows = [
            valid_row(**{"Saint ID": "OS-0001", "Commonly Asked Intercessions": ""}),
            valid_row(**{"Saint ID": "OS-0002",
                         "Commonly Asked Intercessions": "Healing"}),
            valid_row(**{"Saint ID": "OS-0003", "Commonly Asked Intercessions": ""}),
        ]
        ranked = build.priority_ranking(rows, {})
        ids = [r["Saint ID"] for _s, r, _p in ranked]
        # OS-0002 (has intercession) first; the two ties broken by Saint ID.
        self.assertEqual(ids, ["OS-0002", "OS-0001", "OS-0003"])

    def test_ranking_against_committed_seed_is_nonempty(self):
        _header, rows = build.load_saints()
        images = build.load_saint_images()
        ranked = build.priority_ranking(rows, images)
        self.assertTrue(ranked)
        # Scores are non-increasing (descending order).
        scores = [s for s, _r, _p in ranked]
        self.assertEqual(scores, sorted(scores, reverse=True))


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


class NameVariantTests(unittest.TestCase):
    LOOKUP = {"lucia": ["Lucia", "Lucy"], "lucy": ["Lucia", "Lucy"],
              "john": ["John", "Ivan"], "ivan": ["John", "Ivan"]}

    def test_fold_strips_accents_and_case(self):
        self.assertEqual(build.fold("Étienne"), "etienne")
        self.assertEqual(build.fold("Lucy"), "lucy")

    def test_variant_forms_adds_only_missing(self):
        row = valid_row(Name="St. Lucia of Syracuse")
        self.assertEqual(build.variant_forms(row, self.LOOKUP), ["Lucy"])

    def test_variant_forms_uses_also_known_as(self):
        # Already lists Ivan -> nothing new to add for the John group via AKA,
        # but the canonical "John" form should still surface.
        row = valid_row(Name="Holy Apostle Ivan", **{"Also Known As": ""})
        self.assertEqual(build.variant_forms(row, self.LOOKUP), ["John"])

    def test_variant_forms_empty_when_no_match(self):
        self.assertEqual(build.variant_forms(valid_row(Name="Hermione"), self.LOOKUP), [])

    def test_to_record_expands_search_and_sets_variants(self):
        rec = build.to_record(valid_row(Name="St. Lucia"),
                              vendors=[], name_variants=self.LOOKUP)
        self.assertEqual(rec["variants"], ["Lucy"])
        self.assertIn("lucy", rec["search"].lower())

    def test_to_record_no_variants_key_when_none(self):
        rec = build.to_record(valid_row(Name="Hermione"),
                              vendors=[], name_variants=self.LOOKUP)
        self.assertNotIn("variants", rec)

    def test_committed_variant_map_is_valid(self):
        self.assertEqual(build.validate_name_variants(), [])


class SaintImageTests(unittest.TestCase):
    """data/saint_images.csv loader, license rules, validation, and join."""

    def test_license_ok_accepts_open_and_rejects_others(self):
        for good in ("PD", "PD-art", "PD-old", "CC0",
                     "CC-BY", "CC-BY-SA", "CC-BY-4.0", "CC-BY-SA-3.0"):
            self.assertTrue(build.license_ok(good), good)
        for bad in ("", "All rights reserved", "CC-BY-NC", "CC-BY-ND",
                    "Fair use", "© 2020", "GFDL-only"):
            self.assertFalse(build.license_ok(bad), bad)

    def test_only_cc_by_requires_credit(self):
        self.assertTrue(build.license_requires_credit("CC-BY-4.0"))
        self.assertTrue(build.license_requires_credit("CC-BY-SA"))
        self.assertFalse(build.license_requires_credit("PD"))
        self.assertFalse(build.license_requires_credit("CC0"))

    def test_to_record_joins_image_and_attribution(self):
        images = {"OS-0001": {"path": "icons/test.jpg", "license": "CC-BY-4.0",
                              "credit": "A. Iconographer", "source": "https://ex"}}
        rec = build.to_record(valid_row(), vendors=[], name_variants={}, images=images)
        self.assertEqual(rec["image"], "icons/test.jpg")
        self.assertEqual(rec["imageLicense"], "CC-BY-4.0")
        self.assertEqual(rec["imageCredit"], "A. Iconographer")
        self.assertEqual(rec["imageSource"], "https://ex")

    def test_to_record_no_image_key_when_absent(self):
        rec = build.to_record(valid_row(), vendors=[], name_variants={}, images={})
        self.assertNotIn("image", rec)

    def _run_image_validation(self, rows_csv, files, permissions=None):
        """Validate a synthetic saint_images.csv against a temp static/ dir.
        `permissions` is an optional {slug: {...}} registry."""
        import csv as _csv
        import tempfile
        from pathlib import Path

        tmp = Path(tempfile.mkdtemp())
        (tmp / "icons").mkdir()
        for f in files:
            (tmp / f).parent.mkdir(parents=True, exist_ok=True)
            (tmp / f).write_bytes(b"\x89PNG\r\n")
        csv_path = tmp / "saint_images.csv"
        with csv_path.open("w", encoding="utf-8", newline="") as fh:
            w = _csv.DictWriter(fh, fieldnames=build.SAINT_IMAGES_HEADER)
            w.writeheader()
            w.writerows(rows_csv)
        old_csv, old_static = build.SAINT_IMAGES_CSV, build.STATIC
        try:
            build.SAINT_IMAGES_CSV, build.STATIC = csv_path, tmp
            return build.validate_saint_images({"OS-0001", "OS-0002"},
                                               permissions=permissions or {})
        finally:
            build.SAINT_IMAGES_CSV, build.STATIC = old_csv, old_static

    def _img(self, **over):
        row = {"saint_id": "OS-0001", "image_path": "icons/a.jpg",
               "license": "PD", "credit": "", "source": "https://src"}
        row.update(over)
        return row

    def test_clean_image_row_validates(self):
        errs, warns = self._run_image_validation([self._img()], ["icons/a.jpg"])
        self.assertEqual(errs, [])

    def test_unknown_saint_id_errors(self):
        errs, _ = self._run_image_validation(
            [self._img(saint_id="OS-9999")], ["icons/a.jpg"])
        self.assertTrue(any("matches no saint" in e for e in errs))

    def test_missing_file_errors(self):
        errs, _ = self._run_image_validation([self._img()], files=[])
        self.assertTrue(any("not found" in e for e in errs))

    def test_bad_license_errors(self):
        errs, _ = self._run_image_validation(
            [self._img(license="All rights reserved")], ["icons/a.jpg"])
        self.assertTrue(any("not an accepted open license" in e for e in errs))

    def test_cc_by_without_credit_errors(self):
        errs, _ = self._run_image_validation(
            [self._img(license="CC-BY-4.0", credit="")], ["icons/a.jpg"])
        self.assertTrue(any("requires a 'credit'" in e for e in errs))

    def test_duplicate_saint_image_errors(self):
        errs, _ = self._run_image_validation(
            [self._img(image_path="icons/a.jpg"),
             self._img(image_path="icons/a.jpg")], ["icons/a.jpg"])
        self.assertTrue(any("duplicate image row" in e for e in errs))

    def test_missing_source_warns_not_errors(self):
        errs, warns = self._run_image_validation(
            [self._img(source="")], ["icons/a.jpg"])
        self.assertEqual(errs, [])
        self.assertTrue(any("no 'source'" in w for w in warns))

    def test_permission_license_with_known_active_vendor_ok(self):
        perms = {"theophany-works": {"status": "active"}}
        errs, _ = self._run_image_validation(
            [self._img(image_path="icons/permission/theophany-works/OS-0001.jpg",
                       license="Permission:theophany-works", source="https://tw/x")],
            ["icons/permission/theophany-works/OS-0001.jpg"], permissions=perms)
        self.assertEqual(errs, [])

    def test_permission_license_unknown_vendor_errors(self):
        errs, _ = self._run_image_validation(
            [self._img(license="Permission:nobody", source="https://x")],
            ["icons/a.jpg"], permissions={})
        self.assertTrue(any("not in data/image_permissions.csv" in e for e in errs))

    def test_permission_license_without_source_errors(self):
        perms = {"theophany-works": {"status": "active"}}
        errs, _ = self._run_image_validation(
            [self._img(license="Permission:theophany-works", source="")],
            ["icons/a.jpg"], permissions=perms)
        self.assertTrue(any("requires a 'source'" in e for e in errs))

    def test_revoked_vendor_warns_not_errors(self):
        perms = {"theophany-works": {"status": "revoked"}}
        errs, warns = self._run_image_validation(
            [self._img(license="Permission:theophany-works", source="https://x")],
            ["icons/a.jpg"], permissions=perms)
        self.assertEqual(errs, [])
        self.assertTrue(any("REVOKED" in w for w in warns))

    def test_committed_image_file_validates(self):
        # The committed data/saint_images.csv (header-only or real rows) must pass.
        errs, _ = build.validate_saint_images(
            {r["Saint ID"].strip() for r in build.load_saints()[1]})
        self.assertEqual(errs, [], "committed saint_images.csv has errors:\n" +
                         "\n".join(errs))


class ImagePermissionTests(unittest.TestCase):
    """data/image_permissions.csv registry loader + validation."""

    def _run(self, rows):
        import csv as _csv, tempfile
        from pathlib import Path
        tmp = Path(tempfile.mkdtemp())
        csv_path = tmp / "image_permissions.csv"
        with csv_path.open("w", encoding="utf-8", newline="") as fh:
            w = _csv.DictWriter(fh, fieldnames=build.IMAGE_PERMISSIONS_HEADER)
            w.writeheader()
            w.writerows(rows)
        old = build.IMAGE_PERMISSIONS_CSV
        try:
            build.IMAGE_PERMISSIONS_CSV = csv_path
            return build.load_image_permissions(), build.validate_image_permissions()
        finally:
            build.IMAGE_PERMISSIONS_CSV = old

    def _row(self, **over):
        row = {"vendor_slug": "theophany-works", "vendor_name": "Theophany Works",
               "attribution": "Icon used with permission from Theophany Works.",
               "homepage": "https://theophanyworks.com/holy-icons/",
               "granted": "2026-06-17", "status": "active", "terms": "see docs"}
        row.update(over)
        return row

    def test_permission_slug_parses_token(self):
        self.assertEqual(build.permission_slug("Permission:theophany-works"),
                         "theophany-works")
        self.assertIsNone(build.permission_slug("PD"))
        self.assertIsNone(build.permission_slug("Permission:Bad Slug"))

    def test_clean_registry_loads_and_validates(self):
        loaded, (errs, _) = self._run([self._row()])
        self.assertEqual(errs, [])
        self.assertEqual(loaded["theophany-works"]["status"], "active")
        self.assertEqual(loaded["theophany-works"]["name"], "Theophany Works")

    def test_bad_status_errors(self):
        _, (errs, _) = self._run([self._row(status="maybe")])
        self.assertTrue(any("status" in e for e in errs))

    def test_duplicate_slug_errors(self):
        _, (errs, _) = self._run([self._row(), self._row()])
        self.assertTrue(any("duplicate vendor_slug" in e for e in errs))

    def test_missing_attribution_errors(self):
        _, (errs, _) = self._run([self._row(attribution="")])
        self.assertTrue(any("empty attribution" in e for e in errs))

    def test_empty_slug_errors(self):
        _, (errs, _) = self._run([self._row(vendor_slug="")])
        self.assertTrue(any("empty vendor_slug" in e for e in errs))


class SaintQuoteTests(unittest.TestCase):
    """data/saint_quotes.csv loader, PD-translation gate, validation, and join."""

    def test_translation_ok_accepts_pd_and_rejects_copyrighted(self):
        for good in ("ANF Vol 1", "NPNF1 vol 9", "NPNF2 Vol. 4",
                     "NPNF", "Some 1890 ed. (PD)", "PD-old", "CC0"):
            self.assertTrue(build.translation_ok(good), good)
        for bad in ("", "St Vladimir's Seminary Press, 1998",
                    "The Philokalia, Faber 1979", "© 2020 Holy Cross"):
            self.assertFalse(build.translation_ok(bad), bad)

    def test_to_record_joins_quote_and_citation(self):
        quotes = {"OS-0001": {"quote": "A saying.", "work": "On Prayer",
                              "locus": "§3", "translation": "NPNF2 (PD)",
                              "source": "https://ex"}}
        rec = build.to_record(valid_row(), vendors=[], name_variants={},
                              images={}, quotes=quotes)
        self.assertEqual(rec["quote"], "A saying.")
        self.assertEqual(rec["quoteWork"], "On Prayer")
        self.assertEqual(rec["quoteLocus"], "§3")
        self.assertEqual(rec["quoteTranslation"], "NPNF2 (PD)")
        self.assertEqual(rec["quoteSource"], "https://ex")

    def test_to_record_no_quote_key_when_absent(self):
        rec = build.to_record(valid_row(), vendors=[], name_variants={},
                              images={}, quotes={})
        self.assertNotIn("quote", rec)

    def _run_quote_validation(self, rows_csv):
        """Validate a synthetic saint_quotes.csv. Returns (errors, warnings)."""
        import csv as _csv
        import tempfile
        from pathlib import Path

        tmp = Path(tempfile.mkdtemp())
        csv_path = tmp / "saint_quotes.csv"
        with csv_path.open("w", encoding="utf-8", newline="") as fh:
            w = _csv.DictWriter(fh, fieldnames=build.SAINT_QUOTES_HEADER)
            w.writeheader()
            w.writerows(rows_csv)
        old_csv = build.SAINT_QUOTES_CSV
        try:
            build.SAINT_QUOTES_CSV = csv_path
            return build.validate_saint_quotes({"OS-0001", "OS-0002"})
        finally:
            build.SAINT_QUOTES_CSV = old_csv

    def _q(self, **over):
        row = {"saint_id": "OS-0001", "quote": "A genuine saying.",
               "work": "On Prayer", "locus": "§3",
               "translation": "NPNF2 (PD)", "source_url": "https://src"}
        row.update(over)
        return row

    def test_clean_quote_row_validates(self):
        errs, _ = self._run_quote_validation([self._q()])
        self.assertEqual(errs, [])

    def test_unknown_saint_id_errors(self):
        errs, _ = self._run_quote_validation([self._q(saint_id="OS-9999")])
        self.assertTrue(any("matches no saint" in e for e in errs))

    def test_copyrighted_translation_errors(self):
        errs, _ = self._run_quote_validation(
            [self._q(translation="SVS Press 1998")])
        self.assertTrue(any("public-domain source" in e for e in errs))

    def test_empty_translation_errors(self):
        errs, _ = self._run_quote_validation([self._q(translation="")])
        self.assertTrue(any("empty translation" in e for e in errs))

    def test_empty_quote_errors(self):
        errs, _ = self._run_quote_validation([self._q(quote="")])
        self.assertTrue(any("empty quote" in e for e in errs))

    def test_missing_source_errors(self):
        errs, _ = self._run_quote_validation([self._q(source_url="")])
        self.assertTrue(any("empty source_url" in e for e in errs))

    def test_duplicate_quote_errors(self):
        errs, _ = self._run_quote_validation([self._q(), self._q()])
        self.assertTrue(any("duplicate quote row" in e for e in errs))

    def test_committed_quote_file_validates(self):
        # The committed data/saint_quotes.csv (if present) must pass.
        errs, _ = build.validate_saint_quotes(
            {r["Saint ID"].strip() for r in build.load_saints()[1]})
        self.assertEqual(errs, [], "committed saint_quotes.csv has errors:\n" +
                         "\n".join(errs))


class GroupTaxonomyTests(unittest.TestCase):
    """data/groups.csv + data/saint_groups.csv loaders, validation, and join."""

    def _run(self, groups_rows, member_rows):
        """Validate synthetic group join files. Returns (errors, warnings)."""
        import csv as _csv
        import tempfile
        from pathlib import Path

        tmp = Path(tempfile.mkdtemp())
        gpath = tmp / "groups.csv"
        mpath = tmp / "saint_groups.csv"
        with gpath.open("w", encoding="utf-8", newline="") as fh:
            w = _csv.DictWriter(fh, fieldnames=build.GROUPS_HEADER)
            w.writeheader()
            w.writerows(groups_rows)
        with mpath.open("w", encoding="utf-8", newline="") as fh:
            w = _csv.DictWriter(fh, fieldnames=build.SAINT_GROUPS_HEADER)
            w.writeheader()
            w.writerows(member_rows)
        old_g, old_m = build.GROUPS_CSV, build.SAINT_GROUPS_CSV
        try:
            build.GROUPS_CSV, build.SAINT_GROUPS_CSV = gpath, mpath
            return build.validate_groups({"OS-0001", "OS-0002"})
        finally:
            build.GROUPS_CSV, build.SAINT_GROUPS_CSV = old_g, old_m

    def _g(self, **over):
        row = {"slug": "the-twelve", "name": "The Twelve Apostles",
               "type": "synaxis", "description": "x", "feast": "Jun 30", "sort": "1"}
        row.update(over)
        return row

    def _m(self, **over):
        row = {"group_slug": "the-twelve", "saint_id": "OS-0001",
               "role": "", "order": ""}
        row.update(over)
        return row

    def test_clean_join_validates(self):
        errs, _ = self._run([self._g()], [self._m(), self._m(saint_id="OS-0002")])
        self.assertEqual(errs, [])

    def test_bad_type_errors(self):
        errs, _ = self._run([self._g(type="club")], [self._m()])
        self.assertTrue(any("is not one of" in e for e in errs))

    def test_duplicate_slug_errors(self):
        errs, _ = self._run([self._g(), self._g(name="Dup")], [self._m()])
        self.assertTrue(any("duplicate group slug" in e for e in errs))

    def test_non_kebab_slug_errors(self):
        errs, _ = self._run([self._g(slug="The_Twelve")],
                            [self._m(group_slug="The_Twelve")])
        self.assertTrue(any("kebab-case" in e for e in errs))

    def test_dangling_group_slug_errors(self):
        errs, _ = self._run([self._g()], [self._m(group_slug="nope")])
        self.assertTrue(any("matches no group" in e for e in errs))

    def test_dangling_saint_id_errors(self):
        errs, _ = self._run([self._g()], [self._m(saint_id="OS-9999")])
        self.assertTrue(any("matches no saint" in e for e in errs))

    def test_duplicate_membership_errors(self):
        errs, _ = self._run([self._g()], [self._m(), self._m()])
        self.assertTrue(any("duplicate membership" in e for e in errs))

    def test_to_record_joins_groups_and_haystack(self):
        sg = {"OS-0001": ["the-twelve"]}
        gbs = {"the-twelve": {"slug": "the-twelve", "name": "The Twelve Apostles",
                              "type": "synaxis", "sort": 1}}
        rec = build.to_record(valid_row(), vendors=[], name_variants={},
                              images={}, quotes={}, saint_groups=sg,
                              groups_by_slug=gbs)
        self.assertEqual(rec["groups"],
                         [{"slug": "the-twelve", "name": "The Twelve Apostles",
                           "type": "synaxis"}])
        self.assertIn("The Twelve Apostles", rec["search"])

    def test_to_record_no_groups_key_when_absent(self):
        rec = build.to_record(valid_row(), vendors=[], name_variants={},
                              images={}, quotes={}, saint_groups={},
                              groups_by_slug={})
        self.assertNotIn("groups", rec)

    def test_committed_group_files_validate(self):
        errs, _ = build.validate_groups(
            {r["Saint ID"].strip() for r in build.load_saints()[1]})
        self.assertEqual(errs, [], "committed group files have errors:\n" +
                         "\n".join(errs))


class ThemeIntegrationTests(unittest.TestCase):
    def test_record_has_derived_themes(self):
        r = valid_row(**{"Church Status": "Clergy - Bishop", "Rank / Type": "Hierarch"})
        rec = build.to_record(r)
        self.assertIn("themes", rec)
        self.assertIn("bishops", rec["themes"])
        self.assertIn("hierarchs", rec["themes"])

    def test_theme_labels_in_search_haystack(self):
        rec = build.to_record(valid_row(**{"Church Status": "Clergy - Bishop"}))
        self.assertIn("bishops", rec["themes"])
        self.assertIn("Bishops", rec["search"])

    def test_unknown_override_slug_errors(self):
        row = valid_row()
        row["Themes"] = "bishops; not-a-real-theme"
        errs = errors_for([row])
        self.assertTrue(any("not-a-real-theme" in e for e in errs))

    def test_known_override_slug_ok(self):
        row = valid_row()
        row["Themes"] = "church-fathers"
        errs = errors_for([row])
        self.assertEqual([e for e in errs if "church-fathers" in e], [])


class ValidateSaintProfilesTests(unittest.TestCase):
    def _profile(self, d, name, sid):
        (d / name).write_text(f"id: {sid}\nstatus: reviewed\noverview:\n  - x\n")

    def test_flags_unknown_id(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t)
            self._profile(d, "OS-0021.yaml", "OS-0021")
            self._profile(d, "OS-9999.yaml", "OS-9999")
            with mock.patch.object(build, "PROFILES_DIR", d):
                errors, warnings = build.validate_saint_profiles({"OS-0021"})
            self.assertTrue(any("OS-9999" in e for e in errors))
            self.assertTrue(all("OS-0021" not in e for e in errors))

    def test_clean_when_all_known(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t)
            self._profile(d, "OS-0021.yaml", "OS-0021")
            with mock.patch.object(build, "PROFILES_DIR", d):
                errors, warnings = build.validate_saint_profiles({"OS-0021", "OS-0022"})
            self.assertEqual(errors, [])

    def test_flags_id_field_not_matching_filename(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t)
            self._profile(d, "OS-0021.yaml", "OS-0099")  # body id != filename
            with mock.patch.object(build, "PROFILES_DIR", d):
                errors, warnings = build.validate_saint_profiles({"OS-0021", "OS-0099"})
            self.assertTrue(any("OS-0021.yaml" in e for e in errors))

    def test_flags_missing_id_field(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t)
            (d / "OS-0021.yaml").write_text("status: reviewed\noverview:\n  - x\n")
            with mock.patch.object(build, "PROFILES_DIR", d):
                errors, warnings = build.validate_saint_profiles({"OS-0021"})
            self.assertTrue(any("missing" in e and "id" in e for e in errors))

    def test_flags_bad_filename(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t)
            (d / "README.yaml").write_text("notes: not a profile\n")
            with mock.patch.object(build, "PROFILES_DIR", d):
                errors, warnings = build.validate_saint_profiles({"OS-0021"})
            self.assertTrue(any("name must be OS-####.yaml" in e for e in errors))


if __name__ == "__main__":
    unittest.main(verbosity=2)
