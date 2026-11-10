from datetime import UTC, datetime, timedelta

import pytest
from app.api_scopes import AREAS
from app.services import api_key as keys
from httpx import AsyncClient

from tests.conftest import Signup

KEYS = "/api/v1/api-keys"


@pytest.fixture
def clock(monkeypatch):
    """The time keys go by, movable: `clock.now` is read by the service."""

    class Clock:
        now = datetime.now(UTC)

        def advance(self, **delta):
            self.now = self.now + timedelta(**delta)

    c = Clock()
    monkeypatch.setattr(keys, "_now", lambda: c.now)
    return c


def bearer(secret: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {secret}"}


async def make(client: AsyncClient, auth, **body) -> dict:
    res = await client.post(KEYS, json={"name": "Bot", "role": "viewer", **body}, headers=auth)
    assert res.status_code == 201, res.text
    return res.json()


async def test_a_key_is_made_with_its_secret_shown_once(client: AsyncClient, auth):
    made = await make(client, auth)
    assert made["secret"].startswith("mlk_")
    assert made["key"]["prefix"] == made["secret"][:12]
    assert made["key"]["role"] == "viewer"
    assert "budget:read" in made["key"]["scopes"]
    assert made["key"]["expires_at"] is not None  # 90 days by default
    listed = (await client.get(KEYS, headers=auth)).json()
    assert [k["id"] for k in listed] == [made["key"]["id"]]
    assert "secret" not in listed[0]
    assert made["secret"] not in (await client.get(KEYS, headers=auth)).text


async def test_a_viewer_reads_but_cannot_change_anything(client: AsyncClient, auth):
    secret = (await make(client, auth))["secret"]
    for path in ("/accounts", "/budget", "/transactions", "/categories", "/goals"):
        res = await client.get(f"/api/v1{path}", headers=bearer(secret))
        assert res.status_code == 200, (path, res.text)
    tx = {
        "type": "expense",
        "amount": "10",
        "payment_method": "cash",
        "category": "Misc",
        "transaction_date": "2026-01-01",
    }
    res = await client.post("/api/v1/transactions", json=tx, headers=bearer(secret))
    assert res.status_code == 403
    assert "transactions:write" in res.json()["detail"]


async def test_an_assistant_can_add_a_transaction_but_not_delete_one(client: AsyncClient, auth):
    secret = (await make(client, auth, role="assistant"))["secret"]
    tx = {
        "type": "expense",
        "amount": "10",
        "payment_method": "cash",
        "category": "Misc",
        "transaction_date": "2026-01-01",
    }
    made = await client.post("/api/v1/transactions", json=tx, headers=bearer(secret))
    assert made.status_code == 201, made.text
    gone = await client.delete(f"/api/v1/transactions/{made.json()['id']}", headers=bearer(secret))
    assert gone.status_code == 403
    assert "transactions:delete" in gone.json()["detail"]


async def test_a_key_can_never_reach_what_stays_in_the_browser(client: AsyncClient, auth):
    # even with every permission there is
    everything = [f"{a}:{x}" for a in AREAS for x in ("read", "write", "delete")]
    secret = (await make(client, auth, scopes=everything))["secret"]
    for method, path in [
        ("GET", "/auth/sessions"),
        ("POST", "/auth/password"),
        ("GET", "/users/me"),
        ("GET", "/backup"),
        ("GET", "/api-keys"),
        ("POST", "/api-keys"),
        ("GET", "/transactions/export"),
        ("POST", "/email/test"),
    ]:
        res = await client.request(method, f"/api/v1{path}", headers=bearer(secret))
        assert res.status_code == 403, (method, path, res.status_code)


async def test_a_key_cannot_make_a_stronger_key(client: AsyncClient, auth):
    secret = (await make(client, auth, role="editor"))["secret"]
    res = await client.post(KEYS, json={"name": "Sneaky", "role": "editor"}, headers=bearer(secret))
    assert res.status_code == 403
    assert len((await client.get(KEYS, headers=auth)).json()) == 1


async def test_whoami_tells_a_key_what_it_may_do(client: AsyncClient, auth):
    secret = (await make(client, auth, name="Telegram bot", role="reports"))["secret"]
    me = (await client.get("/api/v1/whoami", headers=bearer(secret))).json()
    assert me["kind"] == "api_key"
    assert me["key_name"] == "Telegram bot"
    assert sorted(me["scopes"]) == ["budget:read", "plan:read", "reports:read"]
    person = (await client.get("/api/v1/whoami", headers=auth)).json()
    assert person["kind"] == "session"


async def test_what_a_key_may_do_is_what_it_was_given_not_the_roles_name(client: AsyncClient, auth):
    made = await make(client, auth, scopes=["budget:read", "plan:read"])
    assert made["key"]["role"] == "custom"
    assert made["key"]["scopes"] == ["budget:read", "plan:read"]
    secret = made["secret"]
    assert (await client.get("/api/v1/budget", headers=bearer(secret))).status_code == 200
    assert (await client.get("/api/v1/accounts", headers=bearer(secret))).status_code == 403


async def test_changing_the_permissions_takes_effect_on_the_next_request(client: AsyncClient, auth):
    made = await make(client, auth, role="viewer")
    secret, key_id = made["secret"], made["key"]["id"]
    assert (await client.get("/api/v1/accounts", headers=bearer(secret))).status_code == 200
    changed = await client.patch(
        f"{KEYS}/{key_id}", json={"scopes": ["budget:read"], "name": "Budget only"}, headers=auth
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["role"] == "custom"
    assert changed.json()["name"] == "Budget only"
    assert (await client.get("/api/v1/accounts", headers=bearer(secret))).status_code == 403
    assert (await client.get("/api/v1/budget", headers=bearer(secret))).status_code == 200


async def test_a_key_stops_working_when_it_expires(client: AsyncClient, auth, clock):
    made = await make(client, auth, expires_in_days=7)
    secret = made["secret"]
    assert (await client.get("/api/v1/budget", headers=bearer(secret))).status_code == 200
    clock.advance(days=6)
    assert (await client.get("/api/v1/budget", headers=bearer(secret))).status_code == 200
    clock.advance(days=2)
    res = await client.get("/api/v1/budget", headers=bearer(secret))
    assert res.status_code == 401
    assert (await client.get(KEYS, headers=auth)).json()[0]["status"] == "expired"


async def test_how_long_a_key_works_can_be_extended_or_removed(client: AsyncClient, auth, clock):
    made = await make(client, auth, expires_in_days=7)
    secret, key_id = made["secret"], made["key"]["id"]
    clock.advance(days=6)
    await client.patch(f"{KEYS}/{key_id}", json={"expires_in_days": 30}, headers=auth)
    clock.advance(days=20)  # past the original week, inside the new month
    assert (await client.get("/api/v1/budget", headers=bearer(secret))).status_code == 200
    never = await client.patch(f"{KEYS}/{key_id}", json={"expires_in_days": None}, headers=auth)
    assert never.json()["expires_at"] is None
    clock.advance(days=3000)
    assert (await client.get("/api/v1/budget", headers=bearer(secret))).status_code == 200


async def test_a_key_that_never_expires_can_be_made(client: AsyncClient, auth):
    made = await make(client, auth, expires_in_days=None)
    assert made["key"]["expires_at"] is None


async def test_rotating_replaces_the_secret_and_the_old_one_stops_at_once(
    client: AsyncClient, auth
):
    made = await make(client, auth)
    old, key_id = made["secret"], made["key"]["id"]
    rotated = await client.post(f"{KEYS}/{key_id}/rotate", json={}, headers=auth)
    assert rotated.status_code == 200, rotated.text
    new = rotated.json()["secret"]
    assert new != old
    assert rotated.json()["key"]["prefix"] == new[:12]
    assert rotated.json()["key"]["rotated_at"] is not None
    assert (await client.get("/api/v1/budget", headers=bearer(new))).status_code == 200
    assert (await client.get("/api/v1/budget", headers=bearer(old))).status_code == 401
    # what it may do and how long it lasts are untouched
    assert rotated.json()["key"]["scopes"] == made["key"]["scopes"]
    assert rotated.json()["key"]["expires_at"].rstrip("Z") == made["key"]["expires_at"].rstrip("Z")


async def test_a_grace_period_keeps_the_old_secret_working_for_a_while(
    client: AsyncClient, auth, clock
):
    made = await make(client, auth)
    old, key_id = made["secret"], made["key"]["id"]
    rotated = await client.post(f"{KEYS}/{key_id}/rotate", json={"grace_hours": 2}, headers=auth)
    new = rotated.json()["secret"]
    assert rotated.json()["key"]["grace_until"] is not None
    assert (await client.get("/api/v1/budget", headers=bearer(old))).status_code == 200
    assert (await client.get("/api/v1/budget", headers=bearer(new))).status_code == 200
    clock.advance(hours=3)
    assert (await client.get("/api/v1/budget", headers=bearer(old))).status_code == 401
    assert (await client.get("/api/v1/budget", headers=bearer(new))).status_code == 200
    assert (await client.get(KEYS, headers=auth)).json()[0]["grace_until"] is None


async def test_deleting_a_key_stops_it_at_once(client: AsyncClient, auth):
    made = await make(client, auth)
    secret, key_id = made["secret"], made["key"]["id"]
    assert (await client.delete(f"{KEYS}/{key_id}", headers=auth)).status_code == 204
    assert (await client.get("/api/v1/budget", headers=bearer(secret))).status_code == 401
    assert (await client.get(KEYS, headers=auth)).json() == []


async def test_use_is_noted_on_the_key(client: AsyncClient, auth):
    secret = (await make(client, auth))["secret"]
    assert (await client.get(KEYS, headers=auth)).json()[0]["last_used_at"] is None
    await client.get("/api/v1/budget", headers=bearer(secret))
    assert (await client.get(KEYS, headers=auth)).json()[0]["last_used_at"] is not None


async def test_bad_requests_are_refused(client: AsyncClient, auth):
    unknown = await client.post(KEYS, json={"name": "x", "scopes": ["nope:read"]}, headers=auth)
    assert unknown.status_code == 422
    empty = await client.post(KEYS, json={"name": "x", "scopes": []}, headers=auth)
    assert empty.status_code == 422
    nothing = await client.post(KEYS, json={"name": "x"}, headers=auth)
    assert nothing.status_code == 422
    bad_role = await client.post(KEYS, json={"name": "x", "role": "root"}, headers=auth)
    assert bad_role.status_code == 422
    assert (
        await client.post(
            KEYS, json={"name": "x", "role": "viewer", "expires_in_days": 0}, headers=auth
        )
    ).status_code == 422
    assert (await client.get(KEYS, headers=auth)).json() == []


async def test_there_is_a_limit_on_how_many_keys_one_person_has(client: AsyncClient, auth):
    for i in range(keys.MAX_KEYS_PER_USER):
        await make(client, auth, name=f"Key {i}")
    res = await client.post(KEYS, json={"name": "One too many", "role": "viewer"}, headers=auth)
    assert res.status_code == 422


async def test_keys_belong_to_one_person(client: AsyncClient, auth, signup: Signup):
    made = await make(client, auth)
    key_id, secret = made["key"]["id"], made["secret"]
    other = await signup("bob@example.com")
    assert (await client.get(KEYS, headers=other)).json() == []
    assert (
        await client.patch(f"{KEYS}/{key_id}", json={"name": "x"}, headers=other)
    ).status_code == 404
    assert (await client.post(f"{KEYS}/{key_id}/rotate", json={}, headers=other)).status_code == 404
    assert (await client.delete(f"{KEYS}/{key_id}", headers=other)).status_code == 404
    # and the key sees only its owner's data
    await client.post(
        "/api/v1/accounts",
        json={"name": "Mine", "group": "accounts", "currency": "MVR", "opening_amount": "1"},
        headers=auth,
    )
    seen = (await client.get("/api/v1/accounts", headers=bearer(secret))).json()
    assert [a["name"] for a in seen] == ["Mine"]
    bobs = await client.get("/api/v1/accounts", headers=other)
    assert bobs.json() == []


async def test_the_catalogue_lists_areas_actions_and_roles(client: AsyncClient, auth):
    cat = (await client.get(f"{KEYS}/scopes", headers=auth)).json()
    assert {a["key"] for a in cat["actions"]} == {"read", "write", "delete"}
    assert "budget" in {a["key"] for a in cat["areas"]}
    assert {"viewer", "reports", "assistant", "editor"} <= {r["key"] for r in cat["roles"]}


async def test_a_signed_in_session_is_not_affected_by_any_of_this(client: AsyncClient, auth):
    assert (await client.get("/api/v1/users/me", headers=auth)).status_code == 200
    assert (await client.get("/api/v1/auth/sessions", headers=auth)).status_code == 200


async def test_keys_are_not_in_a_backup(client: AsyncClient, auth):
    made = await make(client, auth)
    backup = (await client.get("/api/v1/backup", headers=auth)).text
    assert made["secret"] not in backup
    assert made["key"]["id"] not in backup
