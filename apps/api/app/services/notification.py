import time
import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import SplitTaskStatus, SubscriptionStatus
from app.models import Notification, SalarySplitTask, Subscription, Transaction, User
from app.services.account import AccountService
from app.services.available import AvailableService
from app.services.budget import BudgetService
from app.services.goal import GoalService

DUE_SOON_DAYS = 3  # a planned payment is "due soon" this many days ahead, and on the day
MAX_REMIND_DAYS = 60  # the longest lead a subscription can ask for (see RemindDays)
CARD_LIMIT_PERCENT = 90  # a card this full (of its limit) is told about, once a month
KEEP_DAYS = 90  # notifications older than this are swept
# Looking for new notifications costs a few queries, and every page asks for the unread count, so
# a user's data is looked at once in a while, not on every request. The daily job ignores this.
SYNC_EVERY_SECONDS = 300
_last_sync: dict[uuid.UUID, float] = {}
_changed_at: dict[uuid.UUID, float] = {}


def data_changed(user_id: uuid.UUID) -> None:
    """The user's data just changed: look for news at the next read. Also tells a look already under
    way (started before this change) not to note itself as done, since it may not have seen it."""
    _last_sync.pop(user_id, None)
    _changed_at[user_id] = time.monotonic()


class NotificationNotFoundError(Exception):
    pass


def _money(amount, currency: str) -> str:
    return f"{currency} {amount:,.2f}"


def _when(days: int) -> str:
    if days == 0:
        return "is due today"
    if days == 1:
        return "is due tomorrow"
    if days > 1:
        return f"is due in {days} days"
    late = -days
    return f"was due {late} {'day' if late == 1 else 'days'} ago"


class NotificationService:
    """Finds what deserves attention in your data and keeps it as notifications you can read and
    dismiss. Three kinds, each with its own switch on the user: planned payments that are due soon
    or overdue, budget limits that are close or over (for the current period), and savings goals
    that are reached. Each event is made once (`dedupe_key`), however often this looks."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # --- finding them ----------------------------------------------------------------------

    async def _add(self, user_id: uuid.UUID, known: set[str], **fields) -> int:
        """Make one if its event has not been seen. A parallel look that got there first just
        loses the race: the unique key refuses the second."""
        key = fields["dedupe_key"]
        if key in known:
            return 0
        known.add(key)
        try:
            async with self.db.begin_nested():
                self.db.add(Notification(user_id=user_id, **fields))
        except IntegrityError:
            return 0
        return 1

    async def _payments(self, user: User, known: set[str], today: date) -> int:
        stmt = select(Transaction).where(
            Transaction.user_id == user.id,
            Transaction.live(),
            Transaction.planned.is_(True),
            Transaction.transaction_date <= today + timedelta(days=MAX_REMIND_DAYS),
        )
        made = 0
        for t in (await self.db.scalars(stmt)).all():
            days = (t.transaction_date - today).days
            overdue = days < 0
            # a subscription says how far ahead it wants to hear (or not at all); anything else
            # planned is "due soon" a few days before. Being overdue is always told.
            lead = t.subscription.remind_days_before if t.subscription else DUE_SOON_DAYS
            if not overdue and (lead is None or days > lead):
                continue
            name = (
                (t.subscription.name if t.subscription else None)
                or (t.vendor.name if t.vendor else None)
                or t.description
                or (t.category_ref.name if t.category_ref else "A payment")
            )
            made += await self._add(
                user.id,
                known,
                kind="payment_overdue" if overdue else "payment_due",
                title=f"{name} {_when(days)}",
                body=_money(t.amount, t.currency),
                link="/transactions",
                dedupe_key=f"{'overdue' if overdue else 'due'}:{t.id}",
            )
        return made

    async def _budget(self, user: User, known: set[str]) -> int:
        view = await BudgetService(self.db).view(user.id)
        made = 0
        # the per-period lines of the current period, and the limits for set dates that are running
        running = [*view.lines, *(f for f in view.fixed_lines if f.state == "active")]
        for line in running:
            if line.status == "ok":
                continue
            since = getattr(line, "start_date", view.period.start)
            over = line.status == "over"
            made += await self._add(
                user.id,
                known,
                kind="budget_over" if over else "budget_warning",
                title=f"{line.name} is over its limit"
                if over
                else f"{line.name} is {line.percent}% used",
                body=f"{_money(line.activity, view.currency)} spent of "
                f"{_money(line.amount + line.carried, view.currency)}",
                link="/budget",
                dedupe_key=f"budget:{line.id}:{since}:{line.status}",
            )
        return made

    async def _goals(self, user: User, known: set[str]) -> int:
        made = 0
        for goal in await GoalService(self.db).list_for_user(user.id):
            if goal.reached:
                made += await self._add(
                    user.id,
                    known,
                    kind="goal_reached",
                    title=f"Goal reached: {goal.name}",
                    body=f"{_money(goal.saved, goal.currency)} of "
                    f"{_money(goal.target_amount, goal.currency)}",
                    link="/budget",
                    dedupe_key=f"goal:{goal.id}",
                )
        return made

    async def _installments(self, user: User, known: set[str]) -> int:
        """An installment plan whose last payment has been made."""
        stmt = select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == SubscriptionStatus.COMPLETED,
            Subscription.installments_total.is_not(None),
        )
        made = 0
        for sub in (await self.db.scalars(stmt)).all():
            made += await self._add(
                user.id,
                known,
                kind="installments_done",
                title=f"{sub.name}: last payment made",
                body=f"All {sub.installments_total} payments are done",
                link="/subscriptions",
                dedupe_key=f"installments-done:{sub.id}",
            )
        return made

    async def _money_short(self, user: User, known: set[str]) -> int:
        """The money runs out before the period does: laying the bills still to pay (overdue first,
        then by date) against what the everyday accounts hold less what is set aside, the first
        bill that takes the figure below zero is named. One notification per period and bill, so
        it comes again only when a different bill is the one that runs short. With no everyday
        account there is nothing to compare against, so there is none."""
        plan = await AvailableService(self.db).available_to_spend(user.id)
        if not plan.accounts:
            return 0  # no everyday account yet: there is nothing to run short of
        running = plan.balance - plan.reserved_total
        # bills and card statements together, overdue first, then by date
        owed = [(b.overdue, b.date, b.title, b.id, b.amount, b.title) for b in plan.bills]
        owed += [
            (c.overdue, c.date, c.title, c.account_id, c.amount, f"{c.title} card payment")
            for c in plan.card_payments
        ]
        owed.sort(key=lambda o: (not o[0], o[1], o[2]))
        for _, when, _, key, amount, name in owed:
            running -= amount
            if running < 0:
                return await self._add(
                    user.id,
                    known,
                    kind="money_short",
                    title=f"The money runs out at {name}",
                    body=f"Short by {_money(-running, plan.currency)} after it, due {when:%d %b}",
                    link="/plan",
                    dedupe_key=f"short:{plan.period_start}:{key}",
                )
        return 0

    async def _cards(self, user: User, known: set[str], today: date) -> int:
        """Credit card statements that are due soon or late, and cards close to their limit."""
        made = 0
        for c in await AccountService(self.db).statements(user.id, today):
            if c.remaining > 0 and c.days_until_due <= DUE_SOON_DAYS:
                late = c.state == "overdue"
                made += await self._add(
                    user.id,
                    known,
                    kind="card_overdue" if late else "card_due",
                    title=f"{c.account_name} payment {_when(c.days_until_due)}",
                    body=f"{_money(c.remaining, c.currency)} left of the statement "
                    f"({_money(c.statement_balance, c.currency)})",
                    link=f"/accounts/{c.account_id}",
                    dedupe_key=f"card-{'overdue' if late else 'due'}:{c.account_id}:{c.closed_on}",
                )
            if c.credit_limit and c.owed_now * 100 >= c.credit_limit * CARD_LIMIT_PERCENT:
                made += await self._add(
                    user.id,
                    known,
                    kind="card_limit",
                    title=f"{c.account_name} is close to its limit",
                    body=f"{_money(c.owed_now, c.currency)} owed of "
                    f"{_money(c.credit_limit, c.currency)}",
                    link=f"/accounts/{c.account_id}",
                    dedupe_key=f"card-limit:{c.account_id}:{today:%Y-%m}",
                )
        return made

    async def _split_waiting(self, user: User, known: set[str]) -> int:
        """A posted salary whose split is waiting for approval on the Pending screen."""
        stmt = (
            select(SalarySplitTask.id, Transaction.amount, Transaction.currency)
            .join(Transaction, Transaction.id == SalarySplitTask.transaction_id)
            .where(
                SalarySplitTask.user_id == user.id,
                SalarySplitTask.status == SplitTaskStatus.PENDING,
                Transaction.deleted_at.is_(None),
                Transaction.planned.is_(False),
            )
        )
        made = 0
        for task_id, amount, currency in (await self.db.execute(stmt)).all():
            made += await self._add(
                user.id,
                known,
                kind="split_waiting",
                title="A salary split is waiting",
                body=f"Your salary of {_money(amount, currency)} is ready to be split",
                link="/pending",
                dedupe_key=f"split-waiting:{task_id}",
            )
        return made

    async def _candidates(self, user: User, known: set[str]) -> int:
        """A charge that repeats clearly (regular, alike, still going), not a subscription yet.
        Only the sure ones are told, one notification per vendor, so a loose guess never nags."""
        from app.services.subscription_candidates import SubscriptionCandidateService

        made = 0
        for c in await SubscriptionCandidateService(self.db).candidates(user.id):
            if c.series.confidence != "high":
                continue
            unit = {"week": "week", "month": "month", "year": "year"}[c.series.unit.value]
            every = unit if c.series.count == 1 else f"{c.series.count} {unit}s"
            made += await self._add(
                user.id,
                known,
                kind="subscription_candidate",
                title=f"{c.vendor.name} looks like a subscription",
                body=f"{_money(c.series.amount, c.currency)} every {every}, "
                f"seen {len(c.series.charges)} times. Add it to plan the next payment.",
                link="/subscriptions",
                dedupe_key=f"subcand:{c.vendor.id}:{c.currency}",
            )
        return made

    async def _sync_user(self, user: User) -> int:
        known = set(
            (
                await self.db.scalars(
                    select(Notification.dedupe_key).where(Notification.user_id == user.id)
                )
            ).all()
        )
        today = date.today()
        made = 0
        if user.notify_payments:
            made += await self._payments(user, known, today)
            made += await self._installments(user, known)
            made += await self._split_waiting(user, known)
            made += await self._money_short(user, known)
            made += await self._cards(user, known, today)
            made += await self._candidates(user, known)
        if user.notify_budget:
            made += await self._budget(user, known)
        if user.notify_goals:
            made += await self._goals(user, known)
        await self.db.flush()
        return made

    async def sync(self, user_id: uuid.UUID | None = None, *, force: bool = False) -> int:
        """Look for new notifications for one user (at most every few minutes unless `force`) or,
        with no `user_id`, for every active user. Returns how many were made."""
        if user_id is not None and not force:
            now = time.monotonic()
            if now - _last_sync.get(user_id, -SYNC_EVERY_SECONDS) < SYNC_EVERY_SECONDS:
                return 0
        started = time.monotonic()
        stmt = select(User).where(User.is_active.is_(True))
        if user_id is not None:
            stmt = stmt.where(User.id == user_id)
        users = (await self.db.scalars(stmt)).all()
        made = sum([await self._sync_user(u) for u in users])
        if user_id is not None and not force and _changed_at.get(user_id, 0.0) < started:
            # Noted once the look is done, not before: a parallel request (the bell's count and the
            # list load together) would otherwise skip the look and read before this one commits,
            # and show a count the list cannot match. Two looks at once are safe: the unique key
            # makes the second wait for the first and make nothing twice. Not noted at all when the
            # data changed while this look ran: it may have missed the change, and noting it would
            # silence the next reads for minutes.
            _last_sync[user_id] = time.monotonic()
        return made

    async def purge_old(self, days: int = KEEP_DAYS) -> int:
        cutoff = datetime.now(UTC) - timedelta(days=days)
        result = await self.db.execute(delete(Notification).where(Notification.created_at < cutoff))
        return result.rowcount or 0

    # --- reading and dismissing -------------------------------------------------------------

    @staticmethod
    def _conditions(user_id: uuid.UUID, unread: bool) -> list:
        conditions = [Notification.user_id == user_id, Notification.dismissed_at.is_(None)]
        if unread:
            conditions.append(Notification.read_at.is_(None))
        return conditions

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        unread: bool = False,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[Notification]:
        stmt = (
            select(Notification)
            .where(*self._conditions(user_id, unread))
            .order_by(Notification.created_at.desc(), Notification.id)
        )
        if limit is not None:
            stmt = stmt.limit(limit).offset(offset)
        return list((await self.db.scalars(stmt)).all())

    async def count_for_user(self, user_id: uuid.UUID, *, unread: bool = False) -> int:
        stmt = select(func.count(Notification.id)).where(*self._conditions(user_id, unread))
        return (await self.db.scalar(stmt)) or 0

    async def get(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> Notification | None:
        return await self.db.scalar(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
                Notification.dismissed_at.is_(None),
            )
        )

    async def mark_read(self, notification: Notification) -> Notification:
        if notification.read_at is None:
            notification.read_at = datetime.now(UTC)
            await self.db.flush()
        return notification

    async def mark_all_read(self, user_id: uuid.UUID) -> int:
        result = await self.db.execute(
            update(Notification)
            .where(*self._conditions(user_id, True))
            .values(read_at=datetime.now(UTC))
        )
        return result.rowcount or 0

    async def dismiss(self, notification: Notification) -> None:
        """Hide it for good. The row stays (until swept) so the event is not announced again."""
        notification.dismissed_at = datetime.now(UTC)
        await self.db.flush()
