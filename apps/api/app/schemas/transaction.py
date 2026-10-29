import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.enums import PaymentMethod, TransactionType
from app.schemas.account import AccountRef
from app.schemas.subscription import SubscriptionRef
from app.schemas.tag import TagNames, TagRef
from app.schemas.types import CurrencyCode, ExchangeRate
from app.schemas.vendor import VendorName, VendorRef, VendorResponse

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
    transaction_time: time | None = Field(
        default=None,
        description="Optional time of day, as read on the clock. It only orders one day.",
    )
    planned: bool = Field(
        default=False,
        description="Something coming up that has not happened yet. It counts toward nothing "
        "until it is posted.",
    )
    splits: list[SplitInput] | None = Field(
        default=None,
        min_length=1,
        description="Optional breakdown by item and category. The line amounts must add up to "
        "`amount`; `category` is then taken from the biggest line, so it can be left out.",
    )
    subscription_id: uuid.UUID | None = None
    tags: TagNames | None = Field(
        default=None,
        description="Tags by name, found or created. They belong to the whole transaction.",
    )
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
    transaction_time: time | None = None  # explicit null clears
    planned: bool | None = None
    splits: list[SplitInput] | None = Field(
        default=None,
        min_length=1,
        description="Replaces all the lines. Explicit null removes the split.",
    )
    tags: TagNames | None = Field(
        default=None, description="Replaces all the tags. An empty list or null removes them."
    )

    @field_validator(
        "type",
        "amount",
        "currency",
        "exchange_rate",
        "payment_method",
        "category",
        "transaction_date",
        "planned",
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
    transaction_time: time | None
    planned: bool
    splits: list[SplitResponse]
    currency: str
    exchange_rate: Decimal
    base_amount: Decimal
    vendor: VendorResponse | None
    subscription: SubscriptionRef | None
    account: AccountRef | None
    to_account: AccountRef | None
    tags: list[TagRef]
    created_at: datetime
    deleted_at: datetime | None = Field(
        description="When it was moved to the trash; null for a live transaction"
    )


# The most transactions one bulk request can touch.
MAX_BULK = 500
# The most transactions "select everything that matches" will hand back at once.
MAX_SELECT_ALL = 5000


class BulkIds(BaseModel):
    ids: list[uuid.UUID] = Field(min_length=1, max_length=MAX_BULK)


class BulkUpdate(BulkIds):
    """Change the same things on many transactions. Only the fields you send change.

    What does not apply to a transaction is left alone: transfers have no category, vendor or
    payment method, and a split transaction takes its category from its items. A transaction
    where nothing could be applied is reported in `skipped`.
    """

    category: Category | None = Field(default=None, description="By name: found or created")
    vendor_name: VendorName | None = Field(default=None, description="By name: found or created")
    payment_method: PaymentMethod | None = None
    add_tags: TagNames = Field(default_factory=list, description="Tags to add, by name")
    remove_tags: TagNames = Field(default_factory=list, description="Tags to remove, by name")

    @model_validator(mode="after")
    def _something_to_change(self):
        if not (
            self.category
            or self.vendor_name
            or self.payment_method
            or self.add_tags
            or self.remove_tags
        ):
            raise ValueError("Choose something to change")
        return self


class PostPlanned(BaseModel):
    """Turn a planned transaction into a real one. Every field is optional: leave one out to keep
    it as planned (an explicit `null` time clears the planned one)."""

    transaction_date: date | None = Field(default=None, description="The day it actually happened")
    transaction_time: time | None = Field(default=None, description="The time it happened")
    amount: Amount | None = Field(default=None, description="What it actually came to")


class BulkSkipped(BaseModel):
    id: uuid.UUID
    reason: str


class BulkResult(BaseModel):
    updated: int = Field(description="How many transactions were changed")
    skipped: list[BulkSkipped] = Field(description="The ones that were not, with the reason")


class CategoryTotal(BaseModel):
    type: Literal["income", "expense"]  # transfers have no category, so are never reported
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
