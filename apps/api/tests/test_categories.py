from httpx import AsyncClient

from tests.conftest import Signup

CAT = "/api/v1/categories"
TX = "/api/v1/transactions"
SUB = "/api/v1/subscriptions"


def expense(category: str = "Groceries", amount: str = "10", **extra) -> dict:
    return {
        "type": "expense",
        "amount": amount,
        "payment_method": "cash",
        "category": category,
        "transaction_date": "2026-03-01",
        **extra,
    }


async def names(client: AsyncClient, auth) -> list[str]:
    return [c["name"] for c in (await client.get(CAT, headers=auth)).json()]


async def test_requires_auth(client: AsyncClient):
    assert (await client.get(CAT)).status_code == 401


async def test_typing_a_category_creates_it_once_ignoring_case(
    client: AsyncClient, auth: dict[str, str]
):
    await client.post(TX, json=expense("Groceries"), headers=auth)
    await client.post(TX, json=expense("  groceries "), headers=auth)
    await client.post(TX, json=expense("Fuel"), headers=auth)
    assert await names(client, auth) == ["Fuel", "Groceries"]
    # the first spelling is kept
    rows = (await client.get(TX, headers=auth)).json()
    assert {r["category"] for r in rows} == {"Groceries", "Fuel"}


async def test_split_lines_and_subscriptions_share_the_same_categories(
    client: AsyncClient, auth: dict[str, str]
):
    lines = [
        {"name": "Eggs", "category": "Groceries", "amount": "6"},
        {"name": "Snickers", "category": "Junk food", "amount": "4"},
    ]
    await client.post(TX, json=expense("Groceries", "10", splits=lines), headers=auth)
    sub = {
        "name": "Box",
        "amount": "5",
        "payment_method": "cash",
        "category": "GROCERIES",
        "interval_unit": "month",
        "start_date": "2026-03-01",
    }
    resp = await client.post(SUB, json=sub, headers=auth)
    assert resp.status_code == 201, resp.text
    assert await names(client, auth) == ["Groceries", "Junk food"]


async def test_usage_counts_and_search(client: AsyncClient, auth: dict[str, str]):
    lines = [
        {"name": "a", "category": "Groceries", "amount": "6"},
        {"name": "b", "category": "Junk food", "amount": "4"},
    ]
    await client.post(TX, json=expense("x", "10", splits=lines), headers=auth)
    await client.post(TX, json=expense("Groceries", "5"), headers=auth)
    got = {c["name"]: c for c in (await client.get(CAT, headers=auth)).json()}
    assert got["Groceries"]["transaction_count"] == 2
    assert got["Junk food"]["transaction_count"] == 1
    found = await client.get(CAT, params={"q": "junk"}, headers=auth)
    assert [c["name"] for c in found.json()] == ["Junk food"]
    assert found.headers["x-total-count"] == "1"


async def test_rename_updates_everything_and_rejects_a_taken_name(
    client: AsyncClient, auth: dict[str, str]
):
    await client.post(TX, json=expense("Grocries"), headers=auth)
    await client.post(TX, json=expense("Fuel"), headers=auth)
    cats = {c["name"]: c["id"] for c in (await client.get(CAT, headers=auth)).json()}
    ok = await client.patch(f"{CAT}/{cats['Grocries']}", json={"name": "Groceries"}, headers=auth)
    assert ok.status_code == 200
    assert {r["category"] for r in (await client.get(TX, headers=auth)).json()} == {
        "Groceries",
        "Fuel",
    }
    clash = await client.patch(f"{CAT}/{cats['Grocries']}", json={"name": "fuel"}, headers=auth)
    assert clash.status_code == 409


async def test_delete_only_when_unused(client: AsyncClient, auth: dict[str, str]):
    tid = (await client.post(TX, json=expense("Fuel"), headers=auth)).json()["id"]
    unused = (await client.post(CAT, json={"name": "Spare"}, headers=auth)).json()["id"]
    fuel = next(
        c["id"] for c in (await client.get(CAT, headers=auth)).json() if c["name"] == "Fuel"
    )
    assert (await client.delete(f"{CAT}/{fuel}", headers=auth)).status_code == 409
    assert (await client.delete(f"{CAT}/{unused}", headers=auth)).status_code == 204
    await client.delete(f"{TX}/{tid}", headers=auth)
    assert (await client.delete(f"{CAT}/{fuel}", headers=auth)).status_code == 204


async def test_merge_moves_everything_then_removes_the_source(
    client: AsyncClient, auth: dict[str, str]
):
    lines = [
        {"name": "a", "category": "Junk", "amount": "4"},
        {"name": "b", "category": "Groceries", "amount": "6"},
    ]
    await client.post(TX, json=expense("x", "10", splits=lines), headers=auth)
    await client.post(TX, json=expense("Junk", "3"), headers=auth)
    cats = {c["name"]: c["id"] for c in (await client.get(CAT, headers=auth)).json()}
    merged = await client.post(
        f"{CAT}/{cats['Junk']}/merge", json={"into_id": cats["Groceries"]}, headers=auth
    )
    assert merged.status_code == 200, merged.text
    assert merged.json()["transaction_count"] == 2
    assert await names(client, auth) == ["Groceries"]
    same = await client.post(
        f"{CAT}/{cats['Groceries']}/merge", json={"into_id": cats["Groceries"]}, headers=auth
    )
    assert same.status_code == 422


async def test_categories_are_per_user(client: AsyncClient, auth: dict[str, str], signup: Signup):
    mine = (await client.post(CAT, json={"name": "Fuel"}, headers=auth)).json()["id"]
    bob = await signup("bob@example.com")
    assert (await client.get(CAT, headers=bob)).json() == []
    assert (await client.get(f"{CAT}/{mine}", headers=bob)).status_code == 404
    assert (await client.post(CAT, json={"name": "Fuel"}, headers=bob)).status_code == 201


async def test_filter_transactions_by_category_including_split_items(
    client: AsyncClient, auth: dict[str, str]
):
    lines = [
        {"name": "a", "category": "Junk food", "amount": "4"},
        {"name": "b", "category": "Groceries", "amount": "6"},
    ]
    await client.post(TX, json=expense("x", "10", splits=lines), headers=auth)
    await client.post(TX, json=expense("Fuel", "20"), headers=auth)
    cats = {c["name"]: c["id"] for c in (await client.get(CAT, headers=auth)).json()}

    junk = await client.get(TX, params={"category_id": cats["Junk food"]}, headers=auth)
    assert len(junk.json()) == 1  # the split purchase, via its item
    assert junk.headers["x-total-count"] == "1"
    fuel = await client.get(TX, params={"category_id": cats["Fuel"]}, headers=auth)
    assert len(fuel.json()) == 1


async def test_category_filter_counts_only_the_matching_part_of_a_split(
    client: AsyncClient, auth: dict[str, str]
):
    lines = [
        {"name": "a", "category": "Junk food", "amount": "4"},
        {"name": "b", "category": "Groceries", "amount": "6"},
    ]
    await client.post(TX, json=expense("x", "10", splits=lines), headers=auth)
    await client.post(TX, json=expense("Groceries", "20"), headers=auth)
    cats = {c["name"]: c["id"] for c in (await client.get(CAT, headers=auth)).json()}
    params = {"category_id": cats["Groceries"]}

    summary = (await client.get(f"{TX}/summary", params=params, headers=auth)).json()
    assert summary["expense"] == "26.0000"  # 6 from the split + the plain 20, not the full 30
    breakdown = (await client.get(f"{TX}/categories", params=params, headers=auth)).json()
    assert [(c["category"], c["total"]) for c in breakdown["categories"]] == [
        ("Groceries", "26.0000")
    ]


async def test_transfers_have_no_category(client: AsyncClient, auth: dict[str, str]):
    a = (
        await client.post("/api/v1/accounts", json={"name": "A", "group": "cash"}, headers=auth)
    ).json()
    b = (
        await client.post("/api/v1/accounts", json={"name": "B", "group": "savings"}, headers=auth)
    ).json()
    resp = await client.post(
        TX,
        json={
            "type": "transfer",
            "amount": "5",
            "transaction_date": "2026-03-01",
            "account_id": a["id"],
            "to_account_id": b["id"],
        },
        headers=auth,
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["category"] == "Transfer"
    assert resp.json()["category_id"] is None
    assert await names(client, auth) == []  # not a category you can pick
