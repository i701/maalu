from datetime import date, timedelta

from httpx import AsyncClient

from tests.conftest import Signup

TX = "/api/v1/transactions"
SUBS = "/api/v1/subscriptions"
CANDIDATES = f"{SUBS}/candidates"
TODAY = date.today()


async def pay(client, auth, vendor, days_ago, amount="99.00", **extra) -> dict:
    res = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": amount,
            "payment_method": "debit_card",
            "category": "Streaming",
            "vendor_name": vendor,
            "transaction_date": (TODAY - timedelta(days=days_ago)).isoformat(),
            **extra,
        },
        headers=auth,
    )
    assert res.status_code == 201, res.text
    return res.json()


async def monthly(client, auth, vendor="Netflix", amount="99.00", months=4):
    return [await pay(client, auth, vendor, 30 * m + 5, amount) for m in range(months, 0, -1)]


async def found(client, auth) -> list[dict]:
    res = await client.get(CANDIDATES, headers=auth)
    assert res.status_code == 200, res.text
    return res.json()


async def test_a_repeating_charge_is_suggested(client: AsyncClient, auth):
    paid = await monthly(client, auth)
    (one,) = await found(client, auth)
    assert one["vendor_name"] == "Netflix"
    assert (one["interval_unit"], one["interval_count"]) == ("month", 1)
    assert one["occurrences"] == 4
    assert one["confidence"] == "high"
    assert one["category"] == "Streaming"
    assert one["payment_method"] == "debit_card"
    assert one["transaction_ids"] == [p["id"] for p in paid]
    assert one["last_date"] == (TODAY - timedelta(days=35)).isoformat()


async def test_nothing_is_made_until_it_is_accepted(client: AsyncClient, auth):
    await monthly(client, auth)
    await found(client, auth)
    assert (await client.get(SUBS, headers=auth)).json() == []


async def test_accepting_makes_the_subscription_and_links_the_payments(client: AsyncClient, auth):
    paid = await monthly(client, auth)
    (one,) = await found(client, auth)
    res = await client.post(
        f"{CANDIDATES}/accept",
        json={"vendor_id": one["vendor_id"], "currency": one["currency"]},
        headers=auth,
    )
    assert res.status_code == 201, res.text
    sub = res.json()
    assert sub["name"] == "Netflix"
    assert sub["interval_unit"] == "month"
    assert sub["payments_made"] == 4  # the four payments already made now belong to it
    assert sub["last_paid_date"] == paid[-1]["transaction_date"]
    # the old payments point at it, and it is no longer suggested
    one_payment = (await client.get(f"{TX}/{paid[0]['id']}", headers=auth)).json()
    assert one_payment["subscription"]["id"] == sub["id"]
    assert await found(client, auth) == []
    # the next payment is planned in its place
    planned = (await client.get(TX, params={"planned": "true"}, headers=auth)).json()
    assert any(t["subscription"] and t["subscription"]["id"] == sub["id"] for t in planned)


async def test_what_the_person_changed_is_used(client: AsyncClient, auth):
    await monthly(client, auth)
    (one,) = await found(client, auth)
    res = await client.post(
        f"{CANDIDATES}/accept",
        json={
            "vendor_id": one["vendor_id"],
            "currency": one["currency"],
            "name": "Netflix Premium",
            "amount": "109.00",
        },
        headers=auth,
    )
    assert res.status_code == 201, res.text
    assert res.json()["name"] == "Netflix Premium"
    assert res.json()["amount"] == "109.0000"


async def test_a_vendor_that_already_has_a_subscription_is_not_suggested(client: AsyncClient, auth):
    await monthly(client, auth)
    (one,) = await found(client, auth)
    await client.post(
        f"{CANDIDATES}/accept",
        json={"vendor_id": one["vendor_id"], "currency": one["currency"]},
        headers=auth,
    )
    await pay(client, auth, "Netflix", 2)  # a later charge: the vendor is still taken
    assert await found(client, auth) == []


async def test_not_a_subscription_is_remembered(client: AsyncClient, auth):
    await monthly(client, auth)
    (one,) = await found(client, auth)
    body = {"vendor_id": one["vendor_id"], "currency": one["currency"]}
    assert (await client.post(f"{CANDIDATES}/dismiss", json=body, headers=auth)).status_code == 204
    assert (await client.post(f"{CANDIDATES}/dismiss", json=body, headers=auth)).status_code == 204
    assert await found(client, auth) == []
    # and it can no longer be accepted
    assert (await client.post(f"{CANDIDATES}/accept", json=body, headers=auth)).status_code == 404


async def test_things_that_are_not_recurring_are_left_alone(client: AsyncClient, auth):
    # shopping at the same shop, different amounts, irregular days
    for days, amount in [(50, "12.00"), (41, "30.00"), (22, "8.50"), (9, "55.00")]:
        await pay(client, auth, "Corner Shop", days, amount)
    # only two payments
    await pay(client, auth, "Gym", 35, "300.00")
    await pay(client, auth, "Gym", 5, "300.00")
    # a subscription that stopped long ago
    for m in range(8, 4, -1):
        await pay(client, auth, "Old Service", 30 * m + 5, "50.00")
    assert await found(client, auth) == []


async def test_a_bill_that_changes_each_month_is_suggested_as_varying(client: AsyncClient, auth):
    for m, amount in zip(range(4, 0, -1), ["80.00", "120.00", "95.00", "110.00"], strict=True):
        await pay(client, auth, "Electricity", 30 * m + 5, amount, category="Utilities")
    (one,) = await found(client, auth)
    assert one["amount_varies"] is True
    assert one["amount"] == "110.0000"


async def test_a_charge_already_linked_to_a_subscription_is_not_counted_again(
    client: AsyncClient, auth
):
    paid = await monthly(client, auth, months=3)
    made = await client.post(
        f"{SUBS}/from-transaction/{paid[0]['id']}",
        json={"interval_unit": "month", "interval_count": 1},
        headers=auth,
    )
    assert made.status_code == 201, made.text
    assert await found(client, auth) == []  # the vendor has a subscription now


async def test_other_people_see_and_touch_nothing(client: AsyncClient, auth, signup: Signup):
    await monthly(client, auth)
    (one,) = await found(client, auth)
    other = await signup("bob@example.com")
    assert await found(client, other) == []
    body = {"vendor_id": one["vendor_id"], "currency": one["currency"]}
    assert (await client.post(f"{CANDIDATES}/accept", json=body, headers=other)).status_code == 404
    assert (await client.post(f"{CANDIDATES}/dismiss", json=body, headers=other)).status_code == 404
    # and the owner's suggestion is untouched
    assert len(await found(client, auth)) == 1


async def test_a_clear_pattern_is_announced_once_in_the_bell(client: AsyncClient, auth):
    from app.services import notification as notifications

    notifications._last_sync.clear()
    await monthly(client, auth)
    first = (await client.get("/api/v1/notifications", headers=auth)).json()
    ours = [n for n in first if n["kind"] == "subscription_candidate"]
    assert len(ours) == 1
    assert "Netflix" in ours[0]["title"]
    assert ours[0]["link"] == "/subscriptions"
    notifications._last_sync.clear()
    again = (await client.get("/api/v1/notifications", headers=auth)).json()
    assert len([n for n in again if n["kind"] == "subscription_candidate"]) == 1  # never repeated
