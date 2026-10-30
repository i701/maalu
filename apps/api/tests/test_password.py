import pyotp
import pytest
from app import admin, rate_limit, two_factor
from app.config import settings
from app.services import UserService
from httpx import AsyncClient

PASSWORD_URL = "/api/v1/auth/password"
LOGIN = "/api/v1/auth/login"
ME = "/api/v1/users/me"
OLD = "correct-horse-battery"
NEW = "a-brand-new-passphrase"


def body(current=OLD, new=NEW, **extra) -> dict:
    return {"current_password": current, "new_password": new, **extra}


async def sign_in(client: AsyncClient, password: str = OLD, email="alice@example.com") -> dict:
    resp = await client.post(LOGIN, data={"username": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def test_changing_the_password_swaps_what_signs_in(client: AsyncClient, auth):
    resp = await client.post(PASSWORD_URL, json=body(), headers=auth)
    assert resp.status_code == 204, resp.text
    old = await client.post(LOGIN, data={"username": "alice@example.com", "password": OLD})
    assert old.status_code == 401
    assert (
        await client.post(LOGIN, data={"username": "alice@example.com", "password": NEW})
    ).status_code == 200


async def test_it_keeps_this_session_and_ends_the_others(client: AsyncClient, auth):
    other = await sign_in(client)
    await client.post(PASSWORD_URL, json=body(), headers=auth)
    assert (await client.get(ME, headers=auth)).status_code == 200
    assert (await client.get(ME, headers=other)).status_code == 401


async def test_a_wrong_current_password_changes_nothing(client: AsyncClient, auth):
    other = await sign_in(client)
    resp = await client.post(PASSWORD_URL, json=body(current="not-my-password"), headers=auth)
    assert resp.status_code == 422  # never 401: the web app reads that as "signed out"
    assert resp.json()["detail"] == "That password is not right"
    assert (await client.get(ME, headers=other)).status_code == 200  # nobody was signed out
    assert (
        await client.post(LOGIN, data={"username": "alice@example.com", "password": OLD})
    ).status_code == 200


async def test_the_new_password_must_be_different(client: AsyncClient, auth):
    resp = await client.post(PASSWORD_URL, json=body(new=OLD), headers=auth)
    assert resp.status_code == 422
    assert "not using now" in resp.json()["detail"]


@pytest.mark.parametrize("new", ["short", "x" * 129, ""])
async def test_the_new_password_has_the_same_length_rules_as_sign_up(
    client: AsyncClient, auth, new: str
):
    resp = await client.post(PASSWORD_URL, json=body(new=new), headers=auth)
    assert resp.status_code == 422


async def test_it_needs_a_login(client: AsyncClient):
    assert (await client.post(PASSWORD_URL, json=body())).status_code == 401


async def test_wrong_current_passwords_count_toward_the_sign_in_limit(
    client: AsyncClient, auth, monkeypatch
):
    """A stolen session must not be a way to guess the password."""
    monkeypatch.setattr(settings, "rate_limit", True)
    rate_limit.limiter.clear()
    try:
        for _ in range(rate_limit.LOGIN_ACCOUNT_FAILURES):
            wrong = await client.post(
                PASSWORD_URL, json=body(current="nope-nope-nope"), headers=auth
            )
            assert wrong.status_code == 422
        locked = await client.post(PASSWORD_URL, json=body(), headers=auth)  # the right one
        assert locked.status_code == 429
        signing_in = await client.post(
            LOGIN, data={"username": "alice@example.com", "password": OLD}
        )
        assert signing_in.status_code == 429  # the same budget
    finally:
        rate_limit.limiter.clear()


# --- with two-factor on -----------------------------------------------------------------------


class Clock:
    now = 1_800_000_000.0

    def code(self, secret: str) -> str:
        return pyotp.TOTP(secret).at(self.now)

    def next_step(self) -> None:
        self.now += two_factor.STEP_SECONDS


@pytest.fixture
async def secured(client: AsyncClient, auth, monkeypatch):
    clock = Clock()
    monkeypatch.setattr(two_factor, "_now", lambda: clock.now)
    secret = (await client.post("/api/v1/auth/2fa/setup", headers=auth)).json()["secret"]
    enable = await client.post(
        "/api/v1/auth/2fa/enable", json={"code": clock.code(secret)}, headers=auth
    )
    clock.next_step()
    return clock, secret, enable.json()["recovery_codes"]


async def test_with_two_factor_on_a_code_is_needed(client: AsyncClient, auth, secured):
    clock, secret, _ = secured
    missing = await client.post(PASSWORD_URL, json=body(), headers=auth)
    assert missing.status_code == 422
    assert missing.json()["detail"] == "Enter the code from your authenticator app"
    wrong = await client.post(PASSWORD_URL, json=body(code="000000"), headers=auth)
    assert wrong.status_code == 422
    assert wrong.json()["detail"] == "That code is not right"
    ok = await client.post(PASSWORD_URL, json=body(code=clock.code(secret)), headers=auth)
    assert ok.status_code == 204, ok.text


async def test_a_recovery_code_will_do(client: AsyncClient, auth, secured):
    _, _, codes = secured
    resp = await client.post(PASSWORD_URL, json=body(code=codes[0]), headers=auth)
    assert resp.status_code == 204, resp.text


async def test_a_wrong_password_is_refused_before_the_code_is_looked_at(
    client: AsyncClient, auth, secured
):
    clock, secret, _ = secured
    resp = await client.post(
        PASSWORD_URL, json=body(current="nope-nope-nope", code=clock.code(secret)), headers=auth
    )
    assert resp.status_code == 422
    assert resp.json()["detail"] == "That password is not right"


async def test_changing_the_password_leaves_two_factor_on(client: AsyncClient, auth, secured):
    clock, secret, _ = secured
    await client.post(PASSWORD_URL, json=body(code=clock.code(secret)), headers=auth)
    step_one = await client.post(LOGIN, data={"username": "alice@example.com", "password": NEW})
    assert step_one.json()["two_factor_required"] is True
    assert (await client.get(ME, headers=auth)).json()["two_factor_enabled"] is True


# --- the operator's command -------------------------------------------------------------------


async def test_the_operator_can_reset_a_forgotten_password(client: AsyncClient, auth):
    other = await sign_in(client)
    done = await admin.reset_password(
        "Alice@Example.com", NEW, session_factory=client.session_factory
    )
    assert done is True
    assert (await client.get(ME, headers=auth)).status_code == 401  # signed out everywhere
    assert (await client.get(ME, headers=other)).status_code == 401
    old = await client.post(LOGIN, data={"username": "alice@example.com", "password": OLD})
    assert old.status_code == 401
    assert (
        await client.post(LOGIN, data={"username": "alice@example.com", "password": NEW})
    ).status_code == 200


async def test_resetting_for_an_unknown_email_says_so(client: AsyncClient):
    assert (
        await admin.reset_password(
            "nobody@example.com", NEW, session_factory=client.session_factory
        )
        is False
    )


async def test_the_service_only_checks_the_current_password_when_asked_to_change_it(
    client: AsyncClient, auth
):
    """`set_password` is the operator's path: no current password, no code."""
    async with client.session_factory() as db:
        users = UserService(db)
        user = await users.get_by_email("alice@example.com")
        await users.set_password(user, NEW)
        await db.commit()
    assert (
        await client.post(LOGIN, data={"username": "alice@example.com", "password": NEW})
    ).status_code == 200
