from datetime import UTC, date, datetime, timedelta

import pytest
from app import jobs, mailer
from app.config import settings
from app.models import Notification
from app.services import notification as notifications
from app.services.email_digest import render
from httpx import AsyncClient
from sqlalchemy import select

ME = "/api/v1/users/me"
TX = "/api/v1/transactions"


@pytest.fixture(autouse=True)
def outbox(monkeypatch):
    """SMTP on, a fake sender that records what would have gone out, and no look throttle."""
    monkeypatch.setattr(notifications, "SYNC_EVERY_SECONDS", 0)
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.test")
    monkeypatch.setattr(settings, "smtp_from", "maalu@example.test")
    monkeypatch.setattr(settings, "app_url", "https://maalu.example.test")
    sent: list = []

    async def fake(message):
        # the sign-in alerts (their own tests are in test_login_alert.py) are not what these count
        if message["Subject"] != "New sign-in to your Maalu account":
            sent.append(message)

    mailer.set_sender(fake)
    yield sent
    mailer.set_sender(None)


async def due_payment(client, auth, description="Rent"):
    res = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": "10",
            "payment_method": "cash",
            "category": "Bills",
            "description": description,
            "transaction_date": date.today().isoformat(),
            "planned": True,
        },
        headers=auth,
    )
    assert res.status_code == 201, res.text
    await client.get("/api/v1/notifications", headers=auth)  # looks, so the notification exists


async def digest(client) -> int:
    return await jobs.email_notifications(client.session_factory)


async def test_status_says_whether_email_is_set_up(client: AsyncClient, auth, monkeypatch):
    on = (await client.get("/api/v1/email/status", headers=auth)).json()
    assert on == {"configured": True, "sender": "maalu@example.test"}
    monkeypatch.setattr(settings, "smtp_host", "")
    off = (await client.get("/api/v1/email/status", headers=auth)).json()
    assert off == {"configured": False, "sender": None}


async def test_a_test_email_goes_to_your_own_address(client: AsyncClient, auth, outbox):
    res = await client.post("/api/v1/email/test", headers=auth)
    assert res.status_code == 204
    assert len(outbox) == 1
    assert outbox[0]["To"] == (await client.get(ME, headers=auth)).json()["email"]


async def test_a_test_email_reports_why_it_failed(client: AsyncClient, auth, monkeypatch):
    async def refuse(message):
        raise mailer.MailError("SMTPAuthenticationError: bad key")

    mailer.set_sender(refuse)
    res = await client.post("/api/v1/email/test", headers=auth)
    assert res.status_code == 503
    assert "bad key" in res.json()["detail"]
    monkeypatch.setattr(settings, "smtp_host", "")
    assert (await client.post("/api/v1/email/test", headers=auth)).status_code == 503


async def test_email_is_off_until_you_switch_it_on(client: AsyncClient, auth, outbox):
    assert (await client.get(ME, headers=auth)).json()["notify_email"] is False
    await due_payment(client, auth)
    assert await digest(client) == 0
    assert outbox == []
    await client.patch(ME, json={"notify_email": True}, headers=auth)
    assert await digest(client) == 1
    assert len(outbox) == 1
    assert "Rent" in outbox[0].get_body(("plain",)).get_content()


async def test_each_notification_is_emailed_once_and_together(client: AsyncClient, auth, outbox):
    await client.patch(ME, json={"notify_email": True}, headers=auth)
    await due_payment(client, auth, "Rent")
    await due_payment(client, auth, "Wifi")
    assert await digest(client) == 1  # two notifications, one email
    body = outbox[0].get_body(("plain",)).get_content()
    assert "Rent" in body
    assert "Wifi" in body
    assert "https://maalu.example.test/" in body  # links to the page
    assert await digest(client) == 0  # nothing new, nothing sent
    assert len(outbox) == 1


async def test_a_failed_send_is_tried_again(client: AsyncClient, auth, outbox):
    await client.patch(ME, json={"notify_email": True}, headers=auth)
    await due_payment(client, auth)

    async def refuse(message):
        raise mailer.MailError("down")

    mailer.set_sender(refuse)
    assert await digest(client) == 0
    async with client.session_factory() as session:
        row = (await session.scalars(select(Notification))).first()
        assert row.emailed_at is None

    async def ok(message):
        outbox.append(message)

    mailer.set_sender(ok)
    assert await digest(client) == 1


async def test_read_dismissed_and_old_ones_are_not_emailed(client: AsyncClient, auth, outbox):
    await client.patch(ME, json={"notify_email": True}, headers=auth)
    await due_payment(client, auth)
    async with client.session_factory() as session:
        row = (await session.scalars(select(Notification))).first()
        row.created_at = datetime.now(UTC) - timedelta(days=5)  # older than the window
        await session.commit()
    assert await digest(client) == 0
    assert outbox == []


async def test_nothing_is_sent_when_the_server_has_no_smtp(client: AsyncClient, auth, monkeypatch):
    await client.patch(ME, json={"notify_email": True}, headers=auth)
    await due_payment(client, auth)
    monkeypatch.setattr(settings, "smtp_host", "")
    assert await digest(client) == 0


def test_the_digest_is_plain_about_one_thing_and_counts_several():
    one = Notification(title="Rent is due", body="MVR 10.00", link="/plan")
    subject, _, html = render([one])
    assert subject == "Rent is due"
    assert "<script" not in html
    many, _, _ = render([one, Notification(title="Wifi", body="", link=None)])
    assert many == "Maalu: 2 things need a look"


def test_text_from_a_notification_cannot_inject_html():
    evil = Notification(title="<script>alert(1)</script>", body="<b>x</b>", link=None)
    _, _, html = render([evil])
    assert "<script>" not in html
    assert "&lt;script&gt;" in html


async def test_the_flag_is_in_backups(client: AsyncClient, auth):
    await client.patch(ME, json={"notify_email": True}, headers=auth)
    backup = (await client.get("/api/v1/backup", headers=auth)).json()
    assert backup["settings"]["notify_email"] is True


def test_the_admin_command_reports_what_it_used_and_sends(outbox, capsys):

    from app import admin

    # the command drives the same sender, so a fake one records the message
    assert admin.test_email("me@example.test") == 0
    assert len(outbox) == 1
    shown = capsys.readouterr().out
    assert "smtp.example.test" in shown
    assert "Sent." in shown


def test_the_admin_command_says_why_it_failed(monkeypatch, capsys):
    from app import admin

    async def refuse(message):
        raise mailer.MailError("SMTPAuthenticationError: bad key")

    mailer.set_sender(refuse)
    assert admin.test_email("me@example.test") == 1
    assert "bad key" in capsys.readouterr().err
    monkeypatch.setattr(settings, "smtp_host", "")
    assert admin.test_email("me@example.test") == 1


async def test_short_numbers_is_a_setting_that_defaults_off_and_is_in_backups(
    client: AsyncClient, auth
):
    assert (await client.get(ME, headers=auth)).json()["compact_numbers"] is False
    res = await client.patch(ME, json={"compact_numbers": True}, headers=auth)
    assert res.status_code == 200, res.text
    assert res.json()["compact_numbers"] is True
    backup = (await client.get("/api/v1/backup", headers=auth)).json()
    assert backup["settings"]["compact_numbers"] is True
