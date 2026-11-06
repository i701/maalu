import uuid
from datetime import UTC, date, datetime
from decimal import ROUND_FLOOR, Decimal

from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.allocation import allocate_base
from app.budget_period import next_period_start, period_bounds, period_start, previous_period_start
from app.enums import CategoryKind
from app.models import (
    Budget,
    BudgetLine,
    BudgetLineCategory,
    BudgetMove,
    Category,
    Transaction,
    User,
)
from app.schemas import (
    BudgetLineCreate,
    BudgetLineResponse,
    BudgetLineUpdate,
    BudgetMoveCreate,
    BudgetMoveResponse,
    BudgetResponse,
    BudgetSettingsUpdate,
)
from app.schemas.budget import (
    MAX_RANGE_DAYS,
    BudgetCategoryRef,
    BudgetFixedLine,
    BudgetMoveLogEntry,
    BudgetPeriod,
    BudgetStatus,
    BudgetTotals,
)
from app.services.category import CategoryNotFoundError, CategoryService

# How many earlier periods a rollover looks back at, so one old line can't make a view slow.
MAX_ROLLOVER_PERIODS = 24
ZERO = Decimal(0)
CENT = Decimal("0.0001")  # money is stored with 4 decimals; keep every output at that scale


class BudgetLineNotFoundError(Exception):
    pass


class BudgetLineRuleError(Exception):
    """A limit's dates or settings that can't go together. The message is safe to show."""


class BudgetCategoryTakenError(Exception):
    """A category can only be in one line, or its spending would be counted twice. A parent covers
    its sub-categories, so those count too: "Groceries" is taken when "Food" is in another line."""

    def __init__(self, category: str, line: str, via: str | None = None) -> None:
        if via is None:
            super().__init__(f'"{category}" is already in the "{line}" line')
        else:
            super().__init__(f'"{category}" is already covered by "{via}" in the "{line}" line')


def _check_range(start: date, end: date) -> None:
    if end < start:
        raise BudgetLineRuleError("The end date can't be before the start date")
    if (end - start).days >= MAX_RANGE_DAYS:
        raise BudgetLineRuleError("A limit can run for at most ten years")


# What a limit covers: a limit for set dates ("fixed") or a per-period one ("monthly"), and the
# days it runs (None = for ever).
Span = tuple[str, tuple[date, date] | None]


def _span_of(line: BudgetLine) -> Span:
    if line.ends_on is not None:
        return "fixed", (line.start_date, line.ends_on)
    if line.active_until is not None:
        return "monthly", (line.start_date, line.active_until)
    return "monthly", None


def _overlap(a: Span, b: Span) -> bool:
    """Whether two limits would count the same spend twice. A limit for set dates is a separate
    budget, kept out of the per-period totals, so it only meets another one of its own kind; a
    per-period limit meets another per-period limit in any period both run in."""
    if a[0] != b[0]:
        return False
    if a[1] is None or b[1] is None:
        return True
    return a[1][0] <= b[1][1] and b[1][0] <= a[1][1]


def _runs_in(line: BudgetLine, start: date, end: date) -> bool:
    """Whether a per-period limit is there in the period `start`..`end`."""
    return line.active_until is None or (line.start_date <= end and line.active_until >= start)


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
            try:
                async with self.db.begin_nested():  # a lost race must not poison the request
                    self.db.add(budget)
            except IntegrityError:
                # a parallel request (the page asks for the budget twice) made it first: use theirs
                budget = await self.db.scalar(select(Budget).where(Budget.user_id == user_id))
                assert budget is not None
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
            Transaction.reported(),
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
    def _spent(
        line: BudgetLine,
        by_category: dict[uuid.UUID, Decimal],
        children: dict[uuid.UUID, list[uuid.UUID]],
    ) -> Decimal:
        """What the line's categories spent, a parent counting its sub-categories too. Each category
        counts once, even when the line holds both a parent and one of its children."""
        covered = set()
        for link in line.category_links:
            covered.add(link.category_id)
            covered.update(children.get(link.category_id, ()))
        return sum((by_category.get(c, ZERO) for c in covered), ZERO)

    async def _children(self, user_id: uuid.UUID) -> dict[uuid.UUID, list[uuid.UUID]]:
        """Each parent category's sub-categories."""
        rows = await self.db.execute(
            select(Category.parent_id, Category.id).where(
                Category.user_id == user_id, Category.parent_id.is_not(None)
            )
        )
        out: dict[uuid.UUID, list[uuid.UUID]] = {}
        for parent_id, child_id in rows.all():
            out.setdefault(parent_id, []).append(child_id)
        return out

    async def _kinds(self, user_id: uuid.UUID) -> dict[uuid.UUID, CategoryKind | None]:
        """Each category's kind: its own, else its parent's."""
        rows = (
            await self.db.execute(
                select(Category.id, Category.kind, Category.parent_id).where(
                    Category.user_id == user_id
                )
            )
        ).all()
        own = {cid: kind for cid, kind, _ in rows}
        return {cid: kind or own.get(parent) for cid, kind, parent in rows}

    @staticmethod
    def _line_kind(
        line: BudgetLine, kinds: dict[uuid.UUID, CategoryKind | None]
    ) -> CategoryKind | None:
        """A limit is a need or a want when all its categories are the same kind."""
        found = {kinds.get(link.category_id) for link in line.category_links}
        return next(iter(found)) if len(found) == 1 else None

    async def _moves(self, user_id: uuid.UUID, first: date, last: date) -> list[BudgetMove]:
        """Moves for periods starting between `first` and `last`, newest first."""
        stmt = (
            select(BudgetMove)
            .where(
                BudgetMove.user_id == user_id,
                BudgetMove.undone_at.is_(None),
                BudgetMove.period_start >= first,
                BudgetMove.period_start <= last,
            )
            .order_by(BudgetMove.created_at.desc())
        )
        return list((await self.db.scalars(stmt)).unique().all())

    async def view(self, user_id: uuid.UUID, on: date | None = None) -> BudgetResponse:
        today = date.today()
        budget = await self.settings(user_id)
        day = budget.period_start_day
        start, end = period_bounds(on or today, day)
        every_line = await self._lines(user_id)
        lines = [line for line in every_line if line.ends_on is None and _runs_in(line, start, end)]
        fixed = [line for line in every_line if line.ends_on is not None]

        activity = await self._activity_by_category(user_id, start, end)
        children = await self._children(user_id)
        kinds = await self._kinds(user_id)

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

        # Money moved between limits (or added) changes a limit's amount for its period only. A
        # move is matched to a period by its date, so changing the start day later still finds it.
        moves = await self._moves(user_id, oldest, end)
        moved: dict[tuple[date, uuid.UUID], tuple[Decimal, Decimal]] = {}  # (in, out)
        for move in moves:
            at = period_start(move.period_start, day)
            got, gave = moved.get((at, move.to_line_id), (ZERO, ZERO))
            moved[(at, move.to_line_id)] = (got + move.amount, gave)
            if move.from_line_id is not None:
                got, gave = moved.get((at, move.from_line_id), (ZERO, ZERO))
                moved[(at, move.from_line_id)] = (got, gave + move.amount)

        def net(at: date, line_id: uuid.UUID) -> Decimal:
            got, gave = moved.get((at, line_id), (ZERO, ZERO))
            return got - gave

        views: list[BudgetLineResponse] = []
        for line in lines:
            carried = ZERO
            if line.rollover:
                cursor = max(period_start(line.start_date, day), oldest)
                while cursor < start:
                    spent_then = self._spent(line, history[cursor], children)
                    left = line.amount + net(cursor, line.id) + carried - spent_then
                    carried = max(ZERO, left)
                    cursor = next_period_start(cursor, day)
            spent = self._spent(line, activity, children)
            moved_in, moved_out = moved.get((start, line.id), (ZERO, ZERO))
            budgeted = line.amount + carried + moved_in - moved_out
            views.append(
                BudgetLineResponse(
                    id=line.id,
                    name=line.name,
                    categories=[BudgetCategoryRef.model_validate(c) for c in line.categories],
                    amount=line.amount.quantize(CENT),
                    rollover=line.rollover,
                    warn_percent=line.warn_percent,
                    carried=carried.quantize(CENT),
                    moved_in=moved_in.quantize(CENT),
                    moved_out=moved_out.quantize(CENT),
                    activity=spent.quantize(CENT),
                    available=(budgeted - spent).quantize(CENT),
                    percent=_percent(spent, budgeted),
                    status=_status(spent, budgeted, line.warn_percent or budget.warn_percent),
                    kind=self._line_kind(line, kinds),
                    runs_from=line.start_date if line.active_until else None,
                    runs_until=line.active_until,
                )
            )

        fixed_views = [
            await self._fixed_view(line, today, children, budget.warn_percent, kinds)
            for line in fixed
        ]
        fixed_views.sort(key=lambda v: (v.state == "ended", v.start_date, v.name))

        budgeted_total = sum((v.amount + v.carried + v.moved_in - v.moved_out for v in views), ZERO)
        spent_total = sum((v.activity for v in views), ZERO)
        return BudgetResponse(
            currency=await self._base_currency(user_id),
            period_start_day=day,
            warn_percent=budget.warn_percent,
            period=BudgetPeriod(start=start, end=end, is_current=start <= today <= end),
            lines=views,
            fixed_lines=fixed_views,
            moves=[
                BudgetMoveResponse.model_validate(m)
                for m in moves
                if start <= m.period_start <= end
            ],
            totals=BudgetTotals(
                amount=budgeted_total.quantize(CENT),
                activity=spent_total.quantize(CENT),
                available=(budgeted_total - spent_total).quantize(CENT),
                percent=_percent(spent_total, budgeted_total),
                status=_status(spent_total, budgeted_total, budget.warn_percent),
            ),
            attention=sum(1 for v in views if v.status != "ok")
            + sum(1 for v in fixed_views if v.state == "active" and v.status != "ok"),
        )

    async def _fixed_view(
        self,
        line: BudgetLine,
        today: date,
        children: dict[uuid.UUID, list[uuid.UUID]],
        default_warn: int,
        kinds: dict[uuid.UUID, CategoryKind | None],
    ) -> BudgetFixedLine:
        """A limit for set dates: everything spent in its categories over the whole range."""
        assert line.ends_on is not None
        activity = await self._activity_by_category(line.user_id, line.start_date, line.ends_on)
        spent = self._spent(line, activity, children)
        state = (
            "upcoming" if today < line.start_date else "ended" if today > line.ends_on else "active"
        )
        return BudgetFixedLine(
            id=line.id,
            name=line.name,
            categories=[BudgetCategoryRef.model_validate(c) for c in line.categories],
            amount=line.amount.quantize(CENT),
            rollover=False,
            warn_percent=line.warn_percent,
            carried=ZERO.quantize(CENT),
            moved_in=ZERO.quantize(CENT),
            moved_out=ZERO.quantize(CENT),
            activity=spent.quantize(CENT),
            available=(line.amount - spent).quantize(CENT),
            percent=_percent(spent, line.amount),
            status=_status(spent, line.amount, line.warn_percent or default_warn),
            kind=self._line_kind(line, kinds),
            start_date=line.start_date,
            end_date=line.ends_on,
            state=state,
            days_left=None if state == "ended" else (line.ends_on - today).days + 1,
        )

    async def _resolve_categories(
        self,
        user_id: uuid.UUID,
        category_ids: list[uuid.UUID],
        *,
        line_id: uuid.UUID | None,
        span: Span = ("monthly", None),
    ) -> list[Category]:
        resolved: list[Category] = []
        for category_id in dict.fromkeys(category_ids):
            category = await self.categories.get(user_id, category_id)
            if category is None:
                raise CategoryNotFoundError
            resolved.append(category)
        # A category clashes with another line that holds it, its parent or one of its children.
        children = await self._children(user_id)
        related = {c.id: {c.id, c.parent_id, *children.get(c.id, ())} - {None} for c in resolved}
        every = set().union(*related.values()) if related else set()
        stmt = (
            select(
                BudgetLine.name,
                BudgetLineCategory.category_id,
                BudgetLine.start_date,
                BudgetLine.ends_on,
                BudgetLine.active_until,
            )
            .join(BudgetLineCategory, BudgetLineCategory.line_id == BudgetLine.id)
            .where(BudgetLine.user_id == user_id, BudgetLineCategory.category_id.in_(every))
        )
        if line_id is not None:
            stmt = stmt.where(BudgetLine.id != line_id)
        taken = {
            cid: name
            for name, cid, first, last, until in (await self.db.execute(stmt)).all()
            if _overlap(
                span,
                ("fixed", (first, last))
                if last is not None
                else ("monthly", None if until is None else (first, until)),
            )
        }
        if taken:
            names = dict(
                (
                    await self.db.execute(
                        select(Category.id, Category.name).where(Category.id.in_(taken))
                    )
                ).all()
            )
            for category in resolved:
                for other in sorted(related[category.id], key=lambda i: i != category.id):
                    if other in taken:
                        via = None if other == category.id else names.get(other)
                        raise BudgetCategoryTakenError(category.name, taken[other], via)
        return resolved

    async def create_line(self, user_id: uuid.UUID, data: BudgetLineCreate) -> BudgetLine:
        budget = await self.settings(user_id)
        day = budget.period_start_day
        dated = data.start_date is not None and data.end_date is not None
        first, last, until = period_start(date.today(), day), None, None
        if dated and data.repeat:  # every period that touches the dates: whole periods
            first = period_start(data.start_date, day)
            until = period_bounds(data.end_date, day)[1]
        elif dated:
            first, last = data.start_date, data.end_date
        span: Span = (
            ("fixed", (first, last))
            if last is not None
            else ("monthly", (first, until) if until else None)
        )
        categories = await self._resolve_categories(
            user_id, data.category_ids, line_id=None, span=span
        )
        line = BudgetLine(
            user_id=user_id,
            name=data.name,
            amount=data.amount,
            warn_percent=data.warn_percent,
            rollover=data.rollover,
            start_date=first,
            ends_on=last,
            active_until=until,
            category_links=[BudgetLineCategory(category=c) for c in categories],
        )
        self.db.add(line)
        await self.db.flush()
        return line

    async def update_line(
        self, user_id: uuid.UUID, line: BudgetLine, data: BudgetLineUpdate
    ) -> BudgetLine:
        changes = data.model_dump(exclude_unset=True)
        ids = changes.pop("category_ids", None)
        dates_changed = any(k in changes for k in ("start_date", "end_date", "repeat"))
        if dates_changed:
            await self._change_dates(user_id, line, changes)
        if ids is not None or dates_changed:
            wanted_ids = ids if ids is not None else [c.id for c in line.categories]
            categories = await self._resolve_categories(
                user_id, wanted_ids, line_id=line.id, span=_span_of(line)
            )
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
        if changes.get("rollover") and line.ends_on is not None:
            raise BudgetLineRuleError("A limit for set dates has nothing to carry over")
        for field, value in changes.items():
            setattr(line, field, value)
        await self.db.flush()
        return line

    async def _change_dates(self, user_id: uuid.UUID, line: BudgetLine, changes: dict) -> None:
        """Apply `start_date` / `end_date` / `repeat` from an update (and remove them from
        `changes`). Both dates make it a limit for set dates, or, with `repeat`, a per-period limit
        that only runs between them; an explicit null end date makes it run for every period."""
        start = changes.pop("start_date") if "start_date" in changes else None
        repeat = changes.pop("repeat") if "repeat" in changes else None
        was_fixed = line.ends_on is not None
        was_windowed = line.active_until is not None
        sent_start = start is not None
        if "end_date" in changes:
            end = changes.pop("end_date")
        else:
            end = line.ends_on or line.active_until
        budget = await self.settings(user_id)
        day = budget.period_start_day
        if end is None:  # per period, for ever
            if sent_start:
                raise BudgetLineRuleError("A limit for every period has no start date")
            if repeat:
                raise BudgetLineRuleError("Give the dates it should run between")
            if was_fixed or was_windowed:
                line.start_date = period_start(date.today(), day)
            line.ends_on = None
            line.active_until = None
            return
        if not (was_fixed or was_windowed) and not sent_start:
            raise BudgetLineRuleError("Give both a start date and an end date")
        first = start if sent_start else line.start_date
        _check_range(first, end)
        monthly = repeat if repeat is not None else was_windowed
        if monthly:
            line.start_date = period_start(first, day)
            line.active_until = period_bounds(end, day)[1]
            line.ends_on = None
            return
        if changes.get("rollover"):
            raise BudgetLineRuleError("A limit for set dates has nothing to carry over")
        line.start_date, line.ends_on, line.rollover = first, end, False
        line.active_until = None
        if not was_fixed:  # only monthly limits take moves, so its moves go
            await self.db.execute(
                delete(BudgetMove).where(
                    or_(BudgetMove.from_line_id == line.id, BudgetMove.to_line_id == line.id)
                )
            )

    async def delete_line(self, line: BudgetLine) -> None:
        await self.db.delete(line)
        await self.db.flush()

    async def _monthly_line(self, user_id: uuid.UUID, line_id: uuid.UUID) -> BudgetLine:
        line = await self.get_line(user_id, line_id)
        if line is None:
            raise BudgetLineNotFoundError
        if line.ends_on is not None:
            raise BudgetLineRuleError(
                f'"{line.name}" is a limit for set dates: money only moves between monthly limits'
            )
        return line

    async def create_move(self, user_id: uuid.UUID, data: BudgetMoveCreate) -> date:
        """Move money from one monthly limit to another for one period, or add to one (no
        `from_line_id`). The source can give at most what it has left that period, so money already
        spent can't be moved. Returns a day in the period, to show it."""
        budget = await self.settings(user_id)
        on = data.on or date.today()
        to_line = await self._monthly_line(user_id, data.to_line_id)
        from_line = (
            await self._monthly_line(user_id, data.from_line_id) if data.from_line_id else None
        )
        if from_line is not None or to_line.active_until is not None:
            view = await self.view(user_id, on)
            shown = {v.id: v for v in view.lines}
            for line in (from_line, to_line):
                if line is not None and line.id not in shown:
                    raise BudgetLineRuleError(f'"{line.name}" does not run in that period')
        if from_line is not None:
            left = shown[from_line.id].available
            if left <= 0:
                raise BudgetLineRuleError(f'"{from_line.name}" has nothing left this period')
            if data.amount > left:
                raise BudgetLineRuleError(
                    f'"{from_line.name}" has only {view.currency} {left:,.2f} left this period'
                )
        self.db.add(
            BudgetMove(
                user_id=user_id,
                period_start=period_start(on, budget.period_start_day),
                from_line_id=from_line.id if from_line else None,
                to_line_id=to_line.id,
                amount=data.amount,
                note=data.note or None,
            )
        )
        await self.db.flush()
        return on

    async def undo_move(self, user_id: uuid.UUID, move_id: uuid.UUID) -> date | None:
        """Undo a move: the budget stops counting it, and the history keeps it, marked undone.
        Returns a day in its period, or None when it isn't yours or is already undone."""
        move = await self.db.scalar(
            select(BudgetMove).where(
                BudgetMove.id == move_id,
                BudgetMove.user_id == user_id,
                BudgetMove.undone_at.is_(None),
            )
        )
        if move is None:
            return None
        move.undone_at = datetime.now(UTC)
        await self.db.flush()
        return move.period_start

    async def history(self, user_id: uuid.UUID, line: BudgetLine) -> list[BudgetMoveLogEntry]:
        """Every move into or out of a limit, in every period, undone ones too; newest first."""
        day = (await self.settings(user_id)).period_start_day
        stmt = (
            select(BudgetMove)
            .where(
                BudgetMove.user_id == user_id,
                or_(BudgetMove.from_line_id == line.id, BudgetMove.to_line_id == line.id),
            )
            .order_by(BudgetMove.created_at.desc())
        )
        entries = []
        for move in (await self.db.scalars(stmt)).unique().all():
            start, end = period_bounds(move.period_start, day)
            entries.append(
                BudgetMoveLogEntry(
                    **BudgetMoveResponse.model_validate(move).model_dump(),
                    period_start=start,
                    period_end=end,
                    undone_at=move.undone_at,
                )
            )
        return entries
