import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import CardKind
from app.models.account import Account
from app.models.base import Base


class Card(Base):
    """A payment card, tied to one of the user's accounts. A **debit** card spends from its bank
    account (it has no balance of its own); a **credit** card's `account` is its own account (group
    card: what is owed) and `repay_account` is the bank account it is repaid from. Picking a card
    on a transaction fills in the account and the payment method."""

    __tablename__ = "cards"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    # The last four digits, to tell cards with the same name apart. Never the full number.
    last_digits: Mapped[str | None] = mapped_column(String(4), default=None)
    kind: Mapped[CardKind] = mapped_column(
        Enum(
            CardKind,
            native_enum=False,
            length=16,
            create_constraint=False,
            values_callable=lambda e: [m.value for m in e],
        )
    )
    # Deleting the account deletes its cards (their transactions are kept, unlinked).
    account_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="CASCADE"), index=True
    )
    account: Mapped[Account] = relationship(lazy="joined", foreign_keys=[account_id])
    # Credit cards only. Deleting that account just clears the link.
    repay_account_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="SET NULL"), default=None
    )
    repay_account: Mapped[Account | None] = relationship(
        lazy="joined", foreign_keys=[repay_account_id]
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
