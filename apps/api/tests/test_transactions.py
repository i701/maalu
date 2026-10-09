from httpx import AsyncClient

from tests.conftest import Signup

PAYLOAD = {
    "amount": "-12.3456",
    "payment_method": "debit_card",
    "category": "food",
    "transaction_date": "2026-01-15",
}
URL = "/api/v1/transactions"


async def test_requires_auth(client: AsyncClient):
    assert (await client.get(URL)).status_code == 401


async def test_create_and_list(client: AsyncClient, auth: dict[str, str]):
    created = await client.post(URL, json=PAYLOAD, headers=auth)
    assert created.status_code == 201
    body = created.json()
    assert body["amount"] == "-12.3456"  # exact Decimal, serialised as a string
    assert "user_id" not in body

    listed = await client.get(URL, headers=auth)
    assert [t["id"] for t in listed.json()] == [body["id"]]


async def test_update_and_delete(client: AsyncClient, auth: dict[str, str]):
    tid = (await client.post(URL, json=PAYLOAD, headers=auth)).json()["id"]
    patched = await client.patch(f"{URL}/{tid}", json={"category": "rent"}, headers=auth)
    assert patched.json()["category"] == "rent"
    assert (await client.delete(f"{URL}/{tid}", headers=auth)).status_code == 204
    assert (await client.get(f"{URL}/{tid}", headers=auth)).status_code == 404


async def test_users_are_isolated(client: AsyncClient, auth: dict[str, str], signup: Signup):
    tid = (await client.post(URL, json=PAYLOAD, headers=auth)).json()["id"]
    bob = await signup("bob@example.com")
    assert (await client.get(f"{URL}/{tid}", headers=bob)).status_code == 404
    assert (await client.get(URL, headers=bob)).json() == []


async def test_rejects_excess_precision(client: AsyncClient, auth: dict[str, str]):
    bad = {**PAYLOAD, "amount": "1.123456"}
    assert (await client.post(URL, json=bad, headers=auth)).status_code == 422


async def test_payment_method_required_and_validated(client: AsyncClient, auth: dict[str, str]):
    missing = {k: v for k, v in PAYLOAD.items() if k != "payment_method"}
    assert (await client.post(URL, json=missing, headers=auth)).status_code == 422
    bad = {**PAYLOAD, "payment_method": "bitcoin"}
    assert (await client.post(URL, json=bad, headers=auth)).status_code == 422


async def test_payment_method_update_and_filter(client: AsyncClient, auth: dict[str, str]):
    tid = (await client.post(URL, json=PAYLOAD, headers=auth)).json()["id"]
    await client.post(URL, json={**PAYLOAD, "payment_method": "cash"}, headers=auth)

    patched = await client.patch(f"{URL}/{tid}", json={"payment_method": "paypal"}, headers=auth)
    assert patched.json()["payment_method"] == "paypal"

    only_paypal = await client.get(URL, params={"payment_method": "paypal"}, headers=auth)
    assert [t["id"] for t in only_paypal.json()] == [tid]


async def test_required_fields_cannot_be_nulled(client: AsyncClient, auth: dict[str, str]):
    tid = (await client.post(URL, json=PAYLOAD, headers=auth)).json()["id"]
    for field in ("amount", "payment_method", "category", "transaction_date"):
        resp = await client.patch(f"{URL}/{tid}", json={field: None}, headers=auth)
        assert resp.status_code == 422, field
