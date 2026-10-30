import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Category(Base):
    """What a transaction, a split line or a subscription is for. Unique per user by normalised
    name, so "Groceries" and "groceries" are the same category."""

    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "normalized_name", name="uq_categories_user_id_normalized_name"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    # casefolded + whitespace-collapsed `name`; what uniqueness is enforced on.
    normalized_name: Mapped[str] = mapped_column(String(100))
    # One of ACCENT_COLORS: picked automatically (the one used least), changeable.
    color: Mapped[str] = mapped_column(String(16))
    # One level only: a top-level category can have sub-categories, a sub-category cannot. The
    # parent still works as a category of its own. Deleting a parent leaves its children top-level.
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("categories.id", ondelete="SET NULL"), index=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
