import base64
import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pyotp
import pytest
from app import two_factor
from app.config import settings
from app.security import ALGORITHM, create_challenge_token
from httpx import AsyncClient

from tests.conftest import Signup

SETUP = "/api/v1/auth/2fa/setup"
ENABLE = "/api/v1/auth/2fa/enable"
DISABLE = "/api/v1/auth/2fa/disable"
RECOVERY = "/api/v1/auth/2fa/recovery-codes"
LOGIN = "/api/v1/auth/login"
LOGIN_2FA = "/api/v1/auth/login/2fa"
ME = "/api/v1/users/me"
PASSWORD = "correct-horse-battery"


class Clock:
    """A phone and a server that agree on the time, which a test moves 30 seconds at a time."""

    def __init__(self) -> None:
        self.now = 1_800_000_000.0

    def code(self, secret: str) -> str:
        return pyotp.TOTP(secret).at(self.now)

    def next_step(self) -> None:
        self.now += two_factor.STEP_SECONDS


@pytest.fixture
def clock(monkeypatch) -> Clock:
    clock = Clock()
    monkeypatch.setattr(two_factor, "_now", lambda: clock.now)
    return clock


async def login(client: AsyncClient, email: str = "alice@example.com") -> dict:
    resp = await client.post(LOGIN, data={"username": email, "password": PASSWORD})
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.fixture
async def secured(client: AsyncClient, auth, clock: Clock):
    """Alice with two-factor on: her headers, the app's secret and her recovery codes."""
    setup = (await client.post(SETUP, headers=auth)).json()
    enable = await client.post(ENABLE, json={"code": clock.code(setup["secret"])}, headers=auth)
    assert enable.status_code == 200, enable.text
    clock.next_step()
    return auth, setup["secret"], enable.json()["recovery_codes"]


async def sign_in(client, clock, secret) -> dict:
    """Both steps with a fresh authenticator code; returns the bearer headers."""
    challenge = (await login(client))["challenge_token"]
    resp = await client.post(
        LOGIN_2FA, json={"challenge_token": challenge, "code": clock.code(secret)}
    )
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def test_setup_gives_a_secret_and_a_qr_code_but_changes_nothing_yet(
    client: AsyncClient, auth
):
    resp = await client.post(SETUP, headers=auth)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["otpauth_uri"].startswith("otpauth://totp/Maalu:alice%40example.com")
    assert body["secret"] in body["otpauth_uri"]
    assert body["qr_data_uri"].startswith("data:image/svg+xml")
    assert (await client.get(ME, headers=auth)).json()["two_factor_enabled"] is False
    assert "access_token" in await login(client)  # still just a password


async def test_asking_for_setup_again_returns_the_same_secret(
    client: AsyncClient, auth, clock: Clock
):
    first = (await client.post(SETUP, headers=auth)).json()
    second = (await client.post(SETUP, headers=auth)).json()
    assert second["secret"] == first["secret"]
    assert second["otpauth_uri"] == first["otpauth_uri"]
    # a code from either answer turns it on
    ok = await client.post(ENABLE, json={"code": clock.code(first["secret"])}, headers=auth)
    assert ok.status_code == 200


async def test_enabling_needs_a_right_code_and_returns_recovery_codes_once(
    client: AsyncClient, auth, clock: Clock
):
    secret = (await client.post(SETUP, headers=auth)).json()["secret"]
    wrong = await client.post(ENABLE, json={"code": "000000"}, headers=auth)
    assert wrong.status_code == 422
    assert (await client.get(ME, headers=auth)).json()["two_factor_enabled"] is False

    ok = await client.post(ENABLE, json={"code": clock.code(secret)}, headers=auth)
    assert ok.status_code == 200, ok.text
    codes = ok.json()["recovery_codes"]
    assert len(codes) == 10
    assert len(set(codes)) == 10
    assert (await client.get(ME, headers=auth)).json()["two_factor_enabled"] is True


async def test_enabling_without_setup_or_twice_is_refused(client: AsyncClient, auth, secured):
    assert (await client.post(SETUP, headers=auth)).status_code == 409
    assert (await client.post(ENABLE, json={"code": "123456"}, headers=auth)).status_code == 409


async def test_enable_before_setup_is_refused(client: AsyncClient, auth):
    resp = await client.post(ENABLE, json={"code": "123456"}, headers=auth)
    assert resp.status_code == 409
    assert "setup" in resp.json()["detail"].lower()


async def test_signing_in_now_asks_for_a_code_and_gives_no_token(
    client: AsyncClient, auth, secured
):
    body = await login(client)
    assert body["two_factor_required"] is True
    assert body["access_token"] is None
    assert body["challenge_token"]


async def test_a_challenge_is_not_an_access_token(client: AsyncClient, auth, secured):
    challenge = (await login(client))["challenge_token"]
    resp = await client.get(ME, headers={"Authorization": f"Bearer {challenge}"})
    assert resp.status_code == 401


async def test_the_second_step_gives_a_working_token(
    client: AsyncClient, auth, secured, clock: Clock
):
    _, secret, _ = secured
    headers = await sign_in(client, clock, secret)
    assert (await client.get(ME, headers=headers)).status_code == 200


async def test_a_code_cannot_be_used_twice(client: AsyncClient, auth, secured, clock: Clock):
    _, secret, _ = secured
    await sign_in(client, clock, secret)
    challenge = (await login(client))["challenge_token"]
    again = await client.post(
        LOGIN_2FA, json={"challenge_token": challenge, "code": clock.code(secret)}
    )
    assert again.status_code == 401
    clock.next_step()
    fresh = await client.post(
        LOGIN_2FA, json={"challenge_token": challenge, "code": clock.code(secret)}
    )
    assert fresh.status_code == 200


async def test_a_wrong_code_is_refused(client: AsyncClient, auth, secured):
    challenge = (await login(client))["challenge_token"]
    resp = await client.post(LOGIN_2FA, json={"challenge_token": challenge, "code": "000000"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "That code is not right"


async def test_five_wrong_codes_lock_it_even_for_the_right_one(
    client: AsyncClient, auth, secured, clock: Clock
):
    _, secret, _ = secured
    challenge = (await login(client))["challenge_token"]
    for _ in range(5):
        wrong = await client.post(LOGIN_2FA, json={"challenge_token": challenge, "code": "000000"})
        assert wrong.status_code == 401
    locked = await client.post(
        LOGIN_2FA, json={"challenge_token": challenge, "code": clock.code(secret)}
    )
    assert locked.status_code == 429
    assert "wait" in locked.json()["detail"].lower()


async def test_a_recovery_code_works_once(client: AsyncClient, auth, secured):
    _, _, codes = secured
    challenge = (await login(client))["challenge_token"]
    first = await client.post(LOGIN_2FA, json={"challenge_token": challenge, "code": codes[0]})
    assert first.status_code == 200
    second = await client.post(LOGIN_2FA, json={"challenge_token": challenge, "code": codes[0]})
    assert second.status_code == 401
    other = await client.post(LOGIN_2FA, json={"challenge_token": challenge, "code": codes[1]})
    assert other.status_code == 200


async def test_recovery_codes_ignore_case_dashes_and_spaces(client: AsyncClient, auth, secured):
    _, _, codes = secured
    challenge = (await login(client))["challenge_token"]
    sloppy = codes[0].upper().replace("-", " ")
    resp = await client.post(LOGIN_2FA, json={"challenge_token": challenge, "code": sloppy})
    assert resp.status_code == 200


async def test_an_expired_or_foreign_challenge_is_refused(client: AsyncClient, auth, secured):
    me = (await client.get(ME, headers=auth)).json()
    stale = jwt.encode(
        {
            "sub": me["id"],
            "scope": "two-factor",
            "exp": datetime.now(UTC) - timedelta(minutes=1),
        },
        settings.secret_key,
        algorithm=ALGORITHM,
    )
    resp = await client.post(LOGIN_2FA, json={"challenge_token": stale, "code": "123456"})
    assert resp.status_code == 401
    # an access token is not a challenge
    plain = auth["Authorization"].removeprefix("Bearer ")
    resp = await client.post(LOGIN_2FA, json={"challenge_token": plain, "code": "123456"})
    assert resp.status_code == 401


async def test_a_challenge_for_someone_without_two_factor_is_refused(
    client: AsyncClient, signup: Signup
):
    me = (await client.get(ME, headers=await signup("bob@example.com"))).json()
    challenge = create_challenge_token(uuid.UUID(me["id"]))
    resp = await client.post(LOGIN_2FA, json={"challenge_token": challenge, "code": "123456"})
    assert resp.status_code == 401


async def test_disabling_needs_the_password_and_a_code(
    client: AsyncClient, auth, secured, clock: Clock
):
    _, secret, _ = secured
    bad_password = await client.post(
        DISABLE, json={"password": "nope-nope-nope", "code": clock.code(secret)}, headers=auth
    )
    assert bad_password.status_code == 422
    assert bad_password.json()["detail"] == "That password is not right"
    bad_code = await client.post(
        DISABLE, json={"password": PASSWORD, "code": "000000"}, headers=auth
    )
    assert bad_code.status_code == 422

    ok = await client.post(
        DISABLE, json={"password": PASSWORD, "code": clock.code(secret)}, headers=auth
    )
    assert ok.status_code == 204
    assert (await client.get(ME, headers=auth)).json()["two_factor_enabled"] is False
    assert "access_token" in await login(client)
    # turning it off forgets the secret, so setting it up again starts with a new one
    again = (await client.post(SETUP, headers=auth)).json()
    assert again["secret"] != secret


async def test_a_wrong_session_check_never_ends_the_session(client: AsyncClient, auth, secured):
    # the web app takes a 401 to mean "signed out", so a wrong password or code is a 422
    resp = await client.post(DISABLE, json={"password": "x" * 10, "code": "000000"}, headers=auth)
    assert resp.status_code == 422


async def test_disabling_can_use_a_recovery_code(client: AsyncClient, auth, secured):
    _, _, codes = secured
    resp = await client.post(DISABLE, json={"password": PASSWORD, "code": codes[0]}, headers=auth)
    assert resp.status_code == 204


async def test_new_recovery_codes_replace_the_old_ones(
    client: AsyncClient, auth, secured, clock: Clock
):
    _, secret, old = secured
    resp = await client.post(
        RECOVERY, json={"password": PASSWORD, "code": clock.code(secret)}, headers=auth
    )
    assert resp.status_code == 200, resp.text
    new = resp.json()["recovery_codes"]
    assert len(new) == 10
    assert not set(new) & set(old)
    challenge = (await login(client))["challenge_token"]
    stale = await client.post(LOGIN_2FA, json={"challenge_token": challenge, "code": old[0]})
    assert stale.status_code == 401
    fresh = await client.post(LOGIN_2FA, json={"challenge_token": challenge, "code": new[0]})
    assert fresh.status_code == 200


async def test_the_two_factor_routes_need_a_login(client: AsyncClient):
    for path in (SETUP, ENABLE, DISABLE, RECOVERY):
        resp = await client.post(path, json={"code": "123456", "password": "x"})
        assert resp.status_code == 401


async def test_each_user_has_their_own_two_factor(
    client: AsyncClient, auth, signup: Signup, secured
):
    bob = await signup("bob@example.com")
    assert (await client.get(ME, headers=bob)).json()["two_factor_enabled"] is False
    assert "access_token" in await login(client, "bob@example.com")


# --- the pure helpers ------------------------------------------------------------------------


def test_the_secret_is_encrypted_and_round_trips(monkeypatch):
    secret = two_factor.new_secret()
    stored = two_factor.encrypt_secret(secret)
    assert secret not in stored
    assert two_factor.decrypt_secret(stored) == secret
    monkeypatch.setattr(settings, "secret_key", "another-secret-key-entirely-different")
    assert two_factor.decrypt_secret(stored) is None


def test_codes_are_accepted_a_step_either_side_but_not_further(clock: Clock):
    secret = two_factor.new_secret()
    totp = pyotp.TOTP(secret)
    step = int(clock.now // 30)
    assert two_factor.matching_step(secret, totp.at(clock.now)) == step
    assert two_factor.matching_step(secret, totp.at(clock.now - 30)) == step - 1
    assert two_factor.matching_step(secret, totp.at(clock.now + 30)) == step + 1
    assert two_factor.matching_step(secret, totp.at(clock.now + 90)) is None


@pytest.mark.parametrize("code", ["", "12345", "1234567", "abcdef", "12 34", "١٢٣٤٥٦"])
def test_malformed_codes_never_match(code: str):
    assert two_factor.matching_step(two_factor.new_secret(), code) is None


def test_a_code_may_have_a_space_in_the_middle(clock: Clock):
    secret = two_factor.new_secret()
    code = pyotp.TOTP(secret).at(clock.now)
    assert two_factor.matching_step(secret, f"{code[:3]} {code[3:]}") is not None


def test_recovery_codes_are_ten_distinct_and_look_the_same_however_typed():
    codes = two_factor.new_recovery_codes()
    assert len(set(codes)) == two_factor.RECOVERY_CODE_COUNT
    code = codes[0]
    assert two_factor.looks_like_recovery_code(code)
    assert two_factor.hash_recovery_code(code) == two_factor.hash_recovery_code(
        code.upper().replace("-", " ")
    )
    assert not two_factor.looks_like_recovery_code("123456")


def test_the_qr_code_is_an_svg_image():
    uri = two_factor.provisioning_uri(two_factor.new_secret(), "a@b.com")
    data = two_factor.qr_data_uri(uri)
    prefix = "data:image/svg+xml;base64,"
    assert data.startswith("data:image/svg+xml")
    if data.startswith(prefix):
        assert b"<svg" in base64.b64decode(data.removeprefix(prefix))
