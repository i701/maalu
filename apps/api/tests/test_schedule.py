from datetime import date
from decimal import Decimal

import pytest
from app.enums import IntervalUnit
from app.schedule import monthly_cost, nearest_occurrence_index, next_due_date, occurrence

W, M, Y = IntervalUnit.WEEK, IntervalUnit.MONTH, IntervalUnit.YEAR


def test_monthly_anchor_clamps_then_recovers():
    start = date(2026, 1, 31)
    assert occurrence(start, M, 1, 1) == date(2026, 2, 28)
    assert occurrence(start, M, 1, 2) == date(2026, 3, 31)  # anchored on the 31st, not the 28th
    assert occurrence(date(2028, 1, 31), M, 1, 1) == date(2028, 2, 29)  # leap year


def test_yearly_and_weekly_and_multi_step():
    assert occurrence(date(2024, 2, 29), Y, 1, 1) == date(2025, 2, 28)
    assert occurrence(date(2024, 2, 29), Y, 1, 4) == date(2028, 2, 29)
    assert occurrence(date(2026, 1, 5), W, 2, 3) == date(2026, 2, 16)
    assert occurrence(date(2026, 1, 15), M, 3, 2) == date(2026, 7, 15)  # every 3 months


def test_next_due_without_payments_is_the_start_date():
    assert next_due_date(date(2026, 3, 1), M, 1, None) == date(2026, 3, 1)


@pytest.mark.parametrize(
    ("paid", "expected"),
    [
        (date(2026, 1, 1), date(2026, 2, 1)),  # on time
        (date(2026, 1, 30), date(2026, 3, 1)),  # 2 days early for Feb 1 counts as Feb's payment
        (date(2026, 2, 4), date(2026, 3, 1)),  # a few days late still counts as Feb's
        (date(2025, 12, 20), date(2026, 2, 1)),  # before the start: counts as the first cycle
    ],
)
def test_next_due_matches_payment_to_nearest_cycle(paid, expected):
    assert next_due_date(date(2026, 1, 1), M, 1, paid) == expected


def test_nearest_index_ties_go_to_earlier_cycle():
    start = date(2026, 1, 1)
    assert (
        nearest_occurrence_index(start, W, 1, date(2026, 1, 4)) == 0
    )  # 3 days from both? no: 3 vs 4
    assert nearest_occurrence_index(start, W, 1, date(2026, 1, 5)) == 1


def test_monthly_cost_conversion():
    assert monthly_cost(Decimal(120), Y, 1) == Decimal("10.0000")
    assert monthly_cost(Decimal(30), M, 3) == Decimal("10.0000")  # every 3 months
    assert monthly_cost(Decimal(12), W, 1) == Decimal("52.0000")  # 12 * 52 / 12
