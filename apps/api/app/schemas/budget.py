import uuid
from datetime import date, datetime
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
from app.enums import CategoryKind

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
    repeat: bool = Field(
        default=False,
        description="With both dates: the limit applies in every period that touches them (the "
        "periods are whole, so the dates snap to them) instead of being one total for the stretch",
    )

    @model_validator(mode="after")
    def _dates(self):
        if (self.start_date is None) != (self.end_date is None):
            raise ValueError("Give both a start date and an end date, or neither")
        if self.start_date is None and self.repeat:
            raise ValueError("Give the dates it should run between")
        if self.start_date is not None and self.end_date is not None:
            if self.end_date < self.start_date:
                raise ValueError("The end date can't be before the start date")
            if (self.end_date - self.start_date).days >= MAX_RANGE_DAYS:
                raise ValueError("A limit can run for at most ten years")
            if self.rollover and not self.repeat:
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
    repeat: bool | None = Field(
        default=None,
        description="With the dates: every period that touches them (true) or one total for the "
        "whole stretch (false). Left out, a limit keeps the kind it has.",
    )

    @field_validator("name", "category_ids", "amount", "rollover", "repeat")
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
    moved_in: Decimal = Field(
        description="Money moved in from other limits, or added, for this period only"
    )
    moved_out: Decimal = Field(description="Money moved out to other limits for this period only")
    activity: Decimal = Field(description="Expenses in the line's categories this period")
    available: Decimal = Field(
        description="amount + carried + moved_in - moved_out - activity (negative when over)"
    )
    percent: int = Field(
        description="Share of (amount + carried + moved_in - moved_out) already spent, rounded"
    )
    status: BudgetStatus
    kind: CategoryKind | None = Field(
        default=None,
        description="Need or want when every category in the limit counts as that (its own kind, "
        "or its parent's); null when they differ or are not sorted",
    )
    runs_from: date | None = Field(
        default=None,
        description="For a monthly limit that only runs between two dates: the first day of its "
        "first period. Null for one that runs for ever.",
    )
    runs_until: date | None = Field(default=None, description="Its last day, inclusive")


class BudgetFixedLine(BudgetLineResponse):
    """A limit for set dates: `amount` is the most to spend in its categories between the two
    dates, counted once over the whole range (not per period)."""

    start_date: date
    end_date: date = Field(description="Inclusive")
    state: Literal["upcoming", "active", "ended"] = Field(
        description="Relative to today: not started yet, running, or over"
    )
    days_left: int | None = Field(description="Days until it ends, today included; null once over")


class BudgetMoveCreate(BaseModel):
    to_line_id: uuid.UUID = Field(description="The monthly limit that gets the money")
    from_line_id: uuid.UUID | None = Field(
        default=None,
        description="The monthly limit the money comes from; at most what it has left this "
        "period. Leave it out to add to `to_line_id` for this period only (a top-up).",
    )
    amount: Limit
    on: date | None = Field(
        default=None, description="Any day in the period it is for; defaults to today"
    )
    note: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] | None = None

    @model_validator(mode="after")
    def _two_limits(self):
        if self.from_line_id is not None and self.from_line_id == self.to_line_id:
            raise ValueError("Choose two different limits")
        return self


class BudgetLineRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class BudgetMoveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    from_line: BudgetLineRef | None = Field(description="Null for a top-up")
    to_line: BudgetLineRef
    amount: Decimal
    note: str | None
    created_at: datetime


class BudgetMoveLogEntry(BudgetMoveResponse):
    """A move in a limit's history: the period it was for, and when it was undone, if it was."""

    period_start: date
    period_end: date = Field(description="Inclusive")
    undone_at: datetime | None = Field(description="When it was undone; it then counts for nothing")


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
    moves: list[BudgetMoveResponse] = Field(
        default_factory=list,
        description="Money moved between monthly limits, or added to one, in this period; "
        "newest first. A top-up raises `totals.amount`; a move between limits leaves it as is.",
    )
    totals: BudgetTotals
    attention: int = Field(
        description="Per-period lines, and limits for set dates that are running, that are close "
        "to their limit or over it"
    )
