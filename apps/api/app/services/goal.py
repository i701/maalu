import math
import uuid
from datetime import date
from decimal import ROUND_CEILING, ROUND_FLOOR, Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.budget_period import period_bounds
from app.enums import LIABILITY_GROUPS, TransactionType
from app.models import Account, Goal, GoalEntry, Transaction, User
from app.schemas import GoalCreate, GoalEntryCreate, GoalResponse, GoalUpdate
from app.schemas.goal import GoalAccountRef, GoalEntryResponse
from app.services.account import AccountNotFoundError, AccountService
from app.services.budget import BudgetService

ZERO = Decimal(0)
CENT = Decimal("0.0001")  # money has 4 decimals; keep outputs at that scale
DAYS_PER_MONTH = Decimal("30.4375")


class GoalNotFoundError(Exception):
    pass


class GoalEntryNotFoundError(Exception):
    pass


class GoalAccountTakenError(Exception):
    """Another goal already follows that account, so its balance would count toward two goals."""


class GoalRuleError(Exception):
    """A rule about goals was broken. The message is safe to show to the user."""


def months_until(target: date, today: date) -> int:
    """Whole months from `today` to `target`, rounding up so the plan never undershoots; 0 once the
    date has passed."""
    if target <= today:
        return 0
    return max(1, math.ceil(Decimal((target - today).days) / DAYS_PER_MONTH))


def _percent(saved: Decimal, target: Decimal) -> int:
    if target <= 0 or saved <= 0:
        return 0
    return int((saved * 100 / target).quantize(Decimal(1), ROUND_FLOOR))


class GoalService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.accounts = AccountService(db)
        self.budget = BudgetService(db)

    async def _base_currency(self, user_id: uuid.UUID) -> str:
        user = await self.db.get(User, user_id)
        assert user is not None
        return user.base_currency

    async def get(self, user_id: uuid.UUID, goal_id: uuid.UUID) -> Goal | None:
        stmt = select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id)
        return await self.db.scalar(stmt)

    async def _list(self, user_id: uuid.UUID) -> list[Goal]:
        stmt = select(Goal).where(Goal.user_id == user_id).order_by(Goal.created_at, Goal.name)
        return list((await self.db.scalars(stmt)).all())

    async def _transfers_into(self, account: Account, start: date, end: date) -> Decimal:
        """Money that moved into the account by transfer in a period, less what moved out, in the
        base currency. Income, expenses and interest are not contributions."""
        conditions = [
            Transaction.counted(),
            Transaction.type == TransactionType.TRANSFER,
            Transaction.transaction_date >= start,
            Transaction.transaction_date <= end,
        ]
        arrived = await self.db.scalar(
            select(func.sum(Transaction.to_amount)).where(
                *conditions, Transaction.to_account_id == account.id
            )
        )
        left = await self.db.scalar(
            select(func.sum(Transaction.base_amount)).where(
                *conditions, Transaction.account_id == account.id
            )
        )
        arrived_base = Decimal(str(arrived or 0)) * account.exchange_rate
        return arrived_base - Decimal(str(left or 0))

    async def present(
        self, user_id: uuid.UUID, goals: list[Goal], on: date | None = None
    ) -> list[GoalResponse]:
        today = date.today()
        currency = await self._base_currency(user_id)
        settings = await self.budget.settings(user_id)
        start, end = period_bounds(on or today, settings.period_start_day)

        linked = [g.account for g in goals if g.account is not None]
        balances = {a.id: a.base_balance for a in await self.accounts.present(linked)}

        out: list[GoalResponse] = []
        for goal in goals:
            account = goal.account
            if account is not None:
                saved = balances[account.id]
            else:
                saved = sum((e.amount for e in goal.entries), ZERO)
            reached = saved >= goal.target_amount
            remaining = max(ZERO, goal.target_amount - saved)

            months_left = months_until(goal.target_date, today) if goal.target_date else None
            needed = None
            if months_left and not reached:
                needed = (remaining / months_left).quantize(CENT, ROUND_CEILING)

            planned = contributed = status = None
            if goal.monthly_amount is not None:
                planned = goal.monthly_amount
                if account is not None:
                    contributed = await self._transfers_into(account, start, end)
                else:
                    contributed = sum(
                        (e.amount for e in goal.entries if start <= e.entry_date <= end), ZERO
                    )
                status = "funded" if contributed >= planned else "pending"

            out.append(
                GoalResponse(
                    id=goal.id,
                    name=goal.name,
                    currency=currency,
                    target_amount=goal.target_amount.quantize(CENT),
                    target_date=goal.target_date,
                    monthly_amount=planned.quantize(CENT) if planned is not None else None,
                    mode="account" if account is not None else "manual",
                    account=GoalAccountRef.model_validate(account) if account else None,
                    saved=saved.quantize(CENT),
                    remaining=remaining.quantize(CENT),
                    percent=_percent(saved, goal.target_amount),
                    reached=reached,
                    months_left=months_left,
                    needed_per_month=needed,
                    period_planned=planned.quantize(CENT) if planned is not None else None,
                    period_contributed=(
                        contributed.quantize(CENT) if contributed is not None else None
                    ),
                    period_status=status,
                    entries=[]
                    if account is not None
                    else [
                        GoalEntryResponse(
                            id=e.id,
                            entry_date=e.entry_date,
                            amount=e.amount.quantize(CENT),
                            note=e.note,
                        )
                        for e in goal.entries
                    ],
                )
            )
        return out

    async def list_for_user(self, user_id: uuid.UUID, on: date | None = None) -> list[GoalResponse]:
        return await self.present(user_id, await self._list(user_id), on)

    async def _check_account(
        self, user_id: uuid.UUID, account_id: uuid.UUID, *, goal_id: uuid.UUID | None
    ) -> Account:
        account = await self.db.scalar(
            select(Account).where(Account.id == account_id, Account.user_id == user_id)
        )
        if account is None:
            raise AccountNotFoundError
        if account.archived_at is not None:
            raise GoalRuleError(f'"{account.name}" is archived. Unarchive it to follow it')
        if account.group in LIABILITY_GROUPS:
            raise GoalRuleError("A goal can't follow a card, overdraft or loan")
        stmt = select(Goal.id).where(Goal.account_id == account_id)
        if goal_id is not None:
            stmt = stmt.where(Goal.id != goal_id)
        if await self.db.scalar(stmt) is not None:
            raise GoalAccountTakenError
        return account

    async def create(self, user_id: uuid.UUID, data: GoalCreate) -> Goal:
        account = (
            await self._check_account(user_id, data.account_id, goal_id=None)
            if data.account_id
            else None
        )
        goal = Goal(
            user_id=user_id,
            name=data.name,
            target_amount=data.target_amount,
            target_date=data.target_date,
            monthly_amount=data.monthly_amount,
            account=account,
            entries=[],  # a new goal has none; without this it would try to lazy-load them
        )
        self.db.add(goal)
        await self.db.flush()
        return goal

    async def update(self, user_id: uuid.UUID, goal: Goal, data: GoalUpdate) -> Goal:
        changes = data.model_dump(exclude_unset=True)
        if "account_id" in changes:
            account_id = changes.pop("account_id")
            goal.account = (
                await self._check_account(user_id, account_id, goal_id=goal.id)
                if account_id
                else None
            )
        for field, value in changes.items():
            setattr(goal, field, value)
        await self.db.flush()
        return goal

    async def delete(self, goal: Goal) -> None:
        await self.db.delete(goal)
        await self.db.flush()

    async def add_entry(self, goal: Goal, data: GoalEntryCreate) -> GoalEntry:
        if goal.account is not None:
            raise GoalRuleError(
                "This goal follows an account's balance, so money can't be set aside by hand"
            )
        if sum((e.amount for e in goal.entries), ZERO) + data.amount < 0:
            raise GoalRuleError("You can't take out more than has been set aside")
        entry = GoalEntry(
            goal=goal,
            entry_date=data.entry_date or date.today(),
            amount=data.amount,
            note=data.note,
        )
        self.db.add(entry)
        await self.db.flush()
        return entry

    async def delete_entry(self, goal: Goal, entry_id: uuid.UUID) -> None:
        entry = next((e for e in goal.entries if e.id == entry_id), None)
        if entry is None:
            raise GoalEntryNotFoundError
        if sum((e.amount for e in goal.entries if e.id != entry_id), ZERO) < 0:
            raise GoalRuleError("Removing this would leave less than nothing set aside")
        goal.entries.remove(entry)
        await self.db.flush()
