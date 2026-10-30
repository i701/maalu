import uuid
from datetime import UTC, datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Stored lowercased; the unique constraint relies on that.
    email: Mapped[str] = mapped_column(String(320), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    # Primary currency, chosen at sign-up. Every transaction's base_amount is in this currency.
    base_currency: Mapped[str] = mapped_column(String(3))
    # The account a new transaction starts in. Only a convenience, so it is cleared when the account
    # is archived or deleted.
    default_account_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="SET NULL"), default=None
    )
    # Whether the transaction form offers "start from a template". Templates stay either way.
    start_from_template: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    # Two-factor (an authenticator app). The secret is kept encrypted (`app/two_factor.py`); it is
    # set during setup but only counts once `two_factor_enabled` is true.
    two_factor_secret: Mapped[str | None] = mapped_column(String(255), default=None)
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    # The last time step a code was accepted for, so the same code cannot be used twice.
    two_factor_last_step: Mapped[int | None] = mapped_column(BigInteger, default=None)
    # Wrong codes in a row; after too many the second factor is locked for a few minutes.
    two_factor_failures: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    two_factor_locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
