import unittest
from tools.profilegen import prioritize
from tools.profilegen import dossier


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
