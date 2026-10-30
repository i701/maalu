import uuid
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import LIABILITY_GROUPS, TransactionType
from app.models import Account, BalanceSnapshot, Transaction, User
from app.schemas.stats import (
    BalancePoint,
    BalanceTrendResponse,
    MonthlyPoint,
    MonthlyResponse,
)
from app.services import snapshot as snapshots
from app.services.money import BASE_AMOUNT_QUANTUM
from app.services.snapshot import SnapshotService, _as_date

ZERO = Decimal(0)
MAX_TREND_DAYS = 400


def _point(day: date, assets: Decimal, liabilities: Decimal) -> BalancePoint:
    return BalancePoint(
        date=day,
        assets=assets.quantize(BASE_AMOUNT_QUANTUM),
        liabilities=liabilities.quantize(BASE_AMOUNT_QUANTUM),
        total=(assets - liabilities).quantize(BASE_AMOUNT_QUANTUM),
    )


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
                Transaction.refund_of_id.is_not(None),
                func.sum(Transaction.base_amount),
            )
            .where(
                Transaction.user_id == user_id,
                Transaction.counted(),
                Transaction.type.in_([TransactionType.INCOME, TransactionType.EXPENSE]),
                Transaction.transaction_date >= first,
                Transaction.transaction_date <= end,
            )
            .group_by(
                Transaction.transaction_date,
                Transaction.type,
                Transaction.refund_of_id.is_not(None),
            )
        )
        sums: dict[str, dict[TransactionType, Decimal]] = {}
        for day, kind, is_refund, total in (await self.db.execute(stmt)).all():
            bucket = sums.setdefault(f"{day.year:04d}-{day.month:02d}", {})
            amount = Decimal(str(total or 0))
            # A refund is money back for spending, not income: it takes away from expense.
            if is_refund:
                kind, amount = TransactionType.EXPENSE, -amount
            bucket[kind] = bucket.get(kind, ZERO) + amount

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
        await SnapshotService(self.db).repair(user_id)
        today = snapshots._today()
        points: list[BalancePoint] = []
        done = min(end, today - timedelta(days=1))
        if start <= done:
            points += await self._snapshot_points(accounts, start, done)
        if end >= today:
            points += await self._live_points(accounts, ids, max(start, today), end)
        return BalanceTrendResponse(currency=await self._base_currency(user_id), points=points)

    async def _snapshot_points(
        self, accounts: list[Account], start: date, end: date
    ) -> list[BalancePoint]:
        """Completed days, from the stored snapshots (each at the rate it had that day). A day
        before an account's first snapshot counts its opening amount at the current rate."""
        values: dict[tuple[uuid.UUID, date], Decimal] = {}
        if accounts:
            rows = await self.db.execute(
                select(
                    BalanceSnapshot.account_id, BalanceSnapshot.day, BalanceSnapshot.base_value
                ).where(
                    BalanceSnapshot.account_id.in_([a.id for a in accounts]),
                    BalanceSnapshot.day >= start,
                    BalanceSnapshot.day <= end,
                )
            )
            values = {(a, _as_date(d)): Decimal(str(v)) for a, d, v in rows.all()}
        points: list[BalancePoint] = []
        day = start
        while day <= end:
            assets = liabilities = ZERO
            for a in accounts:
                base = values.get((a.id, day))
                if base is None:
                    base = (a.opening_amount * a.exchange_rate).quantize(BASE_AMOUNT_QUANTUM)
                if a.group in LIABILITY_GROUPS:
                    liabilities -= base
                else:
                    assets += base
            points.append(_point(day, assets, liabilities))
            day += timedelta(days=1)
        return points

    async def _live_points(
        self, accounts: list[Account], ids: list[uuid.UUID], start: date, end: date
    ) -> list[BalancePoint]:
        """Today and later, worked out from the transactions at each account's current rate."""
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
            points.append(_point(day, assets, liabilities))
            day += timedelta(days=1)
        return points
