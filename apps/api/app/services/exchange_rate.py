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
from app.models import ExchangeRate

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
