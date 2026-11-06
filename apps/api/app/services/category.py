import uuid

from sqlalchemy import delete, func, or_, select, union_all, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.enums import ACCENT_COLORS, SALARY_CATEGORY, CategoryKind
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


class CategoryProtectedError(Exception):
    """Something the Salary category can't have done to it. The message is safe to show."""


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
            .where(Category.user_id == user_id, Category.is_salary.is_(False))
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
        if parent.is_salary or (category is not None and category.is_salary):
            raise CategoryParentError("The Salary category can't have a parent or sub-categories")
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
        kind: CategoryKind | None = None,
    ) -> Category:
        if parent_id is not None:
            await self._check_parent(user_id, None, parent_id)
        is_salary = normalize_name(name) == normalize_name(SALARY_CATEGORY)
        category = Category(
            user_id=user_id,
            name=" ".join(name.split()),
            normalized_name=normalize_name(name),
            color=color or ("green" if is_salary else await self._next_color(user_id)),
            parent_id=parent_id,
            kind=kind,
            is_salary=is_salary,
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
            if not existing.is_salary and existing.normalized_name == normalize_name(
                SALARY_CATEGORY
            ):
                existing.is_salary = True  # e.g. restored from a backup made before it was flagged
            return existing
        try:
            return await self.create(user_id, name)
        except CategoryNameTakenError:  # lost a race with a concurrent request
            category = await self.get_by_name(user_id, name)
            assert category is not None
            return category

    async def ensure_salary(self, user_id: uuid.UUID) -> Category:
        """The user's Salary category, made when it is missing (a new account, or data cleared)."""
        found = await self.db.scalar(
            select(Category).where(Category.user_id == user_id, Category.is_salary.is_(True))
        )
        return found or await self.get_or_create(user_id, SALARY_CATEGORY)

    async def update(self, category: Category, changes: dict) -> Category:
        """Apply the fields sent: a new name, colour, kind and/or parent (null removes the parent or
        the kind)."""
        if category.is_salary and (
            changes.get("parent_id") is not None
            or ("name" in changes and normalize_name(changes["name"]) != category.normalized_name)
        ):
            raise CategoryProtectedError(
                "The Salary category can't be renamed or put under another category"
            )
        if "parent_id" in changes:
            parent_id = changes["parent_id"]
            if parent_id is not None:
                await self._check_parent(category.user_id, category, parent_id)
            category.parent_id = parent_id
        if "color" in changes:
            category.color = changes["color"]
        if "kind" in changes:
            category.kind = changes["kind"]
        if "name" in changes:
            category.name = " ".join(changes["name"].split())
            category.normalized_name = normalize_name(changes["name"])
        try:
            async with self.db.begin_nested():
                await self.db.flush()
        except IntegrityError as exc:
            raise CategoryNameTakenError from exc
        return category

    async def set_kind(
        self, user_id: uuid.UUID, ids: list[uuid.UUID], kind: CategoryKind | None
    ) -> int:
        """Set (or clear) the kind of several categories at once. Ids that aren't yours or don't
        exist are left out, and the number set is returned."""
        found = (
            await self.db.scalars(
                select(Category.id).where(Category.user_id == user_id, Category.id.in_(set(ids)))
            )
        ).all()
        if found:
            await self.db.execute(update(Category).where(Category.id.in_(found)).values(kind=kind))
            await self.db.flush()
        return len(found)

    async def family(self, user_id: uuid.UUID, category_id: uuid.UUID) -> list[uuid.UUID]:
        """A category and its sub-categories: what a filter, a budget line or a total on a parent
        covers. A sub-category (or one without any) is just itself."""
        stmt = select(Category.id).where(
            Category.user_id == user_id,
            or_(Category.id == category_id, Category.parent_id == category_id),
        )
        ids = list((await self.db.scalars(stmt)).all())
        return ids or [category_id]

    async def ids_of_kind(self, user_id: uuid.UUID, kind: str) -> list[uuid.UUID]:
        """The categories whose effective kind is `kind` (their own, else their parent's), or, for
        "unsorted", the ones with none: what a needs-and-wants filter covers."""
        rows = (
            await self.db.execute(
                select(Category.id, Category.kind, Category.parent_id).where(
                    Category.user_id == user_id
                )
            )
        ).all()
        own = {cid: k for cid, k, _ in rows}
        out = []
        for cid, k, parent in rows:
            effective = k or own.get(parent)
            if (effective.value if effective else "unsorted") == kind:
                out.append(cid)
        return out

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
        parent_rows = {
            pid: (name, kind)
            for pid, name, kind in (
                await self.db.execute(
                    select(Category.id, Category.name, Category.kind).where(
                        Category.id.in_({c.parent_id for c in categories if c.parent_id})
                    )
                )
            ).all()
        }
        out = []
        for c in categories:
            tx, subs, budget_lines = usage.get(c.id, (0, 0, 0))
            out.append(
                CategoryResponse(
                    id=c.id,
                    name=c.name,
                    color=c.color,
                    kind=c.kind,
                    is_salary=c.is_salary,
                    effective_kind=c.kind or parent_rows.get(c.parent_id, (None, None))[1],
                    parent_id=c.parent_id,
                    parent=parent_rows.get(c.parent_id, (None, None))[0],
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
        if source.is_salary:
            raise CategoryProtectedError(
                "The Salary category can't be merged into another one. Merge other categories "
                "into it instead"
            )
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
        if target.kind is None:  # like a vendor merge: take what the target lacks
            target.kind = source.kind
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
        if category.is_salary:
            raise CategoryProtectedError(
                "The Salary category is a default one and can't be deleted"
            )
        used = (await self.usage(user_id)).get(category.id, (0, 0, 0))
        if any(used):
            raise CategoryInUseError
        await self.db.delete(category)
        await self.db.flush()
