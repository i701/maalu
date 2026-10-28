import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Table, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

# The colours a tag can get, assigned automatically (the least used one first). They are the names
# of the web app's accent colours.
TAG_COLORS = ("blue", "green", "orange", "violet", "pink", "amber", "lime", "slate")


class Tag(Base):
    """A label that cuts across categories ("Trip", "Need"). Unique per user by normalised name."""

    __tablename__ = "tags"
    __table_args__ = (
        UniqueConstraint("user_id", "normalized_name", name="uq_tags_user_id_normalized_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(50))
    # casefolded + whitespace-collapsed `name`; what uniqueness is enforced on.
    normalized_name: Mapped[str] = mapped_column(String(50))
    # One of TAG_COLORS.
    color: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )


# Many-to-many links. Deleting a tag, a transaction or a template removes its links.
transaction_tags = Table(
    "transaction_tags",
    Base.metadata,
    Column(
        "transaction_id",
        Uuid,
        ForeignKey("transactions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("tag_id", Uuid, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True, index=True),
)

template_tags = Table(
    "template_tags",
    Base.metadata,
    Column(
        "template_id",
        Uuid,
        ForeignKey("transaction_templates.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("tag_id", Uuid, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True, index=True),
)
