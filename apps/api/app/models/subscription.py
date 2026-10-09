import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import IntervalUnit, PaymentMethod, SubscriptionStatus
from app.models.base import Base
from app.models.vendor import Vendor


def _str_enum(enum_cls):
    """VARCHAR-backed enum (no native DB enum), so adding members needs no migration."""
    return Enum(
        enum_cls,
        native_enum=False,
        length=32,
        create_constraint=False,
        values_callable=lambda e: [m.value for m in e],
    )


class Subscription(Base):
    """A recurring charge. Next-due / overdue are computed from the schedule and the linked
    transactions, not stored."""

    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("vendors.id", ondelete="SET NULL"), index=True, default=None
    )
    vendor: Mapped[Vendor | None] = relationship(lazy="joined")

    # Cost per billing cycle, always positive, in `currency`. Same manual-rate rules as
    # transactions: exchange_rate = base-currency units per 1 unit of `currency`.
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    currency: Mapped[str] = mapped_column(String(3))
    exchange_rate: Mapped[Decimal] = mapped_column(Numeric(19, 8))
    base_amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))

    payment_method: Mapped[PaymentMethod] = mapped_column(_str_enum(PaymentMethod))
    category: Mapped[str] = mapped_column(String(100))

    interval_unit: Mapped[IntervalUnit] = mapped_column(_str_enum(IntervalUnit))
    interval_count: Mapped[int] = mapped_column(Integer, default=1)
    start_date: Mapped[date] = mapped_column(Date)  # first billing date; anchors the schedule
    status: Mapped[SubscriptionStatus] = mapped_column(
        _str_enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
