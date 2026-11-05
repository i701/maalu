from datetime import date, timedelta

from httpx import AsyncClient

from tests.conftest import Signup

BUDGET = "/api/v1/budget"
TX = "/api/v1/transactions"
CAT = "/api/v1/categories"
TODAY = date.today()


async def spend(client, auth, category: str, amount: str, day: date = TODAY):
    resp = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": amount,
            "payment_method": "cash",
            "category": category,
            "transaction_date": day.isoformat(),
        },
        headers=auth,
    )
    assert resp.status_code == 201, resp.text


async def cid(client, auth, name: str) -> str:
    cats = (await client.get(CAT, headers=auth)).json()
    return next(c["id"] for c in cats if c["name"] == name)


async def add(client, auth, name, categories, amount, **extra):
    ids = [await cid(client, auth, c) for c in categories]
    return await client.post(
        f"{BUDGET}/lines",
        json={"name": name, "category_ids": ids, "amount": amount, **extra},
        headers=auth,
    )


def window(start: date, end: date) -> dict:
    return {"start_date": start.isoformat(), "end_date": end.isoformat()}


async def view(client, auth, **params) -> dict:
    return (await client.get(BUDGET, params=params, headers=auth)).json()


async def test_a_limit_with_dates_counts_the_whole_range_once(client: AsyncClient, auth):
    start, end = TODAY - timedelta(days=10), TODAY + timedelta(days=10)
    await spend(client, auth, "Trip", "300", start)
    await spend(client, auth, "Trip", "400", TODAY)
    await spend(client, auth, "Trip", "999", start - timedelta(days=1))  # before it
    await spend(client, auth, "Trip", "999", end + timedelta(days=1))  # after it
    resp = await add(client, auth, "Thailand", ["Trip"], "1000", **window(start, end))
    assert resp.status_code == 201, resp.text

    body = await view(client, auth)
    assert body["lines"] == []  # not a per-period line
    [line] = body["fixed_lines"]
    assert line["name"] == "Thailand"
    assert (line["start_date"], line["end_date"]) == (start.isoformat(), end.isoformat())
    assert line["state"] == "active"
    assert line["days_left"] == 11
    assert (line["activity"], line["available"], line["percent"]) == ("700.0000", "300.0000", 70)
    assert line["status"] == "ok"


async def test_status_follows_the_warning_level_and_the_limit(client: AsyncClient, auth):
    start, end = TODAY - timedelta(days=1), TODAY + timedelta(days=1)
    await spend(client, auth, "Trip", "850")
    await add(client, auth, "Trip limit", ["Trip"], "1000", **window(start, end))
    [line] = (await view(client, auth))["fixed_lines"]
    assert line["status"] == "warning"  # 85% of 1,000, the default level is 80%
    await spend(client, auth, "Trip", "200")
    [line] = (await view(client, auth))["fixed_lines"]
    assert line["status"] == "over"
    assert line["available"] == "-50.0000"


async def test_upcoming_and_ended_limits(client: AsyncClient, auth):
    await spend(client, auth, "Trip", "10", TODAY - timedelta(days=30))
    await spend(client, auth, "Gifts", "5", TODAY + timedelta(days=1))
    await add(
        client,
        auth,
        "Old",
        ["Trip"],
        "50",
        **window(TODAY - timedelta(days=40), TODAY - timedelta(days=20)),
    )
    await add(
        client,
        auth,
        "Soon",
        ["Gifts"],
        "50",
        **window(TODAY + timedelta(days=1), TODAY + timedelta(days=9)),
    )
    body = await view(client, auth)
    by_name = {f["name"]: f for f in body["fixed_lines"]}
    assert by_name["Old"]["state"] == "ended"
    assert by_name["Old"]["days_left"] is None
    assert by_name["Soon"]["state"] == "upcoming"
    assert by_name["Soon"]["days_left"] == 10
    # running ones first, ended last
    assert [f["name"] for f in body["fixed_lines"]] == ["Soon", "Old"]
    assert body["attention"] == 0


async def test_it_is_shown_whatever_period_is_viewed(client: AsyncClient, auth):
    await spend(client, auth, "Trip", "10")
    await add(client, auth, "Trip", ["Trip"], "100", **window(TODAY, TODAY + timedelta(days=3)))
    last_year = TODAY.replace(year=TODAY.year - 1)
    body = await view(client, auth, on=last_year.isoformat())
    assert [f["name"] for f in body["fixed_lines"]] == ["Trip"]
    assert body["period"]["is_current"] is False


async def test_only_running_limits_that_are_close_need_attention(client: AsyncClient, auth):
    await spend(client, auth, "Trip", "900")
    await spend(client, auth, "Gifts", "900", TODAY - timedelta(days=30))
    await add(client, auth, "Running", ["Trip"], "1000", **window(TODAY, TODAY + timedelta(days=2)))
    await add(
        client,
        auth,
        "Finished",
        ["Gifts"],
        "1000",
        **window(TODAY - timedelta(days=35), TODAY - timedelta(days=20)),
    )
    assert (await view(client, auth))["attention"] == 1


async def test_the_per_period_totals_leave_limits_with_dates_out(client: AsyncClient, auth):
    await spend(client, auth, "Food", "100")
    await spend(client, auth, "Trip", "700")
    await add(client, auth, "Food", ["Food"], "500")
    await add(client, auth, "Trip", ["Trip"], "1000", **window(TODAY, TODAY + timedelta(days=5)))
    totals = (await view(client, auth))["totals"]
    assert (totals["amount"], totals["activity"]) == ("500.0000", "100.0000")


async def test_dates_need_both_ends_in_order(client: AsyncClient, auth):
    await spend(client, auth, "Trip", "1")
    ids = [await cid(client, auth, "Trip")]
    base = {"name": "X", "category_ids": ids, "amount": "10"}
    for extra in (
        {"start_date": TODAY.isoformat()},
        {"end_date": TODAY.isoformat()},
        window(TODAY, TODAY - timedelta(days=1)),
        window(TODAY, TODAY + timedelta(days=4000)),
        {**window(TODAY, TODAY + timedelta(days=1)), "rollover": True},
    ):
        res = await client.post(f"{BUDGET}/lines", json={**base, **extra}, headers=auth)
        assert res.status_code == 422, extra


async def test_one_day_is_a_valid_range(client: AsyncClient, auth):
    await spend(client, auth, "Trip", "1")
    res = await add(client, auth, "Day", ["Trip"], "10", **window(TODAY, TODAY))
    assert res.status_code == 201
    assert res.json()["fixed_lines"][0]["days_left"] == 1


async def test_limits_on_one_category_may_not_overlap_in_time(client: AsyncClient, auth):
    await spend(client, auth, "Trip", "1")
    first = await add(
        client, auth, "A", ["Trip"], "10", **window(TODAY, TODAY + timedelta(days=10))
    )
    assert first.status_code == 201
    clash = await add(
        client,
        auth,
        "B",
        ["Trip"],
        "10",
        **window(TODAY + timedelta(days=10), TODAY + timedelta(days=20)),
    )
    assert clash.status_code == 409
    after = await add(
        client,
        auth,
        "C",
        ["Trip"],
        "10",
        **window(TODAY + timedelta(days=11), TODAY + timedelta(days=20)),
    )
    assert after.status_code == 201


async def test_a_limit_with_dates_and_a_per_period_one_can_share_a_category(
    client: AsyncClient, auth
):
    await spend(client, auth, "Food", "1")
    assert (await add(client, auth, "Monthly", ["Food"], "500")).status_code == 201
    res = await add(
        client, auth, "Holiday", ["Food"], "100", **window(TODAY, TODAY + timedelta(days=5))
    )
    assert res.status_code == 201
    # but two per-period limits still can't
    assert (await add(client, auth, "Again", ["Food"], "5")).status_code == 409


async def test_a_limit_can_gain_and_lose_its_dates(client: AsyncClient, auth):
    await spend(client, auth, "Food", "1")
    res = await add(client, auth, "Food", ["Food"], "500")
    line_id = res.json()["lines"][0]["id"]

    # per period -> set dates
    res = await client.patch(
        f"{BUDGET}/lines/{line_id}", json=window(TODAY, TODAY + timedelta(days=7)), headers=auth
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["lines"] == []
    assert len(body["fixed_lines"]) == 1

    # change only its end
    new_end = TODAY + timedelta(days=30)
    res = await client.patch(
        f"{BUDGET}/lines/{line_id}", json={"end_date": new_end.isoformat()}, headers=auth
    )
    assert res.json()["fixed_lines"][0]["end_date"] == new_end.isoformat()

    # an end before the start is refused
    res = await client.patch(
        f"{BUDGET}/lines/{line_id}",
        json={"end_date": (TODAY - timedelta(days=1)).isoformat()},
        headers=auth,
    )
    assert res.status_code == 422

    # set dates -> per period again
    res = await client.patch(f"{BUDGET}/lines/{line_id}", json={"end_date": None}, headers=auth)
    assert res.status_code == 200
    assert res.json()["fixed_lines"] == []
    assert len(res.json()["lines"]) == 1


async def test_dates_cannot_be_half_given_on_a_per_period_limit(client: AsyncClient, auth):
    await spend(client, auth, "Food", "1")
    line_id = (await add(client, auth, "Food", ["Food"], "500")).json()["lines"][0]["id"]
    for body in ({"end_date": TODAY.isoformat()}, {"start_date": TODAY.isoformat()}):
        res = await client.patch(f"{BUDGET}/lines/{line_id}", json=body, headers=auth)
        assert res.status_code == 422, body


async def test_a_limit_with_dates_cannot_roll_over(client: AsyncClient, auth):
    await spend(client, auth, "Trip", "1")
    res = await add(client, auth, "T", ["Trip"], "10", **window(TODAY, TODAY + timedelta(days=3)))
    line_id = res.json()["fixed_lines"][0]["id"]
    res = await client.patch(f"{BUDGET}/lines/{line_id}", json={"rollover": True}, headers=auth)
    assert res.status_code == 422


async def test_moving_the_dates_rechecks_the_overlap(client: AsyncClient, auth):
    await spend(client, auth, "Trip", "1")
    await add(client, auth, "A", ["Trip"], "10", **window(TODAY, TODAY + timedelta(days=5)))
    b = await add(
        client,
        auth,
        "B",
        ["Trip"],
        "10",
        **window(TODAY + timedelta(days=10), TODAY + timedelta(days=15)),
    )
    b_id = next(f["id"] for f in b.json()["fixed_lines"] if f["name"] == "B")
    res = await client.patch(
        f"{BUDGET}/lines/{b_id}", json={"start_date": TODAY.isoformat()}, headers=auth
    )
    assert res.status_code == 409


async def test_a_parent_category_covers_its_children_in_a_limit_with_dates(
    client: AsyncClient, auth
):
    parent = (await client.post(CAT, json={"name": "Trip"}, headers=auth)).json()
    await client.post(CAT, json={"name": "Hotels", "parent_id": parent["id"]}, headers=auth)
    await spend(client, auth, "Hotels", "120")
    await add(client, auth, "Trip", ["Trip"], "1000", **window(TODAY, TODAY))
    [line] = (await view(client, auth))["fixed_lines"]
    assert line["activity"] == "120.0000"


async def test_running_limits_that_are_close_make_a_notification(client: AsyncClient, auth):
    await spend(client, auth, "Trip", "950")
    await add(
        client, auth, "Thailand", ["Trip"], "1000", **window(TODAY, TODAY + timedelta(days=3))
    )
    items = (await client.get("/api/v1/notifications", headers=auth)).json()
    assert any("Thailand" in n["title"] for n in items)


async def test_limits_are_private(client: AsyncClient, auth, signup: Signup):
    await spend(client, auth, "Trip", "1")
    await add(client, auth, "T", ["Trip"], "10", **window(TODAY, TODAY + timedelta(days=3)))
    other = await signup("other@example.com")
    assert (await view(client, other))["fixed_lines"] == []
