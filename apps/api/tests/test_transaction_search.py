from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import Signup

TX = "/api/v1/transactions"
SUMMARY = "/api/v1/transactions/summary"
ACC = "/api/v1/accounts"
SUBS = "/api/v1/subscriptions"
TOTAL = "x-total-count"


def body(kind="expense", amount="10", **extra) -> dict:
    return {
        "type": kind,
        "amount": amount,
        "payment_method": "cash",
        "category": "Misc",
        "transaction_date": "2026-07-01",
        **extra,
    }


async def find(client, auth, q, **params):
    resp = await client.get(TX, params={"q": q, **params}, headers=auth)
    assert resp.status_code == 200, resp.text
    return resp


def cats(resp) -> list[str]:
    return sorted(t["category"] for t in resp.json())


async def test_search_matches_category_and_description(client: AsyncClient, auth):
    await client.post(TX, json=body(category="Groceries"), headers=auth)
    await client.post(TX, json=body(category="Dining", description="Birthday dinner"), headers=auth)
    await client.post(TX, json=body(category="Fuel"), headers=auth)

    assert cats(await find(client, auth, "grocer")) == ["Groceries"]
    assert cats(await find(client, auth, "birthday")) == ["Dining"]
    assert cats(await find(client, auth, "zzz")) == []


async def test_search_is_case_insensitive_and_trims(client: AsyncClient, auth):
    await client.post(TX, json=body(category="Groceries"), headers=auth)
    assert cats(await find(client, auth, "  GROCERIES ")) == ["Groceries"]
    # whitespace-only is no filter
    await client.post(TX, json=body(category="Fuel"), headers=auth)
    assert len((await find(client, auth, "   ")).json()) == 2


async def test_search_matches_vendor_subscription_and_account_names(client: AsyncClient, auth):
    sub = (
        await client.post(
            SUBS,
            json={
                "name": "Netflix Premium",
                "amount": "10",
                "payment_method": "cash",
                "category": "Fun",
                "interval_unit": "month",
                "start_date": "2026-07-01",
            },
            headers=auth,
        )
    ).json()
    wallet = (
        await client.post(ACC, json={"group": "cash", "name": "Pocket Wallet"}, headers=auth)
    ).json()

    await client.post(TX, json=body(category="A", vendor_name="Ensis Mart"), headers=auth)
    await client.post(TX, json=body(category="B", subscription_id=sub["id"]), headers=auth)
    await client.post(TX, json=body(category="C", account_id=wallet["id"]), headers=auth)
    await client.post(TX, json=body(category="D"), headers=auth)

    assert cats(await find(client, auth, "ensis")) == ["A"]  # vendor name
    assert cats(await find(client, auth, "premium")) == ["B"]  # subscription name
    assert cats(await find(client, auth, "pocket")) == ["C"]  # account name


async def test_search_finds_transfers_by_either_account(client: AsyncClient, auth):
    a = (
        await client.post(
            ACC, json={"group": "cash", "name": "Alpha", "opening_amount": "100"}, headers=auth
        )
    ).json()
    b = (await client.post(ACC, json={"group": "savings", "name": "Bravo"}, headers=auth)).json()
    transfer = {
        "type": "transfer",
        "amount": "30",
        "account_id": a["id"],
        "to_account_id": b["id"],
        "transaction_date": "2026-07-01",
    }
    await client.post(TX, json=transfer, headers=auth)
    await client.post(TX, json=body(category="Other"), headers=auth)

    assert len((await find(client, auth, "alpha")).json()) == 1  # the source
    assert len((await find(client, auth, "bravo")).json()) == 1  # the destination


async def test_search_treats_wildcards_literally(client: AsyncClient, auth):
    await client.post(TX, json=body(category="Groceries"), headers=auth)
    await client.post(TX, json=body(category="Sale", description="50% off"), headers=auth)
    assert cats(await find(client, auth, "%")) == ["Sale"]  # only the literal percent sign
    assert (await find(client, auth, "_")).json() == []


async def test_search_combines_with_filters_paging_and_total(client: AsyncClient, auth):
    for n in range(5):
        await client.post(TX, json=body(category=f"Lunch {n}"), headers=auth)
    await client.post(TX, json=body("income", "99", category="Lunch refund"), headers=auth)
    await client.post(TX, json=body(category="Fuel"), headers=auth)

    page = await find(client, auth, "lunch", limit=2, offset=0)
    assert len(page.json()) == 2
    assert page.headers[TOTAL] == "6"  # every match, not just the page

    expenses = await find(client, auth, "lunch", type="expense")
    assert expenses.headers[TOTAL] == "5"
    assert (await find(client, auth, "nomatch")).headers[TOTAL] == "0"


async def test_totals_follow_the_search(client: AsyncClient, auth):
    await client.post(TX, json=body(amount="40", category="Lunch"), headers=auth)
    await client.post(TX, json=body(amount="60", category="Lunch"), headers=auth)
    await client.post(TX, json=body(amount="500", category="Rent"), headers=auth)
    await client.post(TX, json=body("income", "1000", category="Lunch money"), headers=auth)

    resp = await client.get(SUMMARY, params={"q": "lunch"}, headers=auth)
    data = resp.json()
    assert Decimal(data["expense"]) == 100  # the Rent row is excluded
    assert Decimal(data["income"]) == 1000


async def test_search_only_sees_your_own_transactions(client: AsyncClient, auth, signup: Signup):
    await client.post(TX, json=body(category="Secret plans"), headers=auth)
    bob = await signup("bob@example.com")
    await client.post(TX, json=body(category="Bob secret"), headers=bob)
    assert cats(await find(client, auth, "secret")) == ["Secret plans"]
    assert cats(await find(client, bob, "secret")) == ["Bob secret"]


async def test_search_rejects_overlong_queries(client: AsyncClient, auth):
    assert (await client.get(TX, params={"q": "x" * 101}, headers=auth)).status_code == 422
