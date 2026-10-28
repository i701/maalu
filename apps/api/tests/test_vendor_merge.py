from httpx import AsyncClient

from tests.conftest import Signup

VEND = "/api/v1/vendors"
TX = "/api/v1/transactions"
TPL = "/api/v1/templates"
SUBS = "/api/v1/subscriptions"
TAGS = "/api/v1/tags"


async def vendor(client: AsyncClient, auth, name: str, **extra) -> dict:
    resp = await client.post(VEND, json={"name": name, **extra}, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def spend(client: AsyncClient, auth, vendor_name: str, amount="10") -> dict:
    resp = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": amount,
            "payment_method": "cash",
            "category": "Misc",
            "transaction_date": "2026-03-01",
            "vendor_name": vendor_name,
        },
        headers=auth,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def merge(client: AsyncClient, auth, source: dict, target: dict):
    return await client.post(
        f"{VEND}/{source['id']}/merge", json={"into_id": target["id"]}, headers=auth
    )


async def test_merge_moves_transactions_and_deletes_the_source(client: AsyncClient, auth):
    a = await vendor(client, auth, "Cafe Nero")
    b = await vendor(client, auth, "Nero Cafe")
    t1 = await spend(client, auth, "Cafe Nero")
    t2 = await spend(client, auth, "Nero Cafe")

    resp = await merge(client, auth, a, b)
    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == b["id"]
    assert [v["name"] for v in (await client.get(VEND, headers=auth)).json()] == ["Nero Cafe"]
    assert (await client.get(f"{VEND}/{a['id']}", headers=auth)).status_code == 404
    for t in (t1, t2):
        moved = (await client.get(f"{TX}/{t['id']}", headers=auth)).json()
        assert moved["vendor"]["id"] == b["id"]


async def test_trashed_transactions_move_too(client: AsyncClient, auth):
    a = await vendor(client, auth, "A")
    b = await vendor(client, auth, "B")
    t = await spend(client, auth, "A")
    await client.delete(f"{TX}/{t['id']}", headers=auth)
    await merge(client, auth, a, b)
    restored = (await client.post(f"{TX}/{t['id']}/restore", headers=auth)).json()
    assert restored["vendor"]["id"] == b["id"]


async def test_subscriptions_and_templates_follow(client: AsyncClient, auth):
    a = await vendor(client, auth, "Netflix Inc")
    b = await vendor(client, auth, "Netflix")
    sub = await client.post(
        SUBS,
        json={
            "name": "Netflix",
            "amount": "10",
            "payment_method": "credit_card",
            "category": "Entertainment",
            "interval_unit": "month",
            "start_date": "2026-03-01",
            "vendor_name": "Netflix Inc",
        },
        headers=auth,
    )
    assert sub.status_code == 201, sub.text
    await client.post(
        TPL, json={"name": "T", "type": "expense", "vendor_name": "Netflix Inc"}, headers=auth
    )
    await merge(client, auth, a, b)
    assert (await client.get(SUBS, headers=auth)).json()[0]["vendor"]["id"] == b["id"]
    assert (await client.get(TPL, headers=auth)).json()[0]["vendor"] == "Netflix"


async def test_fills_what_the_target_lacks_and_keeps_what_it_has(client: AsyncClient, auth):
    source = await vendor(
        client,
        auth,
        "Source",
        address="Main St",
        contact="123",
        currency="USD",
        is_local=False,
        default_category="Groceries",
        default_tags=["Weekly"],
    )
    target = await vendor(client, auth, "Target", contact="999")
    merged = (await merge(client, auth, source, target)).json()
    assert merged["address"] == "Main St"  # filled
    assert merged["contact"] == "999"  # kept
    assert merged["currency"] == "USD"
    assert merged["is_local"] is False
    assert merged["default_category"] == "Groceries"
    assert [t["name"] for t in merged["default_tags"]] == ["Weekly"]


async def test_the_targets_own_defaults_win(client: AsyncClient, auth):
    source = await vendor(
        client, auth, "Source", default_category="Groceries", default_tags=["Weekly"]
    )
    target = await vendor(
        client, auth, "Target", default_category="Fuel", default_tags=["Car"], is_local=True
    )
    merged = (await merge(client, auth, source, target)).json()
    assert merged["default_category"] == "Fuel"
    assert [t["name"] for t in merged["default_tags"]] == ["Car"]
    assert merged["is_local"] is True
    # The source's tag still exists; only the vendor link went.
    assert {t["name"] for t in (await client.get(TAGS, headers=auth)).json()} == {"Weekly", "Car"}


async def test_cannot_merge_into_itself(client: AsyncClient, auth):
    a = await vendor(client, auth, "A")
    assert (await merge(client, auth, a, a)).status_code == 422
    assert (await client.get(f"{VEND}/{a['id']}", headers=auth)).status_code == 200


async def test_unknown_vendor_is_404(client: AsyncClient, auth):
    a = await vendor(client, auth, "A")
    missing = await client.post(
        f"{VEND}/{a['id']}/merge",
        json={"into_id": "00000000-0000-0000-0000-000000000000"},
        headers=auth,
    )
    assert missing.status_code == 404
    gone = await client.post(
        f"{VEND}/00000000-0000-0000-0000-000000000000/merge",
        json={"into_id": a["id"]},
        headers=auth,
    )
    assert gone.status_code == 404


async def test_merge_is_private(client: AsyncClient, auth, signup: Signup):
    mine = await vendor(client, auth, "Mine")
    other = await signup("other@example.com")
    theirs = await vendor(client, other, "Theirs")
    assert (await merge(client, other, mine, theirs)).status_code == 404  # not theirs to merge
    assert (await merge(client, auth, mine, theirs)).status_code == 404  # not mine as a target
    assert (await client.get(f"{VEND}/{mine['id']}", headers=auth)).status_code == 200


async def test_requires_login(client: AsyncClient):
    resp = await client.post(
        f"{VEND}/00000000-0000-0000-0000-000000000000/merge",
        json={"into_id": "00000000-0000-0000-0000-000000000000"},
    )
    assert resp.status_code == 401
