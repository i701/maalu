import uuid
from datetime import date
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

from app.budget_period import MAX_START_DAY

LineName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Limit = Annotated[Decimal, Field(gt=0, max_digits=19, decimal_places=4)]
WarnPercent = Annotated[int, Field(ge=1, le=100)]

BudgetStatus = Literal["ok", "warning", "over"]
# The longest a limit with set dates can run.
MAX_RANGE_DAYS = 3660


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
    start_date: date | None = Field(
        default=None,
        description="With `end_date`: a limit for just those dates instead of every period. "
        "`amount` is then the most to spend between them, counted once.",
    )
    end_date: date | None = Field(default=None, description="Inclusive; needs `start_date`")

    @model_validator(mode="after")
    def _dates(self):
        if (self.start_date is None) != (self.end_date is None):
            raise ValueError("Give both a start date and an end date, or neither")
        if self.start_date is not None and self.end_date is not None:
            if self.end_date < self.start_date:
                raise ValueError("The end date can't be before the start date")
            if (self.end_date - self.start_date).days >= MAX_RANGE_DAYS:
                raise ValueError("A limit can run for at most ten years")
            if self.rollover:
                raise ValueError("A limit for set dates has nothing to carry over")
        return self


class BudgetLineUpdate(BaseModel):
    """Partial update. `warn_percent: null` goes back to the budget's level."""

    name: LineName | None = None
    category_ids: list[uuid.UUID] | None = Field(default=None, min_length=1)
    amount: Limit | None = None
    warn_percent: WarnPercent | None = None
    rollover: bool | None = None
    start_date: date | None = Field(
        default=None, description="Only for a limit with set dates (see `end_date`)"
    )
    end_date: date | None = Field(
        default=None,
        description="Makes this a limit for set dates when sent with `start_date`; an explicit "
        "null makes it a limit for every period again",
    )

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


class BudgetFixedLine(BudgetLineResponse):
    """A limit for set dates: `amount` is the most to spend in its categories between the two
    dates, counted once over the whole range (not per period)."""

    start_date: date
    end_date: date = Field(description="Inclusive")
    state: Literal["upcoming", "active", "ended"] = Field(
        description="Relative to today: not started yet, running, or over"
    )
    days_left: int | None = Field(description="Days until it ends, today included; null once over")


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
    fixed_lines: list[BudgetFixedLine] = Field(
        default_factory=list,
        description="Limits for set dates, every one whatever period is shown. They are not in "
        "`totals`, which add up the per-period lines.",
    )
    totals: BudgetTotals
    attention: int = Field(
        description="Per-period lines, and limits for set dates that are running, that are close "
        "to their limit or over it"
    )
