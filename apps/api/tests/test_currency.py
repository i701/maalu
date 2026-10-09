from decimal import Decimal

from httpx import AsyncClient

URL = "/api/v1/transactions"
TX = {
    "type": "expense",
    "amount": "10.00",
    "payment_method": "cash",
    "category": "food",
    "transaction_date": "2026-03-01",
}


async def test_defaults_to_base_currency(client: AsyncClient, auth: dict[str, str]):
    body = (await client.post(URL, json=TX, headers=auth)).json()
    assert body["currency"] == "MVR"  # base currency of the test user
    assert Decimal(body["exchange_rate"]) == 1
    assert Decimal(body["base_amount"]) == Decimal("10.00")


async def test_foreign_currency_converts(client: AsyncClient, auth: dict[str, str]):
    payload = {**TX, "amount": "25.50", "currency": "usd", "exchange_rate": "15.42"}
    body = (await client.post(URL, json=payload, headers=auth)).json()
    assert body["currency"] == "USD"
    assert body["amount"] == "25.5000"
    assert Decimal(body["base_amount"]) == Decimal("393.2100")  # 25.50 * 15.42


async def test_rate_required_for_foreign_currency(client: AsyncClient, auth: dict[str, str]):
    resp = await client.post(URL, json={**TX, "currency": "USD"}, headers=auth)
    assert resp.status_code == 422


async def test_rate_ignored_for_base_currency(client: AsyncClient, auth: dict[str, str]):
    payload = {**TX, "currency": "MVR", "exchange_rate": "99"}
    body = (await client.post(URL, json=payload, headers=auth)).json()
    assert Decimal(body["exchange_rate"]) == 1
    assert Decimal(body["base_amount"]) == Decimal("10.00")


async def test_invalid_rate_and_currency(client: AsyncClient, auth: dict[str, str]):
    for bad in ({"exchange_rate": "0"}, {"exchange_rate": "-1"}, {"currency": "US"}):
        resp = await client.post(URL, json={**TX, "currency": "USD", **bad}, headers=auth)
        assert resp.status_code == 422, bad


async def test_update_recomputes_base_amount(client: AsyncClient, auth: dict[str, str]):
    created = {**TX, "amount": "10", "currency": "USD", "exchange_rate": "15"}
    tid = (await client.post(URL, json=created, headers=auth)).json()["id"]

    amount_only = await client.patch(f"{URL}/{tid}", json={"amount": "20"}, headers=auth)
    assert Decimal(amount_only.json()["base_amount"]) == 300  # keeps rate 15

    new_rate = await client.patch(f"{URL}/{tid}", json={"exchange_rate": "16"}, headers=auth)
    assert Decimal(new_rate.json()["base_amount"]) == 320

    # switching to another foreign currency without a new rate is not allowed
    assert (
        await client.patch(f"{URL}/{tid}", json={"currency": "EUR"}, headers=auth)
    ).status_code == 422
    eur = await client.patch(
        f"{URL}/{tid}", json={"currency": "EUR", "exchange_rate": "17"}, headers=auth
    )
    assert Decimal(eur.json()["base_amount"]) == 340

    # back to the base currency resets the rate
    back = await client.patch(f"{URL}/{tid}", json={"currency": "MVR"}, headers=auth)
    assert Decimal(back.json()["exchange_rate"]) == 1
    assert Decimal(back.json()["base_amount"]) == 20


async def test_filter_by_currency(client: AsyncClient, auth: dict[str, str]):
    await client.post(URL, json=TX, headers=auth)
    usd = {**TX, "currency": "USD", "exchange_rate": "15"}
    await client.post(URL, json=usd, headers=auth)
    resp = await client.get(URL, params={"currency": "usd"}, headers=auth)
    assert [t["currency"] for t in resp.json()] == ["USD"]
