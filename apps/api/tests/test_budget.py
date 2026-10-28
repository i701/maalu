from datetime import date, timedelta

from app.budget_period import next_period_start, period_bounds
from httpx import AsyncClient

from tests.conftest import Signup

BUDGET = "/api/v1/budget"
TX = "/api/v1/transactions"
CAT = "/api/v1/categories"
TODAY = date.today()


async def spend(client, auth, category: str, amount: str, day: date = TODAY, **extra):
    body = {
        "type": "expense",
        "amount": amount,
        "payment_method": "cash",
        "category": category,
        "transaction_date": day.isoformat(),
        **extra,
    }
    resp = await client.post(TX, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def category_id(client, auth, name: str) -> str:
    cats = (await client.get(CAT, headers=auth)).json()
    return next(c["id"] for c in cats if c["name"] == name)


async def add_line(client, auth, name: str, categories: list[str], amount: str, **extra):
    ids = [await category_id(client, auth, c) for c in categories]
    resp = await client.post(
        f"{BUDGET}/lines",
        json={"name": name, "category_ids": ids, "amount": amount, **extra},
        headers=auth,
    )
    return resp


def line_of(budget: dict, name: str) -> dict:
    return next(line for line in budget["lines"] if line["name"] == name)


async def test_requires_auth(client: AsyncClient):
    assert (await client.get(BUDGET)).status_code == 401


async def test_empty_budget_defaults_to_calendar_months(client: AsyncClient, auth):
    body = (await client.get(BUDGET, headers=auth)).json()
    start, end = period_bounds(TODAY, 1)
    assert body["period"] == {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "is_current": True,
    }
    assert body["period_start_day"] == 1
    assert body["warn_percent"] == 80
    assert body["currency"] == "MVR"
    assert body["lines"] == []
    assert body["attention"] == 0
    assert body["totals"]["status"] == "ok"


async def test_line_goes_from_ok_to_warning_to_over(client: AsyncClient, auth):
    await spend(client, auth, "Groceries", "500")
    created = await add_line(client, auth, "Food", ["Groceries"], "1000")
    assert created.status_code == 201, created.text
    food = line_of(created.json(), "Food")
    assert (food["activity"], food["available"], food["percent"], food["status"]) == (
        "500.0000",
        "500.0000",
        50,
        "ok",
    )

    await spend(client, auth, "Groceries", "300")  # 80%: close
    food = line_of((await client.get(BUDGET, headers=auth)).json(), "Food")
    assert (food["percent"], food["status"]) == (80, "warning")

    await spend(client, auth, "Groceries", "250")  # 105%: over
    body = (await client.get(BUDGET, headers=auth)).json()
    food = line_of(body, "Food")
    assert (food["percent"], food["status"], food["available"]) == (105, "over", "-50.0000")
    assert body["attention"] == 1
    assert body["totals"]["status"] == "over"


async def test_just_under_the_warning_level_is_ok(client: AsyncClient, auth):
    await spend(client, auth, "Fuel", "799.99")
    body = (await add_line(client, auth, "Fuel", ["Fuel"], "1000")).json()
    assert line_of(body, "Fuel")["status"] == "ok"


async def test_only_expenses_in_the_period_and_categories_count(client: AsyncClient, auth):
    start, end = period_bounds(TODAY, 1)
    await spend(client, auth, "Groceries", "100")
    await spend(client, auth, "Other", "900")  # a different category
    await spend(client, auth, "Groceries", "700", day=start - timedelta(days=1))  # last period
    await spend(client, auth, "Groceries", "700", day=end + timedelta(days=1))  # next period
    income = {
        "type": "income",
        "amount": "5000",
        "payment_method": "cash",
        "category": "Groceries",
        "transaction_date": TODAY.isoformat(),
    }
    assert (await client.post(TX, json=income, headers=auth)).status_code == 201
    body = (await add_line(client, auth, "Food", ["Groceries"], "1000")).json()
    assert line_of(body, "Food")["activity"] == "100.0000"


async def test_split_items_count_under_their_own_categories(client: AsyncClient, auth):
    items = [
        {"name": "Eggs", "category": "Groceries", "amount": "60"},
        {"name": "Snickers", "category": "Junk food", "amount": "40"},
    ]
    await spend(client, auth, "x", "100", splits=items)
    await spend(client, auth, "Groceries", "10")
    body = (await add_line(client, auth, "Food", ["Groceries"], "1000")).json()
    assert line_of(body, "Food")["activity"] == "70.0000"
    junk = (await add_line(client, auth, "Junk", ["Junk food"], "100")).json()
    assert line_of(junk, "Junk")["activity"] == "40.0000"


async def test_foreign_currency_counts_in_base_currency(client: AsyncClient, auth):
    await spend(client, auth, "Travel", "10", currency="USD", exchange_rate="15.4")
    body = (await add_line(client, auth, "Trip", ["Travel"], "1000")).json()
    assert line_of(body, "Trip")["activity"] == "154.0000"


async def test_a_category_can_only_be_in_one_line(client: AsyncClient, auth):
    await spend(client, auth, "Groceries", "1")
    await spend(client, auth, "Fuel", "1")
    assert (await add_line(client, auth, "Food", ["Groceries"], "100")).status_code == 201
    clash = await add_line(client, auth, "Again", ["Groceries"], "100")
    assert clash.status_code == 409
    assert "Food" in clash.text

    fuel = (await add_line(client, auth, "Car", ["Fuel"], "100")).json()
    car = line_of(fuel, "Car")
    groceries = await category_id(client, auth, "Groceries")
    taken = await client.patch(
        f"{BUDGET}/lines/{car['id']}", json={"category_ids": [groceries]}, headers=auth
    )
    assert taken.status_code == 409
    # keeping its own categories while editing is fine
    own = [c["id"] for c in car["categories"]]
    ok = await client.patch(
        f"{BUDGET}/lines/{car['id']}", json={"category_ids": own, "amount": "200"}, headers=auth
    )
    assert ok.status_code == 200
    assert line_of(ok.json(), "Car")["amount"] == "200.0000"


async def test_line_validation(client: AsyncClient, auth):
    await spend(client, auth, "Groceries", "1")
    gid = await category_id(client, auth, "Groceries")
    base = {"name": "Food", "category_ids": [gid], "amount": "100"}
    for bad in (
        {**base, "amount": "0"},
        {**base, "category_ids": []},
        {**base, "warn_percent": 0},
        {**base, "warn_percent": 101},
        {**base, "name": " "},
    ):
        assert (await client.post(f"{BUDGET}/lines", json=bad, headers=auth)).status_code == 422
    unknown = {**base, "category_ids": ["00000000-0000-0000-0000-000000000000"]}
    assert (await client.post(f"{BUDGET}/lines", json=unknown, headers=auth)).status_code == 422


async def test_warning_level_per_budget_and_per_line(client: AsyncClient, auth):
    await spend(client, auth, "Groceries", "600")
    await spend(client, auth, "Fuel", "600")
    await add_line(client, auth, "Food", ["Groceries"], "1000")
    body = (await add_line(client, auth, "Car", ["Fuel"], "1000", warn_percent=50)).json()
    assert line_of(body, "Food")["status"] == "ok"
    assert line_of(body, "Car")["status"] == "warning"  # its own 50% level

    lowered = await client.patch(BUDGET, json={"warn_percent": 60}, headers=auth)
    assert line_of(lowered.json(), "Food")["status"] == "warning"
    assert (await client.patch(BUDGET, json={"warn_percent": 0}, headers=auth)).status_code == 422
    assert (
        await client.patch(BUDGET, json={"warn_percent": None}, headers=auth)
    ).status_code == 422

    car = line_of(lowered.json(), "Car")
    cleared = await client.patch(
        f"{BUDGET}/lines/{car['id']}", json={"warn_percent": None}, headers=auth
    )
    assert line_of(cleared.json(), "Car")["warn_percent"] is None


async def test_period_start_day(client: AsyncClient, auth):
    await spend(client, auth, "Groceries", "100", day=date(2026, 3, 24))
    await spend(client, auth, "Groceries", "40", day=date(2026, 3, 25))
    await add_line(client, auth, "Food", ["Groceries"], "1000")
    set_day = await client.patch(BUDGET, json={"period_start_day": 25}, headers=auth)
    assert set_day.status_code == 200
    assert (
        await client.patch(BUDGET, json={"period_start_day": 29}, headers=auth)
    ).status_code == 422

    before = (await client.get(BUDGET, params={"on": "2026-03-24"}, headers=auth)).json()
    assert (before["period"]["start"], before["period"]["end"]) == ("2026-02-25", "2026-03-24")
    assert line_of(before, "Food")["activity"] == "100.0000"
    after = (await client.get(BUDGET, params={"on": "2026-03-25"}, headers=auth)).json()
    assert (after["period"]["start"], after["period"]["end"]) == ("2026-03-25", "2026-04-24")
    assert line_of(after, "Food")["activity"] == "40.0000"
    assert after["period"]["is_current"] is False


async def test_rollover_carries_unspent_money_forward(client: AsyncClient, auth):
    await spend(client, auth, "Groceries", "400")
    await spend(client, auth, "Fuel", "400")
    await add_line(client, auth, "Food", ["Groceries"], "1000", rollover=True)
    await add_line(client, auth, "Car", ["Fuel"], "1000")
    start, _ = period_bounds(TODAY, 1)
    following = next_period_start(start, 1)

    body = (await client.get(BUDGET, params={"on": following.isoformat()}, headers=auth)).json()
    food, car = line_of(body, "Food"), line_of(body, "Car")
    assert (food["carried"], food["available"]) == ("600.0000", "1600.0000")
    assert (car["carried"], car["available"]) == ("0.0000", "1000.0000")  # no rollover

    # overspending is not carried
    await spend(client, auth, "Groceries", "700")
    body = (await client.get(BUDGET, params={"on": following.isoformat()}, headers=auth)).json()
    assert line_of(body, "Food")["carried"] == "0.0000"


async def test_delete_line_and_not_found(client: AsyncClient, auth):
    await spend(client, auth, "Groceries", "1")
    line = line_of((await add_line(client, auth, "Food", ["Groceries"], "100")).json(), "Food")
    assert (await client.delete(f"{BUDGET}/lines/{line['id']}", headers=auth)).status_code == 204
    assert (await client.get(BUDGET, headers=auth)).json()["lines"] == []
    assert (await client.delete(f"{BUDGET}/lines/{line['id']}", headers=auth)).status_code == 404
    patch = await client.patch(f"{BUDGET}/lines/{line['id']}", json={"name": "x"}, headers=auth)
    assert patch.status_code == 404


async def test_budgets_are_per_user(client: AsyncClient, auth, signup: Signup):
    await spend(client, auth, "Groceries", "1")
    line = line_of((await add_line(client, auth, "Food", ["Groceries"], "100")).json(), "Food")
    gid = await category_id(client, auth, "Groceries")
    bob = await signup("bob@example.com")
    assert (await client.get(BUDGET, headers=bob)).json()["lines"] == []
    assert (await client.delete(f"{BUDGET}/lines/{line['id']}", headers=bob)).status_code == 404
    other = {"name": "x", "category_ids": [gid], "amount": "1"}
    assert (await client.post(f"{BUDGET}/lines", json=other, headers=bob)).status_code == 422


async def test_categories_in_a_line_cannot_be_deleted_but_can_be_merged(client: AsyncClient, auth):
    await spend(client, auth, "Groceries", "1")
    await spend(client, auth, "Snacks", "1")
    await add_line(client, auth, "Food", ["Groceries", "Snacks"], "100")
    snacks = await category_id(client, auth, "Snacks")
    groceries = await category_id(client, auth, "Groceries")
    used = (await client.get(f"{CAT}/{snacks}", headers=auth)).json()
    assert used["budget_line_count"] == 1

    assert (await client.delete(f"{CAT}/{snacks}", headers=auth)).status_code == 409
    merged = await client.post(f"{CAT}/{snacks}/merge", json={"into_id": groceries}, headers=auth)
    assert merged.status_code == 200, merged.text
    food = line_of((await client.get(BUDGET, headers=auth)).json(), "Food")
    assert [c["name"] for c in food["categories"]] == ["Groceries"]
    assert food["activity"] == "2.0000"
