"""Transaction groups: a few related transactions bundled under a name, with their combined net.

Nothing about the transactions changes by being grouped, and every other total ignores groups. A
transaction is in at most one group (`Transaction.group_id`); a group holds two to fifty; a group
that is left with fewer than two is deleted (that is what `dissolve_undersized` is for)."""

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import case, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import TransactionType
from app.models import Transaction, TransactionGroup, User
from app.schemas import GroupResponse
from app.schemas.group import MAX_GROUP, MIN_GROUP

ZERO = Decimal(0)


class GroupNotFoundError(Exception):
    pass


class GroupRuleError(Exception):
    """The request breaks a rule of groups. The message is safe to show."""


class GroupService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Reading ─────────────────────────────────────────────────────────────────────────────

    async def get(self, user_id: uuid.UUID, group_id: uuid.UUID) -> TransactionGroup | None:
        return await self.db.scalar(
            select(TransactionGroup).where(
                TransactionGroup.id == group_id, TransactionGroup.user_id == user_id
            )
        )

    @staticmethod
    def _conditions(user_id: uuid.UUID, q: str | None) -> list:
        conditions = [TransactionGroup.user_id == user_id]
        if q and q.strip():
            term = q.strip()
            conditions.append(
                TransactionGroup.name.icontains(term, autoescape=True)
                | TransactionGroup.note.icontains(term, autoescape=True)
            )
        return conditions

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        q: str | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[TransactionGroup]:
        # newest activity first: groups whose latest transaction is most recent
        latest = (
            select(Transaction.group_id, func.max(Transaction.transaction_date).label("latest"))
            .where(Transaction.group_id.is_not(None), Transaction.live())
            .group_by(Transaction.group_id)
            .subquery()
        )
        stmt = (
            select(TransactionGroup)
            .outerjoin(latest, latest.c.group_id == TransactionGroup.id)
            .where(*self._conditions(user_id, q))
            .order_by(latest.c.latest.desc().nulls_last(), TransactionGroup.name)
        )
        if limit is not None:
            stmt = stmt.limit(limit).offset(offset)
        return list((await self.db.scalars(stmt)).all())

    async def count_for_user(self, user_id: uuid.UUID, *, q: str | None = None) -> int:
        stmt = select(func.count(TransactionGroup.id)).where(*self._conditions(user_id, q))
        return (await self.db.scalar(stmt)) or 0

    async def members(self, group: TransactionGroup) -> list[Transaction]:
        """Its transactions that are not in the trash, newest first."""
        stmt = (
            select(Transaction)
            .where(Transaction.group_id == group.id, Transaction.live())
            .order_by(
                Transaction.transaction_date.desc(),
                Transaction.transaction_time.desc().nulls_last(),
                Transaction.created_at.desc(),
            )
        )
        return list((await self.db.scalars(stmt)).all())

    async def present(self, groups: list[TransactionGroup]) -> list[GroupResponse]:
        """Attach each group's summary. Money in and out count posted transactions only (a planned
        or trashed one counts toward nothing), in the base currency, as everything else does."""
        ids = [g.id for g in groups]
        sums: dict[uuid.UUID, tuple[int, date | None, date | None, Decimal, Decimal]] = {}
        if ids:
            counted = Transaction.counted()
            rows = await self.db.execute(
                select(
                    Transaction.group_id,
                    func.count(Transaction.id).filter(Transaction.live()),
                    func.min(Transaction.transaction_date).filter(Transaction.live()),
                    func.max(Transaction.transaction_date).filter(Transaction.live()),
                    func.coalesce(
                        func.sum(
                            case(
                                (
                                    (Transaction.type == TransactionType.INCOME) & counted,
                                    Transaction.base_amount,
                                ),
                                else_=0,
                            )
                        ),
                        0,
                    ),
                    func.coalesce(
                        func.sum(
                            case(
                                (
                                    (Transaction.type == TransactionType.EXPENSE) & counted,
                                    Transaction.base_amount,
                                ),
                                else_=0,
                            )
                        ),
                        0,
                    ),
                )
                .where(Transaction.group_id.in_(ids))
                .group_by(Transaction.group_id)
            )
            for group_id, count, first, last, money_in, money_out in rows.all():
                sums[group_id] = (
                    count,
                    _as_date(first),
                    _as_date(last),
                    Decimal(str(money_in)),
                    Decimal(str(money_out)),
                )
        base = ""
        if groups:
            user = await self.db.get(User, groups[0].user_id)
            base = user.base_currency if user else ""
        out = []
        for g in groups:
            count, first, last, money_in, money_out = sums.get(g.id, (0, None, None, ZERO, ZERO))
            out.append(
                GroupResponse(
                    id=g.id,
                    name=g.name,
                    note=g.note,
                    created_at=g.created_at,
                    transaction_count=count,
                    date_from=first,
                    date_to=last,
                    money_in=money_in,
                    money_out=money_out,
                    net=money_in - money_out,
                    currency=base,
                )
            )
        return out

    # ── Changing ────────────────────────────────────────────────────────────────────────────

    async def _eligible(
        self, user_id: uuid.UUID, ids: list[uuid.UUID], *, group_id: uuid.UUID | None = None
    ) -> list[Transaction]:
        """The transactions to put in a group, or a `GroupRuleError` saying what is wrong: each must
        be yours, not in the trash, not a transfer and not in another group."""
        rows = list(
            (
                await self.db.scalars(
                    select(Transaction).where(
                        Transaction.id.in_(ids),
                        Transaction.user_id == user_id,
                        Transaction.live(),
                    )
                )
            ).all()
        )
        if len(rows) != len(ids):
            raise GroupRuleError("Some of those transactions were not found")
        if any(t.type is TransactionType.TRANSFER for t in rows):
            raise GroupRuleError("A transfer can't be put in a group")
        if any(t.adjustment for t in rows):
            raise GroupRuleError("A balance adjustment can't be put in a group")
        if any(t.group_id is not None and t.group_id != group_id for t in rows):
            raise GroupRuleError("Some of those transactions are already in a group")
        return rows

    async def create(
        self, user_id: uuid.UUID, name: str, note: str | None, ids: list[uuid.UUID]
    ) -> TransactionGroup:
        rows = await self._eligible(user_id, ids)
        group = TransactionGroup(user_id=user_id, name=name, note=note)
        self.db.add(group)
        await self.db.flush()
        for t in rows:
            t.group_id = group.id
            t.group = group
        await self.db.flush()
        return group

    async def add(self, group: TransactionGroup, ids: list[uuid.UUID]) -> TransactionGroup:
        rows = await self._eligible(group.user_id, ids, group_id=group.id)
        already = {t.id for t in rows if t.group_id == group.id}
        have = await self._row_count(group.id)
        if have + len(rows) - len(already) > MAX_GROUP:
            raise GroupRuleError(f"A group can hold at most {MAX_GROUP} transactions")
        for t in rows:
            t.group_id = group.id
            t.group = group
        await self.db.flush()
        return group

    async def _row_count(self, group_id: uuid.UUID) -> int:
        stmt = select(func.count(Transaction.id)).where(Transaction.group_id == group_id)
        return (await self.db.scalar(stmt)) or 0

    async def remove(self, group: TransactionGroup, ids: list[uuid.UUID]) -> tuple[int, bool]:
        """Take transactions out of the group. Returns how many were, and whether the group was
        deleted because fewer than two were left."""
        rows = list(
            (
                await self.db.scalars(
                    select(Transaction).where(
                        Transaction.id.in_(ids), Transaction.group_id == group.id
                    )
                )
            ).all()
        )
        for t in rows:
            t.group_id = None
            t.group = None
        await self.db.flush()
        dissolved = await self._dissolve_if_small(group)
        return len(rows), dissolved

    async def update(
        self, group: TransactionGroup, changes: dict[str, str | None]
    ) -> TransactionGroup:
        for field, value in changes.items():
            setattr(group, field, value)
        await self.db.flush()
        return group

    async def delete(self, group: TransactionGroup) -> None:
        """Delete the group. Its transactions are kept and just stop being grouped."""
        await self._unlink_all(group.id)
        await self.db.delete(group)
        await self.db.flush()

    async def _unlink_all(self, group_id: uuid.UUID) -> None:
        await self.db.execute(
            update(Transaction)
            .where(Transaction.group_id == group_id)
            .values(group_id=None)
            .execution_options(synchronize_session="fetch")
        )

    async def _dissolve_if_small(self, group: TransactionGroup) -> bool:
        if await self._row_count(group.id) >= MIN_GROUP:
            return False
        await self.delete(group)
        return True

    async def dissolve_undersized(
        self, user_id: uuid.UUID, group_ids: set[uuid.UUID | None]
    ) -> None:
        """After transactions left their groups for good (deleted, or turned into transfers), delete
        any of those groups now holding fewer than two."""
        for group_id in group_ids - {None}:
            group = await self.get(user_id, group_id)  # type: ignore[arg-type]
            if group is not None:
                await self._dissolve_if_small(group)


def _as_date(value) -> date | None:
    """SQLite hands min and max over a date column back as strings (the tests use it)."""
    if value is None or isinstance(value, date):
        return value
    return date.fromisoformat(value)
