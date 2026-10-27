import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.enums import PaymentMethod, TransactionType
from app.schemas.account import AccountRef
from app.schemas.subscription import SubscriptionRef
from app.schemas.types import CurrencyCode, ExchangeRate
from app.schemas.vendor import VendorRef, VendorResponse

# Decimal in, Decimal out: JSON serialises as a string, so no float rounding on the wire.
# Always positive: `type` decides whether money comes in or goes out.
Amount = Annotated[Decimal, Field(gt=0, max_digits=19, decimal_places=4)]
Category = Annotated[str, Field(min_length=1, max_length=100)]


class SplitInput(BaseModel):
    """One line of a split transaction. `amount` is the line total paid, tax included."""

    name: str = Field(min_length=1, max_length=200)
    quantity: Decimal = Field(default=Decimal(1), gt=0, max_digits=12, decimal_places=3)
    category: Category
    amount: Amount
    tax_amount: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=19,
        decimal_places=4,
        description="The part of `amount` that is tax (GST), when known.",
    )

    @model_validator(mode="after")
    def _tax_within_amount(self):
        if self.tax_amount is not None and self.tax_amount > self.amount:
            raise ValueError("tax_amount can't be more than the line amount")
        return self


class SplitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    quantity: Decimal
    category: str
    category_id: uuid.UUID
    amount: Decimal
    tax_amount: Decimal | None


class TransactionCreate(VendorRef):
    """Income and expense need a category and payment method. A transfer needs a from-account and
    a to-account, plus `to_amount` when the two accounts use different currencies."""

    type: TransactionType
    amount: Amount = Field(description="Always positive. `type` decides the direction.")
    payment_method: PaymentMethod | None = None
    category: Category | None = None
    description: str | None = None
    transaction_date: date
    splits: list[SplitInput] | None = Field(
        default=None,
        min_length=1,
        description="Optional breakdown by item and category. The line amounts must add up to "
        "`amount`; `category` is then taken from the biggest line, so it can be left out.",
    )
    subscription_id: uuid.UUID | None = None
    account_id: uuid.UUID | None = Field(
        default=None,
        description="Income/expense: optional, and the transaction uses its currency. "
        "Transfer: the account the money leaves.",
    )
    to_account_id: uuid.UUID | None = Field(
        default=None, description="Transfers only: the account the money arrives in."
    )
    to_amount: Amount | None = Field(
        default=None,
        description="Transfers between accounts in different currencies: the amount received.",
    )
    currency: CurrencyCode | None = Field(
        default=None, description="Defaults to your base currency"
    )
    exchange_rate: ExchangeRate | None = Field(
        default=None,
        description="Base-currency units per 1 unit of `currency`. "
        "Required when `currency` differs from your base currency.",
    )

    @model_validator(mode="after")
    def _check_shape(self):
        if self.type is TransactionType.TRANSFER:
            if self.account_id is None or self.to_account_id is None:
                raise ValueError("A transfer needs account_id (from) and to_account_id (to)")
            if self.account_id == self.to_account_id:
                raise ValueError("Choose two different accounts")
            if self.vendor_id or self.vendor_name or self.subscription_id:
                raise ValueError("Transfers can't have a vendor or subscription")
            if self.splits:
                raise ValueError("Transfers can't be split")
            return self
        if not self.category and not self.splits:
            raise ValueError("category is required")
        if self.payment_method is None:
            raise ValueError("payment_method is required")
        if self.to_account_id is not None or self.to_amount is not None:
            raise ValueError("Only transfers have to_account_id / to_amount")
        if self.subscription_id is not None and self.type is not TransactionType.EXPENSE:
            raise ValueError("Only expenses can belong to a subscription")
        return self


class TransactionUpdate(VendorRef):
    """Partial update: only provided fields are changed. The combined result is validated, so
    e.g. switching an expense to a transfer must also provide the accounts.

    Sending `vendor_id: null` (or `vendor_name: null`) unlinks the vendor, and likewise for
    `subscription_id`, `account_id` and `to_account_id`.
    """

    type: TransactionType | None = None
    amount: Amount | None = None
    subscription_id: uuid.UUID | None = None  # explicit null unlinks
    account_id: uuid.UUID | None = None  # explicit null unlinks
    to_account_id: uuid.UUID | None = None  # explicit null unlinks
    to_amount: Amount | None = None
    currency: CurrencyCode | None = None
    exchange_rate: ExchangeRate | None = None
    payment_method: PaymentMethod | None = None
    category: Category | None = None
    description: str | None = None
    transaction_date: date | None = None
    splits: list[SplitInput] | None = Field(
        default=None,
        min_length=1,
        description="Replaces all the lines. Explicit null removes the split.",
    )

    @field_validator(
        "type",
        "amount",
        "currency",
        "exchange_rate",
        "payment_method",
        "category",
        "transaction_date",
    )
    @classmethod
    def _required_fields_not_null(cls, v):
        # Only runs when the field is sent, so omitting it is fine but null is not.
        if v is None:
            raise ValueError("cannot be null")
        return v


class TransactionResponse(BaseModel):
    """Public shape. `user_id` is deliberately omitted."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: TransactionType
    amount: Decimal
    to_amount: Decimal | None
    payment_method: PaymentMethod
    category: str
    category_id: uuid.UUID | None
    description: str | None
    transaction_date: date
    splits: list[SplitResponse]
    currency: str
    exchange_rate: Decimal
    base_amount: Decimal
    vendor: VendorResponse | None
    subscription: SubscriptionRef | None
    account: AccountRef | None
    to_account: AccountRef | None
    created_at: datetime


class CategoryTotal(BaseModel):
    type: TransactionType
    category_id: uuid.UUID
    category: str
    total: Decimal = Field(description="In your base currency")
    count: int = Field(description="Transactions with money in this category")


class CategoryTotals(BaseModel):
    """Income and expense per category, in your base currency. A split transaction counts toward
    each of its items' categories, so its lines are not lumped under one. Transfers are not
    counted."""

    currency: str
    categories: list[CategoryTotal]


class TransactionTotals(BaseModel):
    """Totals of the matching income and expense transactions, in your base currency. Transfers
    only move money between your accounts, so they are not counted."""

    income: Decimal
    expense: Decimal
    currency: str
