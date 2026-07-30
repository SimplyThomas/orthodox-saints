"""Unit tests for hostlib.py — the Heavenly Hosts pipeline (HH-####).

Mirrors tests/test_feastlib.py: the pure helpers (triad derivation, id
assignment, licensing gate), the fail-loud validator, and the record join.
Anything that would read the real data/ or src/content/hosts/ trees is pointed
at a temp path, so these rows are validated in isolation.
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import hostlib  # noqa: E402


HOST_VOCAB = {
    "Entity Type": {"Angelic Rank", "Named Angel", "Scriptural Angel",
                    "Angelic Class", "Collective", "Fallen"},
    "Celestial Order": set(hostlib.NINE_ORDERS),
    "Canonical Status": {"Scriptural", "Deuterocanonical", "Traditional",
                         "Apocryphal", "Symbolic"},
    "Host Source Type": {"Holy Scripture", "Deuterocanonical", "Holy Tradition",
                         "Liturgical Tradition", "Patristic", "Second Temple",
                         "Early Christian", "Later Tradition"},
}


def valid_host(**overrides):
    """A row with all 19 columns; minimally valid by default."""
    row = {col: "" for col in hostlib.HOSTS_HEADER}
    row.update({
        "Host ID": "HH-0001",
        "Name": "Archangel Michael",
        "Entity Type": "Named Angel",
        "Celestial Order": "Archangels",
        "Canonical Status": "Scriptural",
        "Brief": "Commander of the bodiless powers.",
        "Sources": "OCA",
    })
    row.update(overrides)
    return row


def _write_csv(path, header, rows):
    import csv as _csv
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = _csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)


class TestTriad(unittest.TestCase):
    def test_first_triad(self):
        for order in ("Seraphim", "Cherubim", "Thrones"):
            self.assertEqual(hostlib.derive_triad(order), "First")

    def test_second_triad(self):
        for order in ("Dominions", "Virtues", "Powers"):
            self.assertEqual(hostlib.derive_triad(order), "Second")

    def test_third_triad(self):
        for order in ("Principalities", "Archangels", "Angels"):
            self.assertEqual(hostlib.derive_triad(order), "Third")

    def test_blank_or_unknown_order_has_no_triad(self):
        # A Scriptural Angel / Collective carries no rank — blank is legitimate.
        self.assertIsNone(hostlib.derive_triad(""))
        self.assertIsNone(hostlib.derive_triad("Watchers"))

    def test_nine_orders_cover_the_triads(self):
        self.assertEqual(len(hostlib.NINE_ORDERS), 9)
        self.assertEqual(len(hostlib.TRIAD), 9)


class TestSplitMulti(unittest.TestCase):
    def test_semicolon_space(self):
        self.assertEqual(hostlib.split_multi("Gen 3:24; Ezek 10:1"),
                         ["Gen 3:24", "Ezek 10:1"])

    def test_empty(self):
        self.assertEqual(hostlib.split_multi(""), [])


class TestValidate(unittest.TestCase):
    def _validate(self, rows, saint_ids=frozenset({"OS-0001"}),
                  feast_ids=frozenset({"FF-0001"})):
        # Point the profile + image cross-checks at nonexistent paths: these
        # synthetic rows must not fail because the real src/content/hosts/*.yaml
        # or data/host_{images,depictions}.csv reference other host ids.
        missing = Path(tempfile.mkdtemp()) / "none.csv"
        with mock.patch.object(hostlib, "HOST_PROFILES_DIR",
                               Path(tempfile.mkdtemp())), \
             mock.patch.object(hostlib, "HOST_IMAGES_CSV", missing), \
             mock.patch.object(hostlib, "HOST_DEPICTIONS_CSV", missing):
            return hostlib.validate(rows, HOST_VOCAB, set(saint_ids),
                                    set(feast_ids))

    def test_valid_row_clean(self):
        errors, _ = self._validate([valid_host()])
        self.assertEqual(errors, [])

    def test_required_fields(self):
        errors, _ = self._validate([valid_host(Brief="")])
        self.assertTrue(any("Brief" in e for e in errors))

    def test_unknown_vocab_term(self):
        errors, _ = self._validate(
            [valid_host(**{"Canonical Status": "Legendary"})])
        self.assertTrue(any("Legendary" in e for e in errors))

    def test_unknown_primary_source_register(self):
        # The 8-register source taxonomy is the §5b source-fidelity commitment.
        errors, _ = self._validate(
            [valid_host(**{"Primary Source": "Wikipedia"})])
        self.assertTrue(any("Wikipedia" in e for e in errors))

    def test_single_value_no_multi(self):
        errors, _ = self._validate(
            [valid_host(**{"Entity Type": "Named Angel; Fallen"})])
        self.assertTrue(any("single-value" in e for e in errors))

    def test_bad_id_format(self):
        errors, _ = self._validate([valid_host(**{"Host ID": "OS-0001"})])
        self.assertTrue(any("HH-####" in e for e in errors))

    def test_duplicate_id(self):
        errors, _ = self._validate([valid_host(), valid_host(Name="Gabriel")])
        self.assertTrue(any("duplicate Host ID" in e for e in errors))

    def test_duplicate_name_warns(self):
        _, warnings = self._validate(
            [valid_host(), valid_host(**{"Host ID": "HH-0002"})])
        self.assertTrue(any("duplicate host name" in w for w in warnings))

    def test_rank_name_must_be_one_of_the_nine(self):
        errors, _ = self._validate([valid_host(**{
            "Host ID": "HH-0002", "Name": "Watchers",
            "Entity Type": "Angelic Rank", "Celestial Order": ""})])
        self.assertTrue(any("not one of the nine orders" in e for e in errors))

    def test_rank_order_must_equal_its_name(self):
        errors, _ = self._validate([valid_host(**{
            "Host ID": "HH-0002", "Name": "Seraphim",
            "Entity Type": "Angelic Rank", "Celestial Order": "Cherubim"})])
        self.assertTrue(any("must equal its Name" in e for e in errors))

    def test_rank_with_matching_order_is_clean(self):
        errors, _ = self._validate([valid_host(**{
            "Host ID": "HH-0002", "Name": "Seraphim",
            "Entity Type": "Angelic Rank", "Celestial Order": "Seraphim"})])
        self.assertEqual(errors, [])

    def test_blank_order_allowed_for_non_ranks(self):
        # A Scriptural Angel (the Angel of the Lord) cannot be ranked.
        errors, _ = self._validate([valid_host(**{
            "Name": "Angel of the Lord", "Entity Type": "Scriptural Angel",
            "Celestial Order": ""})])
        self.assertEqual(errors, [])

    def test_feast_day_token(self):
        errors, _ = self._validate([valid_host(**{"Feast Day(s)": "Nov 8"})])
        self.assertEqual(errors, [])

    def test_bad_feast_day_token(self):
        errors, _ = self._validate([valid_host(**{"Feast Day(s)": "P+49"})])
        self.assertTrue(any("P+49" in e for e in errors))

    def test_out_of_range_feast_day(self):
        errors, _ = self._validate([valid_host(**{"Feast Day(s)": "Nov 31"})])
        self.assertTrue(any("Feast Day(s)" in e for e in errors))

    def test_related_saint_must_exist(self):
        errors, _ = self._validate([valid_host(**{"Related Saints": "OS-9999"})])
        self.assertTrue(any("OS-9999" in e for e in errors))

    def test_related_feast_must_exist(self):
        errors, _ = self._validate([valid_host(**{"Related Feasts": "FF-9999"})])
        self.assertTrue(any("FF-9999" in e for e in errors))

    def test_related_being_must_exist(self):
        errors, _ = self._validate([valid_host(**{"Related Beings": "HH-9999"})])
        self.assertTrue(any("HH-9999" in e for e in errors))

    def test_related_being_no_self_reference(self):
        errors, _ = self._validate([valid_host(**{"Related Beings": "HH-0001"})])
        self.assertTrue(any("references itself" in e for e in errors))

    def test_related_being_wrong_prefix(self):
        errors, _ = self._validate([valid_host(**{"Related Beings": "OS-0001"})])
        self.assertTrue(any("is not HH-####" in e for e in errors))


class TestAssignIds(unittest.TestCase):
    def test_assigns_sequential_after_max(self):
        rows = [valid_host(**{"Host ID": "HH-0007"}),
                valid_host(**{"Host ID": "", "Name": "Sariel"}),
                valid_host(**{"Host ID": "", "Name": "Phanuel"})]
        self.assertTrue(hostlib.assign_ids(rows))
        self.assertEqual(rows[1]["Host ID"], "HH-0008")
        self.assertEqual(rows[2]["Host ID"], "HH-0009")

    def test_no_change_when_all_assigned(self):
        rows = [valid_host()]
        self.assertFalse(hostlib.assign_ids(rows))
        self.assertEqual(rows[0]["Host ID"], "HH-0001")

    def test_never_reuses_a_gap(self):
        # Ids are opaque and permanent (§6): a deleted HH-0002 leaves a hole.
        rows = [valid_host(**{"Host ID": "HH-0001"}),
                valid_host(**{"Host ID": "HH-0003"}),
                valid_host(**{"Host ID": "", "Name": "Remiel"})]
        hostlib.assign_ids(rows)
        self.assertEqual(rows[2]["Host ID"], "HH-0004")


class TestSort(unittest.TestCase):
    def test_ranks_before_named_before_fallen(self):
        recs = [{"entityType": "Fallen", "order": "", "name": "Abaddon"},
                {"entityType": "Named Angel", "order": "Archangels",
                 "name": "Michael"},
                {"entityType": "Angelic Rank", "order": "Seraphim",
                 "name": "Seraphim"}]
        ordered = [r["name"] for r in sorted(recs, key=hostlib._sort_key)]
        self.assertEqual(ordered, ["Seraphim", "Michael", "Abaddon"])

    def test_ranks_follow_the_hierarchy_not_the_alphabet(self):
        recs = [{"entityType": "Angelic Rank", "order": o, "name": o}
                for o in ("Angels", "Seraphim", "Powers")]
        ordered = [r["name"] for r in sorted(recs, key=hostlib._sort_key)]
        self.assertEqual(ordered, ["Seraphim", "Powers", "Angels"])


class TestRecord(unittest.TestCase):
    def _rec(self, row, **kw):
        kw.setdefault("profile_ids", set())
        kw.setdefault("images", {})
        kw.setdefault("permissions", {})
        kw.setdefault("depictions", {})
        return hostlib.to_record(row, kw["profile_ids"], kw["images"],
                                 kw["permissions"], kw["depictions"])

    def test_shapes(self):
        rec = self._rec(valid_host(**{
            "Also Known As": "Michael the Archangel; St Michael",
            "Scripture References": "Dan 10:13; Jude 1:9",
            "Feast Day(s)": "Nov 8"}))
        self.assertEqual(rec["id"], "HH-0001")
        self.assertEqual(rec["aka"], ["Michael the Archangel", "St Michael"])
        self.assertEqual(rec["scripture"], ["Dan 10:13", "Jude 1:9"])
        self.assertEqual(rec["feasts"], ["Nov 8"])
        self.assertTrue(rec["named"])
        self.assertEqual(rec["triad"], "Third")
        self.assertEqual(rec["profileType"], "host")
        self.assertFalse(rec["hasProfile"])
        self.assertFalse(rec["imageAvailable"])

    def test_empty_optionals_are_omitted(self):
        rec = self._rec(valid_host(**{"Celestial Order": ""}))
        self.assertNotIn("aka", rec)
        self.assertNotIn("notes", rec)
        self.assertNotIn("order", rec)
        self.assertNotIn("triad", rec)  # no order -> no derived triad
        self.assertNotIn("image", rec)

    def test_named_is_derived_not_authored(self):
        self.assertFalse(self._rec(valid_host(**{
            "Entity Type": "Collective", "Celestial Order": ""}))["named"])

    def test_icon_search_url_derived_from_name(self):
        rec = self._rec(valid_host())
        self.assertIn("Archangel+Michael", rec["icon"])

    def test_curated_icon_overrides_the_derived_search(self):
        rec = self._rec(valid_host(Icon="https://example.com/icon"))
        self.assertEqual(rec["icon"], "https://example.com/icon")

    def test_has_profile_flag(self):
        rec = self._rec(valid_host(), profile_ids={"HH-0001"})
        self.assertTrue(rec["hasProfile"])


class TestLicenseHelpers(unittest.TestCase):
    def test_license_ok(self):
        self.assertTrue(hostlib.license_ok("PD"))
        self.assertTrue(hostlib.license_ok("PD-art"))
        self.assertTrue(hostlib.license_ok("CC0"))
        self.assertTrue(hostlib.license_ok("CC-BY-SA-4.0"))
        self.assertFalse(hostlib.license_ok("All rights reserved"))
        self.assertFalse(hostlib.license_ok(""))

    def test_license_requires_credit(self):
        self.assertTrue(hostlib.license_requires_credit("CC-BY-SA-4.0"))
        self.assertFalse(hostlib.license_requires_credit("PD"))

    def test_permission_slug(self):
        self.assertEqual(hostlib.permission_slug("Permission:theophany-works"),
                         "theophany-works")
        self.assertIsNone(hostlib.permission_slug("PD"))

    def test_load_host_images_empty_when_absent(self):
        with mock.patch.object(hostlib, "HOST_IMAGES_CSV",
                               Path("/nonexistent/x.csv")):
            self.assertEqual(hostlib.load_host_images(), {})


class TestImageValidation(unittest.TestCase):
    def _images(self, rows, valid_ids={"HH-0001"}):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "host_images.csv"
            _write_csv(p, hostlib.HOST_IMAGES_HEADER, rows)
            with mock.patch.object(hostlib, "HOST_IMAGES_CSV", p):
                return hostlib.validate_host_images(set(valid_ids))

    def test_unknown_host_id_errors(self):
        errors, _ = self._images([{"host_id": "HH-9999",
            "image_path": "icons/x.jpg", "license": "PD",
            "credit": "", "source": ""}])
        self.assertTrue(any("not a known Host ID" in e for e in errors))

    def test_missing_file_errors(self):
        errors, _ = self._images([{"host_id": "HH-0001",
            "image_path": "icons/hosts/does-not-exist.jpg", "license": "PD",
            "credit": "", "source": ""}])
        self.assertTrue(any("not found under" in e for e in errors))

    def test_bad_license_errors(self):
        errors, _ = self._images([{"host_id": "HH-0001",
            "image_path": "https://example.com/x.jpg",
            "license": "All rights reserved", "credit": "", "source": ""}])
        self.assertTrue(any("not an accepted open license" in e for e in errors))

    def test_cc_by_requires_credit(self):
        errors, _ = self._images([{"host_id": "HH-0001",
            "image_path": "https://example.com/x.jpg",
            "license": "CC-BY-SA-4.0", "credit": "", "source": "x"}])
        self.assertTrue(any("requires a credit" in e for e in errors))

    def test_unknown_permission_vendor_errors(self):
        errors, _ = self._images([{"host_id": "HH-0001",
            "image_path": "https://example.com/x.jpg",
            "license": "Permission:nobody", "credit": "", "source": "x"}])
        self.assertTrue(any("not in data/image_permissions.csv" in e
                            for e in errors))

    def test_missing_source_warns(self):
        _, warnings = self._images([{"host_id": "HH-0001",
            "image_path": "https://example.com/x.jpg", "license": "PD",
            "credit": "", "source": ""}])
        self.assertTrue(any("no source link" in w for w in warnings))


class TestDepictionValidation(unittest.TestCase):
    def _deps(self, rows, valid_ids={"HH-0001"}):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "host_depictions.csv"
            _write_csv(p, hostlib.HOST_DEPICTIONS_HEADER, rows)
            with mock.patch.object(hostlib, "HOST_DEPICTIONS_CSV", p):
                return hostlib.validate_host_depictions(set(valid_ids))

    def _card(self, **over):
        card = {"host_id": "HH-0001", "image_path": "https://example.com/x.jpg",
                "license": "PD", "credit": "", "source": "", "kind": "museum",
                "tag": "", "title": "An icon", "era": "", "by": ""}
        card.update(over)
        return card

    def test_bad_kind_errors(self):
        errors, _ = self._deps([self._card(kind="postcard")])
        self.assertTrue(any("kind" in e for e in errors))

    def test_permission_card_requires_source(self):
        perms = {"theophany-works": {"name": "Theophany Works",
                                     "attribution": "", "homepage": "",
                                     "granted": "", "status": "active",
                                     "terms": ""}}
        with mock.patch.object(hostlib, "load_image_permissions",
                               lambda: perms):
            errors, _ = self._deps([self._card(
                license="Permission:theophany-works", source="")])
        self.assertTrue(any("requires a" in e and "source" in e for e in errors))

    def test_many_cards_per_host_all_validated(self):
        errors, _ = self._deps([self._card(image_path=""),
                                self._card(kind="postcard")])
        self.assertEqual(len(errors), 2)


class TestImageJoin(unittest.TestCase):
    PERMS = {"theophany-works": {"name": "Theophany Works",
             "attribution": "Icon used with permission from Theophany Works.",
             "homepage": "https://theophanyworks.com/holy-icons/",
             "granted": "2026-06-17", "status": "active", "terms": ""}}

    def test_open_license_hero_joined(self):
        images = {"HH-0001": {"path": "icons/hosts/michael.jpg",
                              "license": "CC-BY-SA-4.0", "credit": "A. Kortezas",
                              "source": "https://commons.wikimedia.org/x"}}
        rec = hostlib.to_record(valid_host(), set(), images, {}, {})
        self.assertEqual(rec["image"], "icons/hosts/michael.jpg")
        self.assertEqual(rec["imageLicense"], "CC-BY-SA-4.0")
        self.assertEqual(rec["imageCredit"], "A. Kortezas")
        self.assertTrue(rec["imageAvailable"])
        self.assertNotIn("imagePermission", rec)

    def test_permission_hero_and_cards_joined(self):
        images = {"HH-0001": {"path": "icons/permission/theophany-works/m.jpg",
                              "license": "Permission:theophany-works",
                              "credit": "",
                              "source": "https://theophanyworks.com/p1/"}}
        deps = {"HH-0001": [{"path": "icons/permission/theophany-works/m2.jpg",
                             "license": "Permission:theophany-works",
                             "credit": "",
                             "source": "https://theophanyworks.com/p2/",
                             "kind": "shop", "tag": "Available to order",
                             "title": "Michael, 21st c.", "era": "21st c.",
                             "by": "Theophany Works"}]}
        rec = hostlib.to_record(valid_host(), set(), images, self.PERMS, deps)
        self.assertTrue(rec["imagePermission"])
        self.assertEqual(rec["imageVendor"], "Theophany Works")
        self.assertEqual(rec["imageSource"], "https://theophanyworks.com/p1/")
        self.assertEqual(len(rec["depictions"]), 1)
        card = rec["depictions"][0]
        self.assertTrue(card["permission"])
        self.assertEqual(card["vendor"], "Theophany Works")
        self.assertNotIn("license", card)  # the token is never surfaced

    def test_revoked_vendor_drops_hero_and_cards(self):
        perms = {"theophany-works": dict(self.PERMS["theophany-works"],
                                         status="revoked")}
        images = {"HH-0001": {"path": "icons/permission/theophany-works/m.jpg",
                              "license": "Permission:theophany-works",
                              "credit": "", "source": "https://x/"}}
        deps = {"HH-0001": [{"path": "icons/permission/theophany-works/m2.jpg",
                             "license": "Permission:theophany-works",
                             "credit": "", "source": "https://x/",
                             "kind": "shop", "tag": "", "title": "M",
                             "era": "", "by": ""}]}
        rec = hostlib.to_record(valid_host(), set(), images, perms, deps)
        self.assertNotIn("image", rec)
        self.assertFalse(rec["imageAvailable"])
        self.assertNotIn("depictions", rec)

    def test_no_images_omits_fields(self):
        rec = hostlib.to_record(valid_host(), set(), {}, {}, {})
        self.assertNotIn("image", rec)
        self.assertNotIn("depictions", rec)
        self.assertFalse(rec["imageAvailable"])


class TestProfileCrossCheck(unittest.TestCase):
    def _profiles(self, files, valid_ids={"HH-0001"}):
        with tempfile.TemporaryDirectory() as d:
            for name, body in files.items():
                (Path(d) / name).write_text(body, encoding="utf-8")
            with mock.patch.object(hostlib, "HOST_PROFILES_DIR", Path(d)):
                return hostlib.validate_host_profiles(set(valid_ids))

    def test_good_profile_clean(self):
        errors, _ = self._profiles({"HH-0001.yaml": "id: HH-0001\nstatus: reviewed\n"})
        self.assertEqual(errors, [])

    def test_bad_filename(self):
        errors, _ = self._profiles({"michael.yaml": "id: HH-0001\n"})
        self.assertTrue(any("must be HH-####.yaml" in e for e in errors))

    def test_unknown_host_id(self):
        errors, _ = self._profiles({"HH-9999.yaml": "id: HH-9999\n"})
        self.assertTrue(any("not a known Host ID" in e for e in errors))

    def test_id_must_match_filename(self):
        errors, _ = self._profiles({"HH-0001.yaml": "id: HH-0002\n"})
        self.assertTrue(any("!=" in e for e in errors))

    def test_missing_id_field(self):
        errors, _ = self._profiles({"HH-0001.yaml": "status: reviewed\n"})
        self.assertTrue(any("missing an `id:` field" in e for e in errors))

    def test_absent_dir_is_allowed(self):
        with mock.patch.object(hostlib, "HOST_PROFILES_DIR",
                               Path("/nonexistent/hosts")):
            self.assertEqual(hostlib.validate_host_profiles({"HH-0001"}),
                             ([], []))


if __name__ == "__main__":
    unittest.main()
