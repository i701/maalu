from httpx import AsyncClient

from tests.conftest import Signup

CAT = "/api/v1/categories"
TX = "/api/v1/transactions"


def expense(category: str, amount: str = "10", **extra) -> dict:
    return {
        "type": "expense",
        "amount": amount,
        "payment_method": "cash",
        "category": category,
        "transaction_date": "2026-03-01",
        **extra,
    }


async def make(client: AsyncClient, auth, name: str, **extra) -> dict:
    res = await client.post(CAT, json={"name": name, **extra}, headers=auth)
    assert res.status_code == 201, res.text
    return res.json()


async def kinds(client: AsyncClient, auth) -> dict[str, str | None]:
    return {
        c["name"]: c["kind"]
        for c in [c for c in (await client.get(CAT, headers=auth)).json() if not c["is_salary"]]
    }


async def test_a_category_starts_unsorted_and_can_be_set_and_cleared(
    client: AsyncClient, auth: dict[str, str]
):
    food = await make(client, auth, "Food")
    assert food["kind"] is None
    assert food["effective_kind"] is None

    res = await client.patch(f"{CAT}/{food['id']}", json={"kind": "need"}, headers=auth)
    assert res.json()["kind"] == "need"

    res = await client.patch(f"{CAT}/{food['id']}", json={"kind": None}, headers=auth)
    assert res.json()["kind"] is None

    assert (await make(client, auth, "Games", kind="want"))["kind"] == "want"


async def test_a_kind_must_be_need_or_want(client: AsyncClient, auth: dict[str, str]):
    res = await client.post(CAT, json={"name": "X", "kind": "luxury"}, headers=auth)
    assert res.status_code == 422


async def test_leaving_kind_out_of_an_update_keeps_it(client: AsyncClient, auth: dict[str, str]):
    food = await make(client, auth, "Food", kind="need")
    res = await client.patch(f"{CAT}/{food['id']}", json={"name": "Meals"}, headers=auth)
    assert res.json()["kind"] == "need"


async def test_a_sub_category_takes_its_parents_kind_unless_it_has_its_own(
    client: AsyncClient, auth: dict[str, str]
):
    food = await make(client, auth, "Food", kind="need")
    plain = await make(client, auth, "Groceries", parent_id=food["id"])
    treats = await make(client, auth, "Dining", parent_id=food["id"], kind="want")

    by_name = {
        c["name"]: c
        for c in [c for c in (await client.get(CAT, headers=auth)).json() if not c["is_salary"]]
    }
    assert by_name["Groceries"]["kind"] is None
    assert by_name["Groceries"]["effective_kind"] == "need"
    assert by_name["Dining"]["effective_kind"] == "want"
    assert plain["id"] != treats["id"]


async def test_setting_many_at_once_skips_other_peoples_categories(
    client: AsyncClient, auth: dict[str, str], signup: Signup
):
    a = await make(client, auth, "A")
    b = await make(client, auth, "B")
    other = await signup("other@example.com")
    theirs = await make(client, other, "Theirs")

    res = await client.patch(
        f"{CAT}/kind", json={"ids": [a["id"], b["id"], theirs["id"]], "kind": "want"}, headers=auth
    )
    assert res.status_code == 200
    assert res.json() == {"updated": 2}
    assert await kinds(client, auth) == {"A": "want", "B": "want"}
    assert await kinds(client, other) == {"Theirs": None}  # untouched

    res = await client.patch(f"{CAT}/kind", json={"ids": [a["id"]], "kind": None}, headers=auth)
    assert res.json() == {"updated": 1}
    assert (await kinds(client, auth))["A"] is None


async def test_setting_many_needs_at_least_one_id(client: AsyncClient, auth: dict[str, str]):
    res = await client.patch(f"{CAT}/kind", json={"ids": [], "kind": "need"}, headers=auth)
    assert res.status_code == 422


async def test_merging_gives_the_target_the_sources_kind_only_when_it_has_none(
    client: AsyncClient, auth: dict[str, str]
):
    source = await make(client, auth, "Source", kind="want")
    bare = await make(client, auth, "Bare")
    sorted_ = await make(client, auth, "Sorted", kind="need")

    await client.post(f"{CAT}/{source['id']}/merge", json={"into_id": bare["id"]}, headers=auth)
    assert (await kinds(client, auth))["Bare"] == "want"

    again = await make(client, auth, "Again", kind="want")
    await client.post(f"{CAT}/{again['id']}/merge", json={"into_id": sorted_["id"]}, headers=auth)
    assert (await kinds(client, auth))["Sorted"] == "need"


async def test_category_totals_carry_the_effective_kind(client: AsyncClient, auth: dict[str, str]):
    food = await make(client, auth, "Food", kind="need")
    await make(client, auth, "Groceries", parent_id=food["id"])
    await make(client, auth, "Games", kind="want")
    await make(client, auth, "Misc")
    for category in ("Groceries", "Games", "Misc"):
        assert (await client.post(TX, json=expense(category), headers=auth)).status_code == 201

    totals = (await client.get(f"{TX}/categories", headers=auth)).json()["categories"]
    assert {c["category"]: c["kind"] for c in totals} == {
        "Groceries": "need",  # from its parent
        "Games": "want",
        "Misc": None,
    }

    months = (
        await client.get(
            f"{TX}/categories/monthly",
            params={"date_from": "2026-03-01", "date_to": "2026-03-31"},
            headers=auth,
        )
    ).json()["categories"]
    assert {c["category"]: c["kind"] for c in months} == {
        "Groceries": "need",
        "Games": "want",
        "Misc": None,
    }
