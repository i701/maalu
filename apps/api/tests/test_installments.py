from datetime import date, timedelta

import pytest
from app.services import notification as notifications
from httpx import AsyncClient

from tests.conftest import Signup

SUBS = "/api/v1/subscriptions"
TX = "/api/v1/transactions"
NOTES = "/api/v1/notifications"
TODAY = date.today()


@pytest.fixture(autouse=True)
def look_every_time(monkeypatch):
    monkeypatch.setattr(notifications, "SYNC_EVERY_SECONDS", 0)


async def make(client, auth, start: date, **extra) -> dict:
    body = {
        "name": "Phone plan",
        "amount": "100.00",
        "payment_method": "debit_card",
        "category": "Phone",
        "interval_unit": "month",
        "start_date": start.isoformat(),
        **extra,
    }
    resp = await client.post(SUBS, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def get(client, auth, sub: dict) -> dict:
    return (await client.get(f"{SUBS}/{sub['id']}", headers=auth)).json()


async def upcoming(client, auth) -> list[dict]:
    return (await client.get(TX, params={"planned": True}, headers=auth)).json()


async def pay_next(client, auth) -> None:
    """Mark the planned payment as paid, as the Upcoming card does."""
    first = (await upcoming(client, auth))[0]
    resp = await client.post(f"{TX}/{first['id']}/post", headers=auth)
    assert resp.status_code == 200, resp.text


async def notes(client, auth, **params) -> list[dict]:
    return (await client.get(NOTES, params=params, headers=auth)).json()


# --- installments --------------------------------------------------------------------------


async def test_an_installment_plan_counts_down(client: AsyncClient, auth):
    sub = await make(client, auth, TODAY - timedelta(days=2), installments_total=3)
    assert sub["installments_total"] == 3
    assert sub["payments_made"] == 0
    assert sub["installments_left"] == 3
    await pay_next(client, auth)
    after = await get(client, auth, sub)
    assert (after["payments_made"], after["installments_left"]) == (1, 2)
    assert after["status"] == "active"


async def test_an_ongoing_subscription_has_no_count(client: AsyncClient, auth):
    sub = await make(client, auth, TODAY + timedelta(days=3))
    assert sub["installments_total"] is None
    assert sub["installments_left"] is None


async def test_the_last_payment_completes_it_and_plans_nothing_more(client: AsyncClient, auth):
    sub = await make(client, auth, TODAY - timedelta(days=95), installments_total=2)
    await pay_next(client, auth)  # the 1st
    await pay_next(client, auth)  # the 2nd (planned after the 1st was paid)
    done = (await client.get(SUBS, headers=auth)).json()[0]
    assert done["status"] == "completed"
    assert done["payments_made"] == 2
    assert done["installments_left"] == 0
    assert done["next_due_date"] is None
    assert await upcoming(client, auth) == []
    assert (await get(client, auth, sub))["status"] == "completed"


async def test_a_completed_plan_is_not_counted_in_the_monthly_cost(client: AsyncClient, auth):
    await make(client, auth, TODAY - timedelta(days=95), installments_total=2, name="Ending")
    await make(client, auth, TODAY + timedelta(days=3), name="Forever")
    await pay_next(client, auth)
    await pay_next(client, auth)
    await client.get(SUBS, headers=auth)  # looks, and completes the first
    summary = (await client.get(f"{SUBS}/summary", headers=auth)).json()
    assert summary["active_count"] == 1


async def test_skipping_an_installment_does_not_use_it_up(client: AsyncClient, auth):
    sub = await make(client, auth, TODAY - timedelta(days=2), installments_total=2)
    first = (await upcoming(client, auth))[0]
    await client.delete(f"{TX}/{first['id']}", headers=auth)  # skipped, not paid
    after = await get(client, auth, sub)
    assert after["payments_made"] == 0
    assert after["installments_left"] == 2  # still two to pay


async def test_a_payment_made_by_hand_counts(client: AsyncClient, auth):
    sub = await make(client, auth, TODAY - timedelta(days=2), installments_total=2)
    paid = {
        "type": "expense",
        "amount": "100",
        "payment_method": "cash",
        "category": "Phone",
        "transaction_date": (TODAY - timedelta(days=2)).isoformat(),
        "subscription_id": sub["id"],
    }
    await client.post(TX, json=paid, headers=auth)
    assert (await get(client, auth, sub))["payments_made"] == 1


async def test_adding_payments_or_removing_the_end_reactivates_it(client: AsyncClient, auth):
    sub = await make(client, auth, TODAY - timedelta(days=100), installments_total=1)
    await pay_next(client, auth)
    assert (await client.get(SUBS, headers=auth)).json()[0]["status"] == "completed"

    more = await client.patch(f"{SUBS}/{sub['id']}", json={"installments_total": 3}, headers=auth)
    assert more.json()["status"] == "active"
    assert more.json()["installments_left"] == 2
    assert len(await upcoming(client, auth)) == 1  # the next one is planned again

    await pay_next(client, auth)
    await pay_next(client, auth)
    assert (await client.get(SUBS, headers=auth)).json()[0]["status"] == "completed"
    forever = await client.patch(
        f"{SUBS}/{sub['id']}", json={"installments_total": None}, headers=auth
    )
    assert forever.json()["status"] == "active"
    assert forever.json()["installments_left"] is None


async def test_lowering_the_total_below_what_was_paid_completes_it(client: AsyncClient, auth):
    sub = await make(client, auth, TODAY - timedelta(days=95), installments_total=5)
    await pay_next(client, auth)
    await pay_next(client, auth)
    resp = await client.patch(f"{SUBS}/{sub['id']}", json={"installments_total": 2}, headers=auth)
    assert resp.json()["status"] == "completed"
    assert await upcoming(client, auth) == []


@pytest.mark.parametrize("bad", [0, -1, 601])
async def test_the_number_of_payments_must_be_sensible(client: AsyncClient, auth, bad):
    body = {
        "name": "X",
        "amount": "1",
        "payment_method": "cash",
        "category": "Y",
        "interval_unit": "month",
        "start_date": TODAY.isoformat(),
        "installments_total": bad,
    }
    assert (await client.post(SUBS, json=body, headers=auth)).status_code == 422


async def test_finishing_a_plan_is_a_notification_once(client: AsyncClient, auth):
    await make(client, auth, TODAY - timedelta(days=2), installments_total=1)
    await pay_next(client, auth)
    await client.get(SUBS, headers=auth)  # completes it
    found = [n for n in await notes(client, auth) if n["kind"] == "installments_done"]
    assert len(found) == 1
    assert found[0]["title"] == "Phone plan: last payment made"
    assert found[0]["link"] == "/subscriptions"
    again = [n for n in await notes(client, auth) if n["kind"] == "installments_done"]
    assert len(again) == 1


async def test_finishing_a_plan_respects_the_payments_switch(client: AsyncClient, auth):
    await client.patch("/api/v1/users/me", json={"notify_payments": False}, headers=auth)
    await make(client, auth, TODAY - timedelta(days=2), installments_total=1)
    await pay_next(client, auth)
    await client.get(SUBS, headers=auth)
    assert [n for n in await notes(client, auth) if n["kind"] == "installments_done"] == []


# --- reminders -----------------------------------------------------------------------------


async def due_notes(client, auth) -> list[dict]:
    return [n for n in await notes(client, auth) if n["kind"] == "payment_due"]


async def test_the_default_reminder_is_three_days(client: AsyncClient, auth):
    sub = await make(client, auth, TODAY + timedelta(days=10))
    assert sub["remind_days_before"] == 3


async def test_a_subscription_can_ask_for_a_longer_lead(client: AsyncClient, auth):
    await make(client, auth, TODAY + timedelta(days=6), remind_days_before=7, name="Insurance")
    found = await due_notes(client, auth)
    assert [n["title"] for n in found] == ["Insurance is due in 6 days"]


async def test_the_default_lead_does_not_reach_six_days(client: AsyncClient, auth):
    await make(client, auth, TODAY + timedelta(days=6), name="Insurance")
    assert await due_notes(client, auth) == []


async def test_zero_means_only_on_the_day(client: AsyncClient, auth):
    await make(client, auth, TODAY + timedelta(days=1), remind_days_before=0, name="Tomorrow")
    await make(client, auth, TODAY, remind_days_before=0, name="Today")
    titles = [n["title"] for n in await due_notes(client, auth)]
    assert titles == ["Today is due today"]


async def test_no_reminder_still_tells_you_when_it_is_overdue(client: AsyncClient, auth):
    await make(client, auth, TODAY + timedelta(days=1), remind_days_before=None, name="Quiet")
    assert await due_notes(client, auth) == []
    await make(client, auth, TODAY - timedelta(days=2), remind_days_before=None, name="Late")
    kinds = [n["kind"] for n in await notes(client, auth)]
    assert kinds == ["payment_overdue"]


async def test_the_reminder_can_be_changed_and_switched_off(client: AsyncClient, auth):
    sub = await make(client, auth, TODAY + timedelta(days=10), name="Gym")
    await client.patch(f"{SUBS}/{sub['id']}", json={"remind_days_before": 14}, headers=auth)
    assert len(await due_notes(client, auth)) == 1
    off = await client.patch(f"{SUBS}/{sub['id']}", json={"remind_days_before": None}, headers=auth)
    assert off.json()["remind_days_before"] is None


async def test_other_planned_payments_keep_the_three_day_rule(client: AsyncClient, auth):
    body = {
        "type": "expense",
        "amount": "50",
        "payment_method": "cash",
        "category": "Rent",
        "transaction_date": (TODAY + timedelta(days=5)).isoformat(),
        "planned": True,
    }
    await client.post(TX, json=body, headers=auth)
    assert await due_notes(client, auth) == []
    body["transaction_date"] = (TODAY + timedelta(days=2)).isoformat()
    await client.post(TX, json=body, headers=auth)
    assert len(await due_notes(client, auth)) == 1


async def test_reminders_are_private(client: AsyncClient, auth, signup: Signup):
    await make(client, auth, TODAY + timedelta(days=1), name="Mine")
    other = await signup("bob@example.com")
    assert await due_notes(client, other) == []
