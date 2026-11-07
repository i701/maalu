from datetime import date, timedelta
from decimal import Decimal

import pytest
from app import card_cycle
from app.services import notification as notifications
from httpx import AsyncClient

ACC = "/api/v1/accounts"
TX = "/api/v1/transactions"
PLAN = "/api/v1/stats/available-to-spend"
NOTES = "/api/v1/notifications"
TODAY = date.today()


def ago(days: int) -> date:
    return TODAY - timedelta(days=days)


@pytest.fixture(autouse=True)
def look_every_time(monkeypatch):
    monkeypatch.setattr(notifications, "SYNC_EVERY_SECONDS", 0)


# --- the date maths -----------------------------------------------------------------------


def test_the_last_close_is_today_or_before():
    assert card_cycle.last_close(date(2026, 11, 20), 15) == date(2026, 11, 15)
    assert card_cycle.last_close(date(2026, 11, 15), 15) == date(2026, 11, 15)
    assert card_cycle.last_close(date(2026, 11, 10), 15) == date(2026, 10, 15)
    assert card_cycle.last_close(date(2027, 1, 3), 20) == date(2026, 12, 20)


def test_a_day_past_the_end_of_a_short_month_lands_on_its_last_day():
    assert card_cycle.last_close(date(2026, 4, 30), 31) == date(2026, 4, 30)
    assert card_cycle.last_close(date(2026, 3, 5), 31) == date(2026, 2, 28)
    assert card_cycle.next_close(date(2026, 1, 31), 31) == date(2026, 2, 28)
    assert card_cycle.next_close(date(2026, 11, 15), 15) == date(2026, 12, 15)


def test_the_payment_is_due_on_the_first_due_day_after_the_close():
    assert card_cycle.due_date(date(2026, 11, 5), 25) == date(2026, 11, 25)
    assert card_cycle.due_date(date(2026, 11, 25), 5) == date(2026, 12, 5)
    assert card_cycle.due_date(date(2026, 12, 20), 3) == date(2027, 1, 3)
    assert card_cycle.due_date(date(2026, 11, 10), 10) == date(2026, 12, 10)


# --- the statement ------------------------------------------------------------------------


async def make(client, auth, name, group="accounts", opening="0", **extra) -> dict:
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


async def spend(client, auth, account, amount, when: date):
    res = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": amount,
            "category": "Shopping",
            "payment_method": "credit_card",
            "account_id": account["id"],
            "transaction_date": when.isoformat(),
        },
        headers=auth,
    )
    assert res.status_code == 201, res.text


async def repay(client, auth, bank, card, amount, when: date):
    res = await client.post(
        TX,
        json={
            "type": "transfer",
            "amount": amount,
            "to_amount": amount,
            "transaction_date": when.isoformat(),
            "account_id": bank["id"],
            "to_account_id": card["id"],
        },
        headers=auth,
    )
    assert res.status_code == 201, res.text


async def visa(client, auth, closed_ago=5, due_in=4, **extra) -> dict:
    """A card whose statement closed `closed_ago` days ago and is due `due_in` days from now."""
    return await make(
        client,
        auth,
        "Visa",
        group="card",
        credit_limit="1000",
        statement_day=ago(closed_ago).day,
        due_day=(TODAY + timedelta(days=due_in)).day,
        **extra,
    )


async def statement(client, auth, card) -> dict:
    res = await client.get(f"{ACC}/{card['id']}/statement", headers=auth)
    assert res.status_code == 200, res.text
    return res.json()


async def test_the_statement_is_what_was_owed_when_it_closed(client: AsyncClient, auth):
    card = await visa(client, auth)
    await spend(client, auth, card, "600", ago(8))  # before the close: on the statement
    await spend(client, auth, card, "100", ago(2))  # after it: the next one
    body = await statement(client, auth, card)
    assert body["closed_on"] == ago(5).isoformat()
    assert body["due_on"] == (TODAY + timedelta(days=4)).isoformat()
    assert body["days_until_due"] == 4
    assert Decimal(body["statement_balance"]) == 600
    assert Decimal(body["spent_since"]) == 100
    assert Decimal(body["remaining"]) == 600
    assert Decimal(body["owed_now"]) == 700
    assert body["state"] == "due"


async def test_a_repayment_after_the_close_comes_off_what_remains(client: AsyncClient, auth):
    bank = await make(client, auth, "Main", opening="5000")
    card = await visa(client, auth)
    await spend(client, auth, card, "600", ago(8))
    await repay(client, auth, bank, card, "250", ago(1))
    body = await statement(client, auth, card)
    assert Decimal(body["paid_since"]) == 250
    assert Decimal(body["remaining"]) == 350
    assert body["state"] == "due"
    await repay(client, auth, bank, card, "350", ago(0))
    body = await statement(client, auth, card)
    assert Decimal(body["remaining"]) == 0
    assert body["state"] == "paid"


async def test_a_payment_before_the_close_does_not_count_twice(client: AsyncClient, auth):
    bank = await make(client, auth, "Main", opening="5000")
    card = await visa(client, auth)
    await spend(client, auth, card, "600", ago(9))
    await repay(client, auth, bank, card, "200", ago(7))  # already off the statement balance
    body = await statement(client, auth, card)
    assert Decimal(body["statement_balance"]) == 400
    assert Decimal(body["paid_since"]) == 0
    assert Decimal(body["remaining"]) == 400


async def test_a_card_with_nothing_owed_at_the_close_has_nothing_to_pay(client: AsyncClient, auth):
    card = await visa(client, auth)
    await spend(client, auth, card, "80", ago(1))
    body = await statement(client, auth, card)
    assert body["state"] == "none"
    assert Decimal(body["statement_balance"]) == 0
    assert Decimal(body["remaining"]) == 0
    assert Decimal(body["owed_now"]) == 80


async def test_it_is_overdue_once_the_due_date_has_passed(client: AsyncClient, auth):
    card = await make(
        client,
        auth,
        "Visa",
        group="card",
        statement_day=ago(12).day,
        due_day=ago(3).day,
    )
    await spend(client, auth, card, "300", ago(15))
    body = await statement(client, auth, card)
    assert body["state"] == "overdue"
    assert body["days_until_due"] == -3
    assert Decimal(body["remaining"]) == 300


async def test_planned_spending_is_not_on_a_statement(client: AsyncClient, auth):
    card = await visa(client, auth)
    await spend(client, auth, card, "600", ago(8))
    res = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": "500",
            "category": "Shopping",
            "payment_method": "credit_card",
            "account_id": card["id"],
            "transaction_date": ago(9).isoformat(),
            "planned": True,
        },
        headers=auth,
    )
    assert res.status_code == 201
    assert Decimal((await statement(client, auth, card))["statement_balance"]) == 600


async def test_all_the_cards_are_listed_soonest_due_first(client: AsyncClient, auth):
    later = await visa(client, auth, due_in=9)
    sooner = await make(
        client,
        auth,
        "Amex",
        group="card",
        statement_day=ago(5).day,
        due_day=(TODAY + timedelta(days=2)).day,
    )
    await make(client, auth, "Plain card", group="card")  # no days set: not listed
    await make(client, auth, "Main")
    res = await client.get(f"{ACC}/statements", headers=auth)
    assert res.status_code == 200
    assert [s["account_id"] for s in res.json()] == [sooner["id"], later["id"]]


async def test_the_account_carries_its_statement_days(client: AsyncClient, auth):
    card = await visa(client, auth)
    assert (card["statement_day"], card["due_day"]) == (ago(5).day, (TODAY + timedelta(days=4)).day)
    res = await client.patch(f"{ACC}/{card['id']}", json={"statement_day": None}, headers=auth)
    assert res.status_code == 200
    assert (res.json()["statement_day"], res.json()["due_day"]) == (None, None)
    res = await client.get(f"{ACC}/{card['id']}/statement", headers=auth)
    assert res.status_code == 422


async def test_the_days_come_as_a_pair_and_only_for_a_credit_card(client: AsyncClient, auth):
    one = await client.post(
        ACC,
        json={"name": "Visa", "group": "card", "currency": "MVR", "statement_day": 5},
        headers=auth,
    )
    assert one.status_code == 422
    assert "both" in one.text
    bank = await client.post(
        ACC,
        json={
            "name": "Main",
            "group": "accounts",
            "currency": "MVR",
            "statement_day": 5,
            "due_day": 25,
        },
        headers=auth,
    )
    assert bank.status_code == 422
    assert "credit cards" in bank.text
    late = await client.post(
        ACC,
        json={
            "name": "Visa",
            "group": "card",
            "currency": "MVR",
            "statement_day": 32,
            "due_day": 1,
        },
        headers=auth,
    )
    assert late.status_code == 422


async def test_moving_a_card_to_another_group_drops_its_days(client: AsyncClient, auth):
    card = await visa(client, auth)
    res = await client.patch(f"{ACC}/{card['id']}", json={"group": "accounts"}, headers=auth)
    assert res.status_code == 200, res.text
    assert (res.json()["statement_day"], res.json()["due_day"]) == (None, None)


async def test_another_persons_card_is_not_found(client: AsyncClient, auth, signup):
    card = await visa(client, auth)
    other = await signup("other@example.com")
    assert (await client.get(f"{ACC}/{card['id']}/statement", headers=other)).status_code == 404
    assert (await client.get(f"{ACC}/statements", headers=other)).json() == []


# --- the month plan -----------------------------------------------------------------------


async def test_a_statement_due_this_period_comes_off_what_is_available(client: AsyncClient, auth):
    await make(client, auth, "Main", opening="1000")
    card = await visa(client, auth, due_in=0)
    await spend(client, auth, card, "300", ago(8))
    await spend(client, auth, card, "50", ago(1))  # next statement: not due yet
    body = (await client.get(PLAN, headers=auth)).json()
    assert [c["title"] for c in body["card_payments"]] == ["Visa"]
    assert Decimal(body["card_payments_total"]) == 300
    assert Decimal(body["available"]) == 700


async def test_a_paid_statement_is_not_asked_for_again(client: AsyncClient, auth):
    bank = await make(client, auth, "Main", opening="1000")
    card = await visa(client, auth, due_in=0)
    await spend(client, auth, card, "300", ago(8))
    await repay(client, auth, bank, card, "300", ago(1))
    body = (await client.get(PLAN, headers=auth)).json()
    assert body["card_payments"] == []
    assert Decimal(body["available"]) == 700


# --- notifications ------------------------------------------------------------------------


async def kinds(client, auth) -> dict[str, dict]:
    res = await client.get(NOTES, headers=auth)
    return {n["kind"]: n for n in res.json()}


async def test_a_payment_due_soon_is_a_notification_with_a_link(client: AsyncClient, auth):
    card = await visa(client, auth, due_in=2)
    await spend(client, auth, card, "300", ago(8))
    found = await kinds(client, auth)
    note = found["card_due"]
    assert note["title"] == "Visa payment is due in 2 days"
    assert note["link"] == f"/accounts/{card['id']}"
    assert "MVR 300.00" in note["body"]


async def test_a_payment_far_off_or_already_made_is_quiet(client: AsyncClient, auth):
    bank = await make(client, auth, "Main", opening="1000")
    far = await visa(client, auth, due_in=10)
    await spend(client, auth, far, "300", ago(8))
    paid = await make(
        client,
        auth,
        "Amex",
        group="card",
        statement_day=ago(5).day,
        due_day=(TODAY + timedelta(days=1)).day,
    )
    await spend(client, auth, paid, "100", ago(8))
    await repay(client, auth, bank, paid, "100", ago(0))
    assert "card_due" not in await kinds(client, auth)


async def test_a_late_payment_says_so(client: AsyncClient, auth):
    card = await make(
        client,
        auth,
        "Visa",
        group="card",
        statement_day=ago(12).day,
        due_day=ago(3).day,
    )
    await spend(client, auth, card, "300", ago(15))
    note = (await kinds(client, auth))["card_overdue"]
    assert note["title"] == "Visa payment was due 3 days ago"


async def test_a_card_close_to_its_limit_is_told_once_a_month(client: AsyncClient, auth):
    card = await visa(client, auth)  # limit 1,000
    await spend(client, auth, card, "950", ago(1))
    first = [n for n in (await client.get(NOTES, headers=auth)).json() if n["kind"] == "card_limit"]
    assert len(first) == 1
    assert first[0]["title"] == "Visa is close to its limit"
    again = [n for n in (await client.get(NOTES, headers=auth)).json() if n["kind"] == "card_limit"]
    assert len(again) == 1


async def test_a_card_well_under_its_limit_is_quiet(client: AsyncClient, auth):
    card = await visa(client, auth)
    await spend(client, auth, card, "400", ago(1))
    assert "card_limit" not in await kinds(client, auth)
