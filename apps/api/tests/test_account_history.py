from datetime import date, timedelta
from decimal import Decimal

from httpx import AsyncClient

ACCOUNTS = "/api/v1/accounts"
TX = "/api/v1/transactions"
TODAY = date.today()


def day(ago: int) -> str:
    return (TODAY - timedelta(days=ago)).isoformat()


async def account(client: AsyncClient, auth, name: str, opening="1000", group="accounts") -> dict:
    res = await client.post(
        ACCOUNTS,
        json={"name": name, "group": group, "currency": "MVR", "opening_amount": opening},
        headers=auth,
    )
    assert res.status_code == 201, res.text
    return res.json()


async def tx(client: AsyncClient, auth, **body) -> dict:
    res = await client.post(
        TX, json={"category": "Misc", "payment_method": "cash", **body}, headers=auth
    )
    assert res.status_code == 201, res.text
    return res.json()


async def test_history_is_the_balance_at_the_end_of_each_day(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    await tx(
        client, auth, type="expense", amount="100", account_id=main["id"], transaction_date=day(10)
    )
    await tx(
        client, auth, type="income", amount="500", account_id=main["id"], transaction_date=day(3)
    )
    await tx(
        client, auth, type="expense", amount="50", account_id=main["id"], transaction_date=day(3)
    )

    res = await client.get(f"{ACCOUNTS}/{main['id']}/balance-history?days=7", headers=auth)
    assert res.status_code == 200
    body = res.json()
    assert body["currency"] == "MVR"
    points = {p["date"]: p["balance"] for p in body["points"]}
    assert len(points) == 7
    dates = list(points)
    assert dates[0] == day(6)
    assert dates[-1] == day(0)
    # the expense 10 days ago is before the window, so it is already in the first day
    assert points[day(6)] == "900.0000"
    assert points[day(4)] == "900.0000"
    # a day with two movements is the sum of both; later days repeat it
    assert points[day(3)] == "1350.0000"
    assert points[day(0)] == "1350.0000"


async def test_a_transfer_moves_both_accounts_and_planned_ones_do_not_count(
    client: AsyncClient, auth
):
    main = await account(client, auth, "Main", "1000")
    other = await account(client, auth, "Savings", "0", "savings")
    await tx(
        client,
        auth,
        type="transfer",
        amount="300",
        account_id=main["id"],
        to_account_id=other["id"],
        transaction_date=day(1),
    )
    await tx(
        client,
        auth,
        type="expense",
        amount="999",
        account_id=main["id"],
        transaction_date=day(0),
        planned=True,
    )
    history = lambda a: client.get(f"{ACCOUNTS}/{a['id']}/balance-history?days=7", headers=auth)  # noqa: E731
    assert (await history(main)).json()["points"][-1]["balance"] == "700.0000"
    assert (await history(other)).json()["points"][-1]["balance"] == "300.0000"
    assert (await client.get(f"{ACCOUNTS}/{main['id']}", headers=auth)).json()["balance"] == (
        "700.0000"
    )


async def test_the_balance_after_each_transaction_ends_at_the_balance(client: AsyncClient, auth):
    main = await account(client, auth, "Main", "100")
    first = await tx(
        client, auth, type="income", amount="50", account_id=main["id"], transaction_date=day(5)
    )
    second = await tx(
        client, auth, type="expense", amount="30", account_id=main["id"], transaction_date=day(2)
    )
    # two on one day: the later-entered one is the later balance
    third = await tx(
        client, auth, type="expense", amount="20", account_id=main["id"], transaction_date=day(2)
    )

    res = await client.get(f"{ACCOUNTS}/{main['id']}/balances-after", headers=auth)
    balances = {r["transaction_id"]: r["balance"] for r in res.json()}
    assert balances[first["id"]] == "150.0000"
    assert balances[second["id"]] == "120.0000"
    assert balances[third["id"]] == "100.0000"
    assert (await client.get(f"{ACCOUNTS}/{main['id']}", headers=auth)).json()["balance"] == (
        "100.0000"
    )
    # only the newest few when asked
    newest = (
        await client.get(f"{ACCOUNTS}/{main['id']}/balances-after?limit=1", headers=auth)
    ).json()
    assert [r["transaction_id"] for r in newest] == [third["id"]]


async def test_history_is_private_and_the_days_are_bounded(client: AsyncClient, auth, signup):
    main = await account(client, auth, "Main")
    assert (
        await client.get(f"{ACCOUNTS}/{main['id']}/balance-history?days=3", headers=auth)
    ).status_code == 422
    other = await signup("bob@example.com")
    assert (
        await client.get(f"{ACCOUNTS}/{main['id']}/balance-history", headers=other)
    ).status_code == 404
    assert (
        await client.get(f"{ACCOUNTS}/{main['id']}/balances-after", headers=other)
    ).status_code == 404


async def test_trends_give_every_active_account_a_short_balance_curve(client: AsyncClient, auth):
    main = await account(client, auth, "Main", "1000")
    savings = await account(client, auth, "Savings", "200", group="savings")
    await tx(
        client, auth, type="expense", amount="100", account_id=main["id"], transaction_date=day(10)
    )
    await tx(
        client,
        auth,
        type="transfer",
        amount="50",
        account_id=main["id"],
        to_account_id=savings["id"],
        to_amount="50",
        transaction_date=day(3),
    )
    res = await client.get(f"{ACCOUNTS}/trends?days=14", headers=auth)
    assert res.status_code == 200, res.text
    by_id = {t["account_id"]: t for t in res.json()}
    assert set(by_id) == {main["id"], savings["id"]}
    for trend in by_id.values():
        assert len(trend["balances"]) == 14
        assert trend["currency"] == "MVR"
    # Main: 1000, 900 after the expense, 850 after the transfer out; Savings gains the 50 on day 3
    assert Decimal(by_id[main["id"]]["balances"][0]) == Decimal("1000")
    assert Decimal(by_id[main["id"]]["balances"][-1]) == Decimal("850")
    assert Decimal(by_id[savings["id"]]["balances"][-1]) == Decimal("250")
    assert Decimal(by_id[savings["id"]]["balances"][0]) == Decimal("200")


async def test_trends_leave_out_planned_money_and_archived_accounts(client: AsyncClient, auth):
    main = await account(client, auth, "Main", "1000")
    old = await account(client, auth, "Old", "5")
    await tx(
        client,
        auth,
        type="expense",
        amount="400",
        account_id=main["id"],
        transaction_date=day(0),
        planned=True,
    )
    await client.post(f"{ACCOUNTS}/{old['id']}/archive", headers=auth)
    trends = (await client.get(f"{ACCOUNTS}/trends", headers=auth)).json()
    assert [t["account_id"] for t in trends] == [main["id"]]
    assert len(trends[0]["balances"]) == 30
    assert Decimal(trends[0]["balances"][-1]) == Decimal(
        "1000"
    )  # a planned bill counts for nothing


async def test_trends_are_per_person_and_validate_the_range(client: AsyncClient, auth, signup):
    await account(client, auth, "Main")
    other = await signup("bob@example.com")
    assert (await client.get(f"{ACCOUNTS}/trends", headers=other)).json() == []
    assert (await client.get(f"{ACCOUNTS}/trends?days=3", headers=auth)).status_code == 422
    assert (await client.get(f"{ACCOUNTS}/trends?days=400", headers=auth)).status_code == 422
