from httpx import AsyncClient

ME = "/api/v1/users/me"


async def test_starting_from_a_template_is_on_by_default(client: AsyncClient, auth):
    assert (await client.get(ME, headers=auth)).json()["start_from_template"] is True


async def test_turn_it_off_and_on_again(client: AsyncClient, auth):
    off = await client.patch(ME, json={"start_from_template": False}, headers=auth)
    assert off.status_code == 200, off.text
    assert off.json()["start_from_template"] is False
    assert (await client.get(ME, headers=auth)).json()["start_from_template"] is False
    on = await client.patch(ME, json={"start_from_template": True}, headers=auth)
    assert on.json()["start_from_template"] is True


async def test_other_updates_leave_it_alone(client: AsyncClient, auth):
    await client.patch(ME, json={"start_from_template": False}, headers=auth)
    same = await client.patch(ME, json={"default_account_id": None}, headers=auth)
    assert same.json()["start_from_template"] is False
    assert (await client.patch(ME, json={}, headers=auth)).json()["start_from_template"] is False


async def test_it_is_a_yes_or_no(client: AsyncClient, auth):
    resp = await client.patch(ME, json={"start_from_template": None}, headers=auth)
    assert resp.status_code == 422


async def test_each_user_has_their_own(client: AsyncClient, auth, signup):
    other = await signup("other@example.com")
    await client.patch(ME, json={"start_from_template": False}, headers=auth)
    assert (await client.get(ME, headers=other)).json()["start_from_template"] is True
