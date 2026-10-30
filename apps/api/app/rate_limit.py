"""Slows down guessing on the sign-in and sign-up routes, in memory.

Maalu runs as one process for one household, so a counter held in memory is enough: nothing extra to
install or configure, and a restart simply forgets it. (With several workers each would count on its
own, so the limit would be a multiple. Run one, which is the default.)

Failed attempts are counted per **account** (the email, whether or not it exists, so the answer
never tells you which emails are registered) and per **client address**. The browser never talks to
the API, so the address is the visitor's, passed on by the web server in `X-Forwarded-For`; see
`FORWARDED_ALLOW_IPS` in the production compose file.

Pure and clock-injectable: no FastAPI, no database.
"""

import math
import time
from collections import deque
from collections.abc import Callable

from app.config import settings

# Policy: how many failures within the window before the next attempt is refused.
LOGIN_WINDOW = 15 * 60
LOGIN_ACCOUNT_FAILURES = 10
LOGIN_IP_FAILURES = 30
TWO_FACTOR_IP_FAILURES = 20
REGISTER_WINDOW = 60 * 60
REGISTER_IP_ATTEMPTS = 10

# Memory bound: when this many keys are held, the ones not seen for the longest window are dropped.
MAX_KEYS = 10_000
LONGEST_WINDOW = REGISTER_WINDOW


class RateLimitedError(Exception):
    """Too many attempts. `retry_after` is the seconds until the next one is allowed."""

    def __init__(self, retry_after: int) -> None:
        self.retry_after = max(1, retry_after)
        super().__init__(f"Retry after {self.retry_after} seconds")

    @property
    def message(self) -> str:
        minutes = math.ceil(self.retry_after / 60)
        return f"Too many attempts. Try again in {minutes} minute{'s' if minutes != 1 else ''}"


class RateLimiter:
    """Counts events per key inside a sliding window."""

    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._events: dict[str, deque[float]] = {}

    def _live(self, key: str, window: float) -> deque[float]:
        events = self._events.setdefault(key, deque())
        cutoff = self._clock() - window
        while events and events[0] <= cutoff:
            events.popleft()
        return events

    def check(self, key: str, limit: int, window: float) -> None:
        """Raise `RateLimitedError` if `key` already has `limit` events inside the window."""
        events = self._live(key, window)
        if len(events) >= limit:
            # the oldest event leaving the window is what makes room again
            raise RateLimitedError(math.ceil(events[0] + window - self._clock()))
        if not events:
            del self._events[key]

    def record(self, key: str, window: float) -> None:
        self._live(key, window).append(self._clock())
        if len(self._events) > MAX_KEYS:
            self._sweep()

    def reset(self, key: str) -> None:
        self._events.pop(key, None)

    def clear(self) -> None:
        self._events.clear()

    def _sweep(self) -> None:
        cutoff = self._clock() - LONGEST_WINDOW
        for key in [k for k, e in self._events.items() if not e or e[-1] <= cutoff]:
            del self._events[key]


limiter = RateLimiter()


def _account(email: str) -> str:
    return email.strip().lower()[:320]


def _on() -> bool:
    return settings.rate_limit


def check_login(email: str, ip: str) -> None:
    if not _on():
        return
    limiter.check(f"login:account:{_account(email)}", LOGIN_ACCOUNT_FAILURES, LOGIN_WINDOW)
    limiter.check(f"login:ip:{ip}", LOGIN_IP_FAILURES, LOGIN_WINDOW)


def login_failed(email: str, ip: str) -> None:
    if not _on():
        return
    limiter.record(f"login:account:{_account(email)}", LOGIN_WINDOW)
    limiter.record(f"login:ip:{ip}", LOGIN_WINDOW)


def login_succeeded(email: str) -> None:
    """A right password clears the account's failures, so a few typos never add up."""
    limiter.reset(f"login:account:{_account(email)}")


def check_two_factor(ip: str) -> None:
    if _on():
        limiter.check(f"2fa:ip:{ip}", TWO_FACTOR_IP_FAILURES, LOGIN_WINDOW)


def two_factor_failed(ip: str) -> None:
    if _on():
        limiter.record(f"2fa:ip:{ip}", LOGIN_WINDOW)


def check_register(ip: str) -> None:
    """Every attempt counts, successful or not."""
    if not _on():
        return
    limiter.check(f"register:ip:{ip}", REGISTER_IP_ATTEMPTS, REGISTER_WINDOW)
    limiter.record(f"register:ip:{ip}", REGISTER_WINDOW)
