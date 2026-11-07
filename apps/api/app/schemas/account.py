import datetime as dt
import re
import uuid
from decimal import Decimal
from typing import Annotated, Literal

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
DayOfMonth = Annotated[int, Field(ge=1, le=31)]


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
    statement_day: DayOfMonth | None = Field(
        default=None,
        description="Credit cards only, with `due_day`: the day of the month the statement closes",
    )
    due_day: DayOfMonth | None = Field(
        default=None,
        description="Credit cards only, with `statement_day`: the day of the month the payment "
        "for a statement is due (the first such day after it closes)",
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
    statement_day: DayOfMonth | None = Field(
        default=None, description="`null` clears it (and `due_day` with it)"
    )
    due_day: DayOfMonth | None = Field(default=None, description="`null` clears it")
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
    statement_day: int | None = Field(
        description="Credit cards: the day of the month the statement closes, if set"
    )
    due_day: int | None = Field(
        description="Credit cards: the day of the month its payment is due, if set"
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


CardStatementState = Literal["none", "due", "overdue", "paid"]


class CardStatement(BaseModel):
    """Where a credit card stands against its last statement. Amounts are in the card's own
    currency except `remaining_base`."""

    account_id: uuid.UUID
    account_name: str
    currency: str
    statement_day: int
    due_day: int
    closed_on: dt.date = Field(description="The day the latest statement closed")
    due_on: dt.date = Field(description="When the payment for it is due")
    next_closes_on: dt.date = Field(description="When the following statement closes")
    statement_balance: Decimal = Field(
        description="What was owed when it closed (0 when nothing was)"
    )
    paid_since: Decimal = Field(
        description="Money put on the card since it closed: repayments, refunds, any income"
    )
    remaining: Decimal = Field(description="Still to pay: the statement less what was paid since")
    remaining_base: Decimal = Field(description="`remaining` in your base currency")
    spent_since: Decimal = Field(
        description="Spent on the card since it closed; goes on the next statement"
    )
    owed_now: Decimal = Field(description="Everything owed today, the next statement included")
    credit_limit: Decimal | None
    state: CardStatementState = Field(
        description="`none` nothing was owed, `paid` settled, `due` still to pay and not late, "
        "`overdue` still to pay and past its due date"
    )
    days_until_due: int = Field(description="Negative once the due date has passed")
