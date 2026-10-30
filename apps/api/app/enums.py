from enum import StrEnum
from typing import Literal

# The colours a tag or category can have: the names of the web app's accent colours. A new one gets
# the one its owner uses least, so neighbours rarely look alike.
ACCENT_COLORS = ("blue", "green", "orange", "violet", "pink", "amber", "lime", "slate")
AccentColor = Literal["blue", "green", "orange", "violet", "pink", "amber", "lime", "slate"]


class PaymentMethod(StrEnum):
    """Stored as VARCHAR (not a native DB enum), so adding a member needs no migration."""

    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    DEBIT_CARD = "debit_card"
    CREDIT_CARD = "credit_card"
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


class VendorLocality(StrEnum):
    """Filter for vendors by whether they are local, foreign or not yet classified."""

    LOCAL = "local"
    FOREIGN = "foreign"
    UNKNOWN = "unknown"
