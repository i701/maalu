from app.services import transaction as service
from httpx import AsyncClient

from tests.conftest import Signup

TX = "/api/v1/transactions"


async def add(client: AsyncClient, auth, **extra) -> dict:
    body = {
        "type": "expense",
        "amount": "10",
        "payment_method": "cash",
        "category": "Food",
        "transaction_date": "2026-03-10",
        **extra,
    }
    resp = await client.post(TX, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_ids_cover_every_match_not_one_page(client: AsyncClient, auth):
    made = [await add(client, auth) for _ in range(5)]
    page = await client.get(TX, params={"limit": 2}, headers=auth)
    assert len(page.json()) == 2
    resp = await client.get(f"{TX}/ids", headers=auth)
    assert resp.status_code == 200
    assert set(resp.json()) == {t["id"] for t in made}


async def test_ids_follow_the_list_filters(client: AsyncClient, auth):
    coffee = await add(client, auth, category="Coffee", tags=["Trip"])
    await add(client, auth, category="Rent")
    by_category = await client.get(f"{TX}/ids", params={"q": "coffee"}, headers=auth)
    assert by_category.json() == [coffee["id"]]
    tag_id = coffee["tags"][0]["id"]
    by_tag = await client.get(f"{TX}/ids", params={"tag_id": tag_id}, headers=auth)
    assert by_tag.json() == [coffee["id"]]
    by_type = await client.get(f"{TX}/ids", params={"type": "income"}, headers=auth)
    assert by_type.json() == []


async def test_ids_leave_out_trashed_and_planned_unless_asked(client: AsyncClient, auth):
    live = await add(client, auth)
    gone = await add(client, auth)
    soon = await add(client, auth, planned=True)
    await client.delete(f"{TX}/{gone['id']}", headers=auth)
    assert (await client.get(f"{TX}/ids", headers=auth)).json() == [live["id"]]
    upcoming = await client.get(f"{TX}/ids", params={"planned": "true"}, headers=auth)
    assert upcoming.json() == [soon["id"]]


async def test_ids_are_only_yours(client: AsyncClient, auth, signup: Signup):
    mine = await add(client, auth)
    bob = await signup("bob@example.com")
    await add(client, bob)
    assert (await client.get(f"{TX}/ids", headers=auth)).json() == [mine["id"]]


async def test_ids_refuse_to_hand_back_a_part(client: AsyncClient, auth, monkeypatch):
    monkeypatch.setattr(service, "MAX_SELECT_ALL", 2)
    for _ in range(3):
        await add(client, auth)
    resp = await client.get(f"{TX}/ids", headers=auth)
    assert resp.status_code == 422
    assert "up to 2" in resp.json()["detail"]


async def test_bad_filters_are_still_rejected(client: AsyncClient, auth):
    resp = await client.get(
        f"{TX}/ids", params={"min_amount": "9", "max_amount": "1"}, headers=auth
    )
    assert resp.status_code == 422


async def test_trash_ids(client: AsyncClient, auth, signup: Signup):
    a = await add(client, auth)
    b = await add(client, auth)
    await add(client, auth)  # stays live
    for t in (a, b):
        await client.delete(f"{TX}/{t['id']}", headers=auth)
    resp = await client.get(f"{TX}/trash/ids", headers=auth)
    assert set(resp.json()) == {a["id"], b["id"]}
    bob = await signup("bob@example.com")
    assert (await client.get(f"{TX}/trash/ids", headers=bob)).json() == []


async def test_ids_work_with_the_bulk_actions(client: AsyncClient, auth):
    for _ in range(3):
        await add(client, auth)
    ids = (await client.get(f"{TX}/ids", headers=auth)).json()
    resp = await client.post(f"{TX}/bulk/trash", json={"ids": ids}, headers=auth)
    assert resp.json()["updated"] == 3
    assert (await client.get(f"{TX}/ids", headers=auth)).json() == []
