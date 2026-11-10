import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SubscriptionDismissal(Base):
    """A vendor (in one currency) the user said is not a subscription ("Not a subscription"), so
    the suggestions stop offering it. Deleting the vendor removes the row."""

    __tablename__ = "subscription_dismissals"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "vendor_id", "currency", name="uq_subscription_dismissals_user_vendor"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("vendors.id", ondelete="CASCADE"), index=True
    )
    currency: Mapped[str] = mapped_column(String(3))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
