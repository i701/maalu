from datetime import UTC, date, datetime, timedelta

import pytest
from app import jobs
from app.models import Notification
from app.services import notification as notifications
from httpx import AsyncClient
from sqlalchemy import select, update

from tests.conftest import Signup

URL = "/api/v1/notifications"
TX = "/api/v1/transactions"
SUBS = "/api/v1/subscriptions"
BUDGET = "/api/v1/budget"
GOALS = "/api/v1/goals"
TODAY = date.today()


@pytest.fixture(autouse=True)
def look_every_time(monkeypatch):
    """Looking for notifications is throttled; these tests want it on every call."""
    monkeypatch.setattr(notifications, "SYNC_EVERY_SECONDS", 0)


async def listed(client, auth, **params) -> list[dict]:
    resp = await client.get(URL, params=params, headers=auth)
    assert resp.status_code == 200, resp.text
    return resp.json()


async def unread(client, auth) -> int:
    return (await client.get(f"{URL}/unread-count", headers=auth)).json()["count"]


async def subscription(client, auth, start: date, **extra) -> dict:
    body = {
        "name": "Netflix",
        "amount": "99.00",
        "payment_method": "debit_card",
        "category": "Entertainment",
        "interval_unit": "month",
        "start_date": start.isoformat(),
        **extra,
    }
    resp = await client.post(SUBS, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def spend(client, auth, category: str, amount: str):
    body = {
        "type": "expense",
        "amount": amount,
        "payment_method": "cash",
        "category": category,
        "transaction_date": TODAY.isoformat(),
    }
    assert (await client.post(TX, json=body, headers=auth)).status_code == 201


async def budget_line(client, auth, name: str, category: str, amount: str):
    cats = (await client.get("/api/v1/categories", headers=auth)).json()
    ids = [c["id"] for c in cats if c["name"] == category]
    resp = await client.post(
        f"{BUDGET}/lines",
        json={"name": name, "category_ids": ids, "amount": amount},
        headers=auth,
    )
    assert resp.status_code == 201, resp.text


async def test_a_payment_due_soon_is_a_notification(client: AsyncClient, auth):
    await subscription(client, auth, TODAY + timedelta(days=2))
    found = await listed(client, auth)
    assert len(found) == 1
    n = found[0]
    assert n["kind"] == "payment_due"
    assert n["title"] == "Netflix is due in 2 days"
    assert n["body"] == "MVR 99.00"
    assert n["link"] == "/transactions"
    assert n["read_at"] is None
    assert await unread(client, auth) == 1


async def test_looking_again_does_not_repeat_it(client: AsyncClient, auth):
    await subscription(client, auth, TODAY + timedelta(days=1))
    for _ in range(3):
        await listed(client, auth)
        await unread(client, auth)
    assert len(await listed(client, auth)) == 1


async def test_a_payment_far_away_is_not_news_yet(client: AsyncClient, auth):
    await subscription(client, auth, TODAY + timedelta(days=20))
    assert await listed(client, auth) == []


async def test_an_overdue_payment_gets_its_own_notification(client: AsyncClient, auth):
    await subscription(client, auth, TODAY - timedelta(days=4))
    found = await listed(client, auth)
    assert [n["kind"] for n in found] == ["payment_overdue"]
    assert found[0]["title"] == "Netflix was due 4 days ago"


async def test_due_then_overdue_makes_two_over_time(client: AsyncClient, auth):
    await subscription(client, auth, TODAY + timedelta(days=1))
    await listed(client, auth)
    # a day or two later the same payment is overdue: that is a new event
    async with client.session_factory() as db:
        from app.models import Transaction

        await db.execute(update(Transaction).values(transaction_date=TODAY - timedelta(days=2)))
        await db.commit()
    kinds = sorted(n["kind"] for n in await listed(client, auth))
    assert kinds == ["payment_due", "payment_overdue"]


async def test_a_budget_limit_close_and_then_over(client: AsyncClient, auth):
    await spend(client, auth, "Food", "1")
    await budget_line(client, auth, "Groceries", "Food", "100")
    assert await listed(client, auth) == []

    await spend(client, auth, "Food", "84")  # 85 of 100, past the 80% warning
    warn = await listed(client, auth)
    assert [n["kind"] for n in warn] == ["budget_warning"]
    assert warn[0]["title"] == "Groceries is 85% used"
    assert warn[0]["link"] == "/budget"

    await spend(client, auth, "Food", "30")
    kinds = sorted(n["kind"] for n in await listed(client, auth))
    assert kinds == ["budget_over", "budget_warning"]


async def test_a_goal_reached_is_told_once(client: AsyncClient, auth):
    goal = (
        await client.post(GOALS, json={"name": "Trip", "target_amount": "100"}, headers=auth)
    ).json()
    assert await listed(client, auth) == []
    await client.post(f"{GOALS}/{goal['id']}/entries", json={"amount": "100"}, headers=auth)
    found = await listed(client, auth)
    assert [n["title"] for n in found] == ["Goal reached: Trip"]
    assert len(await listed(client, auth)) == 1


async def test_switching_a_kind_off_stops_new_ones(client: AsyncClient, auth):
    await client.patch("/api/v1/users/me", json={"notify_payments": False}, headers=auth)
    await subscription(client, auth, TODAY + timedelta(days=1))
    assert await listed(client, auth) == []
    me = (await client.get("/api/v1/users/me", headers=auth)).json()
    assert me["notify_payments"] is False
    assert me["notify_budget"] is True

    await client.patch("/api/v1/users/me", json={"notify_payments": True}, headers=auth)
    assert len(await listed(client, auth)) == 1


async def test_read_read_all_and_unread_only(client: AsyncClient, auth):
    await subscription(client, auth, TODAY + timedelta(days=1))
    await subscription(client, auth, TODAY + timedelta(days=2), name="Spotify")
    first, _second = await listed(client, auth)
    assert await unread(client, auth) == 2

    read = await client.post(f"{URL}/{first['id']}/read", headers=auth)
    assert read.status_code == 200
    assert read.json()["read_at"] is not None
    assert await unread(client, auth) == 1
    assert len(await listed(client, auth, unread=True)) == 1
    assert len(await listed(client, auth)) == 2

    done = await client.post(f"{URL}/read-all", headers=auth)
    assert done.json() == {"count": 0}
    assert await unread(client, auth) == 0
    assert await listed(client, auth, unread=True) == []


async def test_a_dismissed_notification_stays_gone(client: AsyncClient, auth):
    await subscription(client, auth, TODAY + timedelta(days=1))
    n = (await listed(client, auth))[0]
    assert (await client.delete(f"{URL}/{n['id']}", headers=auth)).status_code == 204
    for _ in range(2):  # looking again does not announce the same event
        assert await listed(client, auth) == []
        assert await unread(client, auth) == 0
    # and it can no longer be found to read or dismiss again
    assert (await client.post(f"{URL}/{n['id']}/read", headers=auth)).status_code == 404
    assert (await client.delete(f"{URL}/{n['id']}", headers=auth)).status_code == 404


async def test_notifications_are_private(client: AsyncClient, auth, signup: Signup):
    await subscription(client, auth, TODAY + timedelta(days=1))
    n = (await listed(client, auth))[0]
    other = await signup("bob@example.com")
    assert await listed(client, other) == []
    assert (await client.post(f"{URL}/{n['id']}/read", headers=other)).status_code == 404
    assert (await client.delete(f"{URL}/{n['id']}", headers=other)).status_code == 404


async def test_looking_is_throttled(client: AsyncClient, auth, monkeypatch):
    monkeypatch.setattr(notifications, "SYNC_EVERY_SECONDS", 300)
    assert await listed(client, auth) == []  # looks now
    await subscription(client, auth, TODAY + timedelta(days=1))
    assert await listed(client, auth) == []  # not looked at again for a few minutes
    notifications._last_sync.clear()
    assert len(await listed(client, auth)) == 1


async def test_a_new_transaction_ends_the_wait_for_the_next_look(
    client: AsyncClient, auth, monkeypatch
):
    monkeypatch.setattr(notifications, "SYNC_EVERY_SECONDS", 300)
    assert await listed(client, auth) == []  # looks now, and is then left alone for a while
    res = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": "10",
            "payment_method": "cash",
            "category": "Bills",
            "description": "Due now",
            "transaction_date": TODAY.isoformat(),
            "planned": True,
        },
        headers=auth,
    )
    assert res.status_code == 201, res.text
    assert len(await listed(client, auth)) == 1  # the new planned payment is noticed at once


async def test_the_daily_job_looks_for_everyone_and_sweeps_old_ones(
    client: AsyncClient, auth, signup: Signup
):
    other = await signup("bob@example.com")
    await subscription(client, auth, TODAY + timedelta(days=1))
    await subscription(client, other, TODAY + timedelta(days=2))

    made, swept = await jobs.generate_notifications(client.session_factory)
    assert (made, swept) == (2, 0)
    assert await jobs.generate_notifications(client.session_factory) == (0, 0)

    async with client.session_factory() as db:
        await db.execute(
            update(Notification).values(created_at=datetime.now(UTC) - timedelta(days=120))
        )
        await db.commit()
    assert (await jobs.generate_notifications(client.session_factory))[1] == 2
    async with client.session_factory() as db:
        assert (await db.scalars(select(Notification))).all() == []


async def test_the_job_is_scheduled():
    assert any(task.name == "generate_notifications" for task in jobs.app.tasks.values())


async def test_the_switches_are_in_a_backup(client: AsyncClient, auth, signup: Signup):
    await client.patch(
        "/api/v1/users/me", json={"notify_budget": False, "notify_goals": False}, headers=auth
    )
    backup = (await client.get("/api/v1/backup", headers=auth)).content
    fresh = await signup("restore@example.com")
    resp = await client.post("/api/v1/backup/restore", content=backup, headers=fresh)
    assert resp.status_code == 200, resp.text
    me = (await client.get("/api/v1/users/me", headers=fresh)).json()
    assert (me["notify_payments"], me["notify_budget"], me["notify_goals"]) == (True, False, False)


async def test_a_salary_split_waiting_is_a_notification(client: AsyncClient, auth):
    acc = (
        await client.post(
            "/api/v1/accounts",
            json={"name": "Main", "group": "accounts", "currency": "MVR", "opening_amount": "0"},
            headers=auth,
        )
    ).json()
    other = (
        await client.post(
            "/api/v1/accounts",
            json={"name": "Save", "group": "savings", "currency": "MVR", "opening_amount": "0"},
            headers=auth,
        )
    ).json()
    rule = await client.post(
        "/api/v1/salary-rules",
        json={"mode": "percent", "value": "20", "account_id": other["id"]},
        headers=auth,
    )
    assert rule.status_code == 201, rule.text
    pay = await client.post(
        TX,
        json={
            "type": "income",
            "amount": "10000",
            "payment_method": "bank_transfer",
            "category": "Salary",
            "account_id": acc["id"],
            "transaction_date": TODAY.isoformat(),
        },
        headers=auth,
    )
    assert pay.status_code == 201, pay.text
    found = [n for n in await listed(client, auth) if n["kind"] == "split_waiting"]
    assert len(found) == 1
    assert found[0]["link"] == "/pending"
    assert found[0]["body"] == "Your salary of MVR 10,000.00 is ready to be split"
    # once it is split, the notification stays (it was news) and is not made again
    await listed(client, auth)
    assert len([n for n in await listed(client, auth) if n["kind"] == "split_waiting"]) == 1


async def test_the_money_running_out_is_a_notification_naming_the_bill(client: AsyncClient, auth):
    acc = (
        await client.post(
            "/api/v1/accounts",
            json={"name": "Main", "group": "accounts", "currency": "MVR", "opening_amount": "1000"},
            headers=auth,
        )
    ).json()
    for description, amount in (("Rent", "800"), ("Wifi", "400")):
        res = await client.post(
            TX,
            json={
                "type": "expense",
                "amount": amount,
                "payment_method": "bank_transfer",
                "category": "Bills",
                "description": description,
                "account_id": acc["id"],
                "transaction_date": TODAY.isoformat(),
                "planned": True,
            },
            headers=auth,
        )
        assert res.status_code == 201, res.text
    found = [n for n in await listed(client, auth) if n["kind"] == "money_short"]
    assert len(found) == 1
    assert found[0]["title"] == "The money runs out at Wifi"  # 1,000 less 800 less 400
    assert found[0]["body"].startswith("Short by MVR 200.00")
    assert found[0]["link"] == "/plan"
    # looking again does not repeat it
    assert len([n for n in await listed(client, auth) if n["kind"] == "money_short"]) == 1


async def test_enough_money_for_the_bills_is_no_notification(client: AsyncClient, auth):
    acc = (
        await client.post(
            "/api/v1/accounts",
            json={"name": "Main", "group": "accounts", "currency": "MVR", "opening_amount": "5000"},
            headers=auth,
        )
    ).json()
    await client.post(
        TX,
        json={
            "type": "expense",
            "amount": "800",
            "payment_method": "bank_transfer",
            "category": "Bills",
            "account_id": acc["id"],
            "transaction_date": TODAY.isoformat(),
            "planned": True,
        },
        headers=auth,
    )
    assert not [n for n in await listed(client, auth) if n["kind"] == "money_short"]
