from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.dependencies import CurrentUserId, DbSession
from app.schemas.exchange_rate import MarketRateResponse
from app.schemas.types import CurrencyCode
from app.services.currency import list_currencies
from app.services.exchange_rate import SOURCE_NAME, MarketRateUnavailableError, market_rate

router = APIRouter(prefix="/currencies", tags=["currencies"])


class CurrencyList(BaseModel):
    currencies: list[str]


@router.get("", response_model=CurrencyList)
async def get_currencies():
    """ISO 4217 codes of the world's currencies. Public so sign-up can use it."""
    return CurrencyList(currencies=await list_currencies())


@router.get("/rate", response_model=MarketRateResponse)
async def get_market_rate(
    _user_id: CurrentUserId,
    db: DbSession,
    base: Annotated[CurrencyCode, Query(description="The currency you are converting from")],
    quote: Annotated[CurrencyCode, Query(description="The currency you are converting to")],
    on: Annotated[date | None, Query(description="The day; default today")] = None,
):
    """The market rate for 1 `base` in `quote` on a day, to suggest when entering an amount. It is
    a suggestion only: the rate you save is the one you confirm. Today and future days get the
    latest rate; a day with no data gets the nearest earlier one (`exact` is then false)."""
    day = on or date.today()
    try:
        found = await market_rate(db, base, quote, day)
    except MarketRateUnavailableError:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "The exchange rate source is not reachable"
        ) from None
    if found is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No market rate for {base} to {quote}")
    return MarketRateResponse(
        base=found.base,
        quote=found.quote,
        rate=found.rate,
        rate_date=found.rate_date,
        requested_date=found.requested_date,
        exact=found.exact,
        source=SOURCE_NAME,
    )
