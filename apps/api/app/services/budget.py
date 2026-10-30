import uuid
from datetime import date
from decimal import ROUND_FLOOR, Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.allocation import allocate_base
from app.budget_period import next_period_start, period_bounds, period_start, previous_period_start
from app.models import Budget, BudgetLine, BudgetLineCategory, Category, Transaction, User
from app.schemas import (
    BudgetLineCreate,
    BudgetLineResponse,
    BudgetLineUpdate,
    BudgetResponse,
    BudgetSettingsUpdate,
)
from app.schemas.budget import BudgetCategoryRef, BudgetPeriod, BudgetStatus, BudgetTotals
from app.services.category import CategoryNotFoundError, CategoryService

# How many earlier periods a rollover looks back at, so one old line can't make a view slow.
MAX_ROLLOVER_PERIODS = 24
ZERO = Decimal(0)
CENT = Decimal("0.0001")  # money is stored with 4 decimals; keep every output at that scale


class BudgetLineNotFoundError(Exception):
    pass


class BudgetCategoryTakenError(Exception):
    """A category can only be in one line, or its spending would be counted twice."""

    def __init__(self, category: str, line: str) -> None:
        super().__init__(f'"{category}" is already in the "{line}" line')


def _percent(activity: Decimal, budgeted: Decimal) -> int:
    """Whole percent of the limit spent, rounded down (so 100 means the limit is really reached)."""
    if budgeted <= 0:
        return 100 if activity > 0 else 0
    return int((activity * 100 / budgeted).quantize(Decimal(1), ROUND_FLOOR))


def _status(activity: Decimal, budgeted: Decimal, warn_percent: int) -> BudgetStatus:
    """Compared exactly, not on the rounded percent."""
    if activity > budgeted:
        return "over"
    if budgeted > 0 and activity * 100 >= budgeted * warn_percent:
        return "warning"
    return "ok"


class BudgetService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.categories = CategoryService(db)

    async def _base_currency(self, user_id: uuid.UUID) -> str:
        user = await self.db.get(User, user_id)
        assert user is not None
        return user.base_currency

    async def settings(self, user_id: uuid.UUID) -> Budget:
        budget = await self.db.scalar(select(Budget).where(Budget.user_id == user_id))
        if budget is None:
            budget = Budget(user_id=user_id, period_start_day=1, warn_percent=80)
            self.db.add(budget)
            await self.db.flush()
        return budget

    async def update_settings(self, user_id: uuid.UUID, data: BudgetSettingsUpdate) -> Budget:
        budget = await self.settings(user_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(budget, field, value)
        await self.db.flush()
        return budget

    async def _lines(self, user_id: uuid.UUID) -> list[BudgetLine]:
        stmt = (
            select(BudgetLine)
            .where(BudgetLine.user_id == user_id)
            .order_by(BudgetLine.created_at, BudgetLine.name)
        )
        return list((await self.db.scalars(stmt)).all())

    async def get_line(self, user_id: uuid.UUID, line_id: uuid.UUID) -> BudgetLine | None:
        stmt = select(BudgetLine).where(BudgetLine.id == line_id, BudgetLine.user_id == user_id)
        return await self.db.scalar(stmt)

    async def _activity_by_category(
        self, user_id: uuid.UUID, start: date, end: date
    ) -> dict[uuid.UUID, Decimal]:
        """Spending per category in a period, in base currency: expenses less the refunds that gave
        money back. A split transaction counts under
        each of its items' categories, with its base amount shared out by `allocate_base`."""
        conditions = [
            Transaction.user_id == user_id,
            Transaction.counted(),
            Transaction.spending(),  # refunds take away what they give back
            Transaction.transaction_date >= start,
            Transaction.transaction_date <= end,
        ]
        totals: dict[uuid.UUID, Decimal] = {}
        plain = (
            select(Transaction.category_id, func.sum(Transaction.spending_base()))
            .where(*conditions, ~Transaction.splits.any())
            .group_by(Transaction.category_id)
        )
        for category_id, total in (await self.db.execute(plain)).all():
            totals[category_id] = totals.get(category_id, ZERO) + Decimal(str(total or 0))
        split_stmt = select(Transaction).where(*conditions, Transaction.splits.any())
        for t in (await self.db.scalars(split_stmt)).all():
            shares = allocate_base(t.base_amount, t.amount, [s.amount for s in t.splits])
            for line, share in zip(t.splits, shares, strict=True):
                totals[line.category_id] = (
                    totals.get(line.category_id, ZERO) + share * t.spending_sign
                )
        return totals

    @staticmethod
    def _spent(line: BudgetLine, by_category: dict[uuid.UUID, Decimal]) -> Decimal:
        return sum((by_category.get(link.category_id, ZERO) for link in line.category_links), ZERO)

    async def view(self, user_id: uuid.UUID, on: date | None = None) -> BudgetResponse:
        today = date.today()
        budget = await self.settings(user_id)
        day = budget.period_start_day
        start, end = period_bounds(on or today, day)
        lines = await self._lines(user_id)

        activity = await self._activity_by_category(user_id, start, end)

        # Earlier periods only matter for lines that roll their leftovers over.
        history: dict[date, dict[uuid.UUID, Decimal]] = {}
        oldest = start
        for _ in range(MAX_ROLLOVER_PERIODS):
            oldest = previous_period_start(oldest, day)
        for line in lines:
            if line.rollover:
                first = max(period_start(line.start_date, day), oldest)
                cursor = first
                while cursor < start:
                    if cursor not in history:
                        _, cursor_end = period_bounds(cursor, day)
                        history[cursor] = await self._activity_by_category(
                            user_id, cursor, cursor_end
                        )
                    cursor = next_period_start(cursor, day)

        views: list[BudgetLineResponse] = []
        for line in lines:
            carried = ZERO
            if line.rollover:
                cursor = max(period_start(line.start_date, day), oldest)
                while cursor < start:
                    left = line.amount + carried - self._spent(line, history[cursor])
                    carried = max(ZERO, left)
                    cursor = next_period_start(cursor, day)
            spent = self._spent(line, activity)
            budgeted = line.amount + carried
            views.append(
                BudgetLineResponse(
                    id=line.id,
                    name=line.name,
                    categories=[BudgetCategoryRef.model_validate(c) for c in line.categories],
                    amount=line.amount.quantize(CENT),
                    rollover=line.rollover,
                    warn_percent=line.warn_percent,
                    carried=carried.quantize(CENT),
                    activity=spent.quantize(CENT),
                    available=(budgeted - spent).quantize(CENT),
                    percent=_percent(spent, budgeted),
                    status=_status(spent, budgeted, line.warn_percent or budget.warn_percent),
                )
            )

        budgeted_total = sum((v.amount + v.carried for v in views), ZERO)
        spent_total = sum((v.activity for v in views), ZERO)
        return BudgetResponse(
            currency=await self._base_currency(user_id),
            period_start_day=day,
            warn_percent=budget.warn_percent,
            period=BudgetPeriod(start=start, end=end, is_current=start <= today <= end),
            lines=views,
            totals=BudgetTotals(
                amount=budgeted_total.quantize(CENT),
                activity=spent_total.quantize(CENT),
                available=(budgeted_total - spent_total).quantize(CENT),
                percent=_percent(spent_total, budgeted_total),
                status=_status(spent_total, budgeted_total, budget.warn_percent),
            ),
            attention=sum(1 for v in views if v.status != "ok"),
        )

    async def _resolve_categories(
        self, user_id: uuid.UUID, category_ids: list[uuid.UUID], *, line_id: uuid.UUID | None
    ) -> list[Category]:
        resolved: list[Category] = []
        for category_id in dict.fromkeys(category_ids):
            category = await self.categories.get(user_id, category_id)
            if category is None:
                raise CategoryNotFoundError
            resolved.append(category)
        stmt = (
            select(BudgetLine.name, BudgetLineCategory.category_id)
            .join(BudgetLineCategory, BudgetLineCategory.line_id == BudgetLine.id)
            .where(
                BudgetLine.user_id == user_id,
                BudgetLineCategory.category_id.in_([c.id for c in resolved]),
            )
        )
        if line_id is not None:
            stmt = stmt.where(BudgetLine.id != line_id)
        taken = {cid: name for name, cid in (await self.db.execute(stmt)).all()}
        for category in resolved:
            if category.id in taken:
                raise BudgetCategoryTakenError(category.name, taken[category.id])
        return resolved

    async def create_line(self, user_id: uuid.UUID, data: BudgetLineCreate) -> BudgetLine:
        budget = await self.settings(user_id)
        categories = await self._resolve_categories(user_id, data.category_ids, line_id=None)
        line = BudgetLine(
            user_id=user_id,
            name=data.name,
            amount=data.amount,
            warn_percent=data.warn_percent,
            rollover=data.rollover,
            start_date=period_start(date.today(), budget.period_start_day),
            category_links=[BudgetLineCategory(category=c) for c in categories],
        )
        self.db.add(line)
        await self.db.flush()
        return line

    async def update_line(
        self, user_id: uuid.UUID, line: BudgetLine, data: BudgetLineUpdate
    ) -> BudgetLine:
        changes = data.model_dump(exclude_unset=True)
        if (ids := changes.pop("category_ids", None)) is not None:
            categories = await self._resolve_categories(user_id, ids, line_id=line.id)
            # Keep the links that stay (replacing them would insert a duplicate before the old
            # row is deleted); add the new ones and drop the rest.
            wanted = {c.id: c for c in categories}
            line.category_links = [
                link for link in line.category_links if link.category_id in wanted
            ] + [
                BudgetLineCategory(category=c)
                for c in categories
                if c.id not in {link.category_id for link in line.category_links}
            ]
        for field, value in changes.items():
            setattr(line, field, value)
        await self.db.flush()
        return line

    async def delete_line(self, line: BudgetLine) -> None:
        await self.db.delete(line)
        await self.db.flush()
