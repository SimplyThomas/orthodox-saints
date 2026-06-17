import unittest
from tools.profilegen import prioritize


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
