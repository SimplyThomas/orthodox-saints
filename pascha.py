"""Orthodox Pascha computus (Meeus' Julian algorithm).

Pascha is computed on the JULIAN calendar and mapped to the Gregorian civil
calendar by adding the Julian-Gregorian offset, which is a constant 13 days
from 1900-03-14 through 2100-02-28 — hence the hard validity window 1900-2099.
The frontend gets a resolved table (pascha_table) inside public/feasts.json,
so it never needs to run the computus for the years that matter.
"""

from __future__ import annotations

from datetime import date, timedelta

JULIAN_GREGORIAN_OFFSET_DAYS = 13  # valid 1900-2099


def pascha(year: int) -> date:
    """Orthodox Pascha for `year`, as a Gregorian (civil-calendar) date."""
    if not 1900 <= year <= 2099:
        raise ValueError(f"pascha(): year {year} outside the 13-day-offset "
                         "validity window 1900-2099")
    a = year % 4
    b = year % 7
    c = year % 19
    d = (19 * c + 15) % 30
    e = (2 * a + 4 * b - d + 34) % 7
    month = (d + e + 114) // 31
    day = ((d + e + 114) % 31) + 1
    return date(year, month, day) + timedelta(days=JULIAN_GREGORIAN_OFFSET_DAYS)


def pascha_table(start: int = 2020, end: int = 2040) -> dict[str, str]:
    """{'2024': '2024-05-05', ...} for start..end inclusive (feasts.json)."""
    return {str(y): pascha(y).isoformat() for y in range(start, end + 1)}
