from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import Signup

TX = "/api/v1/transactions"
ACC = "/api/v1/accounts"
SUBS = "/api/v1/subscriptions"


async def account(client, auth, name, *, opening="0", **extra) -> dict:
    body = {"group": "cash", "name": name, "opening_amount": opening, **extra}
    resp = await client.post(ACC, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def balance(client, auth, acct) -> Decimal:
    return Decimal((await client.get(f"{ACC}/{acct['id']}", headers=auth)).json()["balance"])


def transfer(src, dst, amount="100", **extra) -> dict:
    return {
        "type": "transfer",
        "amount": amount,
        "account_id": src["id"],
        "to_account_id": dst["id"],
        "transaction_date": "2026-04-01",
        **extra,
    }


def ordinary(kind, amount, **extra) -> dict:
    return {
        "type": kind,
        "amount": amount,
        "payment_method": "cash",
        "category": "Misc",
        "transaction_date": "2026-04-01",
        **extra,
    }


async def test_type_is_required_and_amount_is_always_positive(client: AsyncClient, auth):
    no_type = {k: v for k, v in ordinary("expense", "5").items() if k != "type"}
    assert (await client.post(TX, json=no_type, headers=auth)).status_code == 422
    for amount in ("0", "-5"):
        resp = await client.post(TX, json=ordinary("expense", amount), headers=auth)
        assert resp.status_code == 422, amount
    bad_type = await client.post(TX, json=ordinary("refund", "5"), headers=auth)
    assert bad_type.status_code == 422


async def test_income_and_expense_need_category_and_payment_method(client: AsyncClient, auth):
    for kind in ("income", "expense"):
        for missing in ("category", "payment_method"):
            body = {k: v for k, v in ordinary(kind, "5").items() if k != missing}
            assert (await client.post(TX, json=body, headers=auth)).status_code == 422, (
                kind,
                missing,
            )


async def test_income_raises_and_expense_lowers_the_balance(client: AsyncClient, auth):
    wallet = await account(client, auth, "Wallet", opening="100")
    await client.post(TX, json=ordinary("income", "40", account_id=wallet["id"]), headers=auth)
    await client.post(TX, json=ordinary("expense", "15", account_id=wallet["id"]), headers=auth)
    assert await balance(client, auth, wallet) == 125  # 100 + 40 - 15


async def test_transfer_moves_money_between_accounts(client: AsyncClient, auth):
    a = await account(client, auth, "Wallet", opening="500")
    b = await account(client, auth, "Savings", opening="50")
    resp = await client.post(TX, json=transfer(a, b, "120", description="top up"), headers=auth)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["type"] == "transfer"
    assert Decimal(body["amount"]) == 120
    assert Decimal(body["to_amount"]) == 120  # same currency: what left is what arrived
    assert body["account"]["name"] == "Wallet"
    assert body["to_account"]["name"] == "Savings"
    assert body["category"] == "Transfer"
    assert body["vendor"] is None
    assert body["subscription"] is None

    assert await balance(client, auth, a) == 380
    assert await balance(client, auth, b) == 170
    # Money only moved: the overview total is unchanged
    summary = (await client.get(f"{ACC}/summary", headers=auth)).json()
    assert Decimal(summary["total"]) == 550


async def test_transfer_validation(client: AsyncClient, auth):
    a = await account(client, auth, "A")
    b = await account(client, auth, "B")
    missing_to = {k: v for k, v in transfer(a, b).items() if k != "to_account_id"}
    assert (await client.post(TX, json=missing_to, headers=auth)).status_code == 422
    same = await client.post(TX, json=transfer(a, a), headers=auth)
    assert same.status_code == 422
    for extra in ({"vendor_name": "Shop"}, {"subscription_id": a["id"]}):
        resp = await client.post(TX, json=transfer(a, b, **extra), headers=auth)
        assert resp.status_code == 422, extra
    # destination fields don't belong on income/expense
    stray = await client.post(
        TX, json=ordinary("expense", "5", to_account_id=b["id"]), headers=auth
    )
    assert stray.status_code == 422


async def test_cross_currency_transfer_needs_the_received_amount(client: AsyncClient, auth):
    mvr = await account(client, auth, "MVR wallet", opening="1000")
    usd = await account(client, auth, "USD", opening="0", currency="USD", exchange_rate="15.4")
    missing = await client.post(TX, json=transfer(mvr, usd, "154"), headers=auth)
    assert missing.status_code == 422
    assert "USD" in missing.json()["detail"]

    ok = await client.post(TX, json=transfer(mvr, usd, "154", to_amount="10"), headers=auth)
    assert ok.status_code == 201, ok.text
    assert ok.json()["currency"] == "MVR"
    assert Decimal(ok.json()["to_amount"]) == 10
    assert await balance(client, auth, mvr) == 846  # 1000 - 154
    assert await balance(client, auth, usd) == 10


async def test_transfer_is_valued_with_the_source_accounts_rate(client: AsyncClient, auth):
    usd = await account(client, auth, "USD", opening="100", currency="USD", exchange_rate="15")
    mvr = await account(client, auth, "MVR", opening="0")
    # no exchange_rate sent: the USD account's own rate (15) is used
    resp = await client.post(TX, json=transfer(usd, mvr, "10", to_amount="150"), headers=auth)
    assert resp.status_code == 201, resp.text
    assert resp.json()["currency"] == "USD"
    assert Decimal(resp.json()["base_amount"]) == 150
    assert await balance(client, auth, usd) == 90
    assert await balance(client, auth, mvr) == 150


async def test_transfer_appears_under_both_accounts_and_filters(client: AsyncClient, auth):
    a = await account(client, auth, "A", opening="100")
    b = await account(client, auth, "B")
    c = await account(client, auth, "C")
    await client.post(TX, json=transfer(a, b, "10"), headers=auth)
    await client.post(TX, json=ordinary("expense", "5", account_id=c["id"]), headers=auth)

    for acct, expected in ((a, 1), (b, 1), (c, 1)):
        resp = await client.get(TX, params={"account_id": acct["id"]}, headers=auth)
        assert len(resp.json()) == expected, acct["name"]
    only_transfers = await client.get(TX, params={"type": "transfer"}, headers=auth)
    assert [t["type"] for t in only_transfers.json()] == ["transfer"]
    expenses = await client.get(TX, params={"type": "expense"}, headers=auth)
    assert len(expenses.json()) == 1


async def test_editing_and_deleting_a_transfer_keeps_balances_right(client: AsyncClient, auth):
    a = await account(client, auth, "A", opening="100")
    b = await account(client, auth, "B", opening="0")
    tid = (await client.post(TX, json=transfer(a, b, "30"), headers=auth)).json()["id"]

    edited = await client.patch(f"{TX}/{tid}", json={"amount": "50"}, headers=auth)
    assert edited.status_code == 200, edited.text
    assert await balance(client, auth, a) == 50
    assert await balance(client, auth, b) == 50

    other = await account(client, auth, "C")
    await client.patch(f"{TX}/{tid}", json={"to_account_id": other["id"]}, headers=auth)
    assert await balance(client, auth, b) == 0
    assert await balance(client, auth, other) == 50

    assert (await client.delete(f"{TX}/{tid}", headers=auth)).status_code == 204
    assert await balance(client, auth, a) == 100
    assert await balance(client, auth, other) == 0


async def test_changing_the_type_of_a_transaction(client: AsyncClient, auth):
    a = await account(client, auth, "A", opening="100")
    b = await account(client, auth, "B")
    tid = (
        await client.post(TX, json=ordinary("expense", "20", account_id=a["id"]), headers=auth)
    ).json()["id"]
    assert await balance(client, auth, a) == 80

    flipped = await client.patch(f"{TX}/{tid}", json={"type": "income"}, headers=auth)
    assert flipped.json()["type"] == "income"
    assert await balance(client, auth, a) == 120

    # to a transfer: the destination is required
    no_dest = await client.patch(f"{TX}/{tid}", json={"type": "transfer"}, headers=auth)
    assert no_dest.status_code == 422
    xfer = await client.patch(
        f"{TX}/{tid}", json={"type": "transfer", "to_account_id": b["id"]}, headers=auth
    )
    assert xfer.status_code == 200, xfer.text
    assert xfer.json()["category"] == "Transfer"
    assert await balance(client, auth, a) == 80
    assert await balance(client, auth, b) == 20

    # back to an expense: it needs a category again, and the destination is cleared
    no_cat = await client.patch(f"{TX}/{tid}", json={"type": "expense"}, headers=auth)
    assert no_cat.status_code == 422
    back = await client.patch(
        f"{TX}/{tid}",
        json={"type": "expense", "category": "Food", "payment_method": "cash"},
        headers=auth,
    )
    assert back.status_code == 200, back.text
    assert back.json()["to_account"] is None
    assert back.json()["to_amount"] is None
    assert await balance(client, auth, b) == 0


async def test_only_expenses_can_belong_to_a_subscription(client: AsyncClient, auth):
    sub = (
        await client.post(
            SUBS,
            json={
                "name": "Netflix",
                "amount": "10",
                "payment_method": "cash",
                "category": "Fun",
                "interval_unit": "month",
                "start_date": "2026-04-01",
            },
            headers=auth,
        )
    ).json()
    income = await client.post(
        TX, json=ordinary("income", "10", subscription_id=sub["id"]), headers=auth
    )
    assert income.status_code == 422

    tid = (await client.post(TX, json=ordinary("income", "10"), headers=auth)).json()["id"]
    link = await client.patch(f"{TX}/{tid}", json={"subscription_id": sub["id"]}, headers=auth)
    assert link.status_code == 422
    convert = await client.post(
        f"{SUBS}/from-transaction/{tid}", json={"interval_unit": "month"}, headers=auth
    )
    assert convert.status_code == 422

    # an expense linked to a subscription is unlinked when it becomes income
    eid = (
        await client.post(
            TX, json=ordinary("expense", "10", subscription_id=sub["id"]), headers=auth
        )
    ).json()["id"]
    flipped = await client.patch(f"{TX}/{eid}", json={"type": "income"}, headers=auth)
    assert flipped.json()["subscription"] is None


async def test_deleting_the_destination_account_keeps_the_transfer(client: AsyncClient, auth):
    a = await account(client, auth, "A", opening="100")
    b = await account(client, auth, "B")
    tid = (await client.post(TX, json=transfer(a, b, "30"), headers=auth)).json()["id"]
    await client.delete(f"{ACC}/{b['id']}", headers=auth)
    after = (await client.get(f"{TX}/{tid}", headers=auth)).json()
    assert after["to_account"] is None
    assert after["account"]["name"] == "A"
    assert await balance(client, auth, a) == 70  # the money did leave A


async def test_transfers_count_towards_the_currency_lock(client: AsyncClient, auth):
    a = await account(client, auth, "A", opening="10")
    b = await account(client, auth, "B")
    await client.post(TX, json=transfer(a, b, "5"), headers=auth)
    resp = await client.patch(
        f"{ACC}/{b['id']}", json={"currency": "USD", "exchange_rate": "15"}, headers=auth
    )
    assert resp.status_code == 409
    listed = (await client.get(f"{ACC}/{b['id']}", headers=auth)).json()
    assert listed["transaction_count"] == 1


async def test_cannot_transfer_with_other_users_accounts(client: AsyncClient, auth, signup: Signup):
    mine = await account(client, auth, "Mine")
    bob = await signup("bob@example.com")
    theirs = await account(client, bob, "Theirs")
    resp = await client.post(TX, json=transfer(mine, theirs), headers=auth)
    assert resp.status_code == 422
