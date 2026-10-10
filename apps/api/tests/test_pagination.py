from httpx import AsyncClient

from tests.conftest import Signup

TOTAL = "x-total-count"
TX = "/api/v1/transactions"
VENDORS = "/api/v1/vendors"
SUBS = "/api/v1/subscriptions"


def expense(n: int, **extra) -> dict:
    return {
        "type": "expense",
        "amount": "1",
        "payment_method": "cash",
        "category": f"Cat{n}",
        "transaction_date": f"2026-05-{n:02d}",
        **extra,
    }


def sub(n: int, **extra) -> dict:
    return {
        "name": f"Sub{n:02d}",
        "amount": "10",
        "payment_method": "cash",
        "category": "Fun",
        "interval_unit": "month",
        "start_date": "2026-05-01",
        **extra,
    }


async def test_vendors_pages_and_total(client: AsyncClient, auth):
    for n in range(5):
        await client.post(VENDORS, json={"name": f"Vendor {n}"}, headers=auth)

    page = await client.get(VENDORS, params={"limit": 2, "offset": 2}, headers=auth)
    assert [v["name"] for v in page.json()] == ["Vendor 2", "Vendor 3"]
    assert page.headers[TOTAL] == "5"  # the whole set, not the page

    last = await client.get(VENDORS, params={"limit": 2, "offset": 4}, headers=auth)
    assert [v["name"] for v in last.json()] == ["Vendor 4"]

    beyond = await client.get(VENDORS, params={"limit": 2, "offset": 50}, headers=auth)
    assert beyond.json() == []
    assert beyond.headers[TOTAL] == "5"


async def test_no_limit_returns_everything_for_dropdowns(client: AsyncClient, auth):
    for n in range(5):
        await client.post(VENDORS, json={"name": f"Vendor {n}"}, headers=auth)
    everything = await client.get(VENDORS, headers=auth)
    assert len(everything.json()) == 5
    assert everything.headers[TOTAL] == "5"


async def test_subscriptions_pages_and_status_filtered_total(client: AsyncClient, auth):
    for n in range(4):
        await client.post(SUBS, json=sub(n), headers=auth)
    paused = (await client.get(SUBS, headers=auth)).json()[0]
    await client.patch(f"{SUBS}/{paused['id']}", json={"status": "paused"}, headers=auth)

    page = await client.get(SUBS, params={"limit": 2, "offset": 0}, headers=auth)
    assert len(page.json()) == 2
    assert page.headers[TOTAL] == "4"

    active = await client.get(SUBS, params={"status_filter": "active", "limit": 2}, headers=auth)
    assert active.headers[TOTAL] == "3"  # total follows the filter
    assert len(active.json()) == 2


async def test_transactions_total_follows_filters_and_ignores_the_page(client: AsyncClient, auth):
    for n in range(1, 8):
        await client.post(TX, json=expense(n), headers=auth)
    await client.post(
        TX,
        json={
            "type": "income",
            "amount": "5",
            "payment_method": "cash",
            "category": "Pay",
            "transaction_date": "2026-05-20",
        },
        headers=auth,
    )

    first = await client.get(TX, params={"limit": 3, "offset": 0}, headers=auth)
    assert len(first.json()) == 3
    assert first.headers[TOTAL] == "8"
    # newest first
    assert first.json()[0]["transaction_date"] == "2026-05-20"

    second = await client.get(TX, params={"limit": 3, "offset": 3}, headers=auth)
    assert second.headers[TOTAL] == "8"
    assert {t["id"] for t in first.json()}.isdisjoint({t["id"] for t in second.json()})

    expenses = await client.get(TX, params={"type": "expense", "limit": 2}, headers=auth)
    assert expenses.headers[TOTAL] == "7"
    income = await client.get(TX, params={"type": "income"}, headers=auth)
    assert income.headers[TOTAL] == "1"


async def test_transactions_default_page_size_and_bounds(client: AsyncClient, auth):
    await client.post(TX, json=expense(1), headers=auth)
    default = await client.get(TX, headers=auth)
    assert default.status_code == 200
    assert default.headers[TOTAL] == "1"
    for bad in ({"limit": 0}, {"limit": 201}, {"offset": -1}):
        assert (await client.get(TX, params=bad, headers=auth)).status_code == 422, bad


async def test_totals_only_count_your_own_rows(client: AsyncClient, auth, signup: Signup):
    await client.post(VENDORS, json={"name": "Mine"}, headers=auth)
    bob = await signup("bob@example.com")
    await client.post(VENDORS, json={"name": "Bobs"}, headers=bob)
    await client.post(TX, json=expense(1), headers=bob)

    assert (await client.get(VENDORS, headers=auth)).headers[TOTAL] == "1"
    assert (await client.get(TX, headers=auth)).headers[TOTAL] == "0"
    assert (await client.get(SUBS, headers=auth)).headers[TOTAL] == "0"
