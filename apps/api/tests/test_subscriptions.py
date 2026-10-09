from datetime import date, timedelta
from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import Signup

URL = "/api/v1/subscriptions"
TX = "/api/v1/transactions"

SUB = {
    "name": "Netflix",
    "amount": "99.00",
    "payment_method": "debit_card",
    "category": "Entertainment",
    "interval_unit": "month",
    "start_date": "2026-01-01",
}
TX_BODY = {
    "type": "expense",
    "amount": "99.00",
    "payment_method": "debit_card",
    "category": "Entertainment",
    "transaction_date": "2026-01-01",
}


async def make_sub(client, auth, **overrides) -> dict:
    resp = await client.post(URL, json={**SUB, **overrides}, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_create_defaults_and_computed_fields(client: AsyncClient, auth):
    sub = await make_sub(client, auth)
    assert sub["currency"] == "MVR"  # base currency
    assert Decimal(sub["exchange_rate"]) == 1
    assert sub["status"] == "active"
    assert sub["interval_count"] == 1
    assert sub["next_due_date"] == "2026-01-01"  # nothing paid yet: first cycle is due
    assert sub["last_paid_date"] is None
    assert Decimal(sub["monthly_base_cost"]) == Decimal("99")


async def test_amount_must_be_positive(client: AsyncClient, auth):
    for bad in ("-5", "0"):
        resp = await client.post(URL, json={**SUB, "amount": bad}, headers=auth)
        assert resp.status_code == 422, bad


async def test_foreign_currency_needs_manual_rate_and_converts(client: AsyncClient, auth):
    foreign = {**SUB, "amount": "120", "currency": "usd", "interval_unit": "year"}
    assert (await client.post(URL, json=foreign, headers=auth)).status_code == 422
    sub = await make_sub(client, auth, **{**foreign, "exchange_rate": "15"})
    assert sub["currency"] == "USD"
    assert Decimal(sub["base_amount"]) == 1800  # 120 * 15
    assert Decimal(sub["monthly_base_cost"]) == 150  # 1800 / 12


async def test_linking_a_transaction_advances_next_due(client: AsyncClient, auth):
    sub = await make_sub(client, auth)
    tx = await client.post(TX, json={**TX_BODY, "subscription_id": sub["id"]}, headers=auth)
    assert tx.json()["subscription"] == {"id": sub["id"], "name": "Netflix"}

    after = (await client.get(f"{URL}/{sub['id']}", headers=auth)).json()
    assert after["last_paid_date"] == "2026-01-01"
    assert after["next_due_date"] == "2026-02-01"


async def test_early_payment_counts_for_the_nearest_cycle(client: AsyncClient, auth):
    sub = await make_sub(client, auth)
    early = {**TX_BODY, "transaction_date": "2026-01-30", "subscription_id": sub["id"]}
    await client.post(TX, json=early, headers=auth)  # 2 days before the Feb 1 cycle
    after = (await client.get(f"{URL}/{sub['id']}", headers=auth)).json()
    assert after["next_due_date"] == "2026-03-01"


async def test_link_and_unlink_existing_transaction(client: AsyncClient, auth):
    sub = await make_sub(client, auth)
    tid = (await client.post(TX, json=TX_BODY, headers=auth)).json()["id"]

    linked = await client.patch(f"{TX}/{tid}", json={"subscription_id": sub["id"]}, headers=auth)
    assert linked.json()["subscription"]["name"] == "Netflix"

    kept = await client.patch(f"{TX}/{tid}", json={"category": "Fun"}, headers=auth)
    assert kept.json()["subscription"]["name"] == "Netflix"  # unrelated edit keeps the link

    unlinked = await client.patch(f"{TX}/{tid}", json={"subscription_id": None}, headers=auth)
    assert unlinked.json()["subscription"] is None


async def test_overdue_and_non_active_statuses(client: AsyncClient, auth):
    old_start = (date.today() - timedelta(days=40)).isoformat()
    sub = await make_sub(client, auth, start_date=old_start)
    assert sub["is_overdue"] is True

    paused = await client.patch(f"{URL}/{sub['id']}", json={"status": "paused"}, headers=auth)
    body = paused.json()
    assert body["is_overdue"] is False
    assert body["next_due_date"] is None


async def test_from_transaction_creates_and_links(client: AsyncClient, auth):
    body = {**TX_BODY, "amount": "12.50", "currency": "USD", "exchange_rate": "15"}
    tx = (await client.post(TX, json={**body, "vendor_name": "Spotify"}, headers=auth)).json()

    resp = await client.post(
        f"{URL}/from-transaction/{tx['id']}", json={"interval_unit": "month"}, headers=auth
    )
    assert resp.status_code == 201
    sub = resp.json()
    assert sub["name"] == "Spotify"  # defaults to the vendor
    assert Decimal(sub["amount"]) == Decimal("12.5")
    assert sub["currency"] == "USD"
    assert Decimal(sub["exchange_rate"]) == 15
    assert sub["start_date"] == "2026-01-01"
    assert sub["next_due_date"] == "2026-02-01"  # the transaction was the first payment
    assert sub["vendor"]["name"] == "Spotify"

    linked = (await client.get(f"{TX}/{tx['id']}", headers=auth)).json()
    assert linked["subscription"]["id"] == sub["id"]

    again = await client.post(
        f"{URL}/from-transaction/{tx['id']}", json={"interval_unit": "month"}, headers=auth
    )
    assert again.status_code == 409


async def test_from_transaction_name_falls_back_to_category(client: AsyncClient, auth):
    tx = (await client.post(TX, json=TX_BODY, headers=auth)).json()
    resp = await client.post(
        f"{URL}/from-transaction/{tx['id']}",
        json={"interval_unit": "year", "name": "Insurance"},
        headers=auth,
    )
    assert resp.json()["name"] == "Insurance"


async def test_summary_counts_only_active(client: AsyncClient, auth):
    await make_sub(client, auth, name="A", amount="100")
    await make_sub(client, auth, name="B", amount="120", interval_unit="year")  # 10 / month
    paused = await make_sub(client, auth, name="C", amount="999")
    await client.patch(f"{URL}/{paused['id']}", json={"status": "paused"}, headers=auth)

    summary = (await client.get(f"{URL}/summary", headers=auth)).json()
    assert summary["active_count"] == 2
    assert Decimal(summary["monthly_base_total"]) == 110
    assert summary["currency"] == "MVR"


async def test_update_reprices_and_links_vendor(client: AsyncClient, auth):
    sub = await make_sub(client, auth, currency="USD", exchange_rate="15", amount="10")
    bumped = await client.patch(f"{URL}/{sub['id']}", json={"amount": "20"}, headers=auth)
    assert Decimal(bumped.json()["base_amount"]) == 300  # keeps rate 15

    no_rate = await client.patch(f"{URL}/{sub['id']}", json={"currency": "EUR"}, headers=auth)
    assert no_rate.status_code == 422  # new foreign currency needs a new rate

    vendor = await client.patch(f"{URL}/{sub['id']}", json={"vendor_name": "Acme"}, headers=auth)
    assert vendor.json()["vendor"]["name"] == "Acme"
    cleared = await client.patch(f"{URL}/{sub['id']}", json={"vendor_id": None}, headers=auth)
    assert cleared.json()["vendor"] is None

    for field in ("name", "amount", "status", "interval_unit"):
        resp = await client.patch(f"{URL}/{sub['id']}", json={field: None}, headers=auth)
        assert resp.status_code == 422, field


async def test_delete_unlinks_transactions(client: AsyncClient, auth):
    sub = await make_sub(client, auth)
    tx = (
        await client.post(TX, json={**TX_BODY, "subscription_id": sub["id"]}, headers=auth)
    ).json()
    assert (await client.delete(f"{URL}/{sub['id']}", headers=auth)).status_code == 204
    after = (await client.get(f"{TX}/{tx['id']}", headers=auth)).json()
    assert after["subscription"] is None


async def test_filters(client: AsyncClient, auth):
    a = await make_sub(client, auth, name="A")
    b = await make_sub(client, auth, name="B")
    await client.patch(f"{URL}/{b['id']}", json={"status": "cancelled"}, headers=auth)
    await client.post(TX, json={**TX_BODY, "subscription_id": a["id"]}, headers=auth)
    await client.post(TX, json=TX_BODY, headers=auth)

    active = await client.get(URL, params={"status_filter": "active"}, headers=auth)
    assert [s["name"] for s in active.json()] == ["A"]
    only_a = await client.get(TX, params={"subscription_id": a["id"]}, headers=auth)
    assert len(only_a.json()) == 1


async def test_isolation_between_users(client: AsyncClient, auth, signup: Signup):
    sub = await make_sub(client, auth)
    tx = (await client.post(TX, json=TX_BODY, headers=auth)).json()
    bob = await signup("bob@example.com")

    assert (await client.get(f"{URL}/{sub['id']}", headers=bob)).status_code == 404
    assert (await client.get(URL, headers=bob)).json() == []
    assert (await client.get(f"{URL}/summary", headers=bob)).json()["active_count"] == 0
    # Bob can't link to Alice's subscription, nor convert Alice's transaction
    mine = {**TX_BODY, "subscription_id": sub["id"]}
    assert (await client.post(TX, json=mine, headers=bob)).status_code == 422
    convert = await client.post(
        f"{URL}/from-transaction/{tx['id']}", json={"interval_unit": "month"}, headers=bob
    )
    assert convert.status_code == 404


async def test_requires_auth(client: AsyncClient):
    assert (await client.get(URL)).status_code == 401
