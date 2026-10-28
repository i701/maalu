from datetime import date, timedelta

from httpx import AsyncClient

from tests.conftest import Signup

STATS = "/api/v1/stats"
TX = "/api/v1/transactions"
ACC = "/api/v1/accounts"


async def money(client, auth, kind: str, amount: str, day: date, **extra):
    body = {
        "type": kind,
        "amount": amount,
        "payment_method": "cash",
        "category": "Misc",
        "transaction_date": day.isoformat(),
        **extra,
    }
    resp = await client.post(TX, json=body, headers=auth)
    assert resp.status_code == 201, resp.text


async def account(client, auth, name: str, group: str = "accounts", **extra) -> dict:
    resp = await client.post(ACC, json={"name": name, "group": group, **extra}, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_requires_auth(client: AsyncClient):
    assert (await client.get(f"{STATS}/monthly")).status_code == 401


async def test_monthly_covers_every_month_even_empty_ones(client: AsyncClient, auth):
    body = (
        await client.get(f"{STATS}/monthly", params={"months": 4, "to": "2026-02-15"}, headers=auth)
    ).json()
    assert body["currency"] == "MVR"
    assert [m["month"] for m in body["months"]] == ["2025-11", "2025-12", "2026-01", "2026-02"]
    assert all(m["income"] == "0.0000" and m["expense"] == "0.0000" for m in body["months"])


async def test_monthly_sums_in_base_currency_and_skips_transfers(client: AsyncClient, auth):
    a = await account(client, auth, "A")
    b = await account(client, auth, "B")
    await money(client, auth, "income", "1000", date(2026, 1, 31))
    await money(client, auth, "expense", "200", date(2026, 1, 1))
    await money(
        client, auth, "expense", "10", date(2026, 2, 3), currency="USD", exchange_rate="15.4"
    )
    await money(client, auth, "expense", "999", date(2025, 12, 31))  # the month before the range
    await money(client, auth, "expense", "999", date(2026, 3, 1))  # the month after it
    transfer = {
        "type": "transfer",
        "amount": "500",
        "transaction_date": "2026-01-10",
        "account_id": a["id"],
        "to_account_id": b["id"],
    }
    assert (await client.post(TX, json=transfer, headers=auth)).status_code == 201

    body = (
        await client.get(f"{STATS}/monthly", params={"months": 2, "to": "2026-02-20"}, headers=auth)
    ).json()
    jan, feb = body["months"]
    assert (jan["month"], jan["income"], jan["expense"]) == ("2026-01", "1000.0000", "200.0000")
    assert (feb["month"], feb["income"], feb["expense"]) == ("2026-02", "0.0000", "154.0000")


async def test_monthly_defaults_to_the_current_month_and_validates(client: AsyncClient, auth):
    today = date.today()
    body = (await client.get(f"{STATS}/monthly", headers=auth)).json()
    assert len(body["months"]) == 6
    assert body["months"][-1]["month"] == f"{today.year:04d}-{today.month:02d}"
    for bad in (0, 25):
        assert (
            await client.get(f"{STATS}/monthly", params={"months": bad}, headers=auth)
        ).status_code == 422


async def test_monthly_is_per_user(client: AsyncClient, auth, signup: Signup):
    await money(client, auth, "expense", "50", date.today())
    bob = await signup("bob@example.com")
    body = (await client.get(f"{STATS}/monthly", params={"months": 1}, headers=bob)).json()
    assert body["months"][0]["expense"] == "0.0000"


async def test_balance_trend_follows_transactions_day_by_day(client: AsyncClient, auth):
    main = await account(client, auth, "Main", opening_amount="1000")
    savings = await account(client, auth, "Savings", group="savings", opening_amount="500")
    start = date(2026, 3, 10)
    await money(
        client, auth, "income", "300", start - timedelta(days=5), account_id=main["id"]
    )  # before the range
    await money(client, auth, "expense", "100", start + timedelta(days=1), account_id=main["id"])
    transfer = {
        "type": "transfer",
        "amount": "200",
        "transaction_date": (start + timedelta(days=2)).isoformat(),
        "account_id": main["id"],
        "to_account_id": savings["id"],
    }
    assert (await client.post(TX, json=transfer, headers=auth)).status_code == 201

    resp = await client.get(
        f"{STATS}/balance-trend",
        params={"from": start.isoformat(), "to": (start + timedelta(days=3)).isoformat()},
        headers=auth,
    )
    assert resp.status_code == 200, resp.text
    points = resp.json()["points"]
    assert [p["date"] for p in points] == ["2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13"]
    # opening 1000 + 500, +300 income before the range; -100 expense; the transfer only moves money
    assert [p["total"] for p in points] == ["1800.0000", "1700.0000", "1700.0000", "1700.0000"]
    assert points[2]["assets"] == "1700.0000"


async def test_balance_trend_counts_debts_and_foreign_accounts(client: AsyncClient, auth):
    await account(client, auth, "Main", opening_amount="1000")
    await account(client, auth, "Visa", group="card", opening_amount="-300")
    await account(client, auth, "USD", currency="USD", exchange_rate="15", opening_amount="10")
    day = date(2026, 5, 1).isoformat()
    point = (
        await client.get(f"{STATS}/balance-trend", params={"from": day, "to": day}, headers=auth)
    ).json()["points"][0]
    assert point["assets"] == "1150.0000"  # 1000 + 10 USD at 15
    assert point["liabilities"] == "300.0000"
    assert point["total"] == "850.0000"


async def test_balance_trend_validates_the_range(client: AsyncClient, auth):
    backwards = await client.get(
        f"{STATS}/balance-trend", params={"from": "2026-05-02", "to": "2026-05-01"}, headers=auth
    )
    assert backwards.status_code == 422
    too_long = await client.get(
        f"{STATS}/balance-trend", params={"from": "2025-01-01", "to": "2026-05-01"}, headers=auth
    )
    assert too_long.status_code == 422
    assert (await client.get(f"{STATS}/balance-trend", headers=auth)).status_code == 422


async def test_balance_trend_with_no_accounts_is_zero(client: AsyncClient, auth):
    day = date(2026, 5, 1).isoformat()
    point = (
        await client.get(f"{STATS}/balance-trend", params={"from": day, "to": day}, headers=auth)
    ).json()["points"][0]
    assert point["total"] == "0.0000"
