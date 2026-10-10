from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import Signup

ACC = "/api/v1/accounts"
TX = "/api/v1/transactions"
SUMMARY = "/api/v1/transactions/summary"
TOTAL = "x-total-count"


async def account(client, auth, name, **extra):
    resp = await client.post(ACC, json={"group": "cash", "name": name, **extra}, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


def names(resp) -> list[str]:
    return [a["name"] for a in resp.json()]


# ---- account search / paging (the server side of the autocomplete) ------------------------


async def test_account_search_matches_name_and_description(client: AsyncClient, auth):
    await account(client, auth, "BML Current", description="Salary lands here")
    await account(client, auth, "BML Savings")
    await account(client, auth, "Wallet")

    assert names(await client.get(ACC, params={"q": "bml"}, headers=auth)) == [
        "BML Current",
        "BML Savings",
    ]
    assert names(await client.get(ACC, params={"q": "salary"}, headers=auth)) == ["BML Current"]
    assert names(await client.get(ACC, params={"q": "  WALL "}, headers=auth)) == ["Wallet"]
    assert (await client.get(ACC, params={"q": "zzz"}, headers=auth)).json() == []


async def test_account_search_is_literal_and_paged_with_total(client: AsyncClient, auth):
    for n in range(5):
        await account(client, auth, f"Account {n}")
    await account(client, auth, "100% Safe")

    assert names(await client.get(ACC, params={"q": "%"}, headers=auth)) == ["100% Safe"]

    page = await client.get(ACC, params={"q": "account", "limit": 2, "offset": 2}, headers=auth)
    assert names(page) == ["Account 2", "Account 3"]
    assert page.headers[TOTAL] == "5"  # the matches, not the page

    everything = await client.get(ACC, headers=auth)  # no limit: all, as before
    assert len(everything.json()) == 6
    assert everything.headers[TOTAL] == "6"


async def test_account_search_balances_still_present_and_isolated(
    client: AsyncClient, auth, signup: Signup
):
    await account(client, auth, "Wallet", opening_amount="250")
    found = (await client.get(ACC, params={"q": "wal"}, headers=auth)).json()
    assert Decimal(found[0]["balance"]) == 250  # the computed fields come along with search

    bob = await signup("bob@example.com")
    assert (await client.get(ACC, params={"q": "wal"}, headers=bob)).json() == []


# ---- amount range (compared in the base currency) -----------------------------------------


def tx(amount, **extra) -> dict:
    return {
        "type": "expense",
        "amount": amount,
        "payment_method": "cash",
        "category": f"Cat{amount}",
        "transaction_date": "2026-08-01",
        **extra,
    }


async def amounts(client, auth, **params) -> list[str]:
    resp = await client.get(TX, params=params, headers=auth)
    assert resp.status_code == 200, resp.text
    return sorted(Decimal(t["base_amount"]) for t in resp.json())


async def seed_amounts(client, auth):
    for value in ("5", "50", "500", "5000"):
        await client.post(TX, json=tx(value), headers=auth)


async def test_amount_range_is_inclusive(client: AsyncClient, auth):
    await seed_amounts(client, auth)
    assert await amounts(client, auth, min_amount="50") == [50, 500, 5000]
    assert await amounts(client, auth, max_amount="500") == [5, 50, 500]
    assert await amounts(client, auth, min_amount="50", max_amount="500") == [50, 500]
    assert await amounts(client, auth, min_amount="500", max_amount="500") == [500]
    assert await amounts(client, auth, min_amount="6000") == []


async def test_amount_range_compares_in_the_base_currency(client: AsyncClient, auth):
    # 10 USD at 15.4 is 154 MVR; it must sit between 100 and 200 even though "10" < 100
    await client.post(TX, json=tx("10", currency="USD", exchange_rate="15.4"), headers=auth)
    await client.post(TX, json=tx("120"), headers=auth)
    await client.post(TX, json=tx("300"), headers=auth)
    assert await amounts(client, auth, min_amount="100", max_amount="200") == [120, 154]


async def test_amount_range_applies_to_total_count_and_summary(client: AsyncClient, auth):
    await seed_amounts(client, auth)
    page = await client.get(
        TX, params={"min_amount": "50", "max_amount": "500", "limit": 1}, headers=auth
    )
    assert len(page.json()) == 1
    assert page.headers[TOTAL] == "2"  # the pager total follows the range

    totals = (
        await client.get(SUMMARY, params={"min_amount": "50", "max_amount": "500"}, headers=auth)
    ).json()
    assert Decimal(totals["expense"]) == 550  # 50 + 500


async def test_amount_range_combines_with_other_filters(client: AsyncClient, auth):
    await client.post(TX, json=tx("100", category="Rent"), headers=auth)
    await client.post(TX, json=tx("100", category="Food"), headers=auth)
    await client.post(TX, json=tx("900", category="Rent"), headers=auth)
    resp = await client.get(TX, params={"q": "rent", "max_amount": "200"}, headers=auth)
    assert [t["category"] for t in resp.json()] == ["Rent"]
    assert resp.headers[TOTAL] == "1"


async def test_invalid_amount_ranges_are_rejected(client: AsyncClient, auth):
    backwards = await client.get(TX, params={"min_amount": "10", "max_amount": "5"}, headers=auth)
    assert backwards.status_code == 422
    assert "min_amount" in backwards.json()["detail"]
    assert (
        await client.get(SUMMARY, params={"min_amount": "10", "max_amount": "5"}, headers=auth)
    ).status_code == 422
    assert (await client.get(TX, params={"min_amount": "-1"}, headers=auth)).status_code == 422
    assert (await client.get(TX, params={"max_amount": "abc"}, headers=auth)).status_code == 422
