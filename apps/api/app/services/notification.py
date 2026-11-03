import time
import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import SubscriptionStatus
from app.models import Notification, Subscription, Transaction, User
from app.services.budget import BudgetService
from app.services.goal import GoalService

DUE_SOON_DAYS = 3  # a planned payment is "due soon" this many days ahead, and on the day
MAX_REMIND_DAYS = 60  # the longest lead a subscription can ask for (see RemindDays)
KEEP_DAYS = 90  # notifications older than this are swept
# Looking for new notifications costs a few queries, and every page asks for the unread count, so
# a user's data is looked at once in a while, not on every request. The daily job ignores this.
SYNC_EVERY_SECONDS = 300
_last_sync: dict[uuid.UUID, float] = {}


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
        for line in view.lines:
            if line.status == "ok":
                continue
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
                dedupe_key=f"budget:{line.id}:{view.period.start}:{line.status}",
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
            _last_sync[user_id] = now
        stmt = select(User).where(User.is_active.is_(True))
        if user_id is not None:
            stmt = stmt.where(User.id == user_id)
        users = (await self.db.scalars(stmt)).all()
        return sum([await self._sync_user(u) for u in users])

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
