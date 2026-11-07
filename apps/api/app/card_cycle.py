"""A credit card's billing cycle: the day each month its statement closes and the day the
payment for it is due. Pure date maths, nothing stored. A day past the end of a short month
(31 in April) lands on the month's last day."""

import calendar
from datetime import date


def day_in(year: int, month: int, day: int) -> date:
    return date(year, month, min(day, calendar.monthrange(year, month)[1]))


def _shift(year: int, month: int, by: int) -> tuple[int, int]:
    index = year * 12 + (month - 1) + by
    return index // 12, index % 12 + 1


def last_close(today: date, statement_day: int) -> date:
    """The most recent day the statement closed, today included."""
    this = day_in(today.year, today.month, statement_day)
    if this <= today:
        return this
    year, month = _shift(today.year, today.month, -1)
    return day_in(year, month, statement_day)


def next_close(today: date, statement_day: int) -> date:
    """The next day the statement closes, after today."""
    this = day_in(today.year, today.month, statement_day)
    if this > today:
        return this
    year, month = _shift(today.year, today.month, 1)
    return day_in(year, month, statement_day)


def due_date(closed_on: date, due_day: int) -> date:
    """When the payment for the statement closed on `closed_on` is due: the first `due_day`
    after it."""
    this = day_in(closed_on.year, closed_on.month, due_day)
    if this > closed_on:
        return this
    year, month = _shift(closed_on.year, closed_on.month, 1)
    return day_in(year, month, due_day)
