import uuid
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import LIABILITY_GROUPS, TransactionType
from app.models import Account, Transaction, User
from app.schemas.stats import (
    BalancePoint,
    BalanceTrendResponse,
    MonthlyPoint,
    MonthlyResponse,
)
from app.services.money import BASE_AMOUNT_QUANTUM

ZERO = Decimal(0)
MAX_TREND_DAYS = 400


class StatsRangeError(Exception):
    """A date range that is backwards or too long. The message is safe to show."""


def _month_start(year: int, month: int, back: int) -> date:
    """The first day of the month `back` months before year-month."""
    index = year * 12 + (month - 1) - back
    return date(index // 12, index % 12 + 1, 1)


class StatsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _base_currency(self, user_id: uuid.UUID) -> str:
        user = await self.db.get(User, user_id)
        assert user is not None
        return user.base_currency

    async def monthly(self, user_id: uuid.UUID, months: int, to: date) -> MonthlyResponse:
        first = _month_start(to.year, to.month, months - 1)
        end = _month_start(to.year, to.month, -1) - timedelta(days=1)
        stmt = (
            select(
                Transaction.transaction_date,
                Transaction.type,
                func.sum(Transaction.base_amount),
            )
            .where(
                Transaction.user_id == user_id,
                Transaction.counted(),
                Transaction.type.in_([TransactionType.INCOME, TransactionType.EXPENSE]),
                Transaction.transaction_date >= first,
                Transaction.transaction_date <= end,
            )
            .group_by(Transaction.transaction_date, Transaction.type)
        )
        sums: dict[str, dict[TransactionType, Decimal]] = {}
        for day, kind, total in (await self.db.execute(stmt)).all():
            bucket = sums.setdefault(f"{day.year:04d}-{day.month:02d}", {})
            bucket[kind] = bucket.get(kind, ZERO) + Decimal(str(total or 0))

        points = []
        for back in range(months - 1, -1, -1):
            start = _month_start(to.year, to.month, back)
            key = f"{start.year:04d}-{start.month:02d}"
            got = sums.get(key, {})
            points.append(
                MonthlyPoint(
                    month=key,
                    income=got.get(TransactionType.INCOME, ZERO).quantize(BASE_AMOUNT_QUANTUM),
                    expense=got.get(TransactionType.EXPENSE, ZERO).quantize(BASE_AMOUNT_QUANTUM),
                )
            )
        return MonthlyResponse(currency=await self._base_currency(user_id), months=points)

    async def balance_trend(
        self, user_id: uuid.UUID, start: date, end: date
    ) -> BalanceTrendResponse:
        if start > end:
            raise StatsRangeError("from can't be after to")
        if (end - start).days >= MAX_TREND_DAYS:
            raise StatsRangeError(f"The range can't be longer than {MAX_TREND_DAYS} days")

        accounts = list(
            (
                await self.db.scalars(
                    select(Account).where(Account.user_id == user_id, Account.archived_at.is_(None))
                )
            ).all()
        )
        ids = [a.id for a in accounts]
        signed = case(
            (Transaction.type == TransactionType.INCOME, Transaction.amount),
            else_=-Transaction.amount,
        )

        # Each account's balance on the day before `start`, then the change on each day after.
        balance: dict[uuid.UUID, Decimal] = {a.id: a.opening_amount for a in accounts}
        changes: dict[tuple[uuid.UUID, date], Decimal] = {}
        if ids:
            before_direct = (
                select(Transaction.account_id, func.sum(signed))
                .where(
                    Transaction.account_id.in_(ids),
                    Transaction.counted(),
                    Transaction.transaction_date < start,
                )
                .group_by(Transaction.account_id)
            )
            for account_id, total in (await self.db.execute(before_direct)).all():
                balance[account_id] += Decimal(str(total or 0))
            before_incoming = (
                select(Transaction.to_account_id, func.sum(Transaction.to_amount))
                .where(
                    Transaction.to_account_id.in_(ids),
                    Transaction.counted(),
                    Transaction.transaction_date < start,
                )
                .group_by(Transaction.to_account_id)
            )
            for account_id, total in (await self.db.execute(before_incoming)).all():
                balance[account_id] += Decimal(str(total or 0))

            within = (
                Transaction.counted(),
                Transaction.transaction_date >= start,
                Transaction.transaction_date <= end,
            )
            direct = (
                select(Transaction.account_id, Transaction.transaction_date, func.sum(signed))
                .where(Transaction.account_id.in_(ids), *within)
                .group_by(Transaction.account_id, Transaction.transaction_date)
            )
            incoming = (
                select(
                    Transaction.to_account_id,
                    Transaction.transaction_date,
                    func.sum(Transaction.to_amount),
                )
                .where(Transaction.to_account_id.in_(ids), *within)
                .group_by(Transaction.to_account_id, Transaction.transaction_date)
            )
            for stmt in (direct, incoming):
                for account_id, day, total in (await self.db.execute(stmt)).all():
                    key = (account_id, day)
                    changes[key] = changes.get(key, ZERO) + Decimal(str(total or 0))

        points: list[BalancePoint] = []
        day = start
        while day <= end:
            assets = liabilities = ZERO
            for a in accounts:
                balance[a.id] += changes.get((a.id, day), ZERO)
                base = (balance[a.id] * a.exchange_rate).quantize(BASE_AMOUNT_QUANTUM)
                if a.group in LIABILITY_GROUPS:
                    liabilities -= base
                else:
                    assets += base
            points.append(
                BalancePoint(
                    date=day,
                    assets=assets.quantize(BASE_AMOUNT_QUANTUM),
                    liabilities=liabilities.quantize(BASE_AMOUNT_QUANTUM),
                    total=(assets - liabilities).quantize(BASE_AMOUNT_QUANTUM),
                )
            )
            day += timedelta(days=1)
        return BalanceTrendResponse(currency=await self._base_currency(user_id), points=points)
