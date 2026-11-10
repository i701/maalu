"""Spotting a recurring charge in what was already paid. Pure functions, no I/O: the service feeds
in one vendor's payments and gets back the pattern, or nothing.

A charge counts as a subscription when the gaps between payments keep to one rhythm (weekly,
monthly, every three months, yearly), it is still going (the last payment is recent), and the
amounts are alike. A bill that is the same rhythm but a different amount each time (electricity)
is found too, as one that varies. Rhythm and amount are judged separately, so a gym that raised its
price is still the same subscription."""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from itertools import pairwise
from statistics import median

from app.enums import IntervalUnit
from app.schedule import occurrence

# How alike the amounts must be: within 5% of the usual is "the same amount"; up to 40% is a bill
# that varies (only for monthly and slower rhythms, where that is normal).
TIGHT = Decimal("0.05")
LOOSE = Decimal("0.40")
# Share of the gaps that must fit the rhythm (one missed or doubled month in a few is allowed).
REGULAR = 0.75


@dataclass(frozen=True)
class Charge:
    id: object
    on: date
    amount: Decimal


@dataclass(frozen=True)
class Cadence:
    unit: IntervalUnit
    count: int
    low: int  # the gap between two payments, in days, at least ...
    high: int  # ... and at most
    minimum: int  # how many payments before it is called a pattern
    may_vary: bool  # whether a varying amount is believable at this rhythm


CADENCES = (
    Cadence(IntervalUnit.WEEK, 1, 6, 8, 4, False),
    Cadence(IntervalUnit.MONTH, 1, 26, 35, 3, True),
    Cadence(IntervalUnit.MONTH, 3, 84, 98, 3, True),
    Cadence(IntervalUnit.YEAR, 1, 350, 380, 2, False),
)


@dataclass(frozen=True)
class Series:
    unit: IntervalUnit
    count: int
    amount: Decimal  # what the next one will most likely be
    varies: bool
    confidence: str  # "high" or "medium"
    charges: list[Charge]
    next_due: date


def _spread(amounts: list[Decimal]) -> Decimal:
    usual = Decimal(str(median(amounts)))
    if usual <= 0:
        return Decimal(1)
    return max(abs(a - usual) / usual for a in amounts)


def detect(charges: list[Charge], today: date) -> Series | None:
    """The recurring pattern in one vendor's payments (same currency), or None."""
    ordered = sorted(charges, key=lambda c: c.on)
    if len(ordered) < 2:
        return None
    gaps = [(b.on - a.on).days for a, b in pairwise(ordered)]
    amounts = [c.amount for c in ordered]
    spread = _spread(amounts)

    for cadence in CADENCES:
        if len(ordered) < cadence.minimum:
            continue
        fits = [cadence.low <= g <= cadence.high for g in gaps]
        # a missed payment leaves a gap of two cycles: still the same rhythm, only not a perfectly
        # steady one (not for weekly, where a gap like that is just a week without buying)
        two = cadence.unit is not IntervalUnit.WEEK
        near = [
            f or (two and 2 * cadence.low <= g <= 2 * cadence.high)
            for f, g in zip(fits, gaps, strict=True)
        ]
        if sum(near) / len(gaps) < REGULAR:
            continue
        # still going: the last payment is within about one and a half cycles of today
        if (today - ordered[-1].on).days > cadence.high * 1.5:
            continue
        if spread <= TIGHT:
            varies = False
        elif cadence.may_vary and spread <= LOOSE:
            varies = True
        else:
            continue
        latest = ordered[-1].amount
        amount = latest if varies else Decimal(str(median(amounts))).quantize(Decimal("0.0001"))
        steady = all(fits) and len(ordered) >= 4 and not varies
        return Series(
            unit=cadence.unit,
            count=cadence.count,
            amount=amount,
            varies=varies,
            confidence="high" if steady else "medium",
            charges=ordered,
            next_due=occurrence(ordered[-1].on, cadence.unit, cadence.count, 1),
        )
    return None
