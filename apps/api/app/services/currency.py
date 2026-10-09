import logging
import re
import time

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Used only when the upstream source is unreachable and nothing is cached yet.
FALLBACK_CURRENCIES = (
    "AED",
    "AUD",
    "BDT",
    "BHD",
    "BRL",
    "CAD",
    "CHF",
    "CNY",
    "DKK",
    "EGP",
    "EUR",
    "GBP",
    "HKD",
    "IDR",
    "INR",
    "JPY",
    "KRW",
    "KWD",
    "LKR",
    "MVR",
    "MYR",
    "NOK",
    "NPR",
    "NZD",
    "OMR",
    "PHP",
    "PKR",
    "QAR",
    "SAR",
    "SEK",
    "SGD",
    "THB",
    "TRY",
    "USD",
    "ZAR",
)

_CODE = re.compile(r"^[A-Z]{3}$")

# (fetched_at monotonic seconds, sorted codes)
_cache: tuple[float, list[str]] | None = None


async def _fetch(url: str) -> list[str]:
    """Return the currency codes the source knows about.

    The source is a rates feed (rows of `{base, quote, rate, date}`). We keep only the `base` and
    `quote` codes; rates are deliberately ignored; users always enter their own exchange rate.
    """
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        rows = response.json()

    codes: set[str] = set()
    for row in rows:
        for key in ("base", "quote"):
            code = row.get(key)
            if isinstance(code, str) and _CODE.match(code):
                codes.add(code)
    return sorted(codes)


async def list_currencies() -> list[str]:
    """World currency codes, cached; falls back to stale cache, then a built-in list."""
    global _cache
    now = time.monotonic()
    if _cache and now - _cache[0] < settings.currency_cache_ttl_seconds:
        return _cache[1]

    try:
        codes = await _fetch(settings.currency_source_url)
        if not codes:
            raise ValueError("currency source returned no codes")
    except Exception as exc:
        # One line, no traceback (it was ~60 lines of httpx internals). Full detail at DEBUG.
        logger.warning(
            "Could not refresh currency list from %s (%s: %s); using %s. "
            "If DNS returns 0.0.0.0 for the host, your network's DNS filter is blocking it.",
            settings.currency_source_url,
            type(exc).__name__,
            exc,
            "cached list" if _cache else "built-in fallback list",
        )
        logger.debug("Currency refresh failure detail", exc_info=True)
        return _cache[1] if _cache else list(FALLBACK_CURRENCIES)

    _cache = (now, codes)
    return codes
