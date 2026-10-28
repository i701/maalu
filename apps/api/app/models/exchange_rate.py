import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Numeric, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ExchangeRate(Base):
    """A market rate looked up for a past date and kept, because a past day's rate never changes.

    Shared by every user (rates are public data), keyed by the pair and the day that was asked
    about; `rate_date` is the day the source actually had a rate for, which is earlier when the
    asked-about day was a gap in its data.
    """

    __tablename__ = "exchange_rates"
    __table_args__ = (
        UniqueConstraint("base", "quote", "requested_on", name="uq_exchange_rates_pair_day"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    base: Mapped[str] = mapped_column(String(3))
    quote: Mapped[str] = mapped_column(String(3))
    requested_on: Mapped[date] = mapped_column(Date)
    rate_date: Mapped[date] = mapped_column(Date)
    # Quote-currency units per 1 unit of `base`, like `exchange_rate` on a transaction.
    rate: Mapped[Decimal] = mapped_column(Numeric(19, 8))
