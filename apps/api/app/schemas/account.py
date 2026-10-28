import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.enums import AccountGroup
from app.schemas.types import CurrencyCode, ExchangeRate

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]
# Signed: negative = money owed.
Balance = Annotated[Decimal, Field(max_digits=19, decimal_places=4)]


class AccountRef(BaseModel):
    """Compact form embedded in transaction responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    group: AccountGroup
    currency: str


class AccountCreate(BaseModel):
    group: AccountGroup
    name: Name
    opening_amount: Balance = Decimal(0)
    currency: CurrencyCode | None = Field(
        default=None, description="Defaults to your base currency"
    )
    exchange_rate: ExchangeRate | None = Field(
        default=None,
        description="Base-currency units per 1 unit of `currency`. "
        "Required when `currency` differs from your base currency.",
    )
    description: Description | None = None

    @field_validator("description")
    @classmethod
    def _blank_to_none(cls, v: str | None) -> str | None:
        return v or None


class AccountUpdate(BaseModel):
    """Partial update. `description: null` clears it."""

    group: AccountGroup | None = None
    name: Name | None = None
    opening_amount: Balance | None = None
    currency: CurrencyCode | None = None
    exchange_rate: ExchangeRate | None = None
    description: Description | None = None

    @field_validator("group", "name", "opening_amount", "currency", "exchange_rate")
    @classmethod
    def _required_fields_not_null(cls, v):
        if v is None:  # only runs when the field is sent
            raise ValueError("cannot be null")
        return v

    @field_validator("description")
    @classmethod
    def _blank_to_none(cls, v: str | None) -> str | None:
        return v or None


class AccountResponse(BaseModel):
    id: uuid.UUID
    group: AccountGroup
    name: str
    opening_amount: Decimal
    currency: str
    exchange_rate: Decimal
    description: str | None
    is_liability: bool
    # Computed: opening amount + linked transactions.
    balance: Decimal
    base_balance: Decimal = Field(description="Balance valued in your base currency")
    transaction_count: int
    archived_at: datetime | None = Field(
        description="When it was archived; null for an account in use"
    )
    created_at: datetime


class AccountSummary(BaseModel):
    """Overview in your base currency. Liabilities are shown as a positive amount owed."""

    assets: Decimal
    liabilities: Decimal
    total: Decimal  # assets - liabilities
    currency: str
