from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import Signup

URL = "/api/v1/templates"
ACC = "/api/v1/accounts"
TX = "/api/v1/transactions"
CAT = "/api/v1/categories"
VEND = "/api/v1/vendors"


def body(**extra) -> dict:
    return {
        "name": "Weekly fish box",
        "type": "expense",
        "amount": "120",
        "payment_method": "cash",
        "category": "Groceries",
        "vendor_name": "Male Fish Market",
        "description": "Fish for the week",
        **extra,
    }


async def make(client: AsyncClient, auth, **extra) -> dict:
    resp = await client.post(URL, json=body(**extra), headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def account(client: AsyncClient, auth, name="Wallet", **extra) -> dict:
    resp = await client.post(
        ACC, json={"group": "cash", "name": name, "opening_amount": "10", **extra}, headers=auth
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_create_returns_what_the_form_needs(client: AsyncClient, auth):
    t = await make(client, auth)
    assert t["name"] == "Weekly fish box"
    assert t["type"] == "expense"
    assert Decimal(t["amount"]) == 120
    assert t["currency"] == "MVR"  # the base currency
    assert t["payment_method"] == "cash"
    assert t["category"] == "Groceries"
    assert t["vendor"] == "Male Fish Market"
    assert t["description"] == "Fish for the week"
    assert t["account"] is None


async def test_category_and_vendor_are_found_or_created(client: AsyncClient, auth):
    await make(client, auth)
    cats = [c["name"] for c in (await client.get(CAT, headers=auth)).json()]
    vendors = [v["name"] for v in (await client.get(VEND, headers=auth)).json()]
    assert "Groceries" in cats
    assert "Male Fish Market" in vendors
    # A second template reuses them rather than duplicating.
    await make(client, auth, name="Other", vendor_name="male fish market", category="groceries")
    assert len((await client.get(VEND, headers=auth)).json()) == 1
    assert len((await client.get(CAT, headers=auth)).json()) == 1


async def test_amount_and_most_fields_are_optional(client: AsyncClient, auth):
    resp = await client.post(URL, json={"name": "Coffee", "type": "expense"}, headers=auth)
    assert resp.status_code == 201, resp.text
    t = resp.json()
    assert t["amount"] is None
    assert t["category"] is None
    assert t["payment_method"] == "other"


async def test_account_sets_the_currency(client: AsyncClient, auth):
    usd = await account(client, auth, "USD", currency="USD", exchange_rate="15")
    t = await make(client, auth, account_id=usd["id"], currency="EUR")
    assert t["currency"] == "USD"
    assert t["account"]["id"] == usd["id"]


async def test_transfer_template(client: AsyncClient, auth):
    a = await account(client, auth, "Main")
    b = await account(client, auth, "Savings")
    t = (
        await client.post(
            URL,
            json={
                "name": "Move to savings",
                "type": "transfer",
                "amount": "500",
                "account_id": a["id"],
                "to_account_id": b["id"],
            },
            headers=auth,
        )
    ).json()
    assert t["account"]["id"] == a["id"]
    assert t["to_account"]["id"] == b["id"]


async def test_rules(client: AsyncClient, auth):
    a = await account(client, auth, "Main")
    transfer = {"name": "T", "type": "transfer", "account_id": a["id"]}
    same = await client.post(URL, json={**transfer, "to_account_id": a["id"]}, headers=auth)
    assert same.status_code == 422
    with_cat = await client.post(URL, json={**transfer, "category": "Misc"}, headers=auth)
    assert with_cat.status_code == 422
    stray = await client.post(URL, json=body(to_account_id=a["id"]), headers=auth)
    assert stray.status_code == 422
    both = await client.post(
        URL, json=body(vendor_id="00000000-0000-0000-0000-000000000000"), headers=auth
    )
    assert both.status_code == 422  # vendor_id and vendor_name together
    zero = await client.post(URL, json=body(amount="0"), headers=auth)
    assert zero.status_code == 422
    unknown = await client.post(
        URL,
        json=body(vendor_name=None, account_id="00000000-0000-0000-0000-000000000000"),
        headers=auth,
    )
    assert unknown.status_code == 422


async def test_archived_account_is_refused(client: AsyncClient, auth):
    a = await account(client, auth, "Old")
    await client.post(f"{ACC}/{a['id']}/archive", headers=auth)
    resp = await client.post(URL, json=body(account_id=a["id"]), headers=auth)
    assert resp.status_code == 422
    assert "archived" in resp.json()["detail"]


async def test_names_are_unique_ignoring_case(client: AsyncClient, auth):
    await make(client, auth, name="Fish")
    clash = await client.post(URL, json=body(name="  fish "), headers=auth)
    assert clash.status_code == 409


async def test_list_by_name_with_total(client: AsyncClient, auth):
    await make(client, auth, name="Zebra")
    await make(client, auth, name="apple")
    resp = await client.get(URL, headers=auth)
    assert [t["name"] for t in resp.json()] == ["apple", "Zebra"]
    assert resp.headers["X-Total-Count"] == "2"
    page = await client.get(URL, params={"limit": 1, "offset": 1}, headers=auth)
    assert [t["name"] for t in page.json()] == ["Zebra"]


async def test_rename_and_its_conflicts(client: AsyncClient, auth):
    a = await make(client, auth, name="A")
    await make(client, auth, name="B")
    ok = await client.patch(f"{URL}/{a['id']}", json={"name": "Renamed"}, headers=auth)
    assert ok.json()["name"] == "Renamed"
    same = await client.patch(f"{URL}/{a['id']}", json={"name": "renamed"}, headers=auth)
    assert same.status_code == 200  # only itself
    clash = await client.patch(f"{URL}/{a['id']}", json={"name": "b"}, headers=auth)
    assert clash.status_code == 409


async def test_delete(client: AsyncClient, auth):
    t = await make(client, auth)
    assert (await client.delete(f"{URL}/{t['id']}", headers=auth)).status_code == 204
    assert (await client.get(f"{URL}/{t['id']}", headers=auth)).status_code == 404
    assert (await client.get(URL, headers=auth)).json() == []


async def test_templates_never_block_deleting_what_they_point_at(client: AsyncClient, auth):
    a = await account(client, auth, "Gone")
    t = await make(client, auth, account_id=a["id"])
    cat = next(c["id"] for c in (await client.get(CAT, headers=auth)).json())
    assert (await client.delete(f"{ACC}/{a['id']}", headers=auth)).status_code == 204
    assert (await client.delete(f"{CAT}/{cat}", headers=auth)).status_code == 204
    left = (await client.get(f"{URL}/{t['id']}", headers=auth)).json()
    assert left["account"] is None
    assert left["category"] is None


async def test_templates_are_private(client: AsyncClient, auth, signup: Signup):
    t = await make(client, auth)
    other = await signup("other@example.com")
    assert (await client.get(URL, headers=other)).json() == []
    assert (await client.get(f"{URL}/{t['id']}", headers=other)).status_code == 404
    assert (
        await client.patch(f"{URL}/{t['id']}", json={"name": "x"}, headers=other)
    ).status_code == 404
    assert (await client.delete(f"{URL}/{t['id']}", headers=other)).status_code == 404
    # The same name is free for another user.
    assert (await client.post(URL, json=body(), headers=other)).status_code == 201


async def test_requires_login(client: AsyncClient):
    assert (await client.get(URL)).status_code == 401
