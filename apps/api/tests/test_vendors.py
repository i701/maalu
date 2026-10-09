import uuid

from httpx import AsyncClient

from tests.conftest import Signup

TX = {
    "type": "expense",
    "amount": "4.50",
    "payment_method": "cash",
    "category": "coffee",
    "transaction_date": "2026-02-01",
}
TX_URL = "/api/v1/transactions"
V_URL = "/api/v1/vendors"


async def test_vendor_is_optional(client: AsyncClient, auth: dict[str, str]):
    body = (await client.post(TX_URL, json=TX, headers=auth)).json()
    assert body["vendor"] is None


async def test_create_with_vendor_name_reuses_vendor(client: AsyncClient, auth: dict[str, str]):
    a = (await client.post(TX_URL, json={**TX, "vendor_name": "Cafe  Nero"}, headers=auth)).json()
    b = (await client.post(TX_URL, json={**TX, "vendor_name": "cafe nero "}, headers=auth)).json()
    assert a["vendor"]["id"] == b["vendor"]["id"]
    assert a["vendor"]["name"] == "Cafe Nero"
    assert len((await client.get(V_URL, headers=auth)).json()) == 1


async def test_link_vendor_later_and_unlink(client: AsyncClient, auth: dict[str, str]):
    tid = (await client.post(TX_URL, json=TX, headers=auth)).json()["id"]
    vid = (await client.post(V_URL, json={"name": "Starbucks"}, headers=auth)).json()["id"]

    linked = await client.patch(f"{TX_URL}/{tid}", json={"vendor_id": vid}, headers=auth)
    assert linked.json()["vendor"]["id"] == vid

    # unrelated edit leaves the link alone
    kept = await client.patch(f"{TX_URL}/{tid}", json={"category": "food"}, headers=auth)
    assert kept.json()["vendor"]["id"] == vid

    unlinked = await client.patch(f"{TX_URL}/{tid}", json={"vendor_id": None}, headers=auth)
    assert unlinked.json()["vendor"] is None


async def test_filter_transactions_by_vendor(client: AsyncClient, auth: dict[str, str]):
    vid = (await client.post(V_URL, json={"name": "Shop"}, headers=auth)).json()["id"]
    await client.post(TX_URL, json={**TX, "vendor_id": vid}, headers=auth)
    await client.post(TX_URL, json=TX, headers=auth)
    resp = await client.get(TX_URL, params={"vendor_id": vid}, headers=auth)
    assert len(resp.json()) == 1


async def test_both_vendor_refs_rejected(client: AsyncClient, auth: dict[str, str]):
    bad = {**TX, "vendor_id": str(uuid.uuid4()), "vendor_name": "X"}
    assert (await client.post(TX_URL, json=bad, headers=auth)).status_code == 422


async def test_unknown_vendor_id_rejected(client: AsyncClient, auth: dict[str, str]):
    bad = {**TX, "vendor_id": str(uuid.uuid4())}
    assert (await client.post(TX_URL, json=bad, headers=auth)).status_code == 422


async def test_duplicate_vendor_name_conflicts(client: AsyncClient, auth: dict[str, str]):
    await client.post(V_URL, json={"name": "Shop"}, headers=auth)
    assert (await client.post(V_URL, json={"name": " SHOP"}, headers=auth)).status_code == 409
    other = (await client.post(V_URL, json={"name": "Other"}, headers=auth)).json()["id"]
    renamed = await client.patch(f"{V_URL}/{other}", json={"name": "shop"}, headers=auth)
    assert renamed.status_code == 409


async def test_vendors_are_per_user(client: AsyncClient, auth: dict[str, str], signup: Signup):
    vid = (await client.post(V_URL, json={"name": "Shop"}, headers=auth)).json()["id"]
    bob = await signup("bob@example.com")
    assert (await client.get(f"{V_URL}/{vid}", headers=bob)).status_code == 404
    # Bob can't attach Alice's vendor, but can create his own "Shop"
    assert (
        await client.post(TX_URL, json={**TX, "vendor_id": vid}, headers=bob)
    ).status_code == 422
    assert (await client.post(V_URL, json={"name": "Shop"}, headers=bob)).status_code == 201


async def test_deleting_vendor_keeps_transactions(client: AsyncClient, auth: dict[str, str]):
    tx = (await client.post(TX_URL, json={**TX, "vendor_name": "Gone"}, headers=auth)).json()
    await client.delete(f"{V_URL}/{tx['vendor']['id']}", headers=auth)
    after = (await client.get(f"{TX_URL}/{tx['id']}", headers=auth)).json()
    assert after["vendor"] is None


async def test_vendor_details_optional_and_updatable(client: AsyncClient, auth: dict[str, str]):
    bare = (await client.post(V_URL, json={"name": "Bare"}, headers=auth)).json()
    assert {k: bare[k] for k in ("address", "is_local", "currency", "contact")} == {
        "address": None,
        "is_local": None,
        "currency": None,
        "contact": None,
    }

    full = {
        "name": "Hulhumale Mart",
        "address": " Hulhumale, Maldives ",
        "is_local": True,
        "currency": "mvr",
        "contact": "+960 123 4567",
    }
    created = (await client.post(V_URL, json=full, headers=auth)).json()
    assert created["currency"] == "MVR"
    assert created["address"] == "Hulhumale, Maldives"
    assert created["is_local"] is True

    patched = await client.patch(
        f"{V_URL}/{created['id']}", json={"contact": None, "is_local": False}, headers=auth
    )
    body = patched.json()
    assert body["contact"] is None
    assert body["is_local"] is False
    assert body["name"] == "Hulhumale Mart"
    assert body["currency"] == "MVR"


async def test_vendor_validation(client: AsyncClient, auth: dict[str, str]):
    for bad in ({"currency": "MVRR"}, {"currency": "12$"}):
        resp = await client.post(V_URL, json={"name": "X", **bad}, headers=auth)
        assert resp.status_code == 422
    vid = (await client.post(V_URL, json={"name": "Y"}, headers=auth)).json()["id"]
    assert (
        await client.patch(f"{V_URL}/{vid}", json={"name": None}, headers=auth)
    ).status_code == 422
