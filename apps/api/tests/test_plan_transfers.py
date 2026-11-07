from datetime import date, timedelta
from decimal import Decimal

from httpx import AsyncClient

PLAN = "/api/v1/stats/available-to-spend"
ACC = "/api/v1/accounts"
TX = "/api/v1/transactions"
TODAY = date.today()


async def make(client, auth, name, group="accounts", opening="0", **extra) -> dict:
    res = await client.post(
        ACC,
        json={"name": name, "group": group, "currency": "MVR", "opening_amount": opening, **extra},
        headers=auth,
    )
    assert res.status_code == 201, res.text
    return res.json()


async def planned_transfer(client, auth, source, dest, amount, when=TODAY, **extra) -> dict:
    res = await client.post(
        TX,
        json={
            "type": "transfer",
            "amount": amount,
            "to_amount": amount,
            "account_id": source["id"],
            "to_account_id": dest["id"],
            "transaction_date": when.isoformat(),
            "planned": True,
            **extra,
        },
        headers=auth,
    )
    assert res.status_code == 201, res.text
    return res.json()


async def plan(client, auth) -> dict:
    return (await client.get(PLAN, headers=auth)).json()


async def test_a_planned_transfer_to_savings_is_money_you_cannot_spend(client: AsyncClient, auth):
    main = await make(client, auth, "Main", opening="1000")
    savings = await make(client, auth, "Pot", group="savings")
    await planned_transfer(client, auth, main, savings, "300")
    body = await plan(client, auth)
    assert [b["title"] for b in body["bills"]] == ["Transfer to Pot"]
    assert body["bills"][0]["transfer"] is True
    assert Decimal(body["bills_total"]) == 300
    assert Decimal(body["available"]) == 700


async def test_a_move_between_everyday_accounts_changes_nothing(client: AsyncClient, auth):
    main = await make(client, auth, "Main", opening="1000")
    cash = await make(client, auth, "Cash", group="cash")
    await planned_transfer(client, auth, main, cash, "300")
    body = await plan(client, auth)
    assert body["bills"] == []
    assert Decimal(body["available"]) == 1000


async def test_money_arriving_from_savings_is_never_counted(client: AsyncClient, auth):
    main = await make(client, auth, "Main", opening="1000")
    savings = await make(client, auth, "Pot", group="savings", opening="5000")
    await planned_transfer(client, auth, savings, main, "300")
    body = await plan(client, auth)
    assert body["bills"] == []
    assert body["expected"] == []
    assert Decimal(body["available"]) == 1000


async def test_a_description_names_the_transfer(client: AsyncClient, auth):
    main = await make(client, auth, "Main", opening="1000")
    savings = await make(client, auth, "Pot", group="savings")
    await planned_transfer(client, auth, main, savings, "100", description="Monthly saving")
    assert (await plan(client, auth))["bills"][0]["title"] == "Monthly saving"


async def test_a_transfer_after_the_period_is_not_counted_yet(client: AsyncClient, auth):
    main = await make(client, auth, "Main", opening="1000")
    savings = await make(client, auth, "Pot", group="savings")
    await planned_transfer(client, auth, main, savings, "300", when=TODAY + timedelta(days=90))
    assert (await plan(client, auth))["bills"] == []


async def test_repaying_a_card_already_in_the_plan_is_not_counted_twice(client: AsyncClient, auth):
    main = await make(client, auth, "Main", opening="1000")
    closed = TODAY - timedelta(days=5)
    visa = await make(
        client,
        auth,
        "Visa",
        group="card",
        statement_day=closed.day,
        due_day=TODAY.day,
    )
    res = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": "300",
            "category": "Shopping",
            "payment_method": "credit_card",
            "account_id": visa["id"],
            "transaction_date": (TODAY - timedelta(days=8)).isoformat(),
        },
        headers=auth,
    )
    assert res.status_code == 201
    await planned_transfer(client, auth, main, visa, "300")
    body = await plan(client, auth)
    assert [c["title"] for c in body["card_payments"]] == ["Visa"]
    assert body["bills"] == []
    assert Decimal(body["available"]) == 700  # 1,000 less the statement, once


async def test_a_card_repayment_with_no_statement_in_the_plan_counts(client: AsyncClient, auth):
    main = await make(client, auth, "Main", opening="1000")
    visa = await make(client, auth, "Visa", group="card")
    await planned_transfer(client, auth, main, visa, "200")
    body = await plan(client, auth)
    assert Decimal(body["available"]) == 800


async def test_marking_a_planned_transfer_done_moves_the_money(client: AsyncClient, auth):
    main = await make(client, auth, "Main", opening="1000")
    savings = await make(client, auth, "Pot", group="savings")
    t = await planned_transfer(client, auth, main, savings, "300")
    res = await client.post(f"{TX}/{t['id']}/post", json={}, headers=auth)
    assert res.status_code == 200, res.text
    body = await plan(client, auth)
    assert body["bills"] == []
    assert Decimal(body["available"]) == 700  # now really in the pot
    accounts = {a["name"]: a for a in (await client.get(ACC, headers=auth)).json()}
    assert Decimal(accounts["Pot"]["balance"]) == 300
