import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Notification(Base):
    """Something worth your attention, found by looking at your data (a payment coming due, a
    budget limit reached, a goal met). It is derived, not entered: `dedupe_key` names the event
    ("payment-due:<transaction id>") and is unique per user, so looking again never repeats one.
    Read ones are kept for a while, then swept."""

    __tablename__ = "notifications"
    __table_args__ = (
        UniqueConstraint("user_id", "dedupe_key", name="uq_notifications_user_id_dedupe_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(String(500), default="")
    # A page of the web app to open for it, such as "/budget".
    link: Mapped[str | None] = mapped_column(String(200), default=None)
    dedupe_key: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
        index=True,
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    # Dismissed ones are hidden but kept (until swept), so the event is not announced again.
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
