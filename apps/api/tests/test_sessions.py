from datetime import UTC, datetime, timedelta

import pyotp
import pytest
from app import two_factor
from app.config import settings
from app.security import hash_session_token, new_session_token
from app.services import session as session_service
from httpx import AsyncClient

from tests.conftest import Signup

LOGIN = "/api/v1/auth/login"
LOGIN_2FA = "/api/v1/auth/login/2fa"
LOGOUT = "/api/v1/auth/logout"
SESSIONS = "/api/v1/auth/sessions"
END_OTHERS = "/api/v1/auth/sessions/end-others"
ME = "/api/v1/users/me"
PASSWORD = "correct-horse-battery"


class Clock:
    """The time the sessions go by, which a test moves."""

    def __init__(self) -> None:
        self.now = datetime(2026, 10, 31, 9, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now

    def later(self, **delta) -> None:
        self.now += timedelta(**delta)


@pytest.fixture
def clock(monkeypatch) -> Clock:
    clock = Clock()
    monkeypatch.setattr(session_service, "_now", clock)
    return clock


async def sign_in(client: AsyncClient, email="alice@example.com", agent="TestBrowser/1.0") -> dict:
    """A new sign-in (a new session); returns its bearer headers."""
    resp = await client.post(
        LOGIN, data={"username": email, "password": PASSWORD}, headers={"User-Agent": agent}
    )
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def ids(client: AsyncClient, headers: dict) -> list[str]:
    return [s["id"] for s in (await client.get(SESSIONS, headers=headers)).json()]


def test_a_session_token_is_random_and_only_its_hash_is_kept():
    one, one_hash = new_session_token()
    two, _ = new_session_token()
    assert one != two
    assert len(one) >= 40
    assert one_hash == hash_session_token(one)
    assert one not in one_hash


async def test_signing_in_starts_a_session_that_is_listed_as_current(
    client: AsyncClient, signup: Signup
):
    await signup("alice@example.com")
    headers = await sign_in(client, agent="Mozilla/5.0 (X11; Linux) Firefox/130.0")
    listed = (await client.get(SESSIONS, headers=headers)).json()
    mine = next(s for s in listed if s["current"])
    assert mine["user_agent"] == "Mozilla/5.0 (X11; Linux) Firefox/130.0"
    assert mine["ip_address"]
    assert mine["expires_at"] > mine["created_at"]
    assert len([s for s in listed if s["current"]]) == 1


async def test_each_sign_in_is_its_own_session_and_current_follows_the_asker(
    client: AsyncClient, auth
):
    other = await sign_in(client, agent="Phone/2")
    from_auth = (await client.get(SESSIONS, headers=auth)).json()
    from_other = (await client.get(SESSIONS, headers=other)).json()
    assert len(from_auth) == len(from_other) == 2
    assert (
        next(s for s in from_auth if s["current"])["id"]
        != next(s for s in from_other if s["current"])["id"]
    )


async def test_the_list_needs_a_login(client: AsyncClient):
    assert (await client.get(SESSIONS)).status_code == 401


async def test_logging_out_ends_that_token_at_once_and_only_that_one(client: AsyncClient, auth):
    other = await sign_in(client)
    assert (await client.post(LOGOUT, headers=auth)).status_code == 204
    assert (await client.get(ME, headers=auth)).status_code == 401
    assert (await client.get(ME, headers=other)).status_code == 200
    assert (await client.post(LOGOUT, headers=auth)).status_code == 401


async def test_ending_another_session_cuts_it_off(client: AsyncClient, auth):
    other = await sign_in(client)
    target = next(s for s in (await client.get(SESSIONS, headers=auth)).json() if not s["current"])
    assert (await client.delete(f"{SESSIONS}/{target['id']}", headers=auth)).status_code == 204
    assert (await client.get(ME, headers=other)).status_code == 401
    assert (await client.get(ME, headers=auth)).status_code == 200


async def test_you_can_end_your_own_current_session_too(client: AsyncClient, auth):
    mine = next(s for s in (await client.get(SESSIONS, headers=auth)).json() if s["current"])
    assert (await client.delete(f"{SESSIONS}/{mine['id']}", headers=auth)).status_code == 204
    assert (await client.get(ME, headers=auth)).status_code == 401


async def test_another_users_session_is_a_404_and_is_not_ended(
    client: AsyncClient, auth, signup: Signup
):
    bob = await signup("bob@example.com")
    bobs = (await client.get(SESSIONS, headers=bob)).json()[0]["id"]
    resp = await client.delete(f"{SESSIONS}/{bobs}", headers=auth)
    assert resp.status_code == 404
    assert (await client.get(ME, headers=bob)).status_code == 200
    assert (await client.delete(f"{SESSIONS}/not-a-uuid", headers=auth)).status_code == 422


async def test_each_user_sees_only_their_own_sessions(client: AsyncClient, auth, signup: Signup):
    bob = await signup("bob@example.com")
    assert set(await ids(client, auth)).isdisjoint(await ids(client, bob))


async def test_sign_out_everywhere_else_keeps_this_one(client: AsyncClient, auth):
    second = await sign_in(client)
    third = await sign_in(client)
    resp = await client.post(END_OTHERS, headers=auth)
    assert resp.json() == {"ended": 2}
    assert (await client.get(ME, headers=auth)).status_code == 200
    assert (await client.get(ME, headers=second)).status_code == 401
    assert (await client.get(ME, headers=third)).status_code == 401
    assert (await client.post(END_OTHERS, headers=auth)).json() == {"ended": 0}


async def test_ending_others_never_touches_another_users_sessions(
    client: AsyncClient, auth, signup: Signup
):
    bob = await signup("bob@example.com")
    await client.post(END_OTHERS, headers=auth)
    assert (await client.get(ME, headers=bob)).status_code == 200


# --- how long a sign-in lasts -----------------------------------------------------------------


async def test_a_session_ends_after_thirty_days_unused(client: AsyncClient, clock: Clock, signup):
    headers = await signup("alice@example.com")
    clock.later(days=settings.session_days - 1)
    assert (await client.get(ME, headers=headers)).status_code == 200  # this use renews it
    clock.later(days=settings.session_days + 1)
    assert (await client.get(ME, headers=headers)).status_code == 401


async def test_using_a_session_keeps_it_alive(client: AsyncClient, clock: Clock, signup):
    headers = await signup("alice@example.com")
    for _ in range(4):  # 80 days, a visit every 20
        clock.later(days=20)
        assert (await client.get(ME, headers=headers)).status_code == 200


async def test_a_session_is_renewed_at_most_once_an_hour(client: AsyncClient, clock: Clock, signup):
    headers = await signup("alice@example.com")
    first = (await client.get(SESSIONS, headers=headers)).json()[0]["expires_at"]
    clock.later(minutes=30)
    assert (await client.get(SESSIONS, headers=headers)).json()[0]["expires_at"] == first
    clock.later(hours=2)
    assert (await client.get(SESSIONS, headers=headers)).json()[0]["expires_at"] > first


async def test_an_expired_session_is_not_listed(client: AsyncClient, clock: Clock, signup):
    old = await signup("alice@example.com")
    clock.later(days=settings.session_days + 1)
    fresh = await sign_in(client)
    assert len(await ids(client, fresh)) == 1
    assert (await client.get(ME, headers=old)).status_code == 401


async def test_a_long_browser_name_is_cut_to_fit(client: AsyncClient, signup: Signup):
    await signup("alice@example.com")
    headers = await sign_in(client, agent="x" * 1000)
    mine = next(s for s in (await client.get(SESSIONS, headers=headers)).json() if s["current"])
    assert len(mine["user_agent"]) == 255


# --- two-factor changes end the other sign-ins ------------------------------------------------


@pytest.fixture
def code_clock(monkeypatch):
    class Frozen:
        now = 1_800_000_000.0

        def code(self, secret: str) -> str:
            return pyotp.TOTP(secret).at(self.now)

        def next_step(self) -> None:
            self.now += two_factor.STEP_SECONDS

    frozen = Frozen()
    monkeypatch.setattr(two_factor, "_now", lambda: frozen.now)
    return frozen


async def test_turning_on_two_factor_signs_out_the_other_devices(
    client: AsyncClient, auth, code_clock
):
    other = await sign_in(client)
    secret = (await client.post("/api/v1/auth/2fa/setup", headers=auth)).json()["secret"]
    resp = await client.post(
        "/api/v1/auth/2fa/enable", json={"code": code_clock.code(secret)}, headers=auth
    )
    assert resp.status_code == 200, resp.text
    assert (await client.get(ME, headers=auth)).status_code == 200
    assert (await client.get(ME, headers=other)).status_code == 401


async def test_turning_off_two_factor_and_new_recovery_codes_do_the_same(
    client: AsyncClient, auth, code_clock
):
    secret = (await client.post("/api/v1/auth/2fa/setup", headers=auth)).json()["secret"]
    await client.post(
        "/api/v1/auth/2fa/enable", json={"code": code_clock.code(secret)}, headers=auth
    )
    code_clock.next_step()

    async def second_device() -> dict:
        """A second sign-in, through both steps now that two-factor is on."""
        step_one = await client.post(
            LOGIN, data={"username": "alice@example.com", "password": PASSWORD}
        )
        challenge = step_one.json()["challenge_token"]
        resp = await client.post(
            LOGIN_2FA, json={"challenge_token": challenge, "code": code_clock.code(secret)}
        )
        assert resp.status_code == 200, resp.text
        code_clock.next_step()
        return {"Authorization": f"Bearer {resp.json()['access_token']}"}

    other = await second_device()
    new_codes = await client.post(
        "/api/v1/auth/2fa/recovery-codes",
        json={"password": PASSWORD, "code": code_clock.code(secret)},
        headers=auth,
    )
    assert new_codes.status_code == 200, new_codes.text
    assert (await client.get(ME, headers=other)).status_code == 401
    code_clock.next_step()

    other = await second_device()
    off = await client.post(
        "/api/v1/auth/2fa/disable",
        json={"password": PASSWORD, "code": code_clock.code(secret)},
        headers=auth,
    )
    assert off.status_code == 204, off.text
    assert (await client.get(ME, headers=other)).status_code == 401
    assert (await client.get(ME, headers=auth)).status_code == 200


async def test_a_failed_two_factor_change_signs_nobody_out(client: AsyncClient, auth, code_clock):
    other = await sign_in(client)
    await client.post("/api/v1/auth/2fa/setup", headers=auth)
    resp = await client.post("/api/v1/auth/2fa/enable", json={"code": "000000"}, headers=auth)
    assert resp.status_code == 422
    assert (await client.get(ME, headers=other)).status_code == 200
