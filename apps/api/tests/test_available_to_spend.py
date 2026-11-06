from datetime import date, timedelta
from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import Signup

URL = "/api/v1/stats/available-to-spend"
ACC = "/api/v1/accounts"
TX = "/api/v1/transactions"
GOALS = "/api/v1/goals"


async def account(client: AsyncClient, auth, name: str, group="accounts", opening="0", **extra):
    res = await client.post(
        ACC,
        json={
            "name": name,
            "group": group,
            "currency": "MVR",
            "opening_amount": opening,
            **extra,
        },
        headers=auth,
    )
    assert res.status_code == 201, res.text
    return res.json()


async def planned(client: AsyncClient, auth, account_id, amount, when: date, kind="expense", **x):
    res = await client.post(
        TX,
        json={
            "type": kind,
            "amount": amount,
            "payment_method": "bank_transfer",
            "category": "Bills" if kind == "expense" else "Salary",
            "account_id": account_id,
            "transaction_date": when.isoformat(),
            "planned": True,
            **x,
        },
        headers=auth,
    )
    assert res.status_code == 201, res.text
    return res.json()


async def get(client: AsyncClient, auth) -> dict:
    res = await client.get(URL, headers=auth)
    assert res.status_code == 200, res.text
    return res.json()


def dec(value: str) -> Decimal:
    return Decimal(value)


async def test_requires_auth(client: AsyncClient):
    assert (await client.get(URL)).status_code == 401


async def test_a_new_account_has_nothing_available(client: AsyncClient, auth):
    body = await get(client, auth)
    assert body["currency"] == "MVR"
    assert dec(body["balance"]) == 0
    assert dec(body["available"]) == 0
    assert (body["accounts"], body["bills"], body["reserved"]) == ([], [], [])


async def test_available_is_what_everyday_accounts_hold_less_bills_and_set_asides(
    client: AsyncClient, auth
):
    today = date.today()
    main = await account(client, auth, "Main", opening="5000")
    await account(client, auth, "Wallet", group="cash", opening="200")
    await planned(client, auth, main["id"], "300", today)
    await planned(client, auth, main["id"], "120", today - timedelta(days=40))  # overdue
    await planned(client, auth, main["id"], "999", today + timedelta(days=60))  # not this period
    trip = (
        await client.post(GOALS, json={"name": "Trip", "target_amount": "15000"}, headers=auth)
    ).json()
    await client.post(f"{GOALS}/{trip['id']}/entries", json={"amount": "1000"}, headers=auth)

    body = await get(client, auth)
    assert dec(body["balance"]) == 5200
    assert [(b["amount"], b["overdue"]) for b in body["bills"]] == [
        ("120.0000", True),
        ("300.0000", False),
    ]
    assert {b["account"] for b in body["bills"]} == {"Main"}
    assert dec(body["bills_total"]) == 420
    assert [(r["name"], dec(r["amount"])) for r in body["reserved"]] == [("Trip", 1000)]
    assert dec(body["available"]) == 5200 - 420 - 1000


async def test_it_can_go_below_zero(client: AsyncClient, auth):
    main = await account(client, auth, "Main", opening="100")
    await planned(client, auth, main["id"], "250", date.today())
    assert dec((await get(client, auth))["available"]) == -150


async def test_savings_and_cards_are_not_spendable(client: AsyncClient, auth):
    await account(client, auth, "Main", opening="1000")
    await account(client, auth, "Pot", group="savings", opening="3000")
    await account(client, auth, "Card", group="card", opening="-400")
    body = await get(client, auth)
    assert dec(body["balance"]) == 1000
    assert [a["name"] for a in body["accounts"]] == ["Main"]
    assert [a["name"] for a in body["kept_apart"]] == ["Pot"]  # a debt is neither


async def test_an_account_a_goal_follows_is_kept_apart(client: AsyncClient, auth):
    await account(client, auth, "Main", opening="1000")
    fund = await account(client, auth, "Trip fund", group="accounts", opening="2000")
    res = await client.post(
        GOALS,
        json={"name": "Trip", "target_amount": "5000", "account_id": fund["id"]},
        headers=auth,
    )
    assert res.status_code == 201, res.text
    body = await get(client, auth)
    assert dec(body["balance"]) == 1000
    assert [a["name"] for a in body["kept_apart"]] == ["Trip fund"]
    assert body["reserved"] == []  # its money is not in the everyday accounts at all


async def test_a_bill_from_another_kind_of_account_is_not_counted(client: AsyncClient, auth):
    main = await account(client, auth, "Main", opening="1000")
    card = await account(client, auth, "Card", group="card")
    await planned(client, auth, main["id"], "100", date.today())
    await planned(client, auth, card["id"], "500", date.today())
    body = await get(client, auth)
    assert dec(body["bills_total"]) == 100
    assert dec(body["available"]) == 900


async def test_planned_income_is_shown_but_never_counted(client: AsyncClient, auth):
    main = await account(client, auth, "Main", opening="100")
    await planned(client, auth, main["id"], "8000", date.today(), kind="income")
    body = await get(client, auth)
    assert dec(body["expected_income"]) == 8000
    assert [(e["title"], dec(e["amount"]), e["account"]) for e in body["expected"]] == [
        ("Salary", 8000, "Main")
    ]
    assert body["bills"] == []
    assert dec(body["available"]) == 100


async def test_other_currencies_count_at_the_account_rate(client: AsyncClient, auth):
    res = await client.post(
        ACC,
        json={
            "name": "Dollars",
            "group": "accounts",
            "currency": "USD",
            "exchange_rate": "15.4",
            "opening_amount": "100",
        },
        headers=auth,
    )
    assert res.status_code == 201, res.text
    assert dec((await get(client, auth))["balance"]) == dec("1540")


async def test_archived_and_excluded_accounts_are_left_out(client: AsyncClient, auth):
    await account(client, auth, "Main", opening="1000")
    old = await account(client, auth, "Old", opening="500")
    await account(client, auth, "Hidden", opening="700", exclude_from_stats=True)
    await client.post(f"{ACC}/{old['id']}/archive", headers=auth)
    body = await get(client, auth)
    assert dec(body["balance"]) == 1000
    assert [a["name"] for a in body["accounts"]] == ["Main"]


async def test_a_paid_or_trashed_bill_stops_counting(client: AsyncClient, auth):
    main = await account(client, auth, "Main", opening="1000")
    a = await planned(client, auth, main["id"], "100", date.today())
    b = await planned(client, auth, main["id"], "200", date.today())
    await client.post(f"{TX}/{a['id']}/post", json={}, headers=auth)  # paid: now a real expense
    await client.delete(f"{TX}/{b['id']}", headers=auth)  # skipped
    body = await get(client, auth)
    assert body["bills"] == []
    assert dec(body["available"]) == 900  # the paid one came off the balance itself


async def test_the_period_follows_the_budget_start_day(client: AsyncClient, auth):
    main = await account(client, auth, "Main", opening="1000")
    today = date.today()
    # a bill 10 days ahead is in this period only when the period reaches that far
    soon = today + timedelta(days=10)
    await planned(client, auth, main["id"], "100", soon)
    first = await get(client, auth)  # calendar months
    await client.patch("/api/v1/budget", json={"period_start_day": 28}, headers=auth)
    second = await get(client, auth)
    assert date.fromisoformat(second["period_start"]).day == 28
    assert (
        date.fromisoformat(second["period_start"])
        <= today
        <= date.fromisoformat(second["period_end"])
    )
    assert second["period_end"] != first["period_end"] or today.day == 28
    counted = soon <= date.fromisoformat(second["period_end"])
    assert (dec(second["bills_total"]) == 100) is counted


async def test_each_person_sees_only_their_own(client: AsyncClient, auth, signup: Signup):
    await account(client, auth, "Main", opening="1000")
    other = await signup("other@example.com")
    assert dec((await get(client, other))["balance"]) == 0


async def test_an_account_follows_its_group_until_you_choose(client: AsyncClient, auth):
    wallet = await account(client, auth, "Wallet", "cash", "100")
    savings = await account(client, auth, "Savings", "savings", "1000")
    assert (wallet["spendable"], wallet["counts_as_spendable"]) == (None, True)
    assert (savings["spendable"], savings["counts_as_spendable"]) == (None, False)
    body = await get(client, auth)
    assert [a["name"] for a in body["accounts"]] == ["Wallet"]
    assert [a["name"] for a in body["kept_apart"]] == ["Savings"]


async def test_savings_can_be_everyday_money_and_cash_can_be_kept_apart(client: AsyncClient, auth):
    wallet = await account(client, auth, "Wallet", "cash", "100")
    savings = await account(client, auth, "Savings", "savings", "1000")
    res = await client.patch(f"{ACC}/{savings['id']}", json={"spendable": True}, headers=auth)
    assert res.status_code == 200, res.text
    assert res.json()["counts_as_spendable"] is True
    res = await client.patch(f"{ACC}/{wallet['id']}", json={"spendable": False}, headers=auth)
    assert res.json()["counts_as_spendable"] is False

    body = await get(client, auth)
    assert [a["name"] for a in body["accounts"]] == ["Savings"]
    assert [a["name"] for a in body["kept_apart"]] == ["Wallet"]
    assert dec(body["balance"]) == 1000

    # null goes back to what the group says
    res = await client.patch(f"{ACC}/{savings['id']}", json={"spendable": None}, headers=auth)
    assert (res.json()["spendable"], res.json()["counts_as_spendable"]) == (None, False)


async def test_a_bill_from_an_account_kept_apart_is_not_counted(client: AsyncClient, auth):
    wallet = await account(client, auth, "Wallet", "cash", "100")
    savings = await account(client, auth, "Savings", "savings", "1000", spendable=True)
    await client.patch(f"{ACC}/{wallet['id']}", json={"spendable": False}, headers=auth)
    await planned(client, auth, wallet["id"], "40", date.today())
    await planned(client, auth, savings["id"], "70", date.today())
    body = await get(client, auth)
    assert dec(body["bills_total"]) == 70  # only the one paid from everyday money
    assert dec(body["available"]) == 930


async def test_a_goal_still_keeps_its_account_apart(client: AsyncClient, auth):
    savings = await account(client, auth, "Savings", "savings", "1000", spendable=True)
    res = await client.post(
        GOALS,
        json={"name": "Fund", "target_amount": "5000", "account_id": savings["id"]},
        headers=auth,
    )
    assert res.status_code == 201, res.text
    body = await get(client, auth)
    assert body["accounts"] == []
    assert [a["name"] for a in body["kept_apart"]] == ["Savings"]


async def test_what_is_owed_cannot_be_everyday_money(client: AsyncClient, auth):
    res = await client.post(
        ACC,
        json={"name": "Visa", "group": "card", "currency": "MVR", "spendable": True},
        headers=auth,
    )
    assert res.status_code == 422
    card = await account(client, auth, "Visa", "card")
    res = await client.patch(f"{ACC}/{card['id']}", json={"spendable": True}, headers=auth)
    assert res.status_code == 422


async def test_moving_an_account_to_what_is_owed_drops_the_choice(client: AsyncClient, auth):
    savings = await account(client, auth, "Savings", "savings", "0", spendable=True)
    res = await client.patch(f"{ACC}/{savings['id']}", json={"group": "loan"}, headers=auth)
    assert res.status_code == 200, res.text
    assert (res.json()["spendable"], res.json()["counts_as_spendable"]) == (None, False)
