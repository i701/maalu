import datetime as dt
import uuid
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

from app.enums import PaymentMethod
from app.schemas.account import AccountRef
from app.schemas.tag import TagNames
from app.schemas.transaction import Amount, Category
from app.schemas.vendor import VendorName
from app.statements import MAX_STATEMENT_ROWS

Duplicate = Literal["reference", "transfer", "possible"]
Direction = Literal["income", "expense"]


class PreviewRow(BaseModel):
    """One line of the statement, with what Maalu could already work out about it."""

    index: int = Field(description="Position in the statement, oldest first")
    date: dt.date
    time: dt.time | None
    type: Direction
    amount: Decimal
    counterparty: str
    description: str
    reference: str | None
    kind: str = Field(description="The bank's own transaction type")
    payment_method: PaymentMethod
    balance: Decimal | None = Field(description="The statement's running balance after this row")
    vendor: str | None = Field(description="A vendor this name is known to be, if any")
    category: str | None = Field(description="That vendor's usual category")
    tags: list[str] = Field(description="That vendor's usual tags")
    transfer_account_id: uuid.UUID | None = Field(
        description="Your other account, when this name was earlier marked as a transfer to it"
    )
    duplicate: Duplicate | None = Field(
        description="`reference`: already imported. `transfer`: already recorded as a transfer "
        "between your accounts (the other side of it). `possible`: a transaction by hand with "
        "the same day, amount and direction. Rows with `reference` or `transfer` are left out "
        "by default."
    )


class ImportPreview(BaseModel):
    profile: str
    account: AccountRef
    opening_balance: Decimal | None
    closing_balance: Decimal | None
    rows: list[PreviewRow]
    new_count: int = Field(description="Rows that would be imported (not already there)")
    duplicate_count: int
    balance_now: Decimal = Field(description="What the account holds now")
    balance_after: Decimal = Field(description="What it would hold after importing every new row")
    balance_matches: bool | None = Field(
        description="Whether that equals the statement's closing balance; null when the "
        "statement has none"
    )


class ImportRowIn(BaseModel):
    date: dt.date
    time: dt.time | None = None
    type: Direction
    amount: Amount
    description: str | None = Field(default=None, max_length=1000)
    reference: str | None = Field(default=None, max_length=100)
    counterparty: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] = ""
    payment_method: PaymentMethod = PaymentMethod.BANK_TRANSFER
    vendor_name: VendorName | None = None
    category: Category | None = Field(
        default=None, description="Left out: the transaction goes in 'Uncategorized'"
    )
    tags: TagNames | None = None
    skip: bool = Field(
        default=False,
        description="A row you chose not to import: it is not made, but is in the report",
    )
    transfer_account_id: uuid.UUID | None = Field(
        default=None,
        description="Makes it a transfer between the statement's account and this one. "
        "Both must use the same currency.",
    )


class ImportCommit(BaseModel):
    account_id: uuid.UUID
    filename: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
    profile: Annotated[str, StringConstraints(max_length=32)]
    rows: list[ImportRowIn] = Field(min_length=1, max_length=MAX_STATEMENT_ROWS)


class ImportSkipped(BaseModel):
    index: int = Field(description="Position in the rows that were sent, from 0")
    outcome: Literal["skipped", "failed"] = Field(
        description="`skipped`: already there. `failed`: could not be made"
    )
    reason: str


class ImportBatchResponse(BaseModel):
    id: uuid.UUID
    account: AccountRef | None
    filename: str
    profile: str
    imported_count: int
    skipped_count: int
    transaction_count: int = Field(description="How many of its transactions are still there")
    created_at: dt.datetime


class ImportResult(BaseModel):
    batch: ImportBatchResponse
    skipped: list[ImportSkipped]
