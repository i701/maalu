from httpx import AsyncClient

from tests.conftest import Signup

VEND = "/api/v1/vendors"
CAT = "/api/v1/categories"
TAGS = "/api/v1/tags"
TX = "/api/v1/transactions"
TPL = "/api/v1/templates"
SUBS = "/api/v1/subscriptions"


async def make(client: AsyncClient, auth, name="Male Fish Market", **extra) -> dict:
    resp = await client.post(VEND, json={"name": name, **extra}, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


def tag_names(v: dict) -> list[str]:
    return [t["name"] for t in v["default_tags"]]


async def test_no_defaults_by_default(client: AsyncClient, auth):
    v = await make(client, auth)
    assert v["default_category"] is None
    assert v["default_tags"] == []


async def test_defaults_are_found_or_created_by_name(client: AsyncClient, auth):
    v = await make(client, auth, default_category="Groceries", default_tags=["Weekly", "need"])
    assert v["default_category"] == "Groceries"
    assert tag_names(v) == ["need", "Weekly"]
    assert [c["name"] for c in (await client.get(CAT, headers=auth)).json()] == ["Groceries"]
    assert len((await client.get(TAGS, headers=auth)).json()) == 2
    # Reused, not duplicated, whatever the case.
    await make(client, auth, "Other", default_category="groceries", default_tags=["WEEKLY"])
    assert len((await client.get(CAT, headers=auth)).json()) == 1
    assert len((await client.get(TAGS, headers=auth)).json()) == 2


async def test_update_sets_replaces_and_clears(client: AsyncClient, auth):
    v = await make(client, auth)
    url = f"{VEND}/{v['id']}"
    set_ = await client.patch(
        url, json={"default_category": "Groceries", "default_tags": ["A", "B"]}, headers=auth
    )
    assert set_.json()["default_category"] == "Groceries"
    assert tag_names(set_.json()) == ["A", "B"]
    # Unrelated edits leave the defaults alone.
    other = await client.patch(url, json={"contact": "123"}, headers=auth)
    assert other.json()["default_category"] == "Groceries"
    assert tag_names(other.json()) == ["A", "B"]
    replaced = await client.patch(url, json={"default_tags": ["C"]}, headers=auth)
    assert tag_names(replaced.json()) == ["C"]
    cleared = await client.patch(
        url, json={"default_category": None, "default_tags": []}, headers=auth
    )
    assert cleared.json()["default_category"] is None
    assert cleared.json()["default_tags"] == []
    nulled = await client.patch(url, json={"default_tags": ["C"]}, headers=auth)
    assert tag_names(nulled.json()) == ["C"]
    assert (await client.patch(url, json={"default_tags": None}, headers=auth)).json()[
        "default_tags"
    ] == []


async def test_limits(client: AsyncClient, auth):
    too_many = [f"t{i}" for i in range(11)]
    assert (
        await client.post(VEND, json={"name": "X", "default_tags": too_many}, headers=auth)
    ).status_code == 422
    assert (
        await client.post(VEND, json={"name": "X", "default_category": " "}, headers=auth)
    ).status_code == 422


async def test_defaults_show_wherever_the_vendor_is_embedded(client: AsyncClient, auth):
    await make(client, auth, default_category="Groceries", default_tags=["Weekly"])
    t = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": "10",
            "payment_method": "cash",
            "category": "Misc",
            "transaction_date": "2026-03-01",
            "vendor_name": "male fish market",
        },
        headers=auth,
    )
    vendor = t.json()["vendor"]
    assert vendor["default_category"] == "Groceries"
    assert tag_names(vendor) == ["Weekly"]
    # Using the defaults is up to the form: the API never overrides what a transaction says.
    assert t.json()["category"] == "Misc"
    assert t.json()["tags"] == []


async def test_deleting_the_category_just_clears_the_default(client: AsyncClient, auth):
    v = await make(client, auth, default_category="Spare")
    cat = (await client.get(CAT, headers=auth)).json()[0]["id"]
    assert (await client.delete(f"{CAT}/{cat}", headers=auth)).status_code == 204
    assert (await client.get(f"{VEND}/{v['id']}", headers=auth)).json()["default_category"] is None


async def test_merging_a_category_moves_vendor_and_template_defaults(client: AsyncClient, auth):
    v = await make(client, auth, default_category="Grocery")
    await client.post(
        TPL, json={"name": "T", "type": "expense", "category": "Grocery"}, headers=auth
    )
    await client.post(CAT, json={"name": "Groceries"}, headers=auth)
    cats = {c["name"]: c["id"] for c in (await client.get(CAT, headers=auth)).json()}
    merged = await client.post(
        f"{CAT}/{cats['Grocery']}/merge", json={"into_id": cats["Groceries"]}, headers=auth
    )
    assert merged.status_code == 200
    assert (await client.get(f"{VEND}/{v['id']}", headers=auth)).json()[
        "default_category"
    ] == "Groceries"
    assert (await client.get(TPL, headers=auth)).json()[0]["category"] == "Groceries"


async def test_merging_a_tag_moves_vendor_defaults_without_duplicates(client: AsyncClient, auth):
    both = await make(client, auth, "Both", default_tags=["Trip", "Holiday"])
    only = await make(client, auth, "Only", default_tags=["Holiday"])
    tags = {t["name"]: t["id"] for t in (await client.get(TAGS, headers=auth)).json()}
    merged = await client.post(
        f"{TAGS}/{tags['Holiday']}/merge", json={"into_id": tags["Trip"]}, headers=auth
    )
    assert merged.status_code == 200
    assert tag_names((await client.get(f"{VEND}/{both['id']}", headers=auth)).json()) == ["Trip"]
    assert tag_names((await client.get(f"{VEND}/{only['id']}", headers=auth)).json()) == ["Trip"]


async def test_deleting_a_tag_unlinks_it_from_vendors(client: AsyncClient, auth):
    v = await make(client, auth, default_tags=["Trip", "Need"])
    trip = next(t for t in v["default_tags"] if t["name"] == "Trip")
    await client.delete(f"{TAGS}/{trip['id']}", headers=auth)
    after = (await client.get(f"{VEND}/{v['id']}", headers=auth)).json()
    assert tag_names(after) == ["Need"]


async def test_vendor_defaults_are_private(client: AsyncClient, auth, signup: Signup):
    await make(client, auth, default_category="Groceries", default_tags=["Weekly"])
    other = await signup("other@example.com")
    # The same names are free for another user and do not leak between accounts.
    mine = await make(client, other, default_category="Groceries", default_tags=["Weekly"])
    assert mine["default_category"] == "Groceries"
    assert len((await client.get(CAT, headers=auth)).json()) == 1
    assert len((await client.get(CAT, headers=other)).json()) == 1
    assert len((await client.get(TAGS, headers=other)).json()) == 1


async def test_vendor_list_carries_defaults(client: AsyncClient, auth):
    await make(client, auth, "A", default_category="Groceries", default_tags=["Weekly"])
    await make(client, auth, "B")
    rows = (await client.get(VEND, headers=auth)).json()
    assert [(v["name"], v["default_category"], tag_names(v)) for v in rows] == [
        ("A", "Groceries", ["Weekly"]),
        ("B", None, []),
    ]
