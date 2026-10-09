"""Billing-schedule maths for subscriptions. Pure functions, no I/O."""

import calendar
from datetime import date, timedelta
from decimal import Decimal

from app.enums import IntervalUnit

MONTHLY_QUANTUM = Decimal("0.0001")


def occurrence(start: date, unit: IntervalUnit, count: int, k: int) -> date:
    """The k-th billing date (k=0 is `start`). Month/year steps keep the anchor day and clamp to
    the month's length, so a Jan 31 start bills Feb 28, then Mar 31 (not Mar 28)."""
    if unit is IntervalUnit.WEEK:
        return start + timedelta(weeks=count * k)
    months = count * k * (12 if unit is IntervalUnit.YEAR else 1)
    total = start.month - 1 + months
    year, month = start.year + total // 12, total % 12 + 1
    return date(year, month, min(start.day, calendar.monthrange(year, month)[1]))


def nearest_occurrence_index(start: date, unit: IntervalUnit, count: int, when: date) -> int:
    """Index of the billing date closest to `when` (ties go to the earlier one). Used to decide
    which cycle a payment belongs to, so paying a couple of days early or late still counts."""
    if when <= start:
        return 0
    k = 0
    while occurrence(start, unit, count, k + 1) <= when:
        k += 1
    after = occurrence(start, unit, count, k + 1)
    before = occurrence(start, unit, count, k)
    return k + 1 if (after - when) < (when - before) else k


def next_due_date(start: date, unit: IntervalUnit, count: int, last_paid: date | None) -> date:
    """The next billing date that hasn't been paid yet."""
    if last_paid is None:
        return start
    k = nearest_occurrence_index(start, unit, count, last_paid)
    return occurrence(start, unit, count, k + 1)


def monthly_factor(unit: IntervalUnit, count: int) -> Decimal:
    """How many billing cycles fit in one month (weekly = 52/12 per week)."""
    if unit is IntervalUnit.WEEK:
        return Decimal(52) / Decimal(12) / count
    if unit is IntervalUnit.MONTH:
        return Decimal(1) / count
    return Decimal(1) / (12 * count)


def monthly_cost(amount: Decimal, unit: IntervalUnit, count: int) -> Decimal:
    return (amount * monthly_factor(unit, count)).quantize(MONTHLY_QUANTUM)
