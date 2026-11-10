from datetime import date, timedelta
from decimal import Decimal

from app.enums import IntervalUnit
from app.subscription_detect import Charge, detect

TODAY = date(2026, 11, 10)


def charges(days_ago: list[int], amounts: list[str] | None = None) -> list[Charge]:
    amounts = amounts or ["99.00"] * len(days_ago)
    return [
        Charge(i, TODAY - timedelta(days=d), Decimal(a))
        for i, (d, a) in enumerate(zip(days_ago, amounts, strict=True))
    ]


def test_four_steady_monthly_payments_are_a_high_confidence_subscription():
    series = detect(charges([100, 70, 40, 10]), TODAY)
    assert series is not None
    assert (series.unit, series.count) == (IntervalUnit.MONTH, 1)
    assert series.amount == Decimal("99.0000")
    assert series.confidence == "high"
    assert not series.varies
    assert series.next_due == TODAY - timedelta(days=10) + timedelta(days=30)


def test_three_payments_is_a_pattern_but_a_looser_one():
    series = detect(charges([70, 40, 10]), TODAY)
    assert series is not None
    assert series.confidence == "medium"


def test_two_monthly_payments_are_not_enough():
    assert detect(charges([40, 10]), TODAY) is None


def test_a_subscription_that_stopped_is_not_suggested():
    # the last payment was four months ago: cancelled, not current
    assert detect(charges([220, 190, 160, 130]), TODAY) is None


def test_one_missed_month_still_counts():
    series = detect(charges([130, 100, 40, 10]), TODAY)  # a 60 day gap in the middle
    assert series is not None
    assert series.confidence == "medium"


def test_a_bill_that_changes_each_month_is_found_as_one_that_varies():
    series = detect(charges([100, 70, 40, 10], ["80.00", "120.00", "95.00", "110.00"]), TODAY)
    assert series is not None
    assert series.varies
    assert series.amount == Decimal("110.00")  # the latest, the best guess for the next
    assert series.confidence == "medium"


def test_a_wild_amount_is_not_a_subscription():
    assert detect(charges([100, 70, 40, 10], ["10.00", "200.00", "35.00", "500.00"]), TODAY) is None


def test_weekly_needs_the_same_amount_every_time():
    steady = detect(charges([28, 21, 14, 7]), TODAY)
    assert steady is not None
    assert (steady.unit, steady.count) == (IntervalUnit.WEEK, 1)
    # a weekly shop that costs something different each time is shopping, not a subscription
    assert detect(charges([28, 21, 14, 7], ["20.00", "45.00", "31.00", "12.00"]), TODAY) is None


def test_every_three_months_and_every_year():
    quarterly = detect(charges([270, 180, 90, 2]), TODAY)
    assert quarterly is not None
    assert (quarterly.unit, quarterly.count) == (IntervalUnit.MONTH, 3)
    yearly = detect(charges([365, 0]), TODAY)
    assert yearly is not None
    assert yearly.unit is IntervalUnit.YEAR


def test_buying_often_at_irregular_times_is_not_a_pattern():
    assert detect(charges([40, 33, 20, 11, 4]), TODAY) is None
