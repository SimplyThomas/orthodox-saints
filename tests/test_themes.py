import unittest
import themes


def rec(**kw):
    """A minimal record like to_record() emits (string + array facets)."""
    base = {
        "gender": "", "era": "", "century": "",
        "rank": [], "church": [], "family": [], "vocation": [],
        "experience": [], "virtue": [], "intercession": [],
        "origin": [], "tradition": [],
    }
    base.update(kw)
    return base


class ComputeThemesTests(unittest.TestCase):
    def test_single_facet(self):
        self.assertIn("bishops", themes.compute_themes(rec(church=["Clergy - Bishop"])))

    def test_and_combination_mothers(self):
        self.assertIn("mothers", themes.compute_themes(rec(gender="Female", family=["Parent"])))
        self.assertNotIn("mothers", themes.compute_themes(rec(gender="Male", family=["Parent"])))

    def test_or_across_rules_healers(self):
        self.assertIn("healers", themes.compute_themes(rec(rank=["Unmercenary"])))
        self.assertIn("healers", themes.compute_themes(rec(intercession=["Healing"])))

    def test_desert_fathers_triple_and(self):
        df = themes.compute_themes(rec(gender="Male", origin=["Egypt"], rank=["Ascetic"]))
        self.assertIn("desert-fathers", df)
        self.assertNotIn("desert-mothers", df)

    def test_override_union(self):
        out = themes.compute_themes(rec(church=["Clergy - Bishop"]), override="church-fathers; icon-defenders")
        self.assertIn("church-fathers", out)
        self.assertIn("icon-defenders", out)
        self.assertIn("bishops", out)

    def test_no_duplicate_when_override_repeats_derived(self):
        out = themes.compute_themes(rec(church=["Clergy - Bishop"]), override="bishops")
        self.assertEqual(out.count("bishops"), 1)

    def test_every_slug_unique(self):
        slugs = [t["slug"] for t in themes.THEMES]
        self.assertEqual(len(slugs), len(set(slugs)))

    def test_catalog_counts(self):
        records = [
            {"themes": ["bishops", "hierarchs"]},
            {"themes": ["bishops"]},
        ]
        cat = {c["slug"]: c for c in themes.theme_catalog(records)}
        self.assertEqual(cat["bishops"]["count"], 2)
        self.assertEqual(cat["hierarchs"]["count"], 1)
        self.assertEqual(cat["orphans"]["count"], 0)
        self.assertIn(cat["bishops"]["group"], themes.THEME_GROUPS)


if __name__ == "__main__":
    unittest.main()
