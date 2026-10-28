from datetime import date
from itertools import pairwise

import pytest
from app.budget_period import next_period_start, period_bounds, period_start, previous_period_start


def test_calendar_months():
    assert period_bounds(date(2026, 3, 15), 1) == (date(2026, 3, 1), date(2026, 3, 31))
    assert period_bounds(date(2026, 2, 28), 1) == (date(2026, 2, 1), date(2026, 2, 28))
    assert period_bounds(date(2028, 2, 29), 1) == (date(2028, 2, 1), date(2028, 2, 29))


def test_custom_start_day_before_and_after_it():
    assert period_bounds(date(2026, 3, 24), 25) == (date(2026, 2, 25), date(2026, 3, 24))
    assert period_bounds(date(2026, 3, 25), 25) == (date(2026, 3, 25), date(2026, 4, 24))


def test_year_boundaries():
    assert period_start(date(2026, 1, 10), 25) == date(2025, 12, 25)
    assert next_period_start(date(2025, 12, 25), 25) == date(2026, 1, 25)
    assert previous_period_start(date(2026, 1, 1), 1) == date(2025, 12, 1)
    assert period_bounds(date(2025, 12, 31), 1) == (date(2025, 12, 1), date(2025, 12, 31))


@pytest.mark.parametrize("start_day", [1, 15, 28])
def test_every_day_falls_in_exactly_one_period(start_day: int):
    day = date(2026, 1, 1)
    seen = set()
    while day < date(2027, 1, 1):
        start, end = period_bounds(day, start_day)
        assert start <= day <= end
        seen.add((start, end))
        day = date.fromordinal(day.toordinal() + 1)
    # periods are contiguous: each starts the day after the previous one ends
    ordered = sorted(seen)
    for (_, end), (start, _) in pairwise(ordered):
        assert start.toordinal() == end.toordinal() + 1
