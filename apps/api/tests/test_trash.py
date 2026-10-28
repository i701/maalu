from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import Signup

TX = "/api/v1/transactions"
ACC = "/api/v1/accounts"
CAT = "/api/v1/categories"
STATS = "/api/v1/stats"


def expense(amount="30", **extra) -> dict:
    return {
        "type": "expense",
        "amount": amount,
        "payment_method": "cash",
        "category": "Groceries",
        "transaction_date": "2026-03-01",
        **extra,
    }


async def add(client: AsyncClient, auth, **extra) -> dict:
    resp = await client.post(TX, json=expense(**extra), headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_delete_moves_to_trash_and_hides_everywhere(client: AsyncClient, auth):
    acct = (
        await client.post(
            ACC, json={"group": "cash", "name": "Wallet", "opening_amount": "100"}, headers=auth
        )
    ).json()
    t = await add(client, auth, account_id=acct["id"])
    assert (await client.delete(f"{TX}/{t['id']}", headers=auth)).status_code == 204

    assert (await client.get(f"{TX}/{t['id']}", headers=auth)).status_code == 404
    assert (await client.get(TX, headers=auth)).json() == []
    assert (await client.get(TX, headers=auth)).headers["X-Total-Count"] == "0"
    totals = (await client.get(f"{TX}/summary", headers=auth)).json()
    assert Decimal(totals["expense"]) == 0
    assert (await client.get(f"{TX}/categories", headers=auth)).json()["categories"] == []
    # The account balance is back to its opening amount.
    after = (await client.get(f"{ACC}/{acct['id']}", headers=auth)).json()
    assert Decimal(after["balance"]) == 100
    assert after["transaction_count"] == 0
    # Editing a trashed transaction is a 404 too.
    patch = await client.patch(f"{TX}/{t['id']}", json={"amount": "5"}, headers=auth)
    assert patch.status_code == 404
    # A second delete finds nothing live.
    assert (await client.delete(f"{TX}/{t['id']}", headers=auth)).status_code == 404


async def test_trash_lists_newest_deleted_first(client: AsyncClient, auth):
    first = await add(client, auth, description="first")
    second = await add(client, auth, description="second")
    await client.delete(f"{TX}/{first['id']}", headers=auth)
    await client.delete(f"{TX}/{second['id']}", headers=auth)

    resp = await client.get(f"{TX}/trash", headers=auth)
    assert resp.headers["X-Total-Count"] == "2"
    assert [t["description"] for t in resp.json()] == ["second", "first"]
    assert resp.json()[0]["deleted_at"] is not None
    page = await client.get(f"{TX}/trash", params={"limit": 1, "offset": 1}, headers=auth)
    assert [t["description"] for t in page.json()] == ["first"]
    assert page.headers["X-Total-Count"] == "2"


async def test_restore_brings_it_back_everywhere(client: AsyncClient, auth):
    t = await add(client, auth, amount="40")
    await client.delete(f"{TX}/{t['id']}", headers=auth)

    resp = await client.post(f"{TX}/{t['id']}/restore", headers=auth)
    assert resp.status_code == 200
    assert resp.json()["deleted_at"] is None
    assert (await client.get(f"{TX}/trash", headers=auth)).json() == []
    assert (await client.get(f"{TX}/{t['id']}", headers=auth)).status_code == 200
    assert Decimal((await client.get(f"{TX}/summary", headers=auth)).json()["expense"]) == 40


async def test_restore_needs_a_trashed_transaction(client: AsyncClient, auth):
    t = await add(client, auth)
    assert (await client.post(f"{TX}/{t['id']}/restore", headers=auth)).status_code == 404


async def test_permanent_delete_only_from_the_trash(client: AsyncClient, auth):
    t = await add(client, auth)
    assert (await client.delete(f"{TX}/{t['id']}/permanent", headers=auth)).status_code == 404
    await client.delete(f"{TX}/{t['id']}", headers=auth)
    assert (await client.delete(f"{TX}/{t['id']}/permanent", headers=auth)).status_code == 204
    assert (await client.get(f"{TX}/trash", headers=auth)).json() == []
    assert (await client.post(f"{TX}/{t['id']}/restore", headers=auth)).status_code == 404


async def test_trash_is_private(client: AsyncClient, auth, signup: Signup):
    t = await add(client, auth)
    await client.delete(f"{TX}/{t['id']}", headers=auth)
    other = await signup("other@example.com")
    assert (await client.get(f"{TX}/trash", headers=other)).json() == []
    assert (await client.post(f"{TX}/{t['id']}/restore", headers=other)).status_code == 404
    assert (await client.delete(f"{TX}/{t['id']}/permanent", headers=other)).status_code == 404


async def test_trashed_transaction_leaves_budget_and_trend(client: AsyncClient, auth):
    acct = (
        await client.post(
            ACC, json={"group": "cash", "name": "Wallet", "opening_amount": "100"}, headers=auth
        )
    ).json()
    t = await add(client, auth, amount="30", account_id=acct["id"])
    params = {"from": "2026-03-01", "to": "2026-03-02"}
    before = (await client.get(f"{STATS}/balance-trend", params=params, headers=auth)).json()
    assert Decimal(before["points"][-1]["assets"]) == 70

    await client.delete(f"{TX}/{t['id']}", headers=auth)
    after = (await client.get(f"{STATS}/balance-trend", params=params, headers=auth)).json()
    assert Decimal(after["points"][-1]["assets"]) == 100
    monthly = (
        await client.get(f"{STATS}/monthly", params={"months": 1, "to": "2026-03-15"}, headers=auth)
    ).json()
    assert all(Decimal(m["expense"]) == 0 for m in monthly["months"])


async def test_category_in_trash_still_blocks_its_deletion(client: AsyncClient, auth):
    t = await add(client, auth, category="Fuel")
    await client.delete(f"{TX}/{t['id']}", headers=auth)
    fuel = next(
        c["id"] for c in (await client.get(CAT, headers=auth)).json() if c["name"] == "Fuel"
    )
    assert (await client.delete(f"{CAT}/{fuel}", headers=auth)).status_code == 409


async def test_account_can_be_deleted_with_only_trashed_transactions(client: AsyncClient, auth):
    acct = (await client.post(ACC, json={"group": "cash", "name": "Old"}, headers=auth)).json()
    t = await add(client, auth, account_id=acct["id"])
    await client.delete(f"{TX}/{t['id']}", headers=auth)
    assert (await client.delete(f"{ACC}/{acct['id']}", headers=auth)).status_code == 204
    restored = (await client.post(f"{TX}/{t['id']}/restore", headers=auth)).json()
    assert restored["account"] is None  # the link went with the account
