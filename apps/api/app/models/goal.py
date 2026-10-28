import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.account import Account
from app.models.base import Base


class Goal(Base):
    """Something to save toward, such as a trip fund.

    Progress comes from one of two places: the balance of a linked savings account, or, when no
    account is linked, a log of amounts the user sets aside (`entries`) inside their accounts.
    """

    __tablename__ = "goals"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    # In the user's base currency.
    target_amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    target_date: Mapped[date | None] = mapped_column(Date, default=None)
    # What the user plans to put aside each budget period, shown as a saving line in the budget.
    monthly_amount: Mapped[Decimal | None] = mapped_column(Numeric(19, 4), default=None)
    # One goal per account, or its balance would count toward two goals. Deleting the account
    # unlinks the goal, which then falls back to its log.
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="SET NULL"), unique=True, default=None
    )
    account: Mapped[Account | None] = relationship(lazy="joined")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
    entries: Mapped[list["GoalEntry"]] = relationship(
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="GoalEntry.entry_date.desc(), GoalEntry.created_at.desc()",
        back_populates="goal",
    )


class GoalEntry(Base):
    """Money set aside for a goal (positive) or taken back out (negative), in the base currency."""

    __tablename__ = "goal_entries"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    goal_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("goals.id", ondelete="CASCADE"), index=True
    )
    goal: Mapped[Goal] = relationship(back_populates="entries")
    entry_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    note: Mapped[str | None] = mapped_column(String(200), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
