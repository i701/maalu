import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class BalanceSnapshot(Base):
    """What one account held at the end of one completed day, and what it was worth then.

    The balance is derived from transactions and is rebuilt whenever an earlier transaction changes
    (`SnapshotService.repair`). `exchange_rate` is the account's manual rate as it was that day and
    is **kept** across rebuilds, so revaluing an account later never rewrites the past.
    """

    __tablename__ = "balance_snapshots"

    account_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="CASCADE"), primary_key=True
    )
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    # In the account's currency, signed (money owed is negative)
    balance: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    # Base currency units per 1 unit of the account's currency, on that day
    exchange_rate: Mapped[Decimal] = mapped_column(Numeric(19, 8))
    # balance * exchange_rate in the base currency, rounded to 4dp
    base_value: Mapped[Decimal] = mapped_column(Numeric(19, 4))


class SnapshotDirty(Base):
    """Snapshots of this account from `from_date` on are out of date (an older transaction was
    added, changed or removed) and are rebuilt the next time they are read or by the daily job."""

    __tablename__ = "balance_snapshot_dirty"

    account_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="CASCADE"), primary_key=True
    )
    from_date: Mapped[date] = mapped_column(Date)
