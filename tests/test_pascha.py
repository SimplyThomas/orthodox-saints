"""Unit tests for pascha.py — the Orthodox Pascha computus."""

import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pascha  # noqa: E402


class TestPascha(unittest.TestCase):
    # Known Orthodox Pascha dates on the civil (Gregorian) calendar.
    KNOWN = {
        2020: date(2020, 4, 19),
        2021: date(2021, 5, 2),
        2022: date(2022, 4, 24),
        2023: date(2023, 4, 16),
        2024: date(2024, 5, 5),
        2025: date(2025, 4, 20),   # coincided with Western Easter
        2026: date(2026, 4, 12),
        2027: date(2027, 5, 2),
    }

    def test_known_years(self):
        for year, expected in self.KNOWN.items():
            self.assertEqual(pascha.pascha(year), expected, f"Pascha {year}")

    def test_always_a_sunday(self):
        for year in range(1990, 2050):
            self.assertEqual(pascha.pascha(year).weekday(), 6, f"Pascha {year}")

    def test_range_guard(self):
        with self.assertRaises(ValueError):
            pascha.pascha(1899)
        with self.assertRaises(ValueError):
            pascha.pascha(2100)

    def test_pascha_table(self):
        table = pascha.pascha_table(2024, 2026)
        self.assertEqual(table, {"2024": "2024-05-05",
                                 "2025": "2025-04-20",
                                 "2026": "2026-04-12"})


if __name__ == "__main__":
    unittest.main()
