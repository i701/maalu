import datetime as dt
import re
import uuid
from decimal import Decimal
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.enums import AccountGroup
from app.schemas.types import CurrencyCode, ExchangeRate

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]
Bank = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]
ACCOUNT_NUMBER_PATTERN = re.compile(r"^[0-9A-Za-z*-]{1,34}$")
# Signed: negative = money owed.
Balance = Annotated[Decimal, Field(max_digits=19, decimal_places=4)]
CreditLimit = Annotated[Decimal, Field(max_digits=19, decimal_places=4, ge=0)]


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
    exclude_from_stats: bool


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
    credit_limit: CreditLimit | None = Field(
        default=None,
        description="Cards and overdrafts only: the most that can be owed, in the account's "
        "currency. It changes no balance.",
    )
    exclude_from_stats: bool = Field(
        default=False,
        description="Leave the account out of totals, reports, budgets and net worth",
    )
    spendable: bool | None = Field(
        default=None,
        description="Whether this is everyday money for available-to-spend. Leave out to follow "
        "the account's group (cash, bank accounts and prepaid are). Not for cards, overdrafts "
        "or loans.",
    )
    auto_rate: bool = Field(
        default=False,
        description="Foreign-currency accounts: keep `exchange_rate` at the market rate, updated "
        "daily. Your own typed rate is then replaced each day.",
    )
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
    credit_limit: CreditLimit | None = None
    exclude_from_stats: bool | None = None
    spendable: bool | None = Field(
        default=None, description="`null` goes back to what the account's group says"
    )
    auto_rate: bool | None = None

    @field_validator(
        "group",
        "name",
        "opening_amount",
        "currency",
        "exchange_rate",
        "exclude_from_stats",
        "auto_rate",
    )
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
    credit_limit: Decimal | None = Field(
        description="Cards and overdrafts: the most that can be owed, in the account's currency"
    )
    exclude_from_stats: bool
    spendable: bool | None = Field(
        description="Your own choice, or null to follow the group (see `counts_as_spendable`)"
    )
    counts_as_spendable: bool = Field(
        description="Whether it is everyday money for available-to-spend: `spendable` if set, "
        "else what its group says. A goal that follows the account still keeps it apart."
    )
    auto_rate: bool = Field(description="Whether the rate is kept at the market rate daily")
    is_liability: bool
    # Computed: opening amount + linked transactions.
    balance: Decimal
    base_balance: Decimal = Field(description="Balance valued in your base currency")
    transaction_count: int
    archived_at: dt.datetime | None = Field(
        description="When it was archived; null for an account in use"
    )
    created_at: dt.datetime


class AccountSummary(BaseModel):
    """Overview in your base currency. Liabilities are shown as a positive amount owed."""

    assets: Decimal
    liabilities: Decimal
    total: Decimal  # assets - liabilities
    currency: str


class AccountAdjust(BaseModel):
    """Make an account match its bank. Send exactly one of `new_balance` (what the bank says it
    holds) or `amount` (what to add, negative to take away)."""

    new_balance: Balance | None = None
    amount: Balance | None = None
    date: dt.date | None = Field(default=None, description="When it takes effect; default today")
    note: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] | None = None

    @model_validator(mode="after")
    def _one_of(self):
        if (self.new_balance is None) == (self.amount is None):
            raise ValueError("Send either new_balance or amount")
        return self


class AccountBalancePoint(BaseModel):
    date: dt.date
    balance: Decimal = Field(description="What the account held at the end of that day")


class BalanceHistory(BaseModel):
    """An account's balance at the end of each day, in the account's own currency."""

    currency: str
    points: list[AccountBalancePoint] = Field(description="Oldest first, one per day up to today")


class BalanceAfter(BaseModel):
    transaction_id: uuid.UUID
    balance: Decimal = Field(description="What the account held right after this transaction")
