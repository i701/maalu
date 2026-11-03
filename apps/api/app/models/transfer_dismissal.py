import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class TransferDismissal(Base):
    """A pair of transactions the user said are not one transfer ("Not a pair"), so the suggestions
    stop offering it. Deleting either transaction for good removes the row."""

    __tablename__ = "transfer_dismissals"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "expense_id", "income_id", name="uq_transfer_dismissals_user_pair"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    expense_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("transactions.id", ondelete="CASCADE"), index=True
    )
    income_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("transactions.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
