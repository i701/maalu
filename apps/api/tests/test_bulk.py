from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import Signup

TX = "/api/v1/transactions"
ACC = "/api/v1/accounts"
VEND = "/api/v1/vendors"
TAGS = "/api/v1/tags"
CAT = "/api/v1/categories"
BULK = f"{TX}/bulk"


async def add(client: AsyncClient, auth, **extra) -> dict:
    body = {
        "type": "expense",
        "amount": "10",
        "payment_method": "cash",
        "category": "Misc",
        "transaction_date": "2026-03-01",
        **extra,
    }
    resp = await client.post(TX, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def transfer(client: AsyncClient, auth) -> dict:
    a = (await client.post(ACC, json={"group": "cash", "name": "A"}, headers=auth)).json()
    b = (await client.post(ACC, json={"group": "cash", "name": "B"}, headers=auth)).json()
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
    return resp.json()


def names(row: dict) -> list[str]:
    return [t["name"] for t in row["tags"]]


async def get(client, auth, t) -> dict:
    return (await client.get(f"{TX}/{t['id']}", headers=auth)).json()


# --- trash / restore / purge ----------------------------------------------------------------


async def test_bulk_trash_moves_them_all(client: AsyncClient, auth):
    ts = [await add(client, auth, description=str(i)) for i in range(3)]
    keep = await add(client, auth, description="keep")
    resp = await client.post(f"{BULK}/trash", json={"ids": [t["id"] for t in ts]}, headers=auth)
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"updated": 3, "skipped": []}
    live = (await client.get(TX, headers=auth)).json()
    assert [t["id"] for t in live] == [keep["id"]]
    assert (await client.get(f"{TX}/trash", headers=auth)).headers["X-Total-Count"] == "3"


async def test_bulk_trash_reports_what_it_could_not(client: AsyncClient, auth, signup: Signup):
    mine = await add(client, auth)
    other = await signup("other@example.com")
    theirs = await add(client, other)
    ghost = "00000000-0000-0000-0000-000000000000"
    resp = await client.post(
        f"{BULK}/trash", json={"ids": [mine["id"], theirs["id"], ghost]}, headers=auth
    )
    body = resp.json()
    assert body["updated"] == 1
    assert {s["id"] for s in body["skipped"]} == {theirs["id"], ghost}
    # Someone else's transaction is untouched.
    assert (await client.get(f"{TX}/{theirs['id']}", headers=other)).status_code == 200


async def test_repeated_ids_count_once(client: AsyncClient, auth):
    t = await add(client, auth)
    resp = await client.post(f"{BULK}/trash", json={"ids": [t["id"], t["id"]]}, headers=auth)
    assert resp.json() == {"updated": 1, "skipped": []}


async def test_bulk_restore_and_purge_only_touch_the_trash(client: AsyncClient, auth):
    a = await add(client, auth)
    b = await add(client, auth)
    live = await add(client, auth)
    await client.post(f"{BULK}/trash", json={"ids": [a["id"], b["id"]]}, headers=auth)

    restored = await client.post(
        f"{BULK}/restore", json={"ids": [a["id"], live["id"]]}, headers=auth
    )
    assert restored.json()["updated"] == 1
    assert [s["id"] for s in restored.json()["skipped"]] == [live["id"]]
    assert (await client.get(f"{TX}/{a['id']}", headers=auth)).status_code == 200

    purged = await client.post(f"{BULK}/purge", json={"ids": [b["id"], live["id"]]}, headers=auth)
    assert purged.json()["updated"] == 1
    assert [s["id"] for s in purged.json()["skipped"]] == [live["id"]]
    assert (await client.get(f"{TX}/trash", headers=auth)).json() == []
    assert (await client.get(f"{TX}/{live['id']}", headers=auth)).status_code == 200


async def test_purge_cannot_delete_a_live_transaction(client: AsyncClient, auth):
    t = await add(client, auth)
    resp = await client.post(f"{BULK}/purge", json={"ids": [t["id"]]}, headers=auth)
    assert resp.json()["updated"] == 0
    assert (await client.get(f"{TX}/{t['id']}", headers=auth)).status_code == 200


async def test_trash_is_scoped_to_the_user(client: AsyncClient, auth, signup: Signup):
    t = await add(client, auth)
    await client.post(f"{BULK}/trash", json={"ids": [t["id"]]}, headers=auth)
    other = await signup("other@example.com")
    for action in ("restore", "purge"):
        resp = await client.post(f"{BULK}/{action}", json={"ids": [t["id"]]}, headers=other)
        assert resp.json()["updated"] == 0
    assert (await client.get(f"{TX}/trash", headers=auth)).headers["X-Total-Count"] == "1"


# --- edit -----------------------------------------------------------------------------------


async def test_bulk_set_category_vendor_and_method(client: AsyncClient, auth):
    ts = [await add(client, auth) for _ in range(3)]
    resp = await client.patch(
        BULK,
        json={
            "ids": [t["id"] for t in ts],
            "category": "Groceries",
            "vendor_name": "Corner Shop",
            "payment_method": "debit_card",
        },
        headers=auth,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"updated": 3, "skipped": []}
    for t in ts:
        row = await get(client, auth, t)
        assert row["category"] == "Groceries"
        assert row["vendor"]["name"] == "Corner Shop"
        assert row["payment_method"] == "debit_card"
    # Found or created once, not per transaction.
    assert len((await client.get(VEND, headers=auth)).json()) == 1
    assert "Groceries" in [c["name"] for c in (await client.get(CAT, headers=auth)).json()]


async def test_untouched_fields_stay(client: AsyncClient, auth):
    t = await add(client, auth, description="note", vendor_name="Old", amount="42")
    await client.patch(BULK, json={"ids": [t["id"]], "category": "New"}, headers=auth)
    row = await get(client, auth, t)
    assert row["category"] == "New"
    assert row["vendor"]["name"] == "Old"
    assert row["description"] == "note"
    assert Decimal(row["amount"]) == 42


async def test_bulk_add_and_remove_tags(client: AsyncClient, auth):
    a = await add(client, auth, tags=["Trip", "Need"])
    b = await add(client, auth, tags=["Need"])
    c = await add(client, auth)
    ids = [a["id"], b["id"], c["id"]]
    added = await client.patch(
        BULK, json={"ids": ids, "add_tags": ["Holiday", "need"]}, headers=auth
    )
    assert added.json()["updated"] == 3
    assert names(await get(client, auth, a)) == ["Holiday", "Need", "Trip"]
    assert names(await get(client, auth, b)) == ["Holiday", "Need"]  # no second Need
    assert names(await get(client, auth, c)) == ["Holiday", "Need"]  # the existing "Need"

    removed = await client.patch(BULK, json={"ids": ids, "remove_tags": ["NEED"]}, headers=auth)
    assert removed.json()["updated"] == 3
    assert names(await get(client, auth, a)) == ["Holiday", "Trip"]
    assert names(await get(client, auth, b)) == ["Holiday"]


async def test_tags_apply_to_transfers_but_the_rest_does_not(client: AsyncClient, auth):
    tr = await transfer(client, auth)
    only_category = await client.patch(
        BULK, json={"ids": [tr["id"]], "category": "Misc"}, headers=auth
    )
    assert only_category.json()["updated"] == 0
    assert "transfer" in only_category.json()["skipped"][0]["reason"].lower()

    both = await client.patch(
        BULK, json={"ids": [tr["id"]], "category": "Misc", "add_tags": ["Move"]}, headers=auth
    )
    assert both.json() == {"updated": 1, "skipped": []}
    row = await get(client, auth, tr)
    assert [t["name"] for t in row["tags"]] == ["Move"]
    assert row["category"] == "Transfer"  # unchanged


async def test_split_transactions_keep_their_item_categories(client: AsyncClient, auth):
    split = await add(
        client,
        auth,
        amount="30",
        category=None,
        splits=[
            {"name": "Milk", "category": "Dairy", "amount": "10"},
            {"name": "Bread", "category": "Bakery", "amount": "20"},
        ],
    )
    plain = await add(client, auth)
    resp = await client.patch(
        BULK, json={"ids": [split["id"], plain["id"]], "category": "Groceries"}, headers=auth
    )
    body = resp.json()
    assert body["updated"] == 1
    assert [s["id"] for s in body["skipped"]] == [split["id"]]
    assert "split" in body["skipped"][0]["reason"].lower()
    assert (await get(client, auth, plain))["category"] == "Groceries"


async def test_a_split_still_takes_the_other_fields(client: AsyncClient, auth):
    split = await add(
        client,
        auth,
        amount="30",
        category=None,
        splits=[
            {"name": "Milk", "category": "Dairy", "amount": "10"},
            {"name": "Bread", "category": "Bakery", "amount": "20"},
        ],
    )
    resp = await client.patch(
        BULK,
        json={"ids": [split["id"]], "category": "Groceries", "vendor_name": "Shop"},
        headers=auth,
    )
    assert resp.json() == {"updated": 1, "skipped": []}
    row = await get(client, auth, split)
    assert row["vendor"]["name"] == "Shop"
    assert {s["category"] for s in row["splits"]} == {"Dairy", "Bakery"}


async def test_edits_skip_the_trash_and_other_users(client: AsyncClient, auth, signup: Signup):
    mine = await add(client, auth)
    trashed = await add(client, auth)
    await client.delete(f"{TX}/{trashed['id']}", headers=auth)
    other = await signup("other@example.com")
    theirs = await add(client, other)
    resp = await client.patch(
        BULK,
        json={"ids": [mine["id"], trashed["id"], theirs["id"]], "category": "X"},
        headers=auth,
    )
    assert resp.json()["updated"] == 1
    assert {s["id"] for s in resp.json()["skipped"]} == {trashed["id"], theirs["id"]}
    assert (await get(client, other, theirs))["category"] == "Misc"


async def test_validation(client: AsyncClient, auth):
    t = await add(client, auth)
    assert (await client.patch(BULK, json={"ids": [t["id"]]}, headers=auth)).status_code == 422
    assert (
        await client.patch(BULK, json={"ids": [], "category": "X"}, headers=auth)
    ).status_code == 422
    many = [f"00000000-0000-0000-0000-{i:012d}" for i in range(501)]
    assert (await client.post(f"{BULK}/trash", json={"ids": many}, headers=auth)).status_code == 422
    bad = await client.patch(
        BULK, json={"ids": [t["id"]], "payment_method": "paypal"}, headers=auth
    )
    assert bad.status_code == 422


async def test_requires_login(client: AsyncClient):
    assert (await client.post(f"{BULK}/trash", json={"ids": []})).status_code == 401
    assert (await client.patch(BULK, json={})).status_code == 401
