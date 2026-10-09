import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.enums import IntervalUnit, PaymentMethod, SubscriptionStatus
from app.schemas.types import CurrencyCode, ExchangeRate
from app.schemas.vendor import VendorRef, VendorResponse

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Category = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
# Cost per cycle: always positive (transactions are signed, subscriptions are not).
Cost = Annotated[Decimal, Field(gt=0, max_digits=19, decimal_places=4)]
IntervalCount = Annotated[int, Field(ge=1, le=120)]


class SubscriptionRef(BaseModel):
    """Compact form embedded in transaction responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class SubscriptionCreate(VendorRef):
    name: Name
    amount: Cost
    currency: CurrencyCode | None = Field(
        default=None, description="Defaults to your base currency"
    )
    exchange_rate: ExchangeRate | None = Field(
        default=None,
        description="Base-currency units per 1 unit of `currency`. "
        "Required when `currency` differs from your base currency.",
    )
    payment_method: PaymentMethod
    category: Category
    interval_unit: IntervalUnit
    interval_count: IntervalCount = 1
    start_date: date = Field(description="First billing date; anchors the schedule")
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE


class SubscriptionUpdate(VendorRef):
    """Partial update. `vendor_id: null` / `vendor_name: null` unlinks the vendor."""

    name: Name | None = None
    amount: Cost | None = None
    currency: CurrencyCode | None = None
    exchange_rate: ExchangeRate | None = None
    payment_method: PaymentMethod | None = None
    category: Category | None = None
    interval_unit: IntervalUnit | None = None
    interval_count: IntervalCount | None = None
    start_date: date | None = None
    status: SubscriptionStatus | None = None

    @field_validator(
        "name",
        "amount",
        "currency",
        "exchange_rate",
        "payment_method",
        "category",
        "interval_unit",
        "interval_count",
        "start_date",
        "status",
    )
    @classmethod
    def _required_fields_not_null(cls, v):
        if v is None:  # only runs when the field is sent
            raise ValueError("cannot be null")
        return v


class SubscriptionFromTransaction(BaseModel):
    """Turn an existing transaction into a subscription and link it."""

    name: Name | None = Field(default=None, description="Defaults to the vendor or category")
    interval_unit: IntervalUnit
    interval_count: IntervalCount = 1


class SubscriptionResponse(BaseModel):
    id: uuid.UUID
    name: str
    vendor: VendorResponse | None
    amount: Decimal
    currency: str
    exchange_rate: Decimal
    base_amount: Decimal
    payment_method: PaymentMethod
    category: str
    interval_unit: IntervalUnit
    interval_count: int
    start_date: date
    status: SubscriptionStatus
    # Computed from the schedule and linked transactions (active subscriptions only):
    last_paid_date: date | None
    next_due_date: date | None
    is_overdue: bool
    monthly_base_cost: Decimal = Field(description="Cost per month in your base currency")
    created_at: datetime


class SubscriptionSummary(BaseModel):
    active_count: int
    monthly_base_total: Decimal
    currency: str
