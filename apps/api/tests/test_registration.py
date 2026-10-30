import pytest
from app.config import settings
from httpx import AsyncClient

REGISTER = "/api/v1/auth/register"
STATUS = "/api/v1/auth/registration"


def creds(email: str) -> dict:
    return {"email": email, "password": "correct-horse-battery", "base_currency": "MVR"}


@pytest.fixture
def mode(monkeypatch):
    def _set(value: str) -> None:
        monkeypatch.setattr(settings, "registration", value)

    return _set


async def test_auto_lets_only_the_first_account_register(client: AsyncClient, mode):
    mode("auto")
    assert (await client.get(STATUS)).json() == {"open": True}
    assert (await client.post(REGISTER, json=creds("owner@example.com"))).status_code == 201
    assert (await client.get(STATUS)).json() == {"open": False}
    second = await client.post(REGISTER, json=creds("partner@example.com"))
    assert second.status_code == 403
    assert second.json()["detail"] == "Registration is closed"


async def test_open_lets_anyone_register(client: AsyncClient, mode):
    mode("open")
    for email in ("a@example.com", "b@example.com"):
        assert (await client.post(REGISTER, json=creds(email))).status_code == 201
    assert (await client.get(STATUS)).json() == {"open": True}


async def test_closed_lets_no_one_register_not_even_the_first(client: AsyncClient, mode):
    mode("closed")
    assert (await client.get(STATUS)).json() == {"open": False}
    assert (await client.post(REGISTER, json=creds("owner@example.com"))).status_code == 403


async def test_a_refused_sign_up_creates_nothing(client: AsyncClient, mode):
    mode("closed")
    await client.post(REGISTER, json=creds("owner@example.com"))
    mode("auto")
    assert (await client.get(STATUS)).json() == {"open": True}  # still no account


async def test_existing_accounts_can_still_sign_in_when_closed(client: AsyncClient, mode):
    mode("open")
    await client.post(REGISTER, json=creds("owner@example.com"))
    mode("closed")
    login = await client.post(
        "/api/v1/auth/login",
        data={"username": "owner@example.com", "password": "correct-horse-battery"},
    )
    assert login.status_code == 200
