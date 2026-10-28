from datetime import date
from decimal import Decimal

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
    """What your accounts were worth at the end of each day, in your base currency. Each account
    is valued at its current manual rate, so the line moves with transactions, not with markets."""

    currency: str
    points: list[BalancePoint]
