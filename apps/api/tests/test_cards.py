from httpx import AsyncClient

from tests.conftest import Signup

CARDS = "/api/v1/cards"
ACCOUNTS = "/api/v1/accounts"
TX = "/api/v1/transactions"


async def account(client: AsyncClient, auth, name: str, group="accounts", **extra) -> dict:
    res = await client.post(
        ACCOUNTS,
        json={"name": name, "group": group, "currency": "MVR", "opening_amount": "1000", **extra},
        headers=auth,
    )
    assert res.status_code == 201, res.text
    return res.json()


async def card(client: AsyncClient, auth, **body) -> dict:
    res = await client.post(CARDS, json=body, headers=auth)
    assert res.status_code == 201, res.text
    return res.json()


def expense(**extra) -> dict:
    return {
        "type": "expense",
        "amount": "40",
        "category": "Groceries",
        "transaction_date": "2026-03-01",
        **extra,
    }


async def balance(client: AsyncClient, auth, account_id: str) -> str:
    return (await client.get(f"{ACCOUNTS}/{account_id}", headers=auth)).json()["balance"]


async def test_a_debit_card_spends_from_its_account(client: AsyncClient, auth):
    bank = await account(client, auth, "BML Current")
    visa = await card(
        client, auth, name="BML Visa", kind="debit", last_digits="4164", account_id=bank["id"]
    )
    assert visa["account"]["id"] == bank["id"]
    assert visa["last_digits"] == "4164"

    # picking the card fills in the account and the payment method
    res = await client.post(TX, json=expense(card_id=visa["id"]), headers=auth)
    assert res.status_code == 201, res.text
    tx = res.json()
    assert tx["account"]["id"] == bank["id"]
    assert tx["payment_method"] == "debit_card"
    assert tx["card"]["name"] == "BML Visa"
    assert await balance(client, auth, bank["id"]) == "960.0000"


async def test_a_credit_card_is_its_own_account_repaid_from_a_bank_account(
    client: AsyncClient, auth
):
    bank = await account(client, auth, "BML Current")
    owed = await account(client, auth, "BML Credit", group="card", opening_amount="0")
    credit = await card(
        client,
        auth,
        name="BML Credit",
        kind="credit",
        account_id=owed["id"],
        repay_account_id=bank["id"],
    )
    assert credit["repay_account"]["id"] == bank["id"]
    tx = (await client.post(TX, json=expense(card_id=credit["id"]), headers=auth)).json()
    assert tx["account"]["id"] == owed["id"]
    assert tx["payment_method"] == "credit_card"
    assert await balance(client, auth, owed["id"]) == "-40.0000"  # what is owed
    assert await balance(client, auth, bank["id"]) == "1000.0000"  # untouched until it is repaid


async def test_an_explicit_payment_method_wins_and_a_mismatched_account_is_refused(
    client: AsyncClient, auth
):
    bank = await account(client, auth, "BML Current")
    other = await account(client, auth, "MIB Current")
    visa = await card(client, auth, name="Visa", kind="debit", account_id=bank["id"])
    ok = await client.post(
        TX, json=expense(card_id=visa["id"], payment_method="bank_transfer"), headers=auth
    )
    assert ok.json()["payment_method"] == "bank_transfer"
    bad = await client.post(
        TX, json=expense(card_id=visa["id"], account_id=other["id"]), headers=auth
    )
    assert bad.status_code == 422
    assert "another account" in bad.json()["detail"]


async def test_card_rules(client: AsyncClient, auth):
    bank = await account(client, auth, "BML Current")
    owed = await account(client, auth, "Credit", group="card")
    # a debit card belongs to a bank account, a credit card to a credit card account
    assert (
        await client.post(
            CARDS, json={"name": "x", "kind": "debit", "account_id": owed["id"]}, headers=auth
        )
    ).status_code == 422
    assert (
        await client.post(
            CARDS, json={"name": "x", "kind": "credit", "account_id": bank["id"]}, headers=auth
        )
    ).status_code == 422
    # only a credit card is repaid from an account, and from a bank account
    assert (
        await client.post(
            CARDS,
            json={
                "name": "x",
                "kind": "debit",
                "account_id": bank["id"],
                "repay_account_id": bank["id"],
            },
            headers=auth,
        )
    ).status_code == 422
    assert (
        await client.post(
            CARDS,
            json={
                "name": "x",
                "kind": "credit",
                "account_id": owed["id"],
                "repay_account_id": owed["id"],
            },
            headers=auth,
        )
    ).status_code == 422
    # the digits are four, never a whole number
    assert (
        await client.post(
            CARDS,
            json={
                "name": "x",
                "kind": "debit",
                "account_id": bank["id"],
                "last_digits": "4111111111111111",
            },
            headers=auth,
        )
    ).status_code == 422


async def test_a_transfer_is_not_paid_with_a_card(client: AsyncClient, auth):
    bank = await account(client, auth, "BML Current")
    other = await account(client, auth, "BML Savings", group="savings")
    visa = await card(client, auth, name="Visa", kind="debit", account_id=bank["id"])
    res = await client.post(
        TX,
        json={
            "type": "transfer",
            "amount": "10",
            "transaction_date": "2026-03-01",
            "account_id": bank["id"],
            "to_account_id": other["id"],
            "card_id": visa["id"],
        },
        headers=auth,
    )
    assert res.status_code == 422


async def test_the_card_can_be_changed_cleared_and_filtered_on(client: AsyncClient, auth):
    bank = await account(client, auth, "BML Current")
    visa = await card(client, auth, name="Visa", kind="debit", account_id=bank["id"])
    with_card = (await client.post(TX, json=expense(card_id=visa["id"]), headers=auth)).json()
    cash = (
        await client.post(
            TX, json=expense(payment_method="cash", account_id=bank["id"]), headers=auth
        )
    ).json()
    listed = await client.get(TX, params={"card_id": visa["id"]}, headers=auth)
    assert [t["id"] for t in listed.json()] == [with_card["id"]]
    assert listed.headers["x-total-count"] == "1"
    totals = (
        await client.get(f"{TX}/summary", params={"card_id": visa["id"]}, headers=auth)
    ).json()
    assert totals["expense"] == "40.0000"

    # put a card on a transaction that had none: the account follows
    patched = await client.patch(f"{TX}/{cash['id']}", json={"card_id": visa["id"]}, headers=auth)
    assert patched.status_code == 200, patched.text
    assert patched.json()["card"]["id"] == visa["id"]
    # clear it again
    cleared = await client.patch(f"{TX}/{cash['id']}", json={"card_id": None}, headers=auth)
    assert cleared.json()["card"] is None
    assert cleared.json()["account"]["id"] == bank["id"]


async def test_moving_a_card_transaction_to_another_account_is_refused(client: AsyncClient, auth):
    bank = await account(client, auth, "BML Current")
    other = await account(client, auth, "MIB Current")
    visa = await card(client, auth, name="Visa", kind="debit", account_id=bank["id"])
    tx = (await client.post(TX, json=expense(card_id=visa["id"]), headers=auth)).json()
    res = await client.patch(f"{TX}/{tx['id']}", json={"account_id": other["id"]}, headers=auth)
    assert res.status_code == 422


async def test_deleting_a_card_keeps_its_transactions(client: AsyncClient, auth):
    bank = await account(client, auth, "BML Current")
    visa = await card(client, auth, name="Visa", kind="debit", account_id=bank["id"])
    tx = (await client.post(TX, json=expense(card_id=visa["id"]), headers=auth)).json()
    assert (await client.delete(f"{CARDS}/{visa['id']}", headers=auth)).status_code == 204
    kept = (await client.get(f"{TX}/{tx['id']}", headers=auth)).json()
    assert kept["card"] is None
    assert kept["account"]["id"] == bank["id"]


async def test_cards_are_listed_updated_and_private(client: AsyncClient, auth, signup: Signup):
    bank = await account(client, auth, "BML Current")
    visa = await card(client, auth, name="B card", kind="debit", account_id=bank["id"])
    await card(client, auth, name="A card", kind="debit", account_id=bank["id"])
    names = [c["name"] for c in (await client.get(CARDS, headers=auth)).json()]
    assert names == ["A card", "B card"]
    renamed = await client.patch(
        f"{CARDS}/{visa['id']}", json={"name": "Visa", "last_digits": "1234"}, headers=auth
    )
    assert renamed.json()["name"] == "Visa"
    assert (
        await client.patch(f"{CARDS}/{visa['id']}", json={"last_digits": None}, headers=auth)
    ).json()["last_digits"] is None
    other = await signup("bob@example.com")
    assert (await client.get(f"{CARDS}/{visa['id']}", headers=other)).status_code == 404
    assert (await client.get(CARDS, headers=other)).json() == []
    assert (await client.get(CARDS)).status_code == 401
