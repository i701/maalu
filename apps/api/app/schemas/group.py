import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

if TYPE_CHECKING:
    from app.schemas.transaction import TransactionResponse

MIN_GROUP = 2
MAX_GROUP = 50

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
Ids = Annotated[list[uuid.UUID], Field(min_length=1, max_length=MAX_GROUP)]


class GroupRef(BaseModel):
    """Compact form embedded in transaction responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class GroupCreate(BaseModel):
    name: Name
    note: Note | None = None
    transaction_ids: Annotated[list[uuid.UUID], Field(min_length=MIN_GROUP, max_length=MAX_GROUP)]

    @field_validator("note")
    @classmethod
    def _blank_to_none(cls, v: str | None) -> str | None:
        return v or None

    @field_validator("transaction_ids")
    @classmethod
    def _unique(cls, v: list[uuid.UUID]) -> list[uuid.UUID]:
        if len(set(v)) != len(v):
            raise ValueError("Each transaction can be listed once")
        return v


class GroupUpdate(BaseModel):
    """Partial update. `note: null` clears it."""

    name: Name | None = None
    note: Note | None = None

    @field_validator("name")
    @classmethod
    def _name_not_null(cls, v):
        if v is None:  # only runs when the field is sent
            raise ValueError("cannot be null")
        return v

    @field_validator("note")
    @classmethod
    def _blank_to_none(cls, v: str | None) -> str | None:
        return v or None


class GroupMembers(BaseModel):
    transaction_ids: Ids

    @field_validator("transaction_ids")
    @classmethod
    def _unique(cls, v: list[uuid.UUID]) -> list[uuid.UUID]:
        if len(set(v)) != len(v):
            raise ValueError("Each transaction can be listed once")
        return v


class GroupResponse(BaseModel):
    id: uuid.UUID
    name: str
    note: str | None
    created_at: datetime
    transaction_count: int = Field(description="How many of its transactions are not in the trash")
    date_from: date | None = Field(description="The earliest of those, if any")
    date_to: date | None = Field(description="The latest of those, if any")
    money_in: Decimal = Field(description="Income in the group, in your base currency")
    money_out: Decimal = Field(description="Expenses in the group, in your base currency")
    net: Decimal = Field(description="money_in - money_out, in your base currency")
    currency: str = Field(description="Your base currency")


class GroupDetail(GroupResponse):
    transactions: list["TransactionResponse"]


class GroupRemoved(BaseModel):
    removed: int
    dissolved: bool = Field(
        description="True when too few were left (a group needs two), so the group was deleted"
    )
