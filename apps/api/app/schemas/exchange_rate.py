from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.types import CurrencyCode


class MarketRateResponse(BaseModel):
    base: CurrencyCode
    quote: CurrencyCode
    rate: Decimal = Field(description="Units of `quote` per 1 unit of `base`")
    rate_date: date = Field(description="The day the rate is for")
    requested_date: date
    exact: bool = Field(description="False when `rate_date` is earlier than the day asked about")
    source: str


class RatePointResponse(BaseModel):
    date: date
    rate: Decimal


class RateHistoryResponse(BaseModel):
    base: CurrencyCode
    quote: CurrencyCode
    points: list[RatePointResponse] = Field(
        description="The rate of 1 `base` in `quote` on the days the source had one, oldest first"
    )
    source: str
