from httpx import AsyncClient

TX = "/api/v1/transactions"
CATS = "/api/v1/categories"
ACC = "/api/v1/accounts"


async def setup(client: AsyncClient, auth) -> dict:
    acc = (
        await client.post(
            ACC,
            json={"name": "Main", "group": "accounts", "currency": "MVR", "opening_amount": "5000"},
            headers=auth,
        )
    ).json()
    await client.post(CATS, json={"name": "Food", "kind": "need"}, headers=auth)
    await client.post(CATS, json={"name": "Games", "kind": "want"}, headers=auth)
    out = {}
    for category, amount in (("Food", "300"), ("Games", "100"), ("Misc", "50")):
        res = await client.post(
            TX,
            json={
                "type": "expense",
                "amount": amount,
                "payment_method": "cash",
                "category": category,
                "account_id": acc["id"],
                "transaction_date": "2026-03-01",
            },
            headers=auth,
        )
        out[category] = res.json()["id"]
    return out


async def ids(client: AsyncClient, auth, **params) -> set[str]:
    res = await client.get(TX, params=params, headers=auth)
    assert res.status_code == 200, res.text
    return {t["id"] for t in res.json()}


async def test_the_list_can_be_filtered_by_need_want_or_not_sorted(client: AsyncClient, auth):
    made = await setup(client, auth)
    assert await ids(client, auth, kind="need") == {made["Food"]}
    assert await ids(client, auth, kind="want") == {made["Games"]}
    assert await ids(client, auth, kind="unsorted") == {made["Misc"]}


async def test_a_sub_category_takes_its_parents_kind(client: AsyncClient, auth):
    made = await setup(client, auth)
    parent = (await client.get(CATS, headers=auth)).json()
    food = next(c for c in parent if c["name"] == "Food")
    await client.post(CATS, json={"name": "Dining", "parent_id": food["id"]}, headers=auth)
    acc = (await client.get(ACC, headers=auth)).json()[0]
    dining = (
        await client.post(
            TX,
            json={
                "type": "expense",
                "amount": "20",
                "payment_method": "cash",
                "category": "Dining",
                "account_id": acc["id"],
                "transaction_date": "2026-03-02",
            },
            headers=auth,
        )
    ).json()["id"]
    assert await ids(client, auth, kind="need") == {made["Food"], dining}


async def test_the_totals_and_category_breakdown_follow_the_kind(client: AsyncClient, auth):
    await setup(client, auth)
    totals = (await client.get(f"{TX}/summary", params={"kind": "need"}, headers=auth)).json()
    assert totals["expense"] == "300.0000"
    cats = (await client.get(f"{TX}/categories", params={"kind": "want"}, headers=auth)).json()
    assert [(c["category"], c["total"]) for c in cats["categories"]] == [("Games", "100.0000")]


async def test_a_kind_with_no_categories_matches_nothing(client: AsyncClient, auth):
    await client.post(CATS, json={"name": "Food", "kind": "need"}, headers=auth)
    assert await ids(client, auth, kind="want") == set()
    bad = await client.get(TX, params={"kind": "luxury"}, headers=auth)
    assert bad.status_code == 422
