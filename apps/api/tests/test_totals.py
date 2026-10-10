from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import Signup

TX = "/api/v1/transactions"
SUMMARY = "/api/v1/transactions/summary"
ACC = "/api/v1/accounts"


def body(kind, amount, **extra) -> dict:
    return {
        "type": kind,
        "amount": amount,
        "payment_method": "cash",
        "category": "Misc",
        "transaction_date": "2026-06-01",
        **extra,
    }


async def totals(client, auth, **params) -> tuple[Decimal, Decimal]:
    resp = await client.get(SUMMARY, params=params, headers=auth)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["currency"] == "MVR"
    return Decimal(data["income"]), Decimal(data["expense"])


async def test_totals_with_no_transactions_are_zero(client: AsyncClient, auth):
    assert await totals(client, auth) == (0, 0)


async def test_totals_sum_income_and_expense_separately(client: AsyncClient, auth):
    await client.post(TX, json=body("income", "1000"), headers=auth)
    await client.post(TX, json=body("income", "250.50"), headers=auth)
    await client.post(TX, json=body("expense", "100"), headers=auth)
    await client.post(TX, json=body("expense", "30.25"), headers=auth)
    income, expense = await totals(client, auth)
    assert income == Decimal("1250.50")
    assert expense == Decimal("130.25")


async def test_totals_follow_the_same_filters_as_the_list(client: AsyncClient, auth):
    shop = body("expense", "40", vendor_name="Shop", payment_method="debit_card")
    await client.post(TX, json=shop, headers=auth)
    await client.post(TX, json=body("expense", "60", vendor_name="Cafe"), headers=auth)
    await client.post(TX, json=body("income", "500", vendor_name="Shop"), headers=auth)

    vendors = {
        v["name"]: v["id"] for v in (await client.get("/api/v1/vendors", headers=auth)).json()
    }
    assert await totals(client, auth, vendor_id=vendors["Shop"]) == (500, 40)
    assert await totals(client, auth, vendor_id=vendors["Cafe"]) == (0, 60)
    assert await totals(client, auth, payment_method="debit_card") == (0, 40)
    assert await totals(client, auth, type="income") == (500, 0)
    assert await totals(client, auth, type="expense") == (0, 100)


async def test_totals_match_the_rows_the_list_returns(client: AsyncClient, auth):
    for amount in ("10", "20", "30"):
        await client.post(TX, json=body("expense", amount), headers=auth)
    rows = (await client.get(TX, params={"type": "expense"}, headers=auth)).json()
    assert (
        sum(Decimal(r["amount"]) for r in rows) == (await totals(client, auth, type="expense"))[1]
    )


async def test_totals_use_the_base_currency(client: AsyncClient, auth):
    usd = body("expense", "10", currency="USD", exchange_rate="15.4")
    await client.post(TX, json=usd, headers=auth)
    await client.post(TX, json=body("expense", "5"), headers=auth)  # MVR
    _, expense = await totals(client, auth)
    assert expense == Decimal("159")  # 10 USD * 15.4 + 5 MVR
    # filtering by the transaction currency narrows the same totals
    assert (await totals(client, auth, currency="USD"))[1] == Decimal("154")


async def test_transfers_are_not_counted(client: AsyncClient, auth):
    a = (
        await client.post(
            ACC, json={"group": "cash", "name": "A", "opening_amount": "100"}, headers=auth
        )
    ).json()
    b = (await client.post(ACC, json={"group": "savings", "name": "B"}, headers=auth)).json()
    transfer = {
        "type": "transfer",
        "amount": "50",
        "account_id": a["id"],
        "to_account_id": b["id"],
        "transaction_date": "2026-06-01",
    }
    assert (await client.post(TX, json=transfer, headers=auth)).status_code == 201
    await client.post(TX, json=body("expense", "7", account_id=a["id"]), headers=auth)

    assert await totals(client, auth) == (0, 7)  # the 50 transfer moves money, it isn't spend
    assert await totals(client, auth, type="transfer") == (0, 0)
    # a transfer filtered by account still isn't income/expense
    assert await totals(client, auth, account_id=b["id"]) == (0, 0)


async def test_totals_only_count_your_own_rows(client: AsyncClient, auth, signup: Signup):
    await client.post(TX, json=body("income", "100"), headers=auth)
    bob = await signup("bob@example.com")
    await client.post(TX, json=body("income", "999"), headers=bob)
    assert await totals(client, auth) == (100, 0)


async def test_totals_require_auth_and_validate_filters(client: AsyncClient, auth):
    assert (await client.get(SUMMARY)).status_code == 401
    assert (await client.get(SUMMARY, params={"type": "refund"}, headers=auth)).status_code == 422
