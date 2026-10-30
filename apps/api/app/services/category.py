import uuid

from sqlalchemy import delete, func, or_, select, union_all, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.enums import ACCENT_COLORS
from app.models import (
    BudgetLine,
    BudgetLineCategory,
    Category,
    Subscription,
    Transaction,
    TransactionSplit,
    TransactionTemplate,
    Vendor,
)
from app.schemas import CategoryResponse


class CategoryNotFoundError(Exception):
    pass


class CategoryNameTakenError(Exception):
    pass


class CategoryParentError(Exception):
    """A parent that can't be used (not yours, itself, not top-level) or a category that can't have
    one. The message is safe to show."""


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
        # A parent, then its sub-categories, so a tree reads in order (a child with no parent in the
        # results just stands where its parent would).
        parent = aliased(Category)
        stmt = (
            select(Category)
            .outerjoin(parent, parent.id == Category.parent_id)
            .where(*self._conditions(user_id, q))
            .order_by(
                func.coalesce(parent.normalized_name, Category.normalized_name),
                Category.parent_id.is_not(None),
                Category.normalized_name,
            )
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

    async def _next_color(self, user_id: uuid.UUID) -> str:
        """The palette colour the user's categories use least, so neighbours rarely look alike."""
        rows = await self.db.execute(
            select(Category.color, func.count())
            .where(Category.user_id == user_id)
            .group_by(Category.color)
        )
        used = dict(rows.all())
        return min(ACCENT_COLORS, key=lambda c: (used.get(c, 0), ACCENT_COLORS.index(c)))

    async def _check_parent(
        self, user_id: uuid.UUID, category: Category | None, parent_id: uuid.UUID
    ) -> Category:
        """Whether `parent_id` can be the parent of `category` (None: a new one). One level only."""
        parent = await self.get(user_id, parent_id)
        if parent is None:
            raise CategoryParentError("That parent category was not found")
        if category is not None and parent.id == category.id:
            raise CategoryParentError("A category can't be its own parent")
        if parent.parent_id is not None:
            raise CategoryParentError(
                f'"{parent.name}" is a sub-category itself: choose a top-level category'
            )
        if category is not None:
            has_children = await self.db.scalar(
                select(func.count(Category.id)).where(Category.parent_id == category.id)
            )
            if has_children:
                raise CategoryParentError(
                    f'"{category.name}" has sub-categories, so it can\'t go under another category'
                )
        return parent

    async def create(
        self,
        user_id: uuid.UUID,
        name: str,
        *,
        color: str | None = None,
        parent_id: uuid.UUID | None = None,
    ) -> Category:
        if parent_id is not None:
            await self._check_parent(user_id, None, parent_id)
        category = Category(
            user_id=user_id,
            name=" ".join(name.split()),
            normalized_name=normalize_name(name),
            color=color or await self._next_color(user_id),
            parent_id=parent_id,
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

    async def update(self, category: Category, changes: dict) -> Category:
        """Apply the fields sent: a new name, colour and/or parent (null removes the parent)."""
        if "parent_id" in changes:
            parent_id = changes["parent_id"]
            if parent_id is not None:
                await self._check_parent(category.user_id, category, parent_id)
            category.parent_id = parent_id
        if "color" in changes:
            category.color = changes["color"]
        if "name" in changes:
            category.name = " ".join(changes["name"].split())
            category.normalized_name = normalize_name(changes["name"])
        try:
            async with self.db.begin_nested():
                await self.db.flush()
        except IntegrityError as exc:
            raise CategoryNameTakenError from exc
        return category

    async def family(self, user_id: uuid.UUID, category_id: uuid.UUID) -> list[uuid.UUID]:
        """A category and its sub-categories: what a filter, a budget line or a total on a parent
        covers. A sub-category (or one without any) is just itself."""
        stmt = select(Category.id).where(
            Category.user_id == user_id,
            or_(Category.id == category_id, Category.parent_id == category_id),
        )
        ids = list((await self.db.scalars(stmt)).all())
        return ids or [category_id]

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
        children = dict(
            (
                await self.db.execute(
                    select(Category.parent_id, func.count())
                    .where(Category.user_id == user_id, Category.parent_id.is_not(None))
                    .group_by(Category.parent_id)
                )
            ).all()
        )
        parents = dict(
            (
                await self.db.execute(
                    select(Category.id, Category.name).where(
                        Category.id.in_({c.parent_id for c in categories if c.parent_id})
                    )
                )
            ).all()
        )
        out = []
        for c in categories:
            tx, subs, budget_lines = usage.get(c.id, (0, 0, 0))
            out.append(
                CategoryResponse(
                    id=c.id,
                    name=c.name,
                    color=c.color,
                    parent_id=c.parent_id,
                    parent=parents.get(c.parent_id),
                    child_count=children.get(c.id, 0),
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
        # One level: the source's sub-categories move under the target, which therefore has to be a
        # top-level category.
        has_children = await self.db.scalar(
            select(func.count(Category.id)).where(Category.parent_id == source.id)
        )
        if has_children and target.parent_id not in (None, source.id):
            raise CategoryParentError(
                f'"{target.name}" is a sub-category, so "{source.name}"\'s sub-categories can\'t '
                "move under it. Merge into a top-level category, or move them first"
            )
        if target.parent_id == source.id:  # merging a parent into its own child: it takes its place
            target.parent_id = source.parent_id
        await self.db.execute(
            update(Category)
            .where(Category.parent_id == source.id, Category.id != target.id)
            .values(parent_id=target.id)
        )
        for model in (Transaction, TransactionSplit, Subscription, TransactionTemplate):
            await self.db.execute(
                update(model).where(model.category_id == source.id).values(category_id=target.id)
            )
        await self.db.execute(
            update(Vendor)
            .where(Vendor.default_category_id == source.id)
            .values(default_category_id=target.id)
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
