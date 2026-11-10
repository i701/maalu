"""Sending email over SMTP, with the standard library only (no new dependency). Any provider works:
Brevo, Mailgun, Postmark, a company relay. The settings are `SMTP_*` (see `config.py`).

`send` runs smtplib in a thread, so it never blocks the event loop. Tests replace it with
`set_sender`, so nothing ever really connects."""

import asyncio
import smtplib
import ssl
from collections.abc import Awaitable, Callable
from email.message import EmailMessage
from email.utils import formataddr

from app.config import settings


class MailError(Exception):
    """The message could not be sent (the provider refused it, or could not be reached)."""


def configured() -> bool:
    """Email is on when a server and a sender address are set."""
    return bool(settings.smtp_host and settings.smtp_from)


def build(to: str, subject: str, text: str, html: str | None = None) -> EmailMessage:
    message = EmailMessage()
    message["From"] = formataddr((settings.smtp_from_name, settings.smtp_from))
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    if html:
        message.add_alternative(html, subtype="html")
    return message


def _send_now(message: EmailMessage) -> None:
    host, port, security = settings.smtp_host, settings.smtp_port, settings.smtp_security
    timeout = settings.smtp_timeout_seconds
    try:
        if security == "ssl":
            client: smtplib.SMTP = smtplib.SMTP_SSL(
                host, port, timeout=timeout, context=ssl.create_default_context()
            )
        else:
            client = smtplib.SMTP(host, port, timeout=timeout)
        with client:
            if security == "starttls":
                client.starttls(context=ssl.create_default_context())
            if settings.smtp_username:
                client.login(settings.smtp_username, settings.smtp_password)
            client.send_message(message)
    except (smtplib.SMTPException, OSError) as exc:
        raise MailError(f"{type(exc).__name__}: {exc}") from exc


Sender = Callable[[EmailMessage], Awaitable[None]]


async def _smtp_sender(message: EmailMessage) -> None:
    await asyncio.to_thread(_send_now, message)


_sender: Sender = _smtp_sender


def set_sender(sender: Sender | None) -> None:
    """Swap the sender (tests); `None` puts the real one back."""
    global _sender
    _sender = sender or _smtp_sender


async def send(to: str, subject: str, text: str, html: str | None = None) -> None:
    """Send one message. Raises `MailError` when email is off or the provider refuses it."""
    if not configured():
        raise MailError("Email is not set up on this server (SMTP_HOST and SMTP_FROM).")
    await _sender(build(to, subject, text, html))
