import uuid
from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.budget_period import MAX_START_DAY

LineName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Limit = Annotated[Decimal, Field(gt=0, max_digits=19, decimal_places=4)]
WarnPercent = Annotated[int, Field(ge=1, le=100)]

BudgetStatus = Literal["ok", "warning", "over"]


class BudgetSettingsUpdate(BaseModel):
    period_start_day: Annotated[int, Field(ge=1, le=MAX_START_DAY)] | None = None
    warn_percent: WarnPercent | None = None

    @field_validator("period_start_day", "warn_percent")
    @classmethod
    def _not_null(cls, v):
        if v is None:
            raise ValueError("cannot be null")
        return v


class BudgetLineCreate(BaseModel):
    name: LineName
    category_ids: list[uuid.UUID] = Field(min_length=1)
    amount: Limit = Field(description="Limit per period, in your base currency")
    warn_percent: WarnPercent | None = Field(
        default=None, description="Overrides the budget's warning level for this line"
    )
    rollover: bool = False


class BudgetLineUpdate(BaseModel):
    """Partial update. `warn_percent: null` goes back to the budget's level."""

    name: LineName | None = None
    category_ids: list[uuid.UUID] | None = Field(default=None, min_length=1)
    amount: Limit | None = None
    warn_percent: WarnPercent | None = None
    rollover: bool | None = None

    @field_validator("name", "category_ids", "amount", "rollover")
    @classmethod
    def _not_null(cls, v):
        if v is None:
            raise ValueError("cannot be null")
        return v


class BudgetCategoryRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class BudgetLineResponse(BaseModel):
    id: uuid.UUID
    name: str
    categories: list[BudgetCategoryRef]
    amount: Decimal = Field(description="The limit for each period")
    rollover: bool
    warn_percent: int | None = Field(description="This line's own level, if it has one")
    # For the requested period:
    carried: Decimal = Field(description="Unspent money carried in from earlier periods")
    activity: Decimal = Field(description="Expenses in the line's categories this period")
    available: Decimal = Field(description="amount + carried - activity (negative when over)")
    percent: int = Field(description="Share of (amount + carried) already spent, rounded")
    status: BudgetStatus


class BudgetTotals(BaseModel):
    amount: Decimal
    activity: Decimal
    available: Decimal
    percent: int
    status: BudgetStatus


class BudgetPeriod(BaseModel):
    start: date
    end: date = Field(description="Inclusive")
    is_current: bool


class BudgetResponse(BaseModel):
    currency: str
    period_start_day: int
    warn_percent: int
    period: BudgetPeriod
    lines: list[BudgetLineResponse]
    totals: BudgetTotals
    attention: int = Field(description="Lines that are close to their limit or over it")
