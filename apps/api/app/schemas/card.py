import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.enums import CardKind
from app.schemas.account import AccountRef

CardName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
LastDigits = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^\d{4}$")]


class CardRef(BaseModel):
    """Compact form embedded in transaction responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    last_digits: str | None
    kind: CardKind


class CardCreate(BaseModel):
    name: CardName
    kind: CardKind
    last_digits: LastDigits | None = Field(
        default=None, description="The last four digits, never the whole number"
    )
    account_id: uuid.UUID = Field(
        description="A debit card: the bank account it spends from. A credit card: its own "
        "account (group card), the one that holds what you owe."
    )
    repay_account_id: uuid.UUID | None = Field(
        default=None, description="Credit cards only: the bank account it is repaid from"
    )


class CardUpdate(BaseModel):
    """Partial update. `last_digits` and `repay_account_id` can be set to null."""

    name: CardName | None = None
    last_digits: LastDigits | None = None
    account_id: uuid.UUID | None = None
    repay_account_id: uuid.UUID | None = None

    @field_validator("name", "account_id")
    @classmethod
    def _not_null(cls, v):
        if v is None:
            raise ValueError("cannot be null")
        return v


class CardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    last_digits: str | None
    kind: CardKind
    account: AccountRef
    repay_account: AccountRef | None
    created_at: datetime
