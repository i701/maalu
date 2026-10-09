from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import Signup

URL = "/api/v1/accounts"
TX = "/api/v1/transactions"


def tx(amount: str, **extra) -> dict:
    """Signed shorthand for tests: "-30" is a 30 expense, "50" is 50 income."""
    return {
        "type": "expense" if amount.startswith("-") else "income",
        "amount": amount.lstrip("-"),
        "payment_method": "cash",
        "category": "Misc",
        "transaction_date": "2026-03-01",
        **extra,
    }


async def make_account(client, auth, **overrides) -> dict:
    body = {"group": "cash", "name": "Wallet", "opening_amount": "100", **overrides}
    resp = await client.post(URL, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_create_defaults(client: AsyncClient, auth):
    acct = await make_account(client, auth)
    assert acct["currency"] == "MVR"  # base currency
    assert Decimal(acct["exchange_rate"]) == 1
    assert Decimal(acct["balance"]) == 100  # just the opening amount
    assert acct["is_liability"] is False
    assert acct["transaction_count"] == 0


async def test_opening_amount_defaults_to_zero_and_name_required(client: AsyncClient, auth):
    acct = (
        await client.post(URL, json={"group": "savings", "name": "Rainy day"}, headers=auth)
    ).json()
    assert Decimal(acct["balance"]) == 0
    for bad in ({"group": "cash"}, {"group": "cash", "name": "  "}, {"group": "nope", "name": "X"}):
        assert (await client.post(URL, json=bad, headers=auth)).status_code == 422


async def test_foreign_account_needs_manual_rate(client: AsyncClient, auth):
    body = {"group": "accounts", "name": "USD savings", "currency": "usd", "opening_amount": "10"}
    assert (await client.post(URL, json=body, headers=auth)).status_code == 422
    acct = await make_account(client, auth, **body, exchange_rate="15.4")
    assert acct["currency"] == "USD"
    assert Decimal(acct["base_balance"]) == Decimal("154")  # 10 * 15.4


async def test_balance_follows_linked_transactions(client: AsyncClient, auth):
    acct = await make_account(client, auth)
    await client.post(TX, json=tx("-30", account_id=acct["id"]), headers=auth)
    await client.post(TX, json=tx("50", account_id=acct["id"]), headers=auth)
    await client.post(TX, json=tx("-999"), headers=auth)  # not in the account

    after = (await client.get(f"{URL}/{acct['id']}", headers=auth)).json()
    assert Decimal(after["balance"]) == 120  # 100 - 30 + 50
    assert after["transaction_count"] == 2

    created = (await client.post(TX, json=tx("-1", account_id=acct["id"]), headers=auth)).json()
    assert created["account"] == {
        "id": acct["id"],
        "name": "Wallet",
        "group": "cash",
        "currency": "MVR",
    }


async def test_transaction_takes_the_accounts_currency(client: AsyncClient, auth):
    usd = await make_account(
        client, auth, name="USD", currency="USD", exchange_rate="15", opening_amount="0"
    )
    # Currency omitted: taken from the account, priced with the rate sent on the transaction.
    ok = await client.post(
        TX, json=tx("-10", account_id=usd["id"], exchange_rate="16"), headers=auth
    )
    assert ok.status_code == 201
    assert ok.json()["currency"] == "USD"
    assert Decimal(ok.json()["base_amount"]) == 160  # positive: `type` carries the direction

    clash = await client.post(
        TX, json=tx("-10", account_id=usd["id"], currency="EUR", exchange_rate="17"), headers=auth
    )
    assert clash.status_code == 422
    assert "USD" in clash.json()["detail"]

    # no rate for a foreign-currency account transaction
    assert (
        await client.post(TX, json=tx("-1", account_id=usd["id"]), headers=auth)
    ).status_code == 422


async def test_link_switch_and_unlink_account_on_a_transaction(client: AsyncClient, auth):
    a = await make_account(client, auth, name="A", opening_amount="0")
    b = await make_account(client, auth, name="B", opening_amount="0")
    tid = (await client.post(TX, json=tx("-20"), headers=auth)).json()["id"]

    await client.patch(f"{TX}/{tid}", json={"account_id": a["id"]}, headers=auth)
    assert Decimal((await client.get(f"{URL}/{a['id']}", headers=auth)).json()["balance"]) == -20

    await client.patch(f"{TX}/{tid}", json={"account_id": b["id"]}, headers=auth)
    assert Decimal((await client.get(f"{URL}/{a['id']}", headers=auth)).json()["balance"]) == 0
    assert Decimal((await client.get(f"{URL}/{b['id']}", headers=auth)).json()["balance"]) == -20

    kept = await client.patch(f"{TX}/{tid}", json={"category": "Food"}, headers=auth)
    assert kept.json()["account"]["name"] == "B"  # unrelated edit keeps the link

    unlinked = await client.patch(f"{TX}/{tid}", json={"account_id": None}, headers=auth)
    assert unlinked.json()["account"] is None


async def test_cannot_link_to_an_account_in_another_currency(client: AsyncClient, auth):
    usd = await make_account(client, auth, name="USD", currency="USD", exchange_rate="15")
    tid = (await client.post(TX, json=tx("-20"), headers=auth)).json()["id"]  # an MVR transaction
    resp = await client.patch(f"{TX}/{tid}", json={"account_id": usd["id"]}, headers=auth)
    assert resp.status_code == 422


async def test_account_currency_locked_once_it_has_transactions(client: AsyncClient, auth):
    acct = await make_account(client, auth)
    # Allowed while empty (a foreign currency needs its rate)
    ok = await client.patch(
        f"{URL}/{acct['id']}", json={"currency": "EUR", "exchange_rate": "17"}, headers=auth
    )
    assert ok.status_code == 200
    await client.post(TX, json=tx("-5", account_id=acct["id"], exchange_rate="17"), headers=auth)
    locked = await client.patch(
        f"{URL}/{acct['id']}", json={"currency": "USD", "exchange_rate": "15"}, headers=auth
    )
    assert locked.status_code == 409
    # but the rate itself can be re-valued
    reval = await client.patch(f"{URL}/{acct['id']}", json={"exchange_rate": "18"}, headers=auth)
    assert Decimal(reval.json()["exchange_rate"]) == 18


async def test_update_fields_and_null_rules(client: AsyncClient, auth):
    acct = await make_account(client, auth, description="first")
    patched = await client.patch(
        f"{URL}/{acct['id']}",
        json={"name": "Pocket", "group": "prepaid", "opening_amount": "5", "description": None},
        headers=auth,
    )
    body = patched.json()
    assert (body["name"], body["group"], Decimal(body["balance"])) == ("Pocket", "prepaid", 5)
    assert body["description"] is None
    for field in ("name", "group", "opening_amount", "currency"):
        resp = await client.patch(f"{URL}/{acct['id']}", json={field: None}, headers=auth)
        assert resp.status_code == 422, field


async def test_summary_splits_assets_and_liabilities(client: AsyncClient, auth):
    await make_account(client, auth, name="Wallet", opening_amount="100")
    await make_account(client, auth, name="Savings", group="savings", opening_amount="400")
    card = await make_account(client, auth, name="Visa", group="card", opening_amount="0")
    await make_account(client, auth, name="Loan", group="loan", opening_amount="-1000")
    await client.post(TX, json=tx("-150", account_id=card["id"]), headers=auth)  # card spend

    assert (await client.get(f"{URL}/{card['id']}", headers=auth)).json()["is_liability"] is True
    summary = (await client.get(f"{URL}/summary", headers=auth)).json()
    assert Decimal(summary["assets"]) == 500
    assert Decimal(summary["liabilities"]) == 1150  # 150 on the card + 1000 loan
    assert Decimal(summary["total"]) == -650
    assert summary["currency"] == "MVR"


async def test_delete_keeps_transactions(client: AsyncClient, auth):
    acct = await make_account(client, auth)
    t = (await client.post(TX, json=tx("-5", account_id=acct["id"]), headers=auth)).json()
    assert (await client.delete(f"{URL}/{acct['id']}", headers=auth)).status_code == 204
    after = (await client.get(f"{TX}/{t['id']}", headers=auth)).json()
    assert after["account"] is None


async def test_filter_transactions_by_account(client: AsyncClient, auth):
    acct = await make_account(client, auth)
    await client.post(TX, json=tx("-5", account_id=acct["id"]), headers=auth)
    await client.post(TX, json=tx("-6"), headers=auth)
    resp = await client.get(TX, params={"account_id": acct["id"]}, headers=auth)
    assert len(resp.json()) == 1


async def test_isolation_between_users(client: AsyncClient, auth, signup: Signup):
    acct = await make_account(client, auth)
    bob = await signup("bob@example.com")
    assert (await client.get(f"{URL}/{acct['id']}", headers=bob)).status_code == 404
    assert (await client.get(URL, headers=bob)).json() == []
    resp = await client.post(TX, json=tx("-5", account_id=acct["id"]), headers=bob)
    assert resp.status_code == 422  # can't use Alice's account


async def test_requires_auth(client: AsyncClient):
    assert (await client.get(URL)).status_code == 401
