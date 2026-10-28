import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.enums import AccountGroup
from app.models.base import Base


class Account(Base):
    """A place money lives (wallet, bank account, card, loan...). The balance is not stored: it is
    `opening_amount` plus the sum of the transactions linked to the account."""

    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    group: Mapped[AccountGroup] = mapped_column(
        Enum(
            AccountGroup,
            native_enum=False,
            length=32,
            create_constraint=False,
            values_callable=lambda e: [m.value for m in e],
        )
    )
    name: Mapped[str] = mapped_column(String(200))
    # Signed, in the account's currency. Use a negative amount for money owed (cards, loans).
    opening_amount: Mapped[Decimal] = mapped_column(Numeric(19, 4), default=Decimal(0))
    # Transactions linked to the account must be in this currency.
    currency: Mapped[str] = mapped_column(String(3))
    # Manual rate to the user's base currency (1 when the account is in the base currency).
    # Used to value the account in the overview; editable to revalue it.
    exchange_rate: Mapped[Decimal] = mapped_column(Numeric(19, 8))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    # Set when the account is archived: closed, hidden from pickers and the overview, and left out
    # of the totals, but its transactions stay in the history. Reversible.
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
