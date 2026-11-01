from datetime import date, timedelta
from decimal import Decimal

from app import jobs
from app.models import Subscription, Transaction
from httpx import AsyncClient
from sqlalchemy import delete, select, update

from tests.conftest import Signup

SUBS = "/api/v1/subscriptions"
TX = "/api/v1/transactions"
ACCOUNTS = "/api/v1/accounts"

TODAY = date.today()


def iso(day: date) -> str:
    return day.isoformat()


def sub_body(start: date, **overrides) -> dict:
    return {
        "name": "Netflix",
        "amount": "99.00",
        "payment_method": "debit_card",
        "category": "Entertainment",
        "interval_unit": "month",
        "start_date": iso(start),
        **overrides,
    }


async def make_sub(client, auth, start: date, **overrides) -> dict:
    resp = await client.post(SUBS, json=sub_body(start, **overrides), headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def upcoming(client, auth) -> list[dict]:
    resp = await client.get(TX, params={"planned": True}, headers=auth)
    assert resp.status_code == 200, resp.text
    return resp.json()


async def make_account(client, auth, **overrides) -> dict:
    body = {"group": "cash", "name": "Wallet", "opening_amount": "1000", **overrides}
    resp = await client.post(ACCOUNTS, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_a_new_subscription_gets_its_next_payment_planned(client: AsyncClient, auth):
    due = TODAY + timedelta(days=3)
    sub = await make_sub(client, auth, due)

    planned = await upcoming(client, auth)
    assert len(planned) == 1
    p = planned[0]
    assert p["planned"] is True
    assert p["transaction_date"] == iso(due)
    assert Decimal(p["amount"]) == Decimal("99")
    assert p["type"] == "expense"
    assert p["category"] == "Entertainment"
    assert p["description"] == "Netflix"
    assert p["subscription"] == {"id": sub["id"], "name": "Netflix"}


async def test_planning_is_idempotent(client: AsyncClient, auth):
    await make_sub(client, auth, TODAY + timedelta(days=3))
    for _ in range(3):
        assert len(await upcoming(client, auth)) == 1
        await client.get(SUBS, headers=auth)
    assert len(await upcoming(client, auth)) == 1


async def test_a_planned_payment_counts_toward_nothing(client: AsyncClient, auth):
    account = await make_account(client, auth)
    await make_sub(client, auth, TODAY + timedelta(days=3), account_id=account["id"])
    await upcoming(client, auth)
    after = (await client.get(f"{ACCOUNTS}/{account['id']}", headers=auth)).json()
    assert Decimal(after["balance"]) == Decimal("1000")


async def test_only_the_next_cycle_is_planned_even_when_behind(client: AsyncClient, auth):
    start = TODAY - timedelta(days=100)  # three or four cycles ago, nothing paid
    sub = await make_sub(client, auth, start)
    planned = await upcoming(client, auth)
    assert [p["transaction_date"] for p in planned] == [iso(start)]
    assert (await client.get(f"{SUBS}/{sub['id']}", headers=auth)).json()["is_overdue"] is True


async def test_far_away_payments_are_not_planned_yet(client: AsyncClient, auth):
    await make_sub(client, auth, TODAY + timedelta(days=200), interval_unit="year")
    assert await upcoming(client, auth) == []


async def test_marking_it_paid_plans_the_following_cycle(client: AsyncClient, auth):
    sub = await make_sub(client, auth, TODAY - timedelta(days=2))
    first = (await upcoming(client, auth))[0]
    resp = await client.post(f"{TX}/{first['id']}/post", headers=auth)
    assert resp.status_code == 200
    assert resp.json()["planned"] is False

    after = (await client.get(f"{SUBS}/{sub['id']}", headers=auth)).json()
    assert after["last_paid_date"] == iso(TODAY - timedelta(days=2))
    planned = await upcoming(client, auth)
    assert len(planned) == 1
    assert planned[0]["id"] != first["id"]
    assert planned[0]["transaction_date"] == after["next_due_date"]


async def test_deleting_a_planned_payment_skips_that_cycle(client: AsyncClient, auth):
    start = TODAY + timedelta(days=3)
    sub = await make_sub(client, auth, start)
    first = (await upcoming(client, auth))[0]
    assert (await client.delete(f"{TX}/{first['id']}", headers=auth)).status_code == 204

    # the skipped cycle does not come back; the following one is further than the horizon here
    again = await upcoming(client, auth)
    assert all(p["transaction_date"] != iso(start) for p in again)
    assert (await upcoming(client, auth)) == again  # and it stays that way

    after = (await client.get(f"{SUBS}/{sub['id']}", headers=auth)).json()
    assert after["last_paid_date"] is None  # nothing was paid


async def test_skipping_when_the_next_one_is_close_plans_it(client: AsyncClient, auth):
    start = TODAY - timedelta(days=1)  # the next cycle is about a month away: inside the horizon
    await make_sub(client, auth, start)
    first = (await upcoming(client, auth))[0]
    await client.delete(f"{TX}/{first['id']}", headers=auth)
    planned = await upcoming(client, auth)
    assert len(planned) == 1
    assert planned[0]["transaction_date"] > iso(start)


async def test_a_payment_made_by_hand_retires_the_planned_one(client: AsyncClient, auth):
    due = TODAY - timedelta(days=1)
    sub = await make_sub(client, auth, due)
    assert len(await upcoming(client, auth)) == 1
    paid = {
        "type": "expense",
        "amount": "99",
        "payment_method": "cash",
        "category": "Entertainment",
        "transaction_date": iso(due),
        "subscription_id": sub["id"],
    }
    assert (await client.post(TX, json=paid, headers=auth)).status_code == 201

    planned = await upcoming(client, auth)
    assert len(planned) == 1  # the old one is gone and the following cycle is planned
    assert planned[0]["transaction_date"] > iso(due)
    trash = (await client.get(f"{TX}/trash", headers=auth)).json()
    assert len(trash) == 1


async def test_a_paused_subscription_plans_nothing_and_clears_what_it_had(
    client: AsyncClient, auth
):
    sub = await make_sub(client, auth, TODAY + timedelta(days=3))
    assert len(await upcoming(client, auth)) == 1
    resp = await client.patch(f"{SUBS}/{sub['id']}", json={"status": "paused"}, headers=auth)
    assert resp.status_code == 200
    assert await upcoming(client, auth) == []
    await client.get(SUBS, headers=auth)
    assert await upcoming(client, auth) == []

    # resuming plans it again
    await client.patch(f"{SUBS}/{sub['id']}", json={"status": "active"}, headers=auth)
    assert len(await upcoming(client, auth)) == 1


async def test_editing_the_amount_updates_the_planned_payment(client: AsyncClient, auth):
    sub = await make_sub(client, auth, TODAY + timedelta(days=3))
    before = (await upcoming(client, auth))[0]
    await client.patch(f"{SUBS}/{sub['id']}", json={"amount": "120"}, headers=auth)
    planned = await upcoming(client, auth)
    assert len(planned) == 1
    assert planned[0]["id"] == before["id"]  # edited in place
    assert Decimal(planned[0]["amount"]) == Decimal("120")


async def test_renaming_keeps_a_planned_amount_you_adjusted(client: AsyncClient, auth):
    sub = await make_sub(client, auth, TODAY + timedelta(days=3))
    planned = (await upcoming(client, auth))[0]
    await client.patch(f"{TX}/{planned['id']}", json={"amount": "105"}, headers=auth)
    await client.patch(f"{SUBS}/{sub['id']}", json={"name": "Netflix HD"}, headers=auth)
    after = (await upcoming(client, auth))[0]
    assert Decimal(after["amount"]) == Decimal("105")
    assert after["description"] == "Netflix HD"


async def test_changing_the_schedule_starts_over(client: AsyncClient, auth):
    sub = await make_sub(client, auth, TODAY + timedelta(days=3))
    new_start = TODAY + timedelta(days=10)
    await client.patch(f"{SUBS}/{sub['id']}", json={"start_date": iso(new_start)}, headers=auth)
    planned = await upcoming(client, auth)
    assert [p["transaction_date"] for p in planned] == [iso(new_start)]


async def test_the_account_is_used_and_must_match_the_currency(client: AsyncClient, auth):
    account = await make_account(client, auth)  # MVR
    sub = await make_sub(client, auth, TODAY + timedelta(days=3), account_id=account["id"])
    assert sub["account"]["id"] == account["id"]
    assert (await upcoming(client, auth))[0]["account"]["id"] == account["id"]

    usd = {**sub_body(TODAY), "currency": "USD", "exchange_rate": "15", "account_id": account["id"]}
    bad = await client.post(SUBS, json=usd, headers=auth)
    assert bad.status_code == 422
    assert "MVR" in bad.text


async def test_an_account_sets_the_currency_when_none_is_given(client: AsyncClient, auth):
    usd_account = await make_account(
        client, auth, name="Dollars", currency="USD", exchange_rate="15.4"
    )
    sub = await make_sub(client, auth, TODAY + timedelta(days=3), account_id=usd_account["id"])
    assert sub["currency"] == "USD"
    assert Decimal(sub["exchange_rate"]) == Decimal("15.4")
    assert Decimal(sub["base_amount"]) == Decimal("99") * Decimal("15.4")


async def test_archived_and_foreign_accounts_are_refused(client: AsyncClient, auth, signup: Signup):
    account = await make_account(client, auth)
    await client.post(f"{ACCOUNTS}/{account['id']}/archive", headers=auth)
    resp = await client.post(SUBS, json=sub_body(TODAY, account_id=account["id"]), headers=auth)
    assert resp.status_code == 422

    other = await signup("bob@example.com")
    theirs = await make_account(client, other)
    resp = await client.post(SUBS, json=sub_body(TODAY, account_id=theirs["id"]), headers=auth)
    assert resp.status_code == 422


async def test_unlinking_the_account_moves_the_planned_payment_out_of_it(client: AsyncClient, auth):
    account = await make_account(client, auth)
    sub = await make_sub(client, auth, TODAY + timedelta(days=3), account_id=account["id"])
    await upcoming(client, auth)
    resp = await client.patch(f"{SUBS}/{sub['id']}", json={"account_id": None}, headers=auth)
    assert resp.status_code == 200
    assert resp.json()["account"] is None
    assert (await upcoming(client, auth))[0]["account"] is None


async def test_the_daily_job_plans_for_everyone(client: AsyncClient, auth, signup: Signup):
    other = await signup("bob@example.com")
    await make_sub(client, auth, TODAY + timedelta(days=3))
    await make_sub(client, other, TODAY + timedelta(days=4), name="Spotify")

    # forget both plans, as if the subscriptions had been made before planning existed
    async with client.session_factory() as db:
        await db.execute(delete(Transaction))
        await db.execute(update(Subscription).values(planned_through=None))
        await db.commit()
    assert await jobs.plan_subscriptions(client.session_factory) == 2
    assert await jobs.plan_subscriptions(client.session_factory) == 0  # nothing more to plan
    async with client.session_factory() as db:
        names = sorted((await db.scalars(select(Transaction.description))).all())
    assert names == ["Netflix", "Spotify"]


async def test_the_planning_job_is_scheduled():
    assert any(task.name == "plan_subscriptions" for task in jobs.app.tasks.values())
