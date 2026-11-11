import pyotp
import pytest
from app import mailer, two_factor
from app.config import settings
from app.services import login_alert
from httpx import AsyncClient

ME = "/api/v1/users/me"
LOGIN = "/api/v1/auth/login"
FIREFOX = "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0"


@pytest.fixture(autouse=True)
def outbox(monkeypatch):
    """SMTP on and a fake sender that records what would have gone out."""
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.test")
    monkeypatch.setattr(settings, "smtp_from", "maalu@example.test")
    monkeypatch.setattr(settings, "app_url", "https://maalu.example.test")
    sent: list = []

    async def fake(message):
        sent.append(message)

    mailer.set_sender(fake)
    yield sent
    mailer.set_sender(None)


async def sign_in(client: AsyncClient, email: str, agent: str = FIREFOX):
    return await client.post(
        LOGIN,
        data={"username": email, "password": "correct-horse-battery"},
        headers={"User-Agent": agent},
    )


async def test_signing_in_emails_an_alert_with_device_address_and_time(
    client: AsyncClient, signup, outbox
):
    await signup("alice@example.com")
    outbox.clear()  # the sign-in inside signup() sent one too
    assert (await sign_in(client, "alice@example.com")).status_code == 200
    assert len(outbox) == 1
    mail = outbox[0]
    assert mail["To"] == "alice@example.com"
    assert mail["Subject"] == "New sign-in to your Maalu account"
    body = mail.get_body(("plain",)).get_content()
    assert "Firefox on Linux" in body
    assert "UTC" in body
    assert "https://maalu.example.test/settings" in body
    assert "Address:" in body


async def test_a_wrong_password_sends_no_alert(client: AsyncClient, signup, outbox):
    await signup("alice@example.com")
    outbox.clear()
    res = await client.post(
        LOGIN, data={"username": "alice@example.com", "password": "nope-nope-no"}
    )
    assert res.status_code == 401
    assert outbox == []


async def test_it_can_be_turned_off_and_is_on_by_default(client: AsyncClient, signup, outbox):
    auth = await signup("alice@example.com")
    assert (await client.get(ME, headers=auth)).json()["notify_login"] is True
    res = await client.patch(ME, json={"notify_login": False}, headers=auth)
    assert res.json()["notify_login"] is False
    backup = (await client.get("/api/v1/backup", headers=auth)).json()
    assert backup["settings"]["notify_login"] is False
    outbox.clear()
    await sign_in(client, "alice@example.com")
    assert outbox == []


async def test_nothing_is_sent_when_the_server_has_no_email(
    client: AsyncClient, signup, outbox, monkeypatch
):
    await signup("alice@example.com")
    outbox.clear()
    monkeypatch.setattr(settings, "smtp_host", "")
    assert (await sign_in(client, "alice@example.com")).status_code == 200
    assert outbox == []


async def test_a_failing_mail_server_never_fails_the_sign_in(client: AsyncClient, signup):
    await signup("alice@example.com")

    async def refuse(message):
        raise mailer.MailError("SMTPAuthenticationError: bad key")

    mailer.set_sender(refuse)
    res = await sign_in(client, "alice@example.com")
    assert res.status_code == 200
    assert "access_token" in res.json()


async def test_with_two_factor_the_alert_goes_after_the_code_not_after_the_password(
    client: AsyncClient, signup, outbox, monkeypatch
):
    now = [1_800_000_000.0]
    monkeypatch.setattr(two_factor, "_now", lambda: now[0])
    auth = await signup("alice@example.com")
    setup = (await client.post("/api/v1/auth/2fa/setup", headers=auth)).json()
    code = pyotp.TOTP(setup["secret"]).at(now[0])
    assert (
        await client.post("/api/v1/auth/2fa/enable", json={"code": code}, headers=auth)
    ).status_code == 200
    now[0] += two_factor.STEP_SECONDS
    outbox.clear()
    first = await sign_in(client, "alice@example.com")
    assert first.json()["two_factor_required"] is True
    assert outbox == []  # the password alone is not a sign-in
    done = await client.post(
        "/api/v1/auth/login/2fa",
        json={
            "challenge_token": first.json()["challenge_token"],
            "code": pyotp.TOTP(setup["secret"]).at(now[0]),
        },
        headers={"User-Agent": FIREFOX},
    )
    assert done.status_code == 200, done.text
    assert len(outbox) == 1
    assert "Firefox on Linux" in outbox[0].get_body(("plain",)).get_content()


def test_devices_are_named_like_the_web_does():
    assert login_alert.describe_device(FIREFOX) == "Firefox on Linux"
    assert login_alert.describe_device("Maalu-Android/0.1") == "Maalu app on Android"
    assert (
        login_alert.describe_device(
            "Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36"
        )
        == "Chrome on Android"
    )
    assert login_alert.describe_device("curl/8.5.0") == "curl"
    assert login_alert.describe_device(None) == "Unknown device"


def test_what_the_alert_shows_is_escaped():
    from datetime import UTC, datetime

    _, text, html = login_alert.render(
        "<b>x</b>", "1.2.3.4", datetime(2026, 11, 11, 9, 5, tzinfo=UTC)
    )
    assert "&lt;b&gt;" in html
    assert "<b>x</b>" not in html
    assert "11 Nov 2026, 09:05 UTC" in text
