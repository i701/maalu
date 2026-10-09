import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Vendor(Base):
    """A payee (shop, person, company). Unique per user by normalised name."""

    __tablename__ = "vendors"
    __table_args__ = (
        UniqueConstraint("user_id", "normalized_name", name="uq_vendors_user_id_normalized_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    # casefolded + whitespace-collapsed `name`; what uniqueness is enforced on.
    normalized_name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(Text, default=None)
    # None = unknown. True/False once the user says whether the vendor is local.
    is_local: Mapped[bool | None] = mapped_column(Boolean, default=None)
    # ISO 4217 code, e.g. "MVR". Vendor's usual currency, not enforced on transactions.
    currency: Mapped[str | None] = mapped_column(String(3), default=None)
    # Free text: phone, email, contact person...
    contact: Mapped[str | None] = mapped_column(String(255), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
