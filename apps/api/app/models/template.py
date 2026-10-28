import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import PaymentMethod, TransactionType
from app.models.account import Account
from app.models.base import Base
from app.models.category import Category
from app.models.vendor import Vendor


class TransactionTemplate(Base):
    """A saved starting point for a transaction ("Weekly fish box"). Choosing it pre-fills the
    form; nothing here is a transaction yet. Every link is optional and is unlinked, not blocked,
    when what it points at is deleted. Unique per user by normalised name."""

    __tablename__ = "transaction_templates"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "normalized_name", name="uq_transaction_templates_user_id_normalized_name"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    # casefolded + whitespace-collapsed `name`; what uniqueness is enforced on.
    normalized_name: Mapped[str] = mapped_column(String(200))
    type: Mapped[TransactionType] = mapped_column(
        Enum(
            TransactionType,
            native_enum=False,
            length=32,
            create_constraint=False,
            values_callable=lambda e: [m.value for m in e],
        )
    )
    # Positive, in `currency`; left out when the amount differs every time.
    amount: Mapped[Decimal | None] = mapped_column(Numeric(19, 4), default=None)
    # The account's currency when there is an account, else the one chosen (default: base). The
    # exchange rate is not kept: the form suggests the market rate for the day you use it.
    currency: Mapped[str] = mapped_column(String(3))
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(
            PaymentMethod,
            native_enum=False,
            length=32,
            create_constraint=False,
            values_callable=lambda e: [m.value for m in e],
        )
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("categories.id", ondelete="SET NULL"), index=True, default=None
    )
    category_ref: Mapped[Category | None] = relationship(lazy="joined")
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("vendors.id", ondelete="SET NULL"), index=True, default=None
    )
    vendor_ref: Mapped[Vendor | None] = relationship(lazy="joined")
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="SET NULL"), index=True, default=None
    )
    account: Mapped[Account | None] = relationship(lazy="joined", foreign_keys=[account_id])
    # Transfers only.
    to_account_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="SET NULL"), index=True, default=None
    )
    to_account: Mapped[Account | None] = relationship(lazy="joined", foreign_keys=[to_account_id])
    description: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )

    @property
    def category(self) -> str | None:
        return self.category_ref.name if self.category_ref else None

    @property
    def vendor(self) -> str | None:
        return self.vendor_ref.name if self.vendor_ref else None
