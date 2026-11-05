import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.enums import SplitTaskStatus
from app.models.base import Base


class SalarySplitTask(Base):
    """A salary whose split is waiting for the user: made when a posted Salary income arrives while
    the user has salary rules, and shown on the Pending screen until it is approved or dismissed.
    One per salary."""

    __tablename__ = "salary_split_tasks"
    __table_args__ = (
        UniqueConstraint("transaction_id", name="uq_salary_split_tasks_transaction_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # Deleting the salary for good removes its task.
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("transactions.id", ondelete="CASCADE")
    )
    status: Mapped[SplitTaskStatus] = mapped_column(
        Enum(
            SplitTaskStatus,
            native_enum=False,
            length=32,
            create_constraint=False,
            values_callable=lambda e: [m.value for m in e],
        ),
        default=SplitTaskStatus.PENDING,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
