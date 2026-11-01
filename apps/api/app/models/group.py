import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class TransactionGroup(Base):
    """A handful of related transactions bundled under a name (a trip, a treatment, instalments, an
    expense and what someone paid back), so their combined net can be seen. A group changes nothing
    else: the transactions keep their category, tags and amounts, and every total stays as it was.

    A transaction is in at most one group (`Transaction.group_id`), a group holds two to fifty, and
    deleting the group only unlinks them."""

    __tablename__ = "transaction_groups"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    note: Mapped[str | None] = mapped_column(String(500), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
