"""Market exchange rates, offered as a suggestion when a foreign-currency amount is entered.

Rates come from the same Frankfurter service the currency list does. The suggestion is only that:
the rate saved on a transaction is whatever the user confirms in the form, so a bank's real rate
always wins. Past days are cached in the database, because a past day's rate never changes.
"""

import logging
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Account, ExchangeRate, User

logger = logging.getLogger(__name__)

RATE_QUANTUM = Decimal("0.00000001")  # 8 decimals, as stored on a transaction
LOOKBACK_DAYS = 10  # how far back to look when the asked-about day has no rate
SOURCE_NAME = "Frankfurter"


class MarketRateUnavailableError(Exception):
    """The rate source could not be reached or answered with an error."""


@dataclass(frozen=True)
class MarketRate:
    base: str
    quote: str
    rate: Decimal
    rate_date: date
    requested_date: date

    @property
    def exact(self) -> bool:
        return self.rate_date == self.requested_date


async def _get(params: dict[str, str]) -> list[dict]:
    """Ask the rate source. An unknown currency is an empty answer; anything else that goes
    wrong raises MarketRateUnavailableError."""
    try:
        async with httpx.AsyncClient(timeout=settings.exchange_rate_timeout_seconds) as client:
            response = await client.get(settings.currency_source_url, params=params)
    except httpx.HTTPError as exc:
        logger.warning("Exchange rate lookup failed (%s: %s)", type(exc).__name__, exc)
        raise MarketRateUnavailableError from exc
    if response.status_code == 422:  # the source doesn't know one of the currencies
        return []
    if response.status_code != 200:
        logger.warning("Exchange rate source answered %s", response.status_code)
        raise MarketRateUnavailableError
    body = response.json()
    return body if isinstance(body, list) else []


def _row_rate(row: dict, base: str, quote: str, requested: date) -> MarketRate | None:
    try:
        return MarketRate(
            base=base,
            quote=quote,
            rate=Decimal(str(row["rate"])).quantize(RATE_QUANTUM),
            rate_date=date.fromisoformat(row["date"]),
            requested_date=requested,
        )
    except (KeyError, ValueError, ArithmeticError):
        return None


async def market_rate(
    db: AsyncSession, base: str, quote: str, on: date, *, today: date | None = None
) -> MarketRate | None:
    """The market rate for 1 `base` in `quote` on a day, or None when the source has none.

    - Same currency: 1, with no lookup.
    - A past day: from the cache, else fetched (the nearest earlier day if that day has no data)
      and cached.
    - Today or a future day: the latest rate, never cached.
    """
    today = today or date.today()
    if base == quote:
        return MarketRate(base, quote, Decimal(1).quantize(RATE_QUANTUM), on, on)

    past = on < today
    if past:
        cached = await db.scalar(
            select(ExchangeRate).where(
                ExchangeRate.base == base,
                ExchangeRate.quote == quote,
                ExchangeRate.requested_on == on,
            )
        )
        if cached:
            return MarketRate(base, quote, cached.rate.quantize(RATE_QUANTUM), cached.rate_date, on)

    params = {"base": base, "quotes": quote}
    if past:
        params["date"] = on.isoformat()
    rows = await _get(params)
    if not rows and past:
        # A day the source has no rate for: take the nearest earlier one.
        rows = await _get(
            {
                **params,
                "from": (on - timedelta(days=LOOKBACK_DAYS)).isoformat(),
                "to": on.isoformat(),
            }
        )
        rows = sorted((r for r in rows if "date" in r), key=lambda r: r["date"])[-1:]
    found = _row_rate(rows[-1], base, quote, on) if rows else None
    if found is None:
        return None

    if past:
        db.add(
            ExchangeRate(
                base=base, quote=quote, requested_on=on, rate_date=found.rate_date, rate=found.rate
            )
        )
        await db.flush()
    return found


# --- keeping rates fresh, and their history ---------------------------------------------------

HISTORY_MIN_DAYS = 7
HISTORY_MAX_DAYS = 365


@dataclass(frozen=True)
class RatePoint:
    day: date
    rate: Decimal


async def _remember(db: AsyncSession, base: str, quote: str, day: date, rate: Decimal) -> None:
    """Keep a rate under the day the source says it is for (a day's rate never changes after)."""
    exists = await db.scalar(
        select(ExchangeRate.id).where(
            ExchangeRate.base == base,
            ExchangeRate.quote == quote,
            ExchangeRate.requested_on == day,
        )
    )
    if exists is None:
        db.add(ExchangeRate(base=base, quote=quote, requested_on=day, rate_date=day, rate=rate))


async def cache_latest(db: AsyncSession, base: str, quote: str) -> MarketRate | None:
    """The latest rate for 1 `base` in `quote`, kept under its own day so history builds up even
    when nobody asked for it. None when the source has no rate for the pair."""
    if base == quote:
        return None
    rows = await _get({"base": base, "quotes": quote})
    found = _row_rate(rows[-1], base, quote, date.today()) if rows else None
    if found is None:
        return None
    await _remember(db, base, quote, found.rate_date, found.rate)
    await db.flush()
    return found


async def refresh_rates(db: AsyncSession, user_id=None) -> tuple[int, int]:
    """Look up the latest rate for every foreign currency in use (an account that is not
    archived and not in its owner's base currency), keep it for the history, and set the rate of
    each account that asked to follow the market. Returns (pairs looked up, accounts updated).
    A pair the source cannot answer is skipped and tried again next time."""
    stmt = (
        select(Account, User.base_currency)
        .join(User, User.id == Account.user_id)
        .where(Account.archived_at.is_(None), Account.currency != User.base_currency)
    )
    if user_id is not None:
        stmt = stmt.where(Account.user_id == user_id)
    pairs: dict[tuple[str, str], list[Account]] = {}
    for account, base in (await db.execute(stmt)).all():
        pairs.setdefault((account.currency, base), []).append(account)

    looked_up = updated = 0
    for (currency, base), accounts in pairs.items():
        try:
            found = await cache_latest(db, currency, base)
        except MarketRateUnavailableError:
            continue
        if found is None:
            continue
        looked_up += 1
        for account in accounts:
            if account.auto_rate and account.exchange_rate != found.rate:
                account.exchange_rate = found.rate
                updated += 1
    await db.flush()
    return looked_up, updated


async def rate_history(db: AsyncSession, base: str, quote: str, days: int) -> list[RatePoint]:
    """The rate of 1 `base` in `quote` on the days the source had one, over the last `days` days,
    oldest first. Kept rates are used; when too few are kept the source is asked for the whole
    stretch once and what it answers is kept. If the source cannot be reached, what is kept is
    returned (raises MarketRateUnavailableError only when nothing is)."""
    today = date.today()
    start = today - timedelta(days=days - 1)

    async def kept() -> dict[date, Decimal]:
        rows = await db.scalars(
            select(ExchangeRate).where(
                ExchangeRate.base == base,
                ExchangeRate.quote == quote,
                ExchangeRate.rate_date >= start,
                ExchangeRate.rate_date <= today,
            )
        )
        return {r.rate_date: r.rate.quantize(RATE_QUANTUM) for r in rows}

    points = await kept()
    if base != quote and len(points) < max(2, days // 4):
        try:
            series = await _get(
                {"base": base, "quotes": quote, "from": start.isoformat(), "to": today.isoformat()}
            )
        except MarketRateUnavailableError:
            if not points:
                raise
        else:
            for row in series:
                found = _row_rate(row, base, quote, today)
                if found and start <= found.rate_date <= today:
                    await _remember(db, base, quote, found.rate_date, found.rate)
            await db.flush()
            points = await kept()
    return [RatePoint(d, r) for d, r in sorted(points.items())]
