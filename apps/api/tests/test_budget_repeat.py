"""A per-period limit that only runs between two dates (monthly, but just for a few months)."""

from datetime import date, timedelta

from app.budget_period import next_period_start, period_bounds, period_start
from httpx import AsyncClient

from tests.test_budget_dates import BUDGET, TODAY, add, spend, view

THIS = period_start(TODAY, 1)
NEXT = next_period_start(THIS, 1)
AFTER = next_period_start(NEXT, 1)
LATER = next_period_start(AFTER, 1)


def repeating(start: date, end: date) -> dict:
    return {"start_date": start.isoformat(), "end_date": end.isoformat(), "repeat": True}


async def test_it_shows_only_in_the_periods_it_runs_in(client: AsyncClient, auth):
    await spend(client, auth, "Food", "40")
    # from the middle of next month to the middle of the one after: two whole periods
    res = await add(
        client,
        auth,
        "Winter",
        ["Food"],
        "500",
        **repeating(NEXT + timedelta(days=14), AFTER + timedelta(days=14)),
    )
    assert res.status_code == 201, res.text
    assert (await view(client, auth))["lines"] == []  # this month: not yet
    for month in (NEXT, AFTER):
        [line] = (await view(client, auth, on=month.isoformat()))["lines"]
        assert line["name"] == "Winter"
        assert line["runs_from"] == NEXT.isoformat()  # snapped to whole periods
        assert line["runs_until"] == period_bounds(AFTER, 1)[1].isoformat()
    assert (await view(client, auth, on=LATER.isoformat()))["lines"] == []
    assert (await view(client, auth))["fixed_lines"] == []  # not a limit for set dates


async def test_it_counts_each_period_by_itself(client: AsyncClient, auth):
    await spend(client, auth, "Food", "70", NEXT)
    await spend(client, auth, "Food", "30", AFTER)
    await add(client, auth, "Winter", ["Food"], "500", **repeating(NEXT, AFTER))
    [a] = (await view(client, auth, on=NEXT.isoformat()))["lines"]
    [b] = (await view(client, auth, on=AFTER.isoformat()))["lines"]
    assert (a["activity"], b["activity"]) == ("70.0000", "30.0000")
    assert a["amount"] == b["amount"] == "500.0000"


async def test_it_can_carry_unspent_money_forward_inside_its_dates(client: AsyncClient, auth):
    await spend(client, auth, "Food", "100", NEXT)
    res = await add(
        client, auth, "Winter", ["Food"], "500", rollover=True, **repeating(NEXT, AFTER)
    )
    assert res.status_code == 201, res.text
    [line] = (await view(client, auth, on=AFTER.isoformat()))["lines"]
    assert line["carried"] == "400.0000"


async def test_the_same_category_can_be_in_limits_that_run_at_different_times(
    client: AsyncClient, auth
):
    await spend(client, auth, "Food", "1")
    assert (await add(client, auth, "A", ["Food"], "5", **repeating(THIS, NEXT))).status_code == 201
    # a later stretch is fine, an overlapping one or one that runs for ever is not
    assert (
        await add(client, auth, "B", ["Food"], "5", **repeating(AFTER, LATER))
    ).status_code == 201
    assert (
        await add(client, auth, "C", ["Food"], "5", **repeating(NEXT, AFTER))
    ).status_code == 409
    assert (await add(client, auth, "D", ["Food"], "5")).status_code == 409


async def test_it_does_not_clash_with_a_limit_for_set_dates(client: AsyncClient, auth):
    await spend(client, auth, "Food", "1")
    assert (await add(client, auth, "A", ["Food"], "5", **repeating(THIS, NEXT))).status_code == 201
    res = await add(
        client,
        auth,
        "Trip",
        ["Food"],
        "5",
        start_date=THIS.isoformat(),
        end_date=NEXT.isoformat(),
    )
    assert res.status_code == 201, res.text


async def test_repeat_needs_both_dates(client: AsyncClient, auth):
    await spend(client, auth, "Food", "1")
    res = await add(client, auth, "A", ["Food"], "5", repeat=True)
    assert res.status_code == 422


async def test_a_limit_can_become_one_and_stop_being_one(client: AsyncClient, auth):
    await spend(client, auth, "Food", "1")
    line_id = (await add(client, auth, "Food", ["Food"], "500")).json()["lines"][0]["id"]

    # for ever -> only between two dates
    res = await client.patch(f"{BUDGET}/lines/{line_id}", json=repeating(NEXT, AFTER), headers=auth)
    assert res.status_code == 200, res.text
    assert res.json()["lines"] == []  # this month is outside it
    # change only its end: it keeps being a monthly one
    res = await client.patch(
        f"{BUDGET}/lines/{line_id}",
        json={"end_date": LATER.isoformat()},
        headers=auth,
    )
    assert res.status_code == 200, res.text
    [line] = (await view(client, auth, on=LATER.isoformat()))["lines"]
    assert line["runs_until"] == period_bounds(LATER, 1)[1].isoformat()

    # -> one total for the stretch
    res = await client.patch(f"{BUDGET}/lines/{line_id}", json={"repeat": False}, headers=auth)
    assert res.status_code == 200, res.text
    assert len(res.json()["fixed_lines"]) == 1

    # -> back to running every period
    res = await client.patch(f"{BUDGET}/lines/{line_id}", json={"end_date": None}, headers=auth)
    assert res.status_code == 200, res.text
    [line] = res.json()["lines"]
    assert line["runs_from"] is None
    assert line["runs_until"] is None


async def test_money_only_moves_between_limits_that_run_that_period(client: AsyncClient, auth):
    await spend(client, auth, "Food", "1")
    await spend(client, auth, "Fun", "1")
    always = (await add(client, auth, "Fun", ["Fun"], "500")).json()["lines"][0]["id"]
    await add(client, auth, "Winter", ["Food"], "500", **repeating(NEXT, AFTER))
    winter = (await view(client, auth, on=NEXT.isoformat()))["lines"]
    winter = next(v["id"] for v in winter if v["name"] == "Winter")
    res = await client.post(
        f"{BUDGET}/moves",
        json={"from_line_id": always, "to_line_id": winter, "amount": "10"},
        headers=auth,
    )
    assert res.status_code == 422  # it does not run this month
    res = await client.post(
        f"{BUDGET}/moves",
        json={
            "from_line_id": always,
            "to_line_id": winter,
            "amount": "10",
            "on": NEXT.isoformat(),
        },
        headers=auth,
    )
    assert res.status_code == 201, res.text
