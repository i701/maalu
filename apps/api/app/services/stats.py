import uuid
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import LIABILITY_GROUPS, TransactionType
from app.models import Account, BalanceSnapshot, Transaction, User
from app.schemas.stats import (
    BalancePoint,
    BalanceTrendResponse,
    MonthlyPoint,
    MonthlyResponse,
    NetWorthAccountChange,
    NetWorthDriver,
    NetWorthDrivers,
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


def _round(value: Decimal) -> Decimal:
    return value.quantize(BASE_AMOUNT_QUANTUM)


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
                Transaction.reported(),
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
                    select(Account).where(
                        Account.user_id == user_id,
                        Account.archived_at.is_(None),
                        Account.exclude_from_stats.is_(False),
                    )
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

    async def _in_scope(self, user_id: uuid.UUID) -> list[Account]:
        """The accounts that make up net worth: active and not left out of the stats."""
        return list(
            (
                await self.db.scalars(
                    select(Account).where(
                        Account.user_id == user_id,
                        Account.archived_at.is_(None),
                        Account.exclude_from_stats.is_(False),
                    )
                )
            ).all()
        )

    async def _worth_on(self, accounts: list[Account], day: date) -> dict[uuid.UUID, Decimal]:
        """What each account was worth, in base currency, at the end of `day`: from the stored
        snapshot for a completed day (each at the rate it had), worked out from the transactions at
        the current rate for today or later. A day before an account's first snapshot counts its
        opening amount."""
        if not accounts:
            return {}
        ids = [a.id for a in accounts]
        if day < snapshots._today():
            rows = await self.db.execute(
                select(BalanceSnapshot.account_id, BalanceSnapshot.base_value).where(
                    BalanceSnapshot.account_id.in_(ids), BalanceSnapshot.day == day
                )
            )
            stored = {a: Decimal(str(v)) for a, v in rows.all()}
            return {
                a.id: stored.get(
                    a.id, (a.opening_amount * a.exchange_rate).quantize(BASE_AMOUNT_QUANTUM)
                )
                for a in accounts
            }
        signed = case(
            (Transaction.type == TransactionType.INCOME, Transaction.amount),
            else_=-Transaction.amount,
        )
        balance = {a.id: a.opening_amount for a in accounts}
        until = (Transaction.counted(), Transaction.transaction_date <= day)
        direct = (
            select(Transaction.account_id, func.sum(signed))
            .where(Transaction.account_id.in_(ids), *until)
            .group_by(Transaction.account_id)
        )
        incoming = (
            select(Transaction.to_account_id, func.sum(Transaction.to_amount))
            .where(Transaction.to_account_id.in_(ids), *until)
            .group_by(Transaction.to_account_id)
        )
        for stmt in (direct, incoming):
            for account_id, total in (await self.db.execute(stmt)).all():
                balance[account_id] += Decimal(str(total or 0))
        return {
            a.id: (balance[a.id] * a.exchange_rate).quantize(BASE_AMOUNT_QUANTUM) for a in accounts
        }

    async def net_worth_drivers(
        self, user_id: uuid.UUID, start: date, end: date
    ) -> NetWorthDrivers:
        if start > end:
            raise StatsRangeError("from can't be after to")
        accounts = await self._in_scope(user_id)
        ids = [a.id for a in accounts]
        await SnapshotService(self.db).repair(user_id)
        before = await self._worth_on(accounts, start - timedelta(days=1))
        after = await self._worth_on(accounts, end)

        # What moved money into or out of net worth during the period, at the rate each
        # transaction was made at. A transfer between two accounts that count is one amount out and
        # the same in, so it cancels; only one that crosses the edge of net worth changes it.
        income = spending = adjustments = transfers = ZERO
        if ids:
            source_in = Transaction.account_id.in_(ids)
            target_in = Transaction.to_account_id.in_(ids)
            stmt = (
                select(
                    Transaction.type,
                    Transaction.is_refund(),
                    Transaction.adjustment,
                    source_in,
                    target_in,
                    func.sum(Transaction.base_amount),
                )
                .where(
                    Transaction.user_id == user_id,
                    Transaction.counted(),
                    Transaction.transaction_date >= start,
                    Transaction.transaction_date <= end,
                    or_(source_in, target_in),
                )
                .group_by(
                    Transaction.type,
                    Transaction.is_refund(),
                    Transaction.adjustment,
                    source_in,
                    target_in,
                )
            )
            for kind, is_refund, is_adjustment, from_in, to_in, total in (
                await self.db.execute(stmt)
            ).all():
                amount = Decimal(str(total or 0))
                if kind == TransactionType.TRANSFER:
                    transfers += (amount if to_in else ZERO) - (amount if from_in else ZERO)
                    continue
                if not from_in:
                    continue
                effect = amount if kind == TransactionType.INCOME else -amount
                if is_adjustment:
                    adjustments += effect
                elif kind == TransactionType.INCOME and not is_refund:
                    income += effect
                else:  # an expense, or a refund, which is money back for spending
                    spending += effect

        start_total = sum(before.values(), ZERO)
        end_total = sum(after.values(), ZERO)
        change = end_total - start_total
        exchange = change - income - spending - adjustments - transfers
        rows = [
            NetWorthAccountChange(
                account_id=a.id,
                name=a.name,
                group=a.group.value,
                currency=a.currency,
                start=_round(before[a.id]),
                end=_round(after[a.id]),
                change=_round(after[a.id] - before[a.id]),
            )
            for a in accounts
            if before[a.id] or after[a.id]
        ]
        rows.sort(key=lambda r: (-abs(r.change), r.name))
        return NetWorthDrivers(
            currency=await self._base_currency(user_id),
            start_date=start,
            end_date=end,
            start=_round(start_total),
            end=_round(end_total),
            change=_round(change),
            drivers=[
                NetWorthDriver(key=key, amount=_round(value))
                for key, value in (
                    ("income", income),
                    ("spending", spending),
                    ("adjustments", adjustments),
                    ("transfers", transfers),
                    ("exchange_rates", exchange),
                )
            ],
            accounts=rows,
        )
