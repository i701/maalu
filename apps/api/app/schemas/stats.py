import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class MonthlyPoint(BaseModel):
    month: str = Field(description="YYYY-MM")
    income: Decimal
    expense: Decimal


class MonthlyResponse(BaseModel):
    """Income and expense per calendar month in your base currency, oldest first. Transfers are
    not counted."""

    currency: str
    months: list[MonthlyPoint]


class BalancePoint(BaseModel):
    date: date
    assets: Decimal
    liabilities: Decimal = Field(description="What you owe, as a positive number")
    total: Decimal = Field(description="assets - liabilities")


class BalanceTrendResponse(BaseModel):
    """What your accounts were worth at the end of each day, in your base currency. Completed days
    come from daily snapshots, each account at the manual rate it had that day, so revaluing an
    account never rewrites the past; today is worked out live at the current rate. The line moves
    with transactions, not with markets."""

    currency: str
    points: list[BalancePoint]


class NetWorthDriver(BaseModel):
    key: Literal["income", "spending", "adjustments", "transfers", "exchange_rates"]
    amount: Decimal = Field(description="What it added to your net worth; negative takes away")


class NetWorthAccountChange(BaseModel):
    account_id: uuid.UUID
    name: str
    group: str
    currency: str
    start: Decimal = Field(description="Worth at the end of the day before the period, in base")
    end: Decimal = Field(description="Worth at the end of the last day, in base")
    change: Decimal = Field(description="end - start")


class NetWorthDrivers(BaseModel):
    """How your net worth moved between two days and what moved it, in your base currency. Net worth
    is what the active accounts that count toward stats are worth (what you owe counts below zero),
    the same line as the balance trend. The change is split into `income`, `spending` (after
    refunds), `adjustments` (balance corrections), `transfers` (money moved to or from an account
    that is not part of net worth: archived or left out of stats) and `exchange_rates`, which is
    what is left: accounts in another currency are worth a different amount in your base currency
    when their rate changes. The drivers always add up to `change` exactly, and `exchange_rates` is
    zero when everything is in your base currency."""

    currency: str
    start_date: date
    end_date: date
    start: Decimal = Field(description="Net worth at the end of the day before `start_date`")
    end: Decimal = Field(description="Net worth at the end of `end_date`")
    change: Decimal
    drivers: list[NetWorthDriver]
    accounts: list[NetWorthAccountChange] = Field(
        description="Each account's own change, biggest first; accounts with nothing in them and "
        "no change are left out"
    )
