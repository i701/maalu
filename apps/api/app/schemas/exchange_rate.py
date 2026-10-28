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
