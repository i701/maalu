from httpx import AsyncClient

from tests.conftest import Signup

TX = "/api/v1/transactions"
URL = f"{TX}/categories/monthly"
ACCOUNTS = "/api/v1/accounts"


async def add(client, auth, kind, amount, day, category="Food", **extra) -> dict:
    body = {
        "type": kind,
        "amount": str(amount),
        "payment_method": "cash",
        "category": category,
        "transaction_date": day,
        **extra,
    }
    resp = await client.post(TX, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def months(client, auth, **params) -> dict:
    resp = await client.get(URL, params=params, headers=auth)
    assert resp.status_code == 200, resp.text
    return resp.json()


def row(body, category, kind="expense") -> dict:
    return next(r for r in body["categories"] if r["category"] == category and r["type"] == kind)


RANGE = {"date_from": "2026-01-01", "date_to": "2026-04-30"}


async def test_every_month_is_listed_and_amounts_line_up(client: AsyncClient, auth):
    await add(client, auth, "expense", "10", "2026-01-15")
    await add(client, auth, "expense", "5.5", "2026-01-20")
    await add(client, auth, "expense", "7", "2026-03-02")
    body = await months(client, auth, **RANGE)
    assert body["months"] == ["2026-01", "2026-02", "2026-03", "2026-04"]
    food = row(body, "Food")
    assert food["amounts"] == ["15.5000", "0.0000", "7.0000", "0.0000"]
    assert food["total"] == "22.5000"
    assert body["currency"] == "MVR"


async def test_the_range_is_whole_months_even_when_the_dates_are_not(client: AsyncClient, auth):
    await add(client, auth, "expense", "10", "2026-01-31")
    await add(client, auth, "expense", "20", "2026-02-01")
    body = await months(client, auth, date_from="2026-01-31", date_to="2026-02-01")
    assert body["months"] == ["2026-01", "2026-02"]
    assert row(body, "Food")["amounts"] == ["10.0000", "20.0000"]


async def test_dates_outside_the_range_are_left_out(client: AsyncClient, auth):
    await add(client, auth, "expense", "10", "2025-12-31")
    await add(client, auth, "expense", "20", "2026-02-10")
    await add(client, auth, "expense", "30", "2026-05-01")
    body = await months(client, auth, **RANGE)
    assert row(body, "Food")["amounts"] == ["0.0000", "20.0000", "0.0000", "0.0000"]


async def test_income_and_spending_are_separate_rows(client: AsyncClient, auth):
    await add(client, auth, "income", "900", "2026-02-01", category="Salary")
    await add(client, auth, "expense", "100", "2026-02-02", category="Rent")
    body = await months(client, auth, **RANGE)
    assert row(body, "Salary", "income")["total"] == "900.0000"
    assert row(body, "Rent", "expense")["total"] == "100.0000"
    assert {(r["type"], r["category"]) for r in body["categories"]} == {
        ("income", "Salary"),
        ("expense", "Rent"),
    }


async def test_it_agrees_with_the_category_totals(client: AsyncClient, auth):
    await add(client, auth, "expense", "12.34", "2026-01-05")
    await add(client, auth, "expense", "56.78", "2026-02-05")
    await add(client, auth, "income", "100", "2026-03-05", category="Salary")
    monthly = await months(client, auth, **RANGE)
    totals = (await client.get(f"{TX}/categories", params=RANGE, headers=auth)).json()
    for t in totals["categories"]:
        assert row(monthly, t["category"], t["type"])["total"] == t["total"]


async def test_a_split_transaction_counts_under_each_items_category(client: AsyncClient, auth):
    items = [
        {"name": "Eggs", "category": "Groceries", "amount": "60.00"},
        {"name": "Headphones", "category": "Gadgets", "amount": "40.00"},
    ]
    await add(client, auth, "expense", "100", "2026-02-10", splits=items, category=None)
    body = await months(client, auth, **RANGE)
    assert row(body, "Groceries")["amounts"] == ["0.0000", "60.0000", "0.0000", "0.0000"]
    assert row(body, "Gadgets")["amounts"] == ["0.0000", "40.0000", "0.0000", "0.0000"]


async def test_a_refund_takes_away_from_the_month_it_arrives_in(client: AsyncClient, auth):
    purchase = await add(client, auth, "expense", "100", "2026-01-10")
    await add(
        client,
        auth,
        "income",
        "30",
        "2026-02-10",
        refund_of_id=purchase["id"],
    )
    body = await months(client, auth, **RANGE)
    assert row(body, "Food")["amounts"] == ["100.0000", "-30.0000", "0.0000", "0.0000"]
    assert not [r for r in body["categories"] if r["type"] == "income"]


async def test_transfers_planned_and_trashed_do_not_count(client: AsyncClient, auth):
    a = (
        await client.post(
            ACCOUNTS,
            json={"group": "accounts", "name": "A", "opening_amount": "500"},
            headers=auth,
        )
    ).json()
    b = (
        await client.post(
            ACCOUNTS,
            json={"group": "accounts", "name": "B", "opening_amount": "0"},
            headers=auth,
        )
    ).json()
    await client.post(
        TX,
        json={
            "type": "transfer",
            "amount": "50",
            "account_id": a["id"],
            "to_account_id": b["id"],
            "payment_method": "bank_transfer",
            "transaction_date": "2026-02-01",
        },
        headers=auth,
    )
    await add(client, auth, "expense", "10", "2026-02-02", planned=True)
    gone = await add(client, auth, "expense", "20", "2026-02-03")
    await client.delete(f"{TX}/{gone['id']}", headers=auth)
    body = await months(client, auth, **RANGE)
    assert body["categories"] == []
    assert len(body["months"]) == 4


async def test_it_can_be_limited_to_one_account(client: AsyncClient, auth):
    a = (
        await client.post(
            ACCOUNTS,
            json={"group": "accounts", "name": "A", "opening_amount": "0"},
            headers=auth,
        )
    ).json()
    await add(client, auth, "expense", "10", "2026-02-01", account_id=a["id"])
    await add(client, auth, "expense", "99", "2026-02-02")
    body = await months(client, auth, account_id=a["id"], **RANGE)
    assert row(body, "Food")["total"] == "10.0000"


async def test_sub_categories_carry_their_parent(client: AsyncClient, auth):
    parent = (await client.post("/api/v1/categories", json={"name": "Food"}, headers=auth)).json()
    await client.post(
        "/api/v1/categories", json={"name": "Dining", "parent_id": parent["id"]}, headers=auth
    )
    await add(client, auth, "expense", "10", "2026-02-01", category="Dining")
    dining = row(await months(client, auth, **RANGE), "Dining")
    assert dining["parent"] == "Food"
    assert dining["parent_id"] == parent["id"]


async def test_the_default_is_the_last_twelve_months(client: AsyncClient, auth):
    body = await months(client, auth)
    assert len(body["months"]) == 12
    assert body["months"] == sorted(body["months"])


async def test_at_most_three_years_and_the_dates_must_be_in_order(client: AsyncClient, auth):
    too_long = await client.get(
        URL, params={"date_from": "2020-01-01", "date_to": "2023-01-31"}, headers=auth
    )
    assert too_long.status_code == 422
    assert "36" in too_long.text
    backwards = await client.get(
        URL, params={"date_from": "2026-03-01", "date_to": "2026-01-01"}, headers=auth
    )
    assert backwards.status_code == 422
    exactly = await client.get(
        URL, params={"date_from": "2023-01-01", "date_to": "2025-12-31"}, headers=auth
    )
    assert exactly.status_code == 200


async def test_only_your_own_transactions_show(client: AsyncClient, signup: Signup):
    mine = await signup("alice@example.com")
    theirs = await signup("bob@example.com")
    await add(client, mine, "expense", "10", "2026-02-01")
    await add(client, theirs, "expense", "999", "2026-02-01")
    assert row(await months(client, mine, **RANGE), "Food")["total"] == "10.0000"


async def test_it_needs_a_session(client: AsyncClient):
    assert (await client.get(URL)).status_code == 401
