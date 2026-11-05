from enum import StrEnum
from typing import Literal

# The colours a tag or category can have: the names of the web app's accent colours. A new one gets
# the one its owner uses least, so neighbours rarely look alike.
ACCENT_COLORS = ("blue", "green", "orange", "violet", "pink", "amber", "lime", "slate")
AccentColor = Literal["blue", "green", "orange", "violet", "pink", "amber", "lime", "slate"]


class SplitTaskStatus(StrEnum):
    """Where a salary's split stands on the Pending screen."""

    PENDING = "pending"  # waiting to be approved
    DONE = "done"  # every line that can be made has been
    DISMISSED = "dismissed"  # the user chose not to split it (it can still be split by hand)


class SalaryRuleMode(StrEnum):
    """How much of a salary a rule sends on: a share of it, or a fixed amount."""

    PERCENT = "percent"
    FIXED = "fixed"


class CategoryKind(StrEnum):
    """How necessary spending in a category is. A category with no kind is "unsorted"."""

    NEED = "need"
    WANT = "want"


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
    COMPLETED = "completed"  # an installment plan whose last payment was made


class CardKind(StrEnum):
    """A debit card spends from its bank account; a credit card is an account of its own (what you
    owe) that is repaid from a bank account."""

    DEBIT = "debit"
    CREDIT = "credit"


class AccountGroup(StrEnum):
    CASH = "cash"
    ACCOUNTS = "accounts"
    CARD = "card"  # a credit card: what you owe. A debit card belongs to its bank account.
    SAVINGS = "savings"
    PREPAID = "prepaid"  # Top-Up / Prepaid
    INVESTMENTS = "investments"
    OVERDRAFTS = "overdrafts"
    LOAN = "loan"
    INSURANCE = "insurance"
    OTHERS = "others"


# Balances in these groups are money you owe; everything else is an asset.
LIABILITY_GROUPS = frozenset({AccountGroup.CARD, AccountGroup.OVERDRAFTS, AccountGroup.LOAN})
# Accounts that hold money you spend from day to day: what "available to spend" starts from.
SPENDABLE_GROUPS = frozenset({AccountGroup.CASH, AccountGroup.ACCOUNTS, AccountGroup.PREPAID})
# Only these have a credit limit: the most you can owe on them.
CREDIT_LIMIT_GROUPS = frozenset({AccountGroup.CARD, AccountGroup.OVERDRAFTS})
# The category a balance adjustment is filed under (it is left out of every report anyway).
ADJUSTMENT_CATEGORY = "Balance adjustment"
# The default category for pay. Income in it is never a refund, and nothing but income goes in it.
SALARY_CATEGORY = "Salary"


class TransactionType(StrEnum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"  # moves money between two of the user's accounts


class VendorLocality(StrEnum):
    """Filter for vendors by whether they are local, foreign or not yet classified."""

    LOCAL = "local"
    FOREIGN = "foreign"
    UNKNOWN = "unknown"
