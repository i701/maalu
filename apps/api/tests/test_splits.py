from httpx import AsyncClient

URL = "/api/v1/transactions"
BASE = {
    "type": "expense",
    "payment_method": "cash",
    "transaction_date": "2026-01-15",
}
LINES = [
    {"name": "Eggs", "quantity": "6", "category": "Groceries", "amount": "60.00"},
    {"name": "Carrots", "quantity": "10", "category": "Groceries", "amount": "20.00"},
    {"name": "Energy drink", "category": "Junk food", "amount": "18.00", "tax_amount": "1.3333"},
    {"name": "Snickers", "quantity": "2", "category": "Junk food", "amount": "10.99"},
]
TOTAL = "108.99"


async def test_create_split_transaction(client: AsyncClient, auth: dict[str, str]):
    resp = await client.post(URL, json={**BASE, "amount": TOTAL, "splits": LINES}, headers=auth)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    # the transaction's own category follows the biggest line, so it needn't be sent
    assert body["category"] == "Groceries"
    assert [s["name"] for s in body["splits"]] == ["Eggs", "Carrots", "Energy drink", "Snickers"]
    assert body["splits"][0]["quantity"] == "6.000"
    assert body["splits"][2]["tax_amount"] == "1.3333"
    assert body["splits"][1]["tax_amount"] is None
    assert (await client.get(f"{URL}/{body['id']}", headers=auth)).json()["splits"] == body[
        "splits"
    ]


async def test_unsplit_transaction_has_no_splits(client: AsyncClient, auth: dict[str, str]):
    resp = await client.post(URL, json={**BASE, "amount": "5", "category": "food"}, headers=auth)
    assert resp.json()["splits"] == []


async def test_lines_must_add_up_to_the_total(client: AsyncClient, auth: dict[str, str]):
    resp = await client.post(URL, json={**BASE, "amount": "100", "splits": LINES}, headers=auth)
    assert resp.status_code == 422
    assert "add up" in resp.text


async def test_category_or_splits_required(client: AsyncClient, auth: dict[str, str]):
    assert (await client.post(URL, json={**BASE, "amount": "5"}, headers=auth)).status_code == 422


async def test_transfers_cannot_be_split(client: AsyncClient, auth: dict[str, str]):
    a = (
        await client.post(
            "/api/v1/accounts",
            json={"name": "A", "group": "accounts", "currency": "MVR"},
            headers=auth,
        )
    ).json()
    b = (
        await client.post(
            "/api/v1/accounts",
            json={"name": "B", "group": "accounts", "currency": "MVR"},
            headers=auth,
        )
    ).json()
    resp = await client.post(
        URL,
        json={
            "type": "transfer",
            "amount": TOTAL,
            "transaction_date": "2026-01-15",
            "account_id": a["id"],
            "to_account_id": b["id"],
            "splits": LINES,
        },
        headers=auth,
    )
    assert resp.status_code == 422


async def test_tax_cannot_exceed_line_amount(client: AsyncClient, auth: dict[str, str]):
    bad = [{"name": "x", "category": "c", "amount": "1", "tax_amount": "2"}]
    resp = await client.post(URL, json={**BASE, "amount": "1", "splits": bad}, headers=auth)
    assert resp.status_code == 422


async def test_replace_and_remove_splits(client: AsyncClient, auth: dict[str, str]):
    tid = (
        await client.post(URL, json={**BASE, "amount": TOTAL, "splits": LINES}, headers=auth)
    ).json()["id"]

    two = [
        {"name": "Pizza", "category": "Dining", "amount": "70.00"},
        {"name": "Cola", "category": "Drinks", "amount": "38.99"},
    ]
    patched = await client.patch(f"{URL}/{tid}", json={"splits": two}, headers=auth)
    assert patched.status_code == 200, patched.text
    assert [s["name"] for s in patched.json()["splits"]] == ["Pizza", "Cola"]
    assert patched.json()["category"] == "Dining"

    removed = await client.patch(
        f"{URL}/{tid}", json={"splits": None, "category": "Food"}, headers=auth
    )
    assert removed.json()["splits"] == []
    assert removed.json()["category"] == "Food"


async def test_changing_total_of_split_transaction_needs_new_lines(
    client: AsyncClient, auth: dict[str, str]
):
    tid = (
        await client.post(URL, json={**BASE, "amount": TOTAL, "splits": LINES}, headers=auth)
    ).json()["id"]
    resp = await client.patch(f"{URL}/{tid}", json={"amount": "200"}, headers=auth)
    assert resp.status_code == 422


async def test_search_matches_item_names_and_split_categories(
    client: AsyncClient, auth: dict[str, str]
):
    await client.post(URL, json={**BASE, "amount": TOTAL, "splits": LINES}, headers=auth)
    await client.post(URL, json={**BASE, "amount": "5", "category": "Fuel"}, headers=auth)
    by_item = await client.get(URL, params={"q": "snickers"}, headers=auth)
    assert len(by_item.json()) == 1
    by_category = await client.get(URL, params={"q": "junk"}, headers=auth)
    assert len(by_category.json()) == 1


async def test_deleting_the_transaction_deletes_its_lines(
    client: AsyncClient, auth: dict[str, str]
):
    tid = (
        await client.post(URL, json={**BASE, "amount": TOTAL, "splits": LINES}, headers=auth)
    ).json()["id"]
    assert (await client.delete(f"{URL}/{tid}", headers=auth)).status_code == 204
    assert (await client.get(f"{URL}/{tid}", headers=auth)).status_code == 404


CATEGORIES = "/api/v1/transactions/categories"


def _by_key(body: dict) -> dict:
    return {(c["type"], c["category"]): c for c in body["categories"]}


async def test_category_totals_spread_a_split_over_its_categories(
    client: AsyncClient, auth: dict[str, str]
):
    await client.post(URL, json={**BASE, "amount": TOTAL, "splits": LINES}, headers=auth)
    await client.post(URL, json={**BASE, "amount": "40", "category": "Groceries"}, headers=auth)
    await client.post(
        URL, json={**BASE, "type": "income", "amount": "500", "category": "Salary"}, headers=auth
    )
    body = (await client.get(CATEGORIES, headers=auth)).json()
    assert body["currency"] == "MVR"
    got = _by_key(body)
    # Groceries: 60 + 20 from the split, plus the plain 40; two transactions touch it
    assert got[("expense", "Groceries")]["total"] == "120.0000"
    assert got[("expense", "Groceries")]["count"] == 2
    assert got[("expense", "Junk food")]["total"] == "28.9900"
    assert got[("expense", "Junk food")]["count"] == 1
    assert got[("income", "Salary")]["total"] == "500.0000"
    # biggest first within a type
    expense = [c["category"] for c in body["categories"] if c["type"] == "expense"]
    assert expense == ["Groceries", "Junk food"]


async def test_category_totals_agree_with_the_overall_totals(
    client: AsyncClient, auth: dict[str, str]
):
    """A foreign-currency split whose lines don't divide evenly still adds up exactly."""
    thirds = [
        {"name": n, "category": c, "amount": a}
        for n, c, a in [("a", "One", "3.33"), ("b", "Two", "3.33"), ("c", "Three", "3.34")]
    ]
    await client.post(
        URL,
        json={**BASE, "amount": "10", "currency": "USD", "exchange_rate": "15.4", "splits": thirds},
        headers=auth,
    )
    categories = (await client.get(CATEGORIES, headers=auth)).json()
    summary = (await client.get(f"{URL}/summary", headers=auth)).json()
    total = sum(float(c["total"]) for c in categories["categories"])
    assert total == float(summary["expense"]) == 154.0


async def test_category_totals_follow_the_list_filters(client: AsyncClient, auth: dict[str, str]):
    await client.post(URL, json={**BASE, "amount": TOTAL, "splits": LINES}, headers=auth)
    await client.post(
        URL,
        json={**BASE, "amount": "40", "category": "Fuel", "transaction_date": "2025-01-01"},
        headers=auth,
    )
    body = (await client.get(CATEGORIES, params={"date_from": "2026-01-01"}, headers=auth)).json()
    assert {c["category"] for c in body["categories"]} == {"Groceries", "Junk food"}


async def test_category_totals_are_per_user(client: AsyncClient, auth: dict[str, str], signup):
    await client.post(URL, json={**BASE, "amount": "5", "category": "Fuel"}, headers=auth)
    bob = await signup("bob@example.com")
    assert (await client.get(CATEGORIES, headers=bob)).json()["categories"] == []
