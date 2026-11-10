import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.enums import IntervalUnit, PaymentMethod, SubscriptionStatus
from app.schemas.account import AccountRef
from app.schemas.types import CurrencyCode, ExchangeRate
from app.schemas.vendor import VendorRef, VendorResponse

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Category = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
# Cost per cycle: always positive (transactions are signed, subscriptions are not).
Cost = Annotated[Decimal, Field(gt=0, max_digits=19, decimal_places=4)]
IntervalCount = Annotated[int, Field(ge=1, le=120)]
Installments = Annotated[int, Field(ge=1, le=600)]
RemindDays = Annotated[int, Field(ge=0, le=60)]


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
    account_id: uuid.UUID | None = Field(
        default=None,
        description="Where it is paid from. Its planned payments go in this account, which must "
        "be in the same currency",
    )
    payment_method: PaymentMethod
    category: Category
    interval_unit: IntervalUnit
    interval_count: IntervalCount = 1
    start_date: date = Field(description="First billing date; anchors the schedule")
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    installments_total: Installments | None = Field(
        default=None,
        description="A plan with this many payments, then it is completed. Null: no end.",
    )
    remind_days_before: RemindDays | None = Field(
        default=3, description="Days before a payment to be reminded; null for no reminder."
    )
    amount_varies: bool = Field(
        default=False,
        description="The amount is only the usual one (a server bill, a utility). Its planned "
        "payments are estimates, and the real amount is entered when it is paid.",
    )


class SubscriptionUpdate(VendorRef):
    """Partial update. `vendor_id: null` / `vendor_name: null` unlinks the vendor."""

    name: Name | None = None
    amount: Cost | None = None
    currency: CurrencyCode | None = None
    exchange_rate: ExchangeRate | None = None
    account_id: uuid.UUID | None = Field(default=None, description="`null` unlinks the account")
    payment_method: PaymentMethod | None = None
    category: Category | None = None
    interval_unit: IntervalUnit | None = None
    interval_count: IntervalCount | None = None
    start_date: date | None = None
    status: SubscriptionStatus | None = None
    installments_total: Installments | None = Field(
        default=None, description="Explicit null makes it an ongoing subscription again."
    )
    remind_days_before: RemindDays | None = Field(
        default=None, description="Explicit null turns the reminder off."
    )
    amount_varies: bool | None = None

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
        "amount_varies",
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
    account: AccountRef | None
    payment_method: PaymentMethod
    category: str
    category_id: uuid.UUID
    interval_unit: IntervalUnit
    interval_count: int
    start_date: date
    status: SubscriptionStatus
    # Computed from the schedule and linked transactions (active subscriptions only):
    last_paid_date: date | None
    next_due_date: date | None
    is_overdue: bool
    monthly_base_cost: Decimal = Field(description="Cost per month in your base currency")
    installments_total: int | None
    payments_made: int = Field(description="Payments made so far (posted ones linked to it)")
    installments_left: int | None = Field(
        description="Payments still to make; null when it has no fixed number"
    )
    remind_days_before: int | None
    amount_varies: bool
    created_at: datetime


class SubscriptionSummary(BaseModel):
    active_count: int
    monthly_base_total: Decimal
    currency: str


class SubscriptionCandidate(BaseModel):
    """A charge that repeats, found in what was already paid: what a subscription made from it
    would hold. Worked out each time, never stored."""

    vendor_id: uuid.UUID
    vendor_name: str
    currency: str
    amount: Decimal = Field(description="What the next one will most likely be (the usual amount).")
    amount_varies: bool = Field(description="The amount is different each time (a utility bill).")
    interval_unit: IntervalUnit
    interval_count: int
    occurrences: int = Field(description="How many payments make up the pattern.")
    first_date: date
    last_date: date
    next_due: date
    confidence: str = Field(description='"high" (regular, alike) or "medium" (a looser fit)')
    category: str
    account_id: uuid.UUID | None
    account_name: str | None
    payment_method: PaymentMethod
    transaction_ids: list[uuid.UUID] = Field(
        description="The payments it would link, oldest first."
    )


class CandidateKey(BaseModel):
    vendor_id: uuid.UUID
    currency: CurrencyCode


class CandidateAccept(CandidateKey):
    """Accept a suggestion. What the person changed in the confirm step is sent; the rest comes
    from the pattern, which the server finds again and does not take from the client."""

    name: Name | None = None
    interval_unit: IntervalUnit | None = None
    interval_count: IntervalCount | None = None
    amount: Cost | None = None
