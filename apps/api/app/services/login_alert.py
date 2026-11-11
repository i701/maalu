"""The email sent when someone signs in ("new sign-in to your Maalu account"), so a sign-in that was
not yours is noticed. It tells the time, the device (read from the browser or app's User-Agent) and
the address the sign-in came from, and where to go if it was not you.

It runs after the sign-in has answered (a background task), so a slow or broken mail server never
delays or fails a sign-in: a failed send is only logged. It is given plain values, not a database
session, because the request's session is closed by then. Only the sign-in address is written to,
and only when `notify_login` is on and the server has SMTP settings."""

import logging
import re
from datetime import UTC, datetime
from html import escape

from app import mailer
from app.config import settings

logger = logging.getLogger(__name__)


def describe_device(user_agent: str | None) -> str:
    """ "Firefox on Linux", "Maalu app on Android": the same reading the web's Settings makes."""
    ua = (user_agent or "").strip()
    if not ua:
        return "Unknown device"
    if ua.startswith("Maalu-Android"):
        return "Maalu app on Android"
    # Order matters: Edge, Opera and Chrome all say "Chrome", and most browsers say "Safari".
    browser = None
    if re.search(r"\bEdg(e|A|iOS)?/", ua):
        browser = "Edge"
    elif re.search(r"\b(OPR|Opera)/", ua):
        browser = "Opera"
    elif re.search(r"\b(Firefox|FxiOS)/", ua):
        browser = "Firefox"
    elif re.search(r"\b(Chrome|CriOS)/", ua):
        browser = "Chrome"
    elif "Safari/" in ua and "Version/" in ua:
        browser = "Safari"
    elif ua.lower().startswith("curl/"):
        browser = "curl"
    # Android also says "Linux", and iPhones say "like Mac OS X", so those come first.
    system = None
    if "Android" in ua:
        system = "Android"
    elif re.search(r"iPhone|iPad|iPod", ua):
        system = "iOS"
    elif "Windows" in ua:
        system = "Windows"
    elif re.search(r"Mac OS X|Macintosh", ua):
        system = "macOS"
    elif "CrOS" in ua:
        system = "ChromeOS"
    elif re.search(r"Linux|X11", ua):
        system = "Linux"
    if browser and system:
        return f"{browser} on {system}"
    return browser or system or "Unknown device"


def render(device: str, ip: str, when: datetime) -> tuple[str, str, str]:
    """(subject, plain text, html) for the alert."""
    moment = when.astimezone(UTC).strftime("%d %b %Y, %H:%M UTC")
    settings_url = settings.app_url.rstrip("/") + "/settings" if settings.app_url else None
    subject = "New sign-in to your Maalu account"
    advice = (
        "If this was you, there is nothing to do. If it was not, change your password and sign out "
        "your other devices in Settings" + (f": {settings_url}" if settings_url else ".")
    )
    footer = "You get this because sign-in alerts are on in Maalu's Settings (Notifications)."
    text = (
        "Someone signed in to your Maalu account.\n\n"
        f"Device:  {device}\nAddress: {ip}\nTime:    {moment}\n\n{advice}\n\n{footer}\n"
    )

    def row(label: str, value: str) -> str:
        cell = 'style="padding:2px 16px 2px 0;color:#555"'
        return f"<tr><td {cell}>{label}</td><td>{escape(value)}</td></tr>"

    link = f' <a href="{escape(settings_url)}">Open Settings</a>' if settings_url else ""
    html = (
        '<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5">'
        "<p><strong>Someone signed in to your Maalu account.</strong></p>"
        '<table style="border-collapse:collapse">'
        f"{row('Device', device)}{row('Address', ip)}{row('Time', moment)}"
        "</table>"
        "<p>If this was you, there is nothing to do. If it was not, change your password and sign "
        f"out your other devices in Settings.{link}</p>"
        f'<p style="color:#777;font-size:12px">{escape(footer)}</p></div>'
    )
    return subject, text, html


async def send(email: str, user_agent: str | None, ip: str, when: datetime | None = None) -> None:
    """Email the alert. Never raises: a sign-in must not depend on the mail server."""
    if not mailer.configured():
        return
    subject, text, html = render(
        describe_device(user_agent), ip or "unknown", when or datetime.now(UTC)
    )
    try:
        await mailer.send(email, subject, text, html)
    except mailer.MailError as exc:
        logger.warning("Could not send the sign-in alert: %s", exc)
    except Exception:  # a background task has nobody to tell; keep it from vanishing silently
        logger.exception("Could not send the sign-in alert")
