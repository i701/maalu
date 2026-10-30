import pytest
from app import rate_limit
from app.config import settings
from app.rate_limit import RateLimitedError, RateLimiter
from httpx import AsyncClient

LOGIN = "/api/v1/auth/login"
REGISTER = "/api/v1/auth/register"
PASSWORD = "correct-horse-battery"


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


@pytest.fixture
def clock(monkeypatch) -> FakeClock:
    """The limits switched on, with a clock a test can move."""
    clock = FakeClock()
    monkeypatch.setattr(settings, "rate_limit", True)
    monkeypatch.setattr(rate_limit.limiter, "_clock", clock)
    rate_limit.limiter.clear()
    yield clock
    rate_limit.limiter.clear()


def creds(email: str = "alice@example.com", password: str = PASSWORD) -> dict:
    return {"username": email, "password": password}


async def fail_logins(client: AsyncClient, count: int, email: str = "alice@example.com"):
    for _ in range(count):
        assert (await client.post(LOGIN, data=creds(email, "wrong-password"))).status_code == 401


# --- the limiter ------------------------------------------------------------------------------


def test_events_inside_the_window_count_and_older_ones_do_not():
    clock = FakeClock()
    limiter = RateLimiter(clock)
    for _ in range(3):
        limiter.record("k", 60)
    with pytest.raises(RateLimitedError):
        limiter.check("k", 3, 60)
    limiter.check("k", 4, 60)
    clock.now += 61
    limiter.check("k", 3, 60)  # all three have left the window


def test_retry_after_is_when_the_oldest_event_leaves():
    clock = FakeClock()
    limiter = RateLimiter(clock)
    limiter.record("k", 100)
    clock.now += 30
    limiter.record("k", 100)
    with pytest.raises(RateLimitedError) as caught:
        limiter.check("k", 2, 100)
    assert caught.value.retry_after == 70  # the first event is 30s old, so 70s to go


def test_keys_are_independent_and_reset_clears_one():
    limiter = RateLimiter(FakeClock())
    limiter.record("a", 60)
    limiter.record("b", 60)
    limiter.reset("a")
    limiter.check("a", 1, 60)
    with pytest.raises(RateLimitedError):
        limiter.check("b", 1, 60)


def test_stale_keys_are_swept_when_too_many_are_held(monkeypatch):
    clock = FakeClock()
    limiter = RateLimiter(clock)
    monkeypatch.setattr(rate_limit, "MAX_KEYS", 5)
    for n in range(5):
        limiter.record(f"old{n}", 60)
    clock.now += rate_limit.LONGEST_WINDOW + 1
    limiter.record("fresh", 60)
    assert list(limiter._events) == ["fresh"]


def test_the_message_says_how_long_in_minutes():
    assert RateLimitedError(1).message == "Too many attempts. Try again in 1 minute"
    assert RateLimitedError(61).message == "Too many attempts. Try again in 2 minutes"


# --- sign-in ----------------------------------------------------------------------------------


async def test_ten_wrong_passwords_lock_the_account_even_for_the_right_one(
    client: AsyncClient, auth, clock: FakeClock
):
    await fail_logins(client, rate_limit.LOGIN_ACCOUNT_FAILURES)
    locked = await client.post(LOGIN, data=creds())  # the right password
    assert locked.status_code == 429
    assert locked.headers["retry-after"] == str(rate_limit.LOGIN_WINDOW)
    assert locked.json()["detail"] == "Too many attempts. Try again in 15 minutes"


async def test_it_unlocks_when_the_window_has_passed(client: AsyncClient, auth, clock: FakeClock):
    await fail_logins(client, rate_limit.LOGIN_ACCOUNT_FAILURES)
    clock.now += rate_limit.LOGIN_WINDOW + 1
    assert (await client.post(LOGIN, data=creds())).status_code == 200


async def test_other_accounts_are_not_locked(client: AsyncClient, auth, clock: FakeClock):
    await fail_logins(client, rate_limit.LOGIN_ACCOUNT_FAILURES)
    other = await client.post(LOGIN, data=creds("bob@example.com", "wrong-password"))
    assert other.status_code == 401  # a wrong password, not "too many attempts"


async def test_a_few_typos_then_the_right_password_start_from_zero(
    client: AsyncClient, auth, clock: FakeClock
):
    await fail_logins(client, rate_limit.LOGIN_ACCOUNT_FAILURES - 1)
    assert (await client.post(LOGIN, data=creds())).status_code == 200
    await fail_logins(client, rate_limit.LOGIN_ACCOUNT_FAILURES - 1)  # the count was cleared
    assert (await client.post(LOGIN, data=creds())).status_code == 200


async def test_an_unknown_email_is_limited_the_same_way(client: AsyncClient, clock: FakeClock):
    """The answer never tells you whether an email is registered."""
    await fail_logins(client, rate_limit.LOGIN_ACCOUNT_FAILURES, "nobody@example.com")
    resp = await client.post(LOGIN, data=creds("nobody@example.com"))
    assert resp.status_code == 429


async def test_the_email_is_matched_ignoring_case_and_spaces(
    client: AsyncClient, auth, clock: FakeClock
):
    for variant in ["ALICE@example.com", " alice@example.com", "Alice@Example.com"] * 4:
        await client.post(LOGIN, data=creds(variant, "wrong-password"))
    resp = await client.post(LOGIN, data=creds("alice@example.com"))
    assert resp.status_code == 429


async def test_thirty_failures_from_one_address_block_it_whatever_the_emails(
    client: AsyncClient, clock: FakeClock
):
    for n in range(rate_limit.LOGIN_IP_FAILURES):
        await client.post(LOGIN, data=creds(f"user{n}@example.com", "wrong-password"))
    resp = await client.post(LOGIN, data=creds("fresh@example.com", "wrong-password"))
    assert resp.status_code == 429


async def test_it_does_nothing_when_switched_off(client: AsyncClient, auth, monkeypatch):
    monkeypatch.setattr(settings, "rate_limit", False)
    rate_limit.limiter.clear()
    await fail_logins(client, rate_limit.LOGIN_ACCOUNT_FAILURES + 5)
    assert (await client.post(LOGIN, data=creds())).status_code == 200


# --- sign-up ----------------------------------------------------------------------------------


async def test_sign_up_attempts_from_one_address_are_limited(client: AsyncClient, clock: FakeClock):
    body = {"password": PASSWORD, "base_currency": "MVR"}
    for n in range(rate_limit.REGISTER_IP_ATTEMPTS):
        resp = await client.post(REGISTER, json={"email": f"u{n}@example.com", **body})
        assert resp.status_code == 201
    resp = await client.post(REGISTER, json={"email": "one-more@example.com", **body})
    assert resp.status_code == 429
    assert resp.headers["retry-after"] == str(rate_limit.REGISTER_WINDOW)
    clock.now += rate_limit.REGISTER_WINDOW + 1
    again = await client.post(REGISTER, json={"email": "one-more@example.com", **body})
    assert again.status_code == 201


# --- the code step ----------------------------------------------------------------------------


def test_wrong_codes_from_one_address_are_limited(clock: FakeClock):
    for _ in range(rate_limit.TWO_FACTOR_IP_FAILURES):
        rate_limit.check_two_factor("1.2.3.4")
        rate_limit.two_factor_failed("1.2.3.4")
    with pytest.raises(RateLimitedError):
        rate_limit.check_two_factor("1.2.3.4")
    rate_limit.check_two_factor("5.6.7.8")  # another address is fine


async def test_the_address_behind_a_proxy_is_the_visitors(clock: FakeClock):
    """Mirrors production: the web server connects to the API and sends the visitor's address in
    X-Forwarded-For, which uvicorn trusts from FORWARDED_ALLOW_IPS and turns into
    `request.client`."""
    from app.routers.auth import client_ip
    from fastapi import FastAPI, Request
    from httpx import ASGITransport
    from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

    app = FastAPI()

    @app.get("/ip")
    async def ip(request: Request) -> str:
        return client_ip(request)

    wrapped = ProxyHeadersMiddleware(app, trusted_hosts="*")
    transport = ASGITransport(app=wrapped, client=("10.0.0.5", 4000))
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        assert (
            await c.get("/ip", headers={"X-Forwarded-For": "203.0.113.9"})
        ).json() == "203.0.113.9"
        assert (await c.get("/ip")).json() == "10.0.0.5"
