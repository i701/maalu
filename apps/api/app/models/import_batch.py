import uuid
from datetime import UTC, date, datetime, time
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ImportBatch(Base):
    """One statement file brought in. The transactions it made point back to it
    (`Transaction.import_batch_id`), which is what makes an import undoable as a whole. The counts
    are what the import did; how many of its transactions are still live is worked out."""

    __tablename__ = "import_batches"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # The account the statement belongs to. Deleting the account only unlinks the batch.
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="SET NULL"), index=True, default=None
    )
    filename: Mapped[str] = mapped_column(String(255))
    profile: Mapped[str] = mapped_column(String(32))
    imported_count: Mapped[int] = mapped_column(Integer, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )


class ImportAlias(Base):
    """What a name on a statement stands for, remembered from an earlier import so the next one
    fills it in: a vendor, or (for a transfer between your own accounts) the other account. One
    row per normalised name; exactly one of `vendor_id` and `account_id` is set."""

    __tablename__ = "import_aliases"
    __table_args__ = (
        UniqueConstraint("user_id", "normalized_text", name="uq_import_aliases_user_id_text"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    normalized_text: Mapped[str] = mapped_column(String(200))
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("vendors.id", ondelete="CASCADE"), index=True, default=None
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="CASCADE"), index=True, default=None
    )


class ImportRow(Base):
    """What happened to one row of an import: made into a transaction, skipped because it was
    already there, left out by the user, or failed (with the reason). It is what the downloadable
    report is made from, so an import can always be audited afterwards. The transaction link is
    cleared if that transaction is deleted for good."""

    __tablename__ = "import_rows"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    batch_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("import_batches.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)  # in the order the rows were sent, from 1
    transaction_date: Mapped[date] = mapped_column(Date)
    transaction_time: Mapped[time | None] = mapped_column(Time, default=None)
    type: Mapped[str] = mapped_column(String(16))
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    counterparty: Mapped[str] = mapped_column(String(200), default="")
    description: Mapped[str | None] = mapped_column(Text, default=None)
    reference: Mapped[str | None] = mapped_column(String(100), default=None)
    outcome: Mapped[str] = mapped_column(String(16))  # imported, skipped, left_out or failed
    reason: Mapped[str | None] = mapped_column(String(500), default=None)
    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("transactions.id", ondelete="SET NULL"), default=None
    )
