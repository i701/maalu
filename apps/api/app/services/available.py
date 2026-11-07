import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.budget_period import period_bounds
from app.enums import LIABILITY_GROUPS, TransactionType, is_spendable
from app.models import Transaction, User
from app.schemas.available import (
    AvailableAccount,
    AvailableBill,
    AvailableCardPayment,
    AvailableReserve,
    AvailableToSpend,
)
from app.services.account import AccountService
from app.services.budget import BudgetService
from app.services.goal import GoalService
from app.services.stats import StatsService

ZERO = Decimal(0)


class AvailableService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.stats = StatsService(db)
        self.goals = GoalService(db)
        self.budget = BudgetService(db)

    async def available_to_spend(self, user_id: uuid.UUID) -> AvailableToSpend:
        """Spendable balance, less the bills still to pay this period, less what is set aside for
        goals. See `AvailableToSpend`."""
        user = await self.db.get(User, user_id)
        assert user is not None
        today = date.today()
        settings = await self.budget.settings(user_id)
        start, end = period_bounds(today, settings.period_start_day)

        accounts = await self.stats._in_scope(user_id)
        worth = await self.stats._worth_on(accounts, today)
        goals = await self.goals.list_for_user(user_id)
        followed = {g.account.id for g in goals if g.account is not None}

        spendable, apart = [], []
        for a in accounts:
            if a.group in LIABILITY_GROUPS:
                continue  # what is owed isn't money to spend, and isn't money kept apart
            row = AvailableAccount(id=a.id, name=a.name, group=a.group.value, balance=worth[a.id])
            if is_spendable(a.group, a.spendable) and a.id not in followed:
                spendable.append(row)
            else:
                apart.append(row)
        spendable_ids = {a.id for a in spendable}

        # Credit card statements still to pay by the end of the period. What was spent since a
        # statement closed is not due yet, so it is not here.
        in_scope = {a.id for a in accounts}
        cards = [
            AvailableCardPayment(
                account_id=c.account_id,
                title=c.account_name,
                date=c.due_on,
                amount=c.remaining_base,
                overdue=c.state == "overdue",
            )
            for c in await AccountService(self.db).statements(user_id, today)
            if c.account_id in in_scope and c.remaining > 0 and c.due_on <= end
        ]
        cards.sort(key=lambda c: (not c.overdue, c.date, c.title))

        # Bills still to pay: planned expenses up to the end of the period, overdue ones included,
        # paid from a spendable account (or from none yet).
        planned = (
            await self.db.scalars(
                select(Transaction)
                .where(
                    Transaction.user_id == user_id,
                    Transaction.live(),
                    Transaction.planned.is_(True),
                    Transaction.adjustment.is_(False),
                    Transaction.transaction_date <= end,
                    Transaction.type.in_(
                        (TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.TRANSFER)
                    ),
                )
                .order_by(Transaction.transaction_date, Transaction.created_at)
            )
        ).all()
        bills: list[AvailableBill] = []
        coming: list[AvailableBill] = []
        carded = {c.account_id for c in cards}
        for t in planned:
            if t.type is TransactionType.TRANSFER:
                # Only money leaving the everyday accounts for somewhere else is a bill. A move
                # between everyday accounts changes nothing, and money arriving from elsewhere is
                # never counted (like planned income). A repayment of a card whose statement is
                # already in the plan would count twice, so it is left out.
                leaving = t.account_id in spendable_ids and t.to_account_id not in spendable_ids
                if not leaving or t.to_account_id in carded:
                    continue
                other = t.to_account
                bills.append(
                    AvailableBill(
                        id=t.id,
                        title=t.description
                        or f"Transfer to {other.name if other else 'another account'}",
                        date=t.transaction_date,
                        amount=t.base_amount,
                        overdue=t.transaction_date < today,
                        subscription=None,
                        account=(t.account.name if t.account else None),
                        transfer=True,
                    )
                )
                continue
            if t.account_id is not None and t.account_id not in spendable_ids:
                continue
            row = AvailableBill(
                id=t.id,
                title=t.description or t.category,
                date=t.transaction_date,
                amount=t.base_amount,
                overdue=t.transaction_date < today,
                subscription=t.subscription.name if t.subscription else None,
                account=t.account.name if t.account else None,
                estimate=bool(t.subscription and t.subscription.amount_varies),
            )
            (coming if t.type is TransactionType.INCOME else bills).append(row)
        expected = sum((c.amount for c in coming), ZERO)
        bills.sort(key=lambda b: (not b.overdue, b.date, b.title))

        reserved = [
            AvailableReserve(goal_id=g.id, name=g.name, amount=g.saved)
            for g in goals
            if g.mode == "manual" and g.saved > 0
        ]
        balance = sum((a.balance for a in spendable), ZERO)
        bills_total = sum((b.amount for b in bills), ZERO)
        cards_total = sum((c.amount for c in cards), ZERO)
        reserved_total = sum((r.amount for r in reserved), ZERO)
        return AvailableToSpend(
            currency=user.base_currency,
            today=today,
            period_start=start,
            period_end=end,
            accounts=spendable,
            balance=balance,
            bills=bills,
            bills_total=bills_total,
            card_payments=cards,
            card_payments_total=cards_total,
            reserved=reserved,
            reserved_total=reserved_total,
            available=balance - bills_total - cards_total - reserved_total,
            expected_income=expected,
            expected=coming,
            kept_apart=apart,
        )
