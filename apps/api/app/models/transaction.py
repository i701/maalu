import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Index, Numeric, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import PaymentMethod
from app.models.base import Base
from app.models.subscription import Subscription
from app.models.vendor import Vendor


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_user_id_transaction_date", "user_id", "transaction_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # Signed: negative = money out, positive = money in. Never a float.
    # Optional payee. Deleting a vendor keeps the transaction and just unlinks it.
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("vendors.id", ondelete="SET NULL"), index=True, default=None
    )
    vendor: Mapped[Vendor | None] = relationship(lazy="joined")
    # Optional recurring charge this payment belongs to. Deleting the subscription unlinks it.
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("subscriptions.id", ondelete="SET NULL"), index=True, default=None
    )
    subscription: Mapped[Subscription | None] = relationship(lazy="joined")
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    # `amount` is in `currency`. `exchange_rate` = units of the user's base currency per 1 unit
    # of `currency` (1 when they match); base_amount = amount * exchange_rate, in base currency.
    currency: Mapped[str] = mapped_column(String(3))
    exchange_rate: Mapped[Decimal] = mapped_column(Numeric(19, 8))
    base_amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(
            PaymentMethod,
            native_enum=False,
            length=32,
            create_constraint=False,
            values_callable=lambda e: [m.value for m in e],
        )
    )
    category: Mapped[str] = mapped_column(String(100), index=True)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    transaction_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
