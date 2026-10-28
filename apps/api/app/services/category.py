import uuid

from sqlalchemy import delete, func, select, union_all, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    BudgetLine,
    BudgetLineCategory,
    Category,
    Subscription,
    Transaction,
    TransactionSplit,
)
from app.schemas import CategoryResponse


class CategoryNotFoundError(Exception):
    pass


class CategoryNameTakenError(Exception):
    pass


class CategoryInUseError(Exception):
    """Deleting a category that transactions, items or subscriptions still use."""


def normalize_name(name: str) -> str:
    return " ".join(name.split()).casefold()


class CategoryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _conditions(user_id: uuid.UUID, q: str | None) -> list:
        conditions = [Category.user_id == user_id]
        if q and q.strip():
            conditions.append(Category.name.icontains(q.strip(), autoescape=True))
        return conditions

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        q: str | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[Category]:
        stmt = (
            select(Category).where(*self._conditions(user_id, q)).order_by(Category.normalized_name)
        )
        if limit is not None:
            stmt = stmt.limit(limit).offset(offset)
        return list((await self.db.scalars(stmt)).all())

    async def count_for_user(self, user_id: uuid.UUID, *, q: str | None = None) -> int:
        stmt = select(func.count(Category.id)).where(*self._conditions(user_id, q))
        return (await self.db.scalar(stmt)) or 0

    async def get(self, user_id: uuid.UUID, category_id: uuid.UUID) -> Category | None:
        stmt = select(Category).where(Category.id == category_id, Category.user_id == user_id)
        return await self.db.scalar(stmt)

    async def get_by_name(self, user_id: uuid.UUID, name: str) -> Category | None:
        stmt = select(Category).where(
            Category.user_id == user_id, Category.normalized_name == normalize_name(name)
        )
        return await self.db.scalar(stmt)

    async def create(self, user_id: uuid.UUID, name: str) -> Category:
        category = Category(
            user_id=user_id, name=" ".join(name.split()), normalized_name=normalize_name(name)
        )
        try:
            async with self.db.begin_nested():  # a name clash doesn't poison the outer transaction
                self.db.add(category)
                await self.db.flush()
        except IntegrityError as exc:
            raise CategoryNameTakenError from exc
        return category

    async def get_or_create(self, user_id: uuid.UUID, name: str) -> Category:
        existing = await self.get_by_name(user_id, name)
        if existing:
            return existing
        try:
            return await self.create(user_id, name)
        except CategoryNameTakenError:  # lost a race with a concurrent request
            category = await self.get_by_name(user_id, name)
            assert category is not None
            return category

    async def rename(self, category: Category, name: str) -> Category:
        category.name = " ".join(name.split())
        category.normalized_name = normalize_name(name)
        try:
            async with self.db.begin_nested():
                await self.db.flush()
        except IntegrityError as exc:
            raise CategoryNameTakenError from exc
        return category

    async def usage(self, user_id: uuid.UUID) -> dict[uuid.UUID, tuple[int, int, int]]:
        """(transactions, subscriptions, budget lines) per category id. A transaction counts once
        for each category it touches: its own, or any of its items'. Trashed transactions count:
        they still point at the category, so it can't be deleted while they do."""
        touches = union_all(
            select(Transaction.id.label("tid"), Transaction.category_id.label("cid")).where(
                Transaction.user_id == user_id
            ),
            select(TransactionSplit.transaction_id.label("tid"), TransactionSplit.category_id)
            .join(Transaction, Transaction.id == TransactionSplit.transaction_id)
            .where(Transaction.user_id == user_id),
        ).subquery()
        distinct = select(touches.c.tid, touches.c.cid).distinct().subquery()
        transactions = dict(
            (
                await self.db.execute(select(distinct.c.cid, func.count()).group_by(distinct.c.cid))
            ).all()
        )
        subscriptions = dict(
            (
                await self.db.execute(
                    select(Subscription.category_id, func.count())
                    .where(Subscription.user_id == user_id)
                    .group_by(Subscription.category_id)
                )
            ).all()
        )
        lines = dict(
            (
                await self.db.execute(
                    select(BudgetLineCategory.category_id, func.count())
                    .join(BudgetLine, BudgetLine.id == BudgetLineCategory.line_id)
                    .where(BudgetLine.user_id == user_id)
                    .group_by(BudgetLineCategory.category_id)
                )
            ).all()
        )
        ids = set(transactions) | set(subscriptions) | set(lines)
        return {i: (transactions.get(i, 0), subscriptions.get(i, 0), lines.get(i, 0)) for i in ids}

    async def present(
        self, user_id: uuid.UUID, categories: list[Category]
    ) -> list[CategoryResponse]:
        """The categories with how much each is used."""
        usage = await self.usage(user_id)
        out = []
        for c in categories:
            tx, subs, budget_lines = usage.get(c.id, (0, 0, 0))
            out.append(
                CategoryResponse(
                    id=c.id,
                    name=c.name,
                    created_at=c.created_at,
                    transaction_count=tx,
                    subscription_count=subs,
                    budget_line_count=budget_lines,
                )
            )
        return out

    async def merge(self, source: Category, target: Category) -> Category:
        """Move everything from `source` to `target`, then delete `source`."""
        if source.id == target.id:
            raise CategoryNameTakenError
        for model in (Transaction, TransactionSplit, Subscription):
            await self.db.execute(
                update(model).where(model.category_id == source.id).values(category_id=target.id)
            )
        # A budget line holding both categories would end up with the target twice: drop the
        # source's link there, move the others.
        already = select(BudgetLineCategory.line_id).where(
            BudgetLineCategory.category_id == target.id
        )
        await self.db.execute(
            delete(BudgetLineCategory).where(
                BudgetLineCategory.category_id == source.id,
                BudgetLineCategory.line_id.in_(already),
            )
        )
        await self.db.execute(
            update(BudgetLineCategory)
            .where(BudgetLineCategory.category_id == source.id)
            .values(category_id=target.id)
        )
        await self.db.delete(source)
        await self.db.flush()
        return target

    async def delete(self, user_id: uuid.UUID, category: Category) -> None:
        used = (await self.usage(user_id)).get(category.id, (0, 0, 0))
        if any(used):
            raise CategoryInUseError
        await self.db.delete(category)
        await self.db.flush()
