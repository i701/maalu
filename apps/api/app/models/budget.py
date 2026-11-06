import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.category import Category


class Budget(Base):
    """A user's budget settings. One row per user, created the first time it is needed."""

    __tablename__ = "budgets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    # Day of the month a budget period starts (1-28). 1 = calendar months.
    period_start_day: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    # Spending at or above this percent of a line's limit is flagged as close (1-100).
    warn_percent: Mapped[int] = mapped_column(Integer, default=80, server_default="80")


class BudgetLine(Base):
    """A spending limit per period for some categories (each category is in one line at most)."""

    __tablename__ = "budget_lines"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    # Limit per period, in the user's base currency.
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    # Overrides the budget's warning level for this line when set.
    warn_percent: Mapped[int | None] = mapped_column(Integer, default=None)
    # Unspent money carries into the next period when on.
    rollover: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    # The first period this line counts from; rollover never reaches back before it. For a limit
    # with set dates (`ends_on` given) it is the first day of those dates.
    start_date: Mapped[date] = mapped_column(Date)
    # Set for a limit that is not per period: `amount` is then the most to spend in the categories
    # between `start_date` and this day (inclusive), counted once over the whole range.
    ends_on: Mapped[date | None] = mapped_column(Date, default=None)
    # Set for a per-period limit that only runs between two dates (monthly, but only Nov to Jan):
    # it counts in the periods from `start_date` to this day (inclusive), both snapped to whole
    # periods, and is not there outside them. Null = runs for ever. Never set with `ends_on`.
    active_until: Mapped[date | None] = mapped_column(Date, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
    category_links: Mapped[list["BudgetLineCategory"]] = relationship(
        lazy="selectin", cascade="all, delete-orphan", back_populates="line"
    )

    @property
    def categories(self) -> list[Category]:
        return sorted(
            (link.category for link in self.category_links), key=lambda c: c.name.casefold()
        )


class BudgetLineCategory(Base):
    __tablename__ = "budget_line_categories"
    __table_args__ = (
        UniqueConstraint("line_id", "category_id", name="uq_budget_line_categories_line_category"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    line_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("budget_lines.id", ondelete="CASCADE"), index=True
    )
    # Cascade, so deleting a user (whose categories and lines go together) doesn't trip over the
    # order the rows are removed in. The service refuses to delete a category a line still uses.
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("categories.id", ondelete="CASCADE"), index=True
    )
    line: Mapped[BudgetLine] = relationship(back_populates="category_links")
    category: Mapped[Category] = relationship(lazy="joined")


class BudgetMove(Base):
    """Money moved from one monthly limit to another for one period, or added to one for that
    period only (a top-up: no `from_line`). It changes nothing else: the limits keep their usual
    amount, and the next period starts from it again."""

    __tablename__ = "budget_moves"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # The first day of the period it is for, as periods were when it was made. A view matches it
    # by range, so changing the period's start day later still finds it.
    period_start: Mapped[date] = mapped_column(Date)
    # Deleting a limit deletes the moves it took part in.
    from_line_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("budget_lines.id", ondelete="CASCADE"), index=True, default=None
    )
    to_line_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("budget_lines.id", ondelete="CASCADE"), index=True
    )
    # Always positive, in the user's base currency.
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    note: Mapped[str | None] = mapped_column(String(200), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
    # Undoing a move keeps the row, so a limit's history shows what happened; the budget ignores it.
    undone_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    from_line: Mapped[BudgetLine | None] = relationship(foreign_keys=[from_line_id], lazy="joined")
    to_line: Mapped[BudgetLine] = relationship(foreign_keys=[to_line_id], lazy="joined")
