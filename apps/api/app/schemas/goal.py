import uuid
from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.enums import AccountGroup

GoalName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Target = Annotated[Decimal, Field(gt=0, max_digits=19, decimal_places=4)]
Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]


class GoalCreate(BaseModel):
    name: GoalName
    target_amount: Target = Field(description="In your base currency")
    target_date: date | None = None
    monthly_amount: Target | None = Field(
        default=None, description="What you plan to put aside each budget period"
    )
    account_id: uuid.UUID | None = Field(
        default=None,
        description="A savings account whose balance is the goal's progress. "
        "Leave out to track money you set aside by hand.",
    )


class GoalUpdate(BaseModel):
    """Partial update. `target_date`, `monthly_amount` and `account_id` can be set to null."""

    name: GoalName | None = None
    target_amount: Target | None = None
    target_date: date | None = None
    monthly_amount: Target | None = None
    account_id: uuid.UUID | None = None

    @field_validator("name", "target_amount")
    @classmethod
    def _not_null(cls, v):
        if v is None:
            raise ValueError("cannot be null")
        return v


class GoalEntryCreate(BaseModel):
    amount: Annotated[Decimal, Field(max_digits=19, decimal_places=4)] = Field(
        description="Positive to set money aside, negative to take it back out"
    )
    entry_date: date | None = Field(default=None, description="Defaults to today")
    note: Note | None = None

    @field_validator("amount")
    @classmethod
    def _not_zero(cls, v: Decimal) -> Decimal:
        if v == 0:
            raise ValueError("amount can't be zero")
        return v

    @field_validator("note")
    @classmethod
    def _blank_to_none(cls, v: str | None) -> str | None:
        return v or None


class GoalEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    entry_date: date
    amount: Decimal
    note: str | None


class GoalAccountRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    group: AccountGroup
    currency: str


class GoalResponse(BaseModel):
    id: uuid.UUID
    name: str
    currency: str = Field(description="Your base currency: every amount here is in it")
    target_amount: Decimal
    target_date: date | None
    monthly_amount: Decimal | None
    mode: Literal["account", "manual"]
    account: GoalAccountRef | None
    saved: Decimal = Field(description="The account's balance, or the sum of what was set aside")
    remaining: Decimal = Field(description="Never below zero")
    percent: int = Field(description="Share of the target saved, rounded down")
    reached: bool
    months_left: int | None = Field(
        description="Whole months until the target date; 0 when it has passed; null without a date"
    )
    needed_per_month: Decimal | None = Field(
        description="remaining spread over months_left, rounded up; null without a date, "
        "already reached or past the date"
    )
    # For the budget period requested (only when a monthly amount is planned):
    period_planned: Decimal | None
    period_contributed: Decimal | None = Field(
        description="Set aside this period: transfers into the account (less out) or log entries"
    )
    period_status: Literal["funded", "pending"] | None
    entries: list[GoalEntryResponse] = Field(
        description="The log of money set aside, newest first. Empty for an account-linked goal"
    )
