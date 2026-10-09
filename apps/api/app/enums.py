from enum import StrEnum


class PaymentMethod(StrEnum):
    """Stored as VARCHAR (not a native DB enum), so adding a member needs no migration."""

    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    DEBIT_CARD = "debit_card"
    CREDIT_CARD = "credit_card"
    PAYPAL = "paypal"
    OTHER = "other"


class IntervalUnit(StrEnum):
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"


class SubscriptionStatus(StrEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"
