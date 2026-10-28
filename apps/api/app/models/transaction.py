import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import PaymentMethod, TransactionType
from app.models.account import Account
from app.models.base import Base
from app.models.category import Category
from app.models.subscription import Subscription
from app.models.tag import Tag, transaction_tags
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
    # Optional account this moved money in/out of. Deleting the account only unlinks it.
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="SET NULL"), index=True, default=None
    )
    account: Mapped[Account | None] = relationship(lazy="joined", foreign_keys=[account_id])
    # Transfers only: the destination account and the amount that arrived there (in that
    # account's currency). `account` is then the source and `amount` what left it.
    to_account_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="SET NULL"), index=True, default=None
    )
    to_account: Mapped[Account | None] = relationship(lazy="joined", foreign_keys=[to_account_id])
    to_amount: Mapped[Decimal | None] = mapped_column(Numeric(19, 4), default=None)
    type: Mapped[TransactionType] = mapped_column(
        Enum(
            TransactionType,
            native_enum=False,
            length=32,
            create_constraint=False,
            values_callable=lambda e: [m.value for m in e],
        ),
        index=True,
    )
    # Always positive and never a float; `type` decides the direction (income in, expense and
    # transfer out). In `currency`.
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    # `exchange_rate` = units of the user's base currency per 1 unit of `currency` (1 when they
    # match); base_amount = amount * exchange_rate, in base currency.
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
    # What it was for. For a split transaction this is the category of the biggest line; transfers
    # have none. A category in use can't be deleted (the service refuses): merge it instead.
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("categories.id"), index=True, default=None
    )
    category_ref: Mapped[Category | None] = relationship(lazy="joined")
    description: Mapped[str | None] = mapped_column(Text, default=None)
    # Optional breakdown of `amount` by item and category (a shopping trip that mixes groceries and
    # snacks). When present the lines add up exactly to `amount`, and `category` above is the
    # category of the biggest line.
    splits: Mapped[list["TransactionSplit"]] = relationship(
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="TransactionSplit.position",
        back_populates="transaction",
    )
    transaction_date: Mapped[date] = mapped_column(Date)
    # Labels that cut across categories. Belong to the whole transaction, not to its items.
    tags: Mapped[list[Tag]] = relationship(
        secondary=transaction_tags, lazy="selectin", order_by=Tag.normalized_name
    )
    # Set when the transaction is moved to the trash. A trashed row is hidden everywhere and
    # counts toward nothing (balances, budgets, stats) until it is restored or deleted for good.
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True, default=None
    )

    @property
    def category(self) -> str:
        return self.category_ref.name if self.category_ref else "Transfer"

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )


class TransactionSplit(Base):
    """One line of a split transaction: an item (or group of items) in a single category."""

    __tablename__ = "transaction_splits"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("transactions.id", ondelete="CASCADE"), index=True
    )
    transaction: Mapped[Transaction] = relationship(back_populates="splits")
    position: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(200))
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=Decimal(1))
    category_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("categories.id"), index=True)
    category_ref: Mapped[Category] = relationship(lazy="joined")

    @property
    def category(self) -> str:
        return self.category_ref.name

    # What this line cost in the transaction's currency, tax included, so the lines add up to the
    # transaction's amount. `tax_amount` is the part of it that is tax (GST), when known.
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    tax_amount: Mapped[Decimal | None] = mapped_column(Numeric(19, 4), default=None)
