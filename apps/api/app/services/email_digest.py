"""Emailing notifications. A notification is made by `NotificationService` as before; for a user
who switched email on, the ones not yet emailed go out together as one digest, so a quiet morning
is no email and a busy one is one email, not ten.

Only the sign-in address is ever written to, and only when that user asked for it. A failed send
leaves the notifications as they were, so the next run tries again (for up to `WINDOW`)."""

import logging
from datetime import UTC, datetime, timedelta
from html import escape

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import mailer
from app.config import settings
from app.models import Notification, User

logger = logging.getLogger(__name__)

# Only notifications this recent are emailed, so switching email on does not send the whole backlog.
WINDOW = timedelta(days=2)
# At most this many in one digest; the rest wait for the next one.
MAX_PER_DIGEST = 20


def _link(path: str | None) -> str | None:
    if not path or not settings.app_url:
        return None
    return settings.app_url.rstrip("/") + path


def render(items: list[Notification]) -> tuple[str, str, str]:
    """(subject, plain text, html) for a digest."""
    n = len(items)
    subject = items[0].title if n == 1 else f"Maalu: {n} things need a look"
    text_lines: list[str] = []
    html_rows: list[str] = []
    for item in items:
        link = _link(item.link)
        text_lines.append(f"- {item.title}" + (f": {item.body}" if item.body else ""))
        if link:
            text_lines.append(f"  {link}")
        title = escape(item.title)
        if link:
            title = f'<a href="{escape(link)}">{title}</a>'
        body = f'<br><span style="color:#555">{escape(item.body)}</span>' if item.body else ""
        html_rows.append(f'<li style="margin:0 0 10px"><strong>{title}</strong>{body}</li>')
    footer = "You get these because email is switched on in Maalu's Settings."
    text = "\n".join(text_lines) + f"\n\n{footer}\n"
    html = (
        '<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.4">'
        f'<ul style="padding-left:18px">{"".join(html_rows)}</ul>'
        f'<p style="color:#777;font-size:12px">{escape(footer)}</p></div>'
    )
    return subject, text, html


async def send_digests(db: AsyncSession, now: datetime | None = None) -> int:
    """Email each opted-in user their new notifications; returns how many emails went out. Does
    nothing when the server has no SMTP settings."""
    if not mailer.configured():
        return 0
    now = now or datetime.now(UTC)
    users = (
        await db.scalars(select(User).where(User.is_active.is_(True), User.notify_email.is_(True)))
    ).all()
    sent = 0
    for user in users:
        items = (
            await db.scalars(
                select(Notification)
                .where(
                    Notification.user_id == user.id,
                    Notification.emailed_at.is_(None),
                    Notification.dismissed_at.is_(None),
                    Notification.read_at.is_(None),
                    Notification.created_at >= now - WINDOW,
                )
                .order_by(Notification.created_at)
                .limit(MAX_PER_DIGEST)
            )
        ).all()
        if not items:
            continue
        subject, text, html = render(list(items))
        try:
            await mailer.send(user.email, subject, text, html)
        except mailer.MailError as exc:
            logger.warning("could not email %s: %s", user.id, exc)  # the next run tries again
            continue
        for item in items:
            item.emailed_at = now
        await db.flush()
        sent += 1
    return sent
