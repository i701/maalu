from datetime import date, timedelta
from decimal import Decimal

from app import jobs
from app.models import BalanceSnapshot, SnapshotDirty
from app.services import snapshot as snapshots
from httpx import AsyncClient
from sqlalchemy import func, select

from tests.test_stats import ACC, STATS, TX, account, money

TODAY = snapshots._today()


def days_ago(n: int) -> date:
    return TODAY - timedelta(days=n)


def pass_days(monkeypatch, n: int) -> date:
    """Move the clock `n` days on, as if that long had passed (accounts made so far are n days
    old). Returns the new today."""
    new = TODAY + timedelta(days=n)
    monkeypatch.setattr(snapshots, "_today", lambda: new)
    return new


async def trend(client: AsyncClient, auth, start: date, end: date) -> dict[str, Decimal]:
    resp = await client.get(
        f"{STATS}/balance-trend",
        params={"from": start.isoformat(), "to": end.isoformat()},
        headers=auth,
    )
    assert resp.status_code == 200, resp.text
    return {p["date"]: Decimal(p["total"]) for p in resp.json()["points"]}


async def count(client, model=BalanceSnapshot) -> int:
    async with client.session_factory() as db:
        return await db.scalar(select(func.count()).select_from(model))


async def test_reading_the_trend_builds_snapshots_for_completed_days(client, auth):
    acc = await account(client, auth, "Wallet", opening_amount="100")
    await money(client, auth, "expense", "30", days_ago(5), account_id=acc["id"])
    points = await trend(client, auth, days_ago(7), TODAY)
    assert points[days_ago(6).isoformat()] == 100
    assert points[days_ago(5).isoformat()] == 70
    assert points[TODAY.isoformat()] == 70
    # a row for every completed day from the first transaction through yesterday, not for today
    assert await count(client) == 5
    async with client.session_factory() as db:
        last = await db.scalar(select(func.max(BalanceSnapshot.day)))
    assert str(last) == days_ago(1).isoformat()


async def test_an_older_transaction_rewrites_the_days_after_it(client, auth):
    acc = await account(client, auth, "Wallet", opening_amount="100")
    await trend(client, auth, days_ago(10), TODAY)  # builds the snapshots
    await money(client, auth, "expense", "40", days_ago(4), account_id=acc["id"])
    assert await count(client, SnapshotDirty) == 1
    points = await trend(client, auth, days_ago(10), TODAY)
    assert points[days_ago(5).isoformat()] == 100
    assert points[days_ago(4).isoformat()] == 60
    assert points[days_ago(1).isoformat()] == 60
    assert await count(client, SnapshotDirty) == 0


async def test_a_transaction_today_marks_nothing(client, auth):
    acc = await account(client, auth, "Wallet", opening_amount="100")
    await trend(client, auth, days_ago(3), TODAY)
    await money(client, auth, "expense", "10", TODAY, account_id=acc["id"])
    assert await count(client, SnapshotDirty) == 0
    assert (await trend(client, auth, days_ago(3), TODAY))[TODAY.isoformat()] == 90


async def test_revaluing_an_account_keeps_the_rates_of_past_days(client, auth, monkeypatch):
    acc = await account(
        client, auth, "Euro", currency="EUR", exchange_rate="17", opening_amount="10"
    )
    today = pass_days(monkeypatch, 3)
    await jobs.snapshot_balances(client.session_factory)  # the days so far, at 17

    resp = await client.patch(f"{ACC}/{acc['id']}", json={"exchange_rate": "20"}, headers=auth)
    assert resp.status_code == 200, resp.text
    after = await trend(client, auth, today - timedelta(days=3), today)
    # the past stays at the rate it had; today is worth the new rate
    assert after[(today - timedelta(days=1)).isoformat()] == 170
    assert after[today.isoformat()] == 200


async def test_a_rebuild_keeps_each_days_rate(client, auth, monkeypatch):
    acc = await account(
        client, auth, "Euro", currency="EUR", exchange_rate="17", opening_amount="10"
    )
    today = pass_days(monkeypatch, 6)
    await jobs.snapshot_balances(client.session_factory)
    await client.patch(f"{ACC}/{acc['id']}", json={"exchange_rate": "20"}, headers=auth)
    # a forgotten purchase from five days ago: every day after it changes, still valued at 17
    await money(
        client,
        auth,
        "expense",
        "4",
        today - timedelta(days=5),
        account_id=acc["id"],
        currency="EUR",
        exchange_rate="1",
    )
    points = await trend(client, auth, today - timedelta(days=6), today)
    assert points[(today - timedelta(days=5)).isoformat()] == 6 * 17
    assert points[(today - timedelta(days=1)).isoformat()] == 6 * 17
    assert points[today.isoformat()] == 6 * 20


async def test_removing_the_only_transaction_removes_its_days(client, auth):
    acc = await account(client, auth, "Wallet", opening_amount="100")
    t = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": "30",
            "payment_method": "cash",
            "category": "Misc",
            "transaction_date": days_ago(8).isoformat(),
            "account_id": acc["id"],
        },
        headers=auth,
    )
    await trend(client, auth, days_ago(9), TODAY)
    assert await client.delete(f"{TX}/{t.json()['id']}", headers=auth)
    points = await trend(client, auth, days_ago(9), TODAY)
    assert set(points.values()) == {Decimal(100)}


async def test_archived_accounts_stay_out_of_the_trend(client, auth):
    acc = await account(client, auth, "Old", opening_amount="50")
    await trend(client, auth, days_ago(3), TODAY)
    await client.post(f"{ACC}/{acc['id']}/archive", headers=auth)
    assert set((await trend(client, auth, days_ago(3), TODAY)).values()) == {Decimal(0)}


async def test_the_daily_job_catches_up_every_account(client, auth, signup, monkeypatch):
    other = await signup("second@example.com")
    await account(client, auth, "A", opening_amount="10")
    await account(client, other, "B", opening_amount="20")
    pass_days(monkeypatch, 3)
    await jobs.snapshot_balances(client.session_factory)
    first = await count(client)
    assert first == 6  # three days for each of the two accounts

    # a day later each account gets one more row, and running it again changes nothing
    pass_days(monkeypatch, 4)
    await jobs.snapshot_balances(client.session_factory)
    await jobs.snapshot_balances(client.session_factory)
    assert await count(client) == first + 2


async def test_snapshots_go_with_their_account(client, auth, monkeypatch):
    acc = await account(client, auth, "Gone", opening_amount="5")
    pass_days(monkeypatch, 3)
    await jobs.snapshot_balances(client.session_factory)
    assert await count(client) == 3
    assert (await client.delete(f"{ACC}/{acc['id']}", headers=auth)).status_code == 204
    assert await count(client) == 0
    assert await count(client, SnapshotDirty) == 0
