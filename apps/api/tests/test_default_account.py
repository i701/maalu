from httpx import AsyncClient

from tests.conftest import Signup

ME = "/api/v1/users/me"
ACC = "/api/v1/accounts"
TX = "/api/v1/transactions"


async def account(client: AsyncClient, auth, name="Wallet") -> dict:
    resp = await client.post(ACC, json={"group": "cash", "name": name}, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_no_default_account_at_first(client: AsyncClient, auth):
    assert (await client.get(ME, headers=auth)).json()["default_account_id"] is None


async def test_set_and_clear(client: AsyncClient, auth):
    a = await account(client, auth)
    resp = await client.patch(ME, json={"default_account_id": a["id"]}, headers=auth)
    assert resp.status_code == 200, resp.text
    assert resp.json()["default_account_id"] == a["id"]
    assert (await client.get(ME, headers=auth)).json()["default_account_id"] == a["id"]
    cleared = await client.patch(ME, json={"default_account_id": None}, headers=auth)
    assert cleared.json()["default_account_id"] is None


async def test_an_empty_update_changes_nothing(client: AsyncClient, auth):
    a = await account(client, auth)
    await client.patch(ME, json={"default_account_id": a["id"]}, headers=auth)
    same = await client.patch(ME, json={}, headers=auth)
    assert same.json()["default_account_id"] == a["id"]


async def test_must_be_your_own_account(client: AsyncClient, auth, signup: Signup):
    other = await signup("other@example.com")
    theirs = await account(client, other, "Theirs")
    resp = await client.patch(ME, json={"default_account_id": theirs["id"]}, headers=auth)
    assert resp.status_code == 422
    missing = await client.patch(
        ME, json={"default_account_id": "00000000-0000-0000-0000-000000000000"}, headers=auth
    )
    assert missing.status_code == 422
    assert (await client.get(ME, headers=auth)).json()["default_account_id"] is None


async def test_an_archived_account_is_refused(client: AsyncClient, auth):
    a = await account(client, auth)
    await client.post(f"{ACC}/{a['id']}/archive", headers=auth)
    resp = await client.patch(ME, json={"default_account_id": a["id"]}, headers=auth)
    assert resp.status_code == 422
    assert "archived" in resp.json()["detail"]


async def test_archiving_the_default_account_clears_it(client: AsyncClient, auth):
    a = await account(client, auth)
    b = await account(client, auth, "Other")
    await client.patch(ME, json={"default_account_id": a["id"]}, headers=auth)
    await client.post(f"{ACC}/{b['id']}/archive", headers=auth)  # another account: no change
    assert (await client.get(ME, headers=auth)).json()["default_account_id"] == a["id"]
    await client.post(f"{ACC}/{a['id']}/archive", headers=auth)
    assert (await client.get(ME, headers=auth)).json()["default_account_id"] is None


async def test_deleting_the_default_account_clears_it(client: AsyncClient, auth):
    a = await account(client, auth)
    await client.patch(ME, json={"default_account_id": a["id"]}, headers=auth)
    assert (await client.delete(f"{ACC}/{a['id']}", headers=auth)).status_code == 204
    assert (await client.get(ME, headers=auth)).json()["default_account_id"] is None


async def test_the_default_is_only_a_convenience(client: AsyncClient, auth):
    a = await account(client, auth)
    await client.patch(ME, json={"default_account_id": a["id"]}, headers=auth)
    # The API never applies it: a transaction without an account stays without one.
    t = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": "5",
            "payment_method": "cash",
            "category": "Misc",
            "transaction_date": "2026-03-01",
        },
        headers=auth,
    )
    assert t.json()["account"] is None


async def test_each_user_has_their_own_default(client: AsyncClient, auth, signup: Signup):
    a = await account(client, auth)
    await client.patch(ME, json={"default_account_id": a["id"]}, headers=auth)
    other = await signup("other@example.com")
    assert (await client.get(ME, headers=other)).json()["default_account_id"] is None


async def test_requires_login(client: AsyncClient):
    assert (await client.patch(ME, json={})).status_code == 401
