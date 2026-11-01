import re
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.enums import AccountGroup
from app.schemas.types import CurrencyCode, ExchangeRate

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]
Bank = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]
ACCOUNT_NUMBER_PATTERN = re.compile(r"^[0-9A-Za-z*-]{1,34}$")
# Signed: negative = money owed.
Balance = Annotated[Decimal, Field(max_digits=19, decimal_places=4)]


def normalize_account_number(value: str | None) -> str | None:
    """The number without spaces (so `7730 0004 86374` and `773000048 6374` are the same account),
    or None when blank. Letters, digits, `*` and `-` only: a masked card number like
    `533294XXXXXX4164` or an IBAN fits, anything else is refused."""
    if value is None:
        return None
    number = re.sub(r"\s+", "", value)
    if not number:
        return None
    if not ACCOUNT_NUMBER_PATTERN.match(number):
        raise ValueError("Use letters and digits only, up to 34 characters")
    return number.upper()


class AccountRef(BaseModel):
    """Compact form embedded in transaction responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    group: AccountGroup
    currency: str
    bank: str | None
    account_number: str | None


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
    bank: Bank | None = Field(default=None, description="The bank that holds it, if any")
    account_number: str | None = Field(
        default=None,
        description="Its number at the bank, if any. Spaces are ignored; a user's accounts "
        "cannot share one.",
    )

    @field_validator("description", "bank")
    @classmethod
    def _blank_to_none(cls, v: str | None) -> str | None:
        return v or None

    @field_validator("account_number")
    @classmethod
    def _number(cls, v: str | None) -> str | None:
        return normalize_account_number(v)


class AccountUpdate(BaseModel):
    """Partial update. `description: null` clears it."""

    group: AccountGroup | None = None
    name: Name | None = None
    opening_amount: Balance | None = None
    currency: CurrencyCode | None = None
    exchange_rate: ExchangeRate | None = None
    description: Description | None = None
    bank: Bank | None = None
    account_number: str | None = None

    @field_validator("group", "name", "opening_amount", "currency", "exchange_rate")
    @classmethod
    def _required_fields_not_null(cls, v):
        if v is None:  # only runs when the field is sent
            raise ValueError("cannot be null")
        return v

    @field_validator("description", "bank")
    @classmethod
    def _blank_to_none(cls, v: str | None) -> str | None:
        return v or None

    @field_validator("account_number")
    @classmethod
    def _number(cls, v: str | None) -> str | None:
        return normalize_account_number(v)


class AccountResponse(BaseModel):
    id: uuid.UUID
    group: AccountGroup
    name: str
    opening_amount: Decimal
    currency: str
    exchange_rate: Decimal
    description: str | None
    bank: str | None
    account_number: str | None
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
