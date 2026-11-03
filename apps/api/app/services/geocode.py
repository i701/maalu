"""Looking a place up by name, for the map's search box.

This is the one place Maalu sends something a user typed to a service that is not the user's own
(the web app's tile requests are the other, made by the browser). So it is deliberately narrow: only
when someone presses Search, only the text they typed (and roughly where the map is, to prefer
nearby places), never as-you-type. It keeps to Nominatim's usage policy: an identifying User-Agent,
no more than one request a second (`_pace`), and a memory cache so the same search is not repeated.
"""

import asyncio
import logging
import time
from collections import OrderedDict
from dataclasses import dataclass
from decimal import Decimal

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

MIN_INTERVAL = 1.1  # seconds between requests to the geocoder (its policy is one a second)
CACHE_SECONDS = 60 * 60
CACHE_SIZE = 200
BIAS_DEGREES = 1.0  # prefer results within this many degrees of where the map is
MAX_RESULTS = 8
COORDINATE = Decimal("0.000001")


class GeocoderDisabledError(Exception):
    """Place search is turned off on this server."""


class GeocoderUnavailableError(Exception):
    """The geocoder could not be reached or answered with an error."""


@dataclass(frozen=True)
class PlaceHit:
    name: str
    address: str
    latitude: Decimal
    longitude: Decimal


_cache: OrderedDict[tuple, tuple[float, list[PlaceHit]]] = OrderedDict()
_pace_lock = asyncio.Lock()
_last_request = 0.0


async def _pace() -> None:
    """Wait until at least `MIN_INTERVAL` has passed since the last request to the geocoder."""
    global _last_request
    async with _pace_lock:
        wait = _last_request + MIN_INTERVAL - time.monotonic()
        if wait > 0:
            await asyncio.sleep(wait)
        _last_request = time.monotonic()


async def _get(params: dict[str, str]) -> list[dict]:
    """Ask the geocoder. Anything that goes wrong raises GeocoderUnavailableError."""
    await _pace()
    try:
        async with httpx.AsyncClient(timeout=settings.geocoder_timeout_seconds) as client:
            response = await client.get(
                settings.geocoder_url,
                params=params,
                headers={"User-Agent": settings.geocoder_user_agent, "Accept-Language": "en"},
            )
    except httpx.HTTPError as exc:
        logger.warning("Place search failed (%s: %s)", type(exc).__name__, exc)
        raise GeocoderUnavailableError from exc
    if response.status_code != 200:
        logger.warning("Place search answered %s", response.status_code)
        raise GeocoderUnavailableError
    body = response.json()
    return body if isinstance(body, list) else []


def _hit(row: dict) -> PlaceHit | None:
    try:
        lat = Decimal(str(row["lat"])).quantize(COORDINATE)
        lng = Decimal(str(row["lon"])).quantize(COORDINATE)
        address = str(row.get("display_name") or "").strip()
    except (KeyError, ArithmeticError, ValueError):
        return None
    if abs(lat) > 90 or abs(lng) > 180:
        return None
    # the short name (a shop's own name), else the first part of the long address
    name = str(row.get("name") or "").strip() or address.split(",")[0].strip()
    return PlaceHit(name=name, address=address, latitude=lat, longitude=lng)


async def search_places(
    query: str,
    near: tuple[float, float] | None = None,
    limit: int = 5,
) -> list[PlaceHit]:
    """Places matching `query`, best first. `near` (latitude, longitude) only prefers results around
    it; it does not hide the rest."""
    if not settings.geocoder_url:
        raise GeocoderDisabledError
    text = " ".join(query.split())
    limit = max(1, min(limit, MAX_RESULTS))
    key = (text.casefold(), None if near is None else (round(near[0], 1), round(near[1], 1)), limit)
    now = time.monotonic()
    cached = _cache.get(key)
    if cached and now - cached[0] < CACHE_SECONDS:
        _cache.move_to_end(key)
        return cached[1]

    params = {"q": text, "format": "jsonv2", "limit": str(limit)}
    if near is not None:
        lat, lng = near
        params["viewbox"] = (
            f"{lng - BIAS_DEGREES},{lat + BIAS_DEGREES},{lng + BIAS_DEGREES},{lat - BIAS_DEGREES}"
        )
        params["bounded"] = "0"
    hits = [h for row in await _get(params) if (h := _hit(row))]
    _cache[key] = (now, hits)
    while len(_cache) > CACHE_SIZE:
        _cache.popitem(last=False)
    return hits
