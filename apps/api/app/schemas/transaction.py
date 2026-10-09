import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.enums import PaymentMethod
from app.schemas.subscription import SubscriptionRef
from app.schemas.types import CurrencyCode, ExchangeRate
from app.schemas.vendor import VendorRef, VendorResponse


class TransactionBase(BaseModel):
    # Decimal in, Decimal out: JSON serialises as a string, so no float rounding on the wire.
    amount: Decimal = Field(max_digits=19, decimal_places=4, description="Negative = expense")
    payment_method: PaymentMethod
    category: str = Field(min_length=1, max_length=100)
    description: str | None = None
    transaction_date: date


class TransactionCreate(TransactionBase, VendorRef):
    subscription_id: uuid.UUID | None = None
    currency: CurrencyCode | None = Field(
        default=None, description="Defaults to your base currency"
    )
    exchange_rate: ExchangeRate | None = Field(
        default=None,
        description="Base-currency units per 1 unit of `currency`. "
        "Required when `currency` differs from your base currency.",
    )


class TransactionUpdate(VendorRef):
    """Partial update: only provided fields are changed.

    Sending `vendor_id: null` (or `vendor_name: null`) unlinks the vendor.
    """

    amount: Decimal | None = Field(default=None, max_digits=19, decimal_places=4)
    subscription_id: uuid.UUID | None = None  # explicit null unlinks
    currency: CurrencyCode | None = None
    exchange_rate: ExchangeRate | None = None
    payment_method: PaymentMethod | None = None
    category: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    transaction_date: date | None = None

    @field_validator(
        "amount", "currency", "exchange_rate", "payment_method", "category", "transaction_date"
    )
    @classmethod
    def _required_fields_not_null(cls, v):
        # Only runs when the field is sent, so omitting it is fine but null is not.
        if v is None:
            raise ValueError("cannot be null")
        return v


class TransactionResponse(TransactionBase):
    """Public shape. `user_id` is deliberately omitted."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    currency: str
    exchange_rate: Decimal
    base_amount: Decimal
    vendor: VendorResponse | None
    subscription: SubscriptionRef | None
    created_at: datetime
