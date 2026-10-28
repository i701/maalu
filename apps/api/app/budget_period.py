"""Budget periods: a month that starts on a chosen day of the month. Pure date maths, no database.

With `start_day` 1 a period is a calendar month. With another day (the salary day, say 25) it runs
from that day to the day before the next one. The day is limited to 1-28 so every month has it.
"""

from datetime import date, timedelta

MAX_START_DAY = 28


def period_start(on: date, start_day: int) -> date:
    """First day of the period that contains `on`."""
    if on.day >= start_day:
        return date(on.year, on.month, start_day)
    year, month = (on.year - 1, 12) if on.month == 1 else (on.year, on.month - 1)
    return date(year, month, start_day)


def next_period_start(start: date, start_day: int) -> date:
    year, month = (start.year + 1, 1) if start.month == 12 else (start.year, start.month + 1)
    return date(year, month, start_day)


def previous_period_start(start: date, start_day: int) -> date:
    year, month = (start.year - 1, 12) if start.month == 1 else (start.year, start.month - 1)
    return date(year, month, start_day)


def period_bounds(on: date, start_day: int) -> tuple[date, date]:
    """(first day, last day) of the period that contains `on`, both inclusive."""
    start = period_start(on, start_day)
    return start, next_period_start(start, start_day) - timedelta(days=1)
