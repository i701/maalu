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


class AccountGroup(StrEnum):
    CASH = "cash"
    ACCOUNTS = "accounts"
    CARD = "card"
    DEBIT_CARD = "debit_card"
    SAVINGS = "savings"
    PREPAID = "prepaid"  # Top-Up / Prepaid
    INVESTMENTS = "investments"
    OVERDRAFTS = "overdrafts"
    LOAN = "loan"
    INSURANCE = "insurance"
    OTHERS = "others"


# Balances in these groups are money you owe; everything else is an asset.
LIABILITY_GROUPS = frozenset({AccountGroup.CARD, AccountGroup.OVERDRAFTS, AccountGroup.LOAN})


class TransactionType(StrEnum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"  # moves money between two of the user's accounts
