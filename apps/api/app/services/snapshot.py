"""Daily balance snapshots: what each account held, and was worth, at the end of each completed day.

A snapshot is cheap to read and, unlike the balance a replay of transactions gives today, it keeps
the exchange rate the account had on that day, so revaluing an account never rewrites the past. The
balances themselves stay derived from transactions and are the source of truth: when an older
transaction changes, the affected snapshots are marked (`SnapshotDirty`, written by the flush hook
below) and rebuilt the next time they are read or by the daily job, keeping each day's rate.
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import case, delete, event, func, insert, inspect, select
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.enums import TransactionType
from app.models import Account, BalanceSnapshot, SnapshotDirty, Transaction
from app.services.money import BASE_AMOUNT_QUANTUM

ZERO = Decimal(0)
# "From the beginning": earlier than any real transaction, so a rebuild starts at the first day the
# account has anything.
EPOCH = date(1900, 1, 1)


def _today() -> date:
    """The day snapshots go by (UTC; a test replaces it). The current day is never snapshotted: it
    is still changing, so it is worked out live."""
    return datetime.now(UTC).date()


def _created_day(account: Account) -> date:
    created = account.created_at
    return created.date() if created else EPOCH


class SnapshotService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _first_day(self, account: Account) -> date:
        """The first day an account has anything: it was created, or a transaction touches it."""
        counted = Transaction.counted()
        direct = select(func.min(Transaction.transaction_date)).where(
            Transaction.account_id == account.id, counted
        )
        incoming = select(func.min(Transaction.transaction_date)).where(
            Transaction.to_account_id == account.id, counted
        )
        days = [_created_day(account)]
        for stmt in (direct, incoming):
            found = await self.db.scalar(stmt)
            if found:
                days.append(found)
        return min(days)

    async def _sum_before(self, account: Account, day: date) -> Decimal:
        """Opening amount plus every counted transaction dated before `day`."""
        signed = case(
            (Transaction.type == TransactionType.INCOME, Transaction.amount),
            else_=-Transaction.amount,
        )
        counted = Transaction.counted()
        out = await self.db.scalar(
            select(func.sum(signed)).where(
                Transaction.account_id == account.id,
                counted,
                Transaction.transaction_date < day,
            )
        )
        into = await self.db.scalar(
            select(func.sum(Transaction.to_amount)).where(
                Transaction.to_account_id == account.id,
                counted,
                Transaction.transaction_date < day,
            )
        )
        return account.opening_amount + Decimal(str(out or 0)) + Decimal(str(into or 0))

    async def _changes(self, account: Account, start: date, end: date) -> dict[date, Decimal]:
        signed = case(
            (Transaction.type == TransactionType.INCOME, Transaction.amount),
            else_=-Transaction.amount,
        )
        within = (
            Transaction.counted(),
            Transaction.transaction_date >= start,
            Transaction.transaction_date <= end,
        )
        changes: dict[date, Decimal] = {}
        direct = (
            select(Transaction.transaction_date, func.sum(signed))
            .where(Transaction.account_id == account.id, *within)
            .group_by(Transaction.transaction_date)
        )
        incoming = (
            select(Transaction.transaction_date, func.sum(Transaction.to_amount))
            .where(Transaction.to_account_id == account.id, *within)
            .group_by(Transaction.transaction_date)
        )
        for stmt in (direct, incoming):
            for day, total in (await self.db.execute(stmt)).all():
                changes[day] = changes.get(day, ZERO) + Decimal(str(total or 0))
        return changes

    async def rebuild(self, account: Account, from_date: date) -> None:
        """Rebuild the account's snapshots from `from_date` through yesterday. A day that already
        has a snapshot keeps its exchange rate; a new day takes the account's current one."""
        last = _today() - timedelta(days=1)
        start = max(from_date, await self._first_day(account))
        rates = {
            _as_date(day): rate
            for day, rate in (
                await self.db.execute(
                    select(BalanceSnapshot.day, BalanceSnapshot.exchange_rate).where(
                        BalanceSnapshot.account_id == account.id,
                        BalanceSnapshot.day >= start,
                        BalanceSnapshot.day <= last,
                    )
                )
            ).all()
        }
        # Everything from `from_date` on is replaced, so a day that no longer has anything (its only
        # transaction was removed) loses its snapshot too.
        await self.db.execute(
            delete(BalanceSnapshot).where(
                BalanceSnapshot.account_id == account.id, BalanceSnapshot.day >= from_date
            )
        )
        if start > last:
            return
        balance = await self._sum_before(account, start)
        changes = await self._changes(account, start, last)
        rows = []
        day = start
        while day <= last:
            balance += changes.get(day, ZERO)
            rate = Decimal(str(rates.get(day, account.exchange_rate)))
            rows.append(
                {
                    "account_id": account.id,
                    "day": day,
                    "balance": balance,
                    "exchange_rate": rate,
                    "base_value": (balance * rate).quantize(BASE_AMOUNT_QUANTUM),
                }
            )
            day += timedelta(days=1)
        await self.db.execute(insert(BalanceSnapshot), rows)

    async def repair(self, user_id: uuid.UUID | None = None) -> None:
        """Bring snapshots up to date: rebuild what an older change made stale, then add the days
        since each account's last snapshot (everything, for an account with none). For one user,
        or every user when `user_id` is None."""
        accounts = select(Account)
        if user_id is not None:
            accounts = accounts.where(Account.user_id == user_id)

        dirty = await self.db.execute(
            select(SnapshotDirty, Account)
            .join(Account, Account.id == SnapshotDirty.account_id)
            .where(*([Account.user_id == user_id] if user_id is not None else []))
        )
        for marker, account in dirty.all():
            await self.rebuild(account, marker.from_date)
            await self.db.delete(marker)
        await self.db.flush()

        last_day = dict(
            (
                await self.db.execute(
                    select(BalanceSnapshot.account_id, func.max(BalanceSnapshot.day)).group_by(
                        BalanceSnapshot.account_id
                    )
                )
            ).all()
        )
        yesterday = _today() - timedelta(days=1)
        for account in (await self.db.scalars(accounts)).all():
            last = last_day.get(account.id)
            if last is None:
                await self.rebuild(account, EPOCH)
            elif _as_date(last) < yesterday:
                await self.rebuild(account, _as_date(last) + timedelta(days=1))


def _as_date(value) -> date:
    """SQLite's max() over a date column comes back as a string."""
    return date.fromisoformat(value) if isinstance(value, str) else value


# ── Marking snapshots stale ─────────────────────────────────────────────────────────────────────


def _mark(connection: Connection, account_id: uuid.UUID, day: date) -> None:
    """Record that this account's snapshots from `day` on are stale (keeping the earliest day)."""
    table = SnapshotDirty.__table__
    if connection.dialect.name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert as upsert

        earliest = func.least
    else:
        from sqlalchemy.dialects.sqlite import insert as upsert

        earliest = func.min
    stmt = upsert(table).values(account_id=account_id, from_date=day)
    stmt = stmt.on_conflict_do_update(
        index_elements=[table.c.account_id],
        set_={"from_date": earliest(table.c.from_date, stmt.excluded.from_date)},
    )
    connection.execute(stmt)


def _old(obj, attribute: str):
    """What an attribute held before this flush, or its current value when it did not change."""
    history = inspect(obj).attrs[attribute].history
    return history.deleted[0] if history.deleted else None


@event.listens_for(Session, "after_flush")
def mark_stale_snapshots(session: Session, _context) -> None:
    """After every flush, note which accounts' completed days an added, changed or removed
    transaction (or a changed opening amount) reaches. Today and later are worked out live, so they
    need no mark. A new account is marked from the beginning, which is what builds its history."""
    today = _today()
    touches: dict[uuid.UUID, date] = {}

    def touch(account_id: uuid.UUID | None, day: date | None) -> None:
        if account_id is None or day is None or day >= today:
            return
        touches[account_id] = min(day, touches.get(account_id, day))

    gone = {obj.id for obj in session.deleted if isinstance(obj, Account)}
    for obj in (*session.new, *session.dirty, *session.deleted):
        if isinstance(obj, Transaction):
            days = [obj.transaction_date, _old(obj, "transaction_date")]
            day = min((d for d in days if d), default=None)
            accounts = {
                obj.account_id,
                obj.to_account_id,
                _old(obj, "account_id"),
                _old(obj, "to_account_id"),
            }
            for account_id in accounts - gone:
                touch(account_id, day)
        elif isinstance(obj, Account) and obj.id not in gone:
            if obj in session.new or inspect(obj).attrs.opening_amount.history.has_changes():
                touches[obj.id] = EPOCH

    if touches:
        connection = session.connection()
        for account_id, day in touches.items():
            _mark(connection, account_id, day)
