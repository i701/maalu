from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import Signup

ACC = "/api/v1/accounts"
TX = "/api/v1/transactions"
GOALS = "/api/v1/goals"
STATS = "/api/v1/stats"


async def make(client: AsyncClient, auth, name="Old card", **extra) -> dict:
    body = {"group": "savings", "name": name, "opening_amount": "200", **extra}
    resp = await client.post(ACC, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


def expense(account_id: str, amount="25") -> dict:
    return {
        "type": "expense",
        "amount": amount,
        "payment_method": "cash",
        "category": "Misc",
        "transaction_date": "2026-03-01",
        "account_id": account_id,
    }


async def test_archive_hides_it_from_the_list_and_totals(client: AsyncClient, auth):
    keep = await make(client, auth, "Main", opening_amount="1000")
    old = await make(client, auth, "Old")
    resp = await client.post(f"{ACC}/{old['id']}/archive", headers=auth)
    assert resp.status_code == 200
    assert resp.json()["archived_at"] is not None

    listed = await client.get(ACC, headers=auth)
    assert [a["id"] for a in listed.json()] == [keep["id"]]
    assert listed.headers["X-Total-Count"] == "1"
    summary = (await client.get(f"{ACC}/summary", headers=auth)).json()
    assert Decimal(summary["assets"]) == 1000

    archived = await client.get(ACC, params={"archived": True}, headers=auth)
    assert [a["id"] for a in archived.json()] == [old["id"]]
    assert archived.headers["X-Total-Count"] == "1"
    # It can still be opened directly.
    assert (await client.get(f"{ACC}/{old['id']}", headers=auth)).status_code == 200


async def test_unarchive_restores_it(client: AsyncClient, auth):
    old = await make(client, auth)
    await client.post(f"{ACC}/{old['id']}/archive", headers=auth)
    resp = await client.post(f"{ACC}/{old['id']}/unarchive", headers=auth)
    assert resp.json()["archived_at"] is None
    assert [a["id"] for a in (await client.get(ACC, headers=auth)).json()] == [old["id"]]
    assert (await client.get(ACC, params={"archived": True}, headers=auth)).json() == []


async def test_archiving_twice_keeps_the_first_time(client: AsyncClient, auth):
    old = await make(client, auth)
    first = (await client.post(f"{ACC}/{old['id']}/archive", headers=auth)).json()
    second = (await client.post(f"{ACC}/{old['id']}/archive", headers=auth)).json()
    # SQLite drops the timezone on a re-read, so compare without the trailing Z.
    assert first["archived_at"].rstrip("Z") == second["archived_at"].rstrip("Z")


async def test_history_stays_but_new_transactions_are_refused(client: AsyncClient, auth):
    old = await make(client, auth)
    t = (await client.post(TX, json=expense(old["id"]), headers=auth)).json()
    await client.post(f"{ACC}/{old['id']}/archive", headers=auth)

    # The past transaction is still listed and still shows its account.
    row = (await client.get(f"{TX}/{t['id']}", headers=auth)).json()
    assert row["account"]["id"] == old["id"]
    # Its balance is still computed when you look at the archived account.
    assert Decimal((await client.get(f"{ACC}/{old['id']}", headers=auth)).json()["balance"]) == 175

    refused = await client.post(TX, json=expense(old["id"]), headers=auth)
    assert refused.status_code == 422
    assert "archived" in refused.json()["detail"]
    # Editing the old one without moving it works.
    ok = await client.patch(
        f"{TX}/{t['id']}", json={"account_id": old["id"], "description": "x"}, headers=auth
    )
    assert ok.status_code == 200, ok.text
    # But moving another transaction into it does not.
    other = await client.post(TX, json={**expense(old["id"]), "account_id": None}, headers=auth)
    moved = await client.patch(
        f"{TX}/{other.json()['id']}", json={"account_id": old["id"]}, headers=auth
    )
    assert moved.status_code == 422


async def test_unarchived_account_takes_transactions_again(client: AsyncClient, auth):
    old = await make(client, auth)
    await client.post(f"{ACC}/{old['id']}/archive", headers=auth)
    await client.post(f"{ACC}/{old['id']}/unarchive", headers=auth)
    assert (await client.post(TX, json=expense(old["id"]), headers=auth)).status_code == 201


async def test_archived_account_leaves_the_balance_trend(client: AsyncClient, auth):
    await make(client, auth, "Main", opening_amount="1000")
    old = await make(client, auth, "Old", opening_amount="300")
    params = {"from": "2026-05-01", "to": "2026-05-01"}
    both = (await client.get(f"{STATS}/balance-trend", params=params, headers=auth)).json()
    assert Decimal(both["points"][0]["total"]) == 1300
    await client.post(f"{ACC}/{old['id']}/archive", headers=auth)
    one = (await client.get(f"{STATS}/balance-trend", params=params, headers=auth)).json()
    assert Decimal(one["points"][0]["total"]) == 1000


async def test_a_goal_cannot_follow_an_archived_account(client: AsyncClient, auth):
    old = await make(client, auth)
    await client.post(f"{ACC}/{old['id']}/archive", headers=auth)
    resp = await client.post(
        GOALS,
        json={"name": "Trip", "target_amount": "500", "account_id": old["id"]},
        headers=auth,
    )
    assert resp.status_code == 422
    assert "archived" in resp.json()["detail"]


async def test_archive_is_private(client: AsyncClient, auth, signup: Signup):
    old = await make(client, auth)
    other = await signup("other@example.com")
    assert (await client.post(f"{ACC}/{old['id']}/archive", headers=other)).status_code == 404
    assert (await client.post(f"{ACC}/{old['id']}/unarchive", headers=other)).status_code == 404
