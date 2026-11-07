import datetime as dt
import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field


class AvailableAccount(BaseModel):
    id: uuid.UUID
    name: str
    group: str
    balance: Decimal = Field(description="What it holds now, in your base currency")


class AvailableBill(BaseModel):
    id: uuid.UUID
    title: str = Field(description="Its description, else its category")
    date: date
    amount: Decimal = Field(description="In your base currency")
    overdue: bool = Field(description="Its date has passed and it is still planned")
    subscription: str | None = Field(description="The subscription it belongs to, if any")
    account: str | None = Field(description="The account it will be paid from, if one is set")
    estimate: bool = Field(
        default=False,
        description="Only a guess: its subscription's amount varies from month to month",
    )


class AvailableCardPayment(BaseModel):
    account_id: uuid.UUID
    title: str = Field(description="The card's name")
    date: dt.date = Field(description="When the payment for its last statement is due")
    amount: Decimal = Field(description="Still to pay of that statement, in your base currency")
    overdue: bool = Field(description="Its due date has passed and it is not paid")


class AvailableReserve(BaseModel):
    goal_id: uuid.UUID
    name: str
    amount: Decimal = Field(description="Set aside by hand, kept inside your accounts")


class AvailableToSpend(BaseModel):
    """What you can spend until the end of the budget period without touching a bill that is still
    to pay or money set aside for a goal. Everything is in your base currency."""

    currency: str
    today: date
    period_start: date
    period_end: date = Field(description="Bills dated up to here (and any overdue) are counted")
    accounts: list[AvailableAccount] = Field(
        description="What it starts from: cash, current, debit and prepaid accounts that count "
        "toward your stats, leaving out any account a goal follows"
    )
    balance: Decimal = Field(description="Those accounts added up")
    bills: list[AvailableBill] = Field(
        description="Planned expenses (a subscription's next payment, rent due) not yet paid, "
        "overdue ones first, then by date"
    )
    bills_total: Decimal
    card_payments: list[AvailableCardPayment] = Field(
        description="Credit card statements still to pay that fall due by the end of the period "
        "(overdue ones first). Spending since a statement closed is not here: it is not due yet."
    )
    card_payments_total: Decimal
    reserved: list[AvailableReserve] = Field(
        description="Goals tracked by hand: what you set aside is not yours to spend"
    )
    reserved_total: Decimal
    available: Decimal = Field(
        description="balance - bills_total - card_payments_total - reserved_total. Below zero "
        "means you are short."
    )
    expected_income: Decimal = Field(
        description="Planned income up to the end of the period (a salary not yet received). It "
        "is not counted in `available`, so the figure never relies on money that hasn't arrived."
    )
    expected: list[AvailableBill] = Field(
        description="The planned income behind `expected_income`, by date (same shape as bills)"
    )
    kept_apart: list[AvailableAccount] = Field(
        description="Accounts that count toward net worth but not toward spending: savings, "
        "investments and accounts a goal follows"
    )
