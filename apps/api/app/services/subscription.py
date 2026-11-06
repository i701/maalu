import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import IntervalUnit, SubscriptionStatus, TransactionType
from app.models import Account, Category, Subscription, Transaction, User, Vendor
from app.schedule import (
    MONTHLY_QUANTUM,
    PLAN_AHEAD_DAYS,
    monthly_cost,
    nearest_occurrence_index,
    next_due_date,
    occurrence,
)
from app.schemas import (
    AccountRef,
    SubscriptionCreate,
    SubscriptionFromTransaction,
    SubscriptionResponse,
    SubscriptionSummary,
    SubscriptionUpdate,
    VendorResponse,
)
from app.services.account import AccountNotFoundError
from app.services.category import CategoryService
from app.services.errors import TransactionRuleError
from app.services.money import price_in_base
from app.services.vendor import VendorNotFoundError, VendorService


class SubscriptionNotFoundError(Exception):
    pass


class TransactionNotFoundError(Exception):
    pass


class TransactionAlreadyLinkedError(Exception):
    pass


class SubscriptionService:
    """Business logic for subscriptions. Next-due / overdue are computed, never stored."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.vendors = VendorService(db)
        self.categories = CategoryService(db)

    async def _base_currency(self, user_id: uuid.UUID) -> str:
        user = await self.db.get(User, user_id)
        assert user is not None
        return user.base_currency

    async def _resolve_vendor(
        self, user_id: uuid.UUID, vendor_id: uuid.UUID | None, vendor_name: str | None
    ) -> Vendor | None:
        if vendor_id is not None:
            vendor = await self.vendors.get(user_id, vendor_id)
            if vendor is None:
                raise VendorNotFoundError
            return vendor
        if vendor_name is not None:
            return await self.vendors.get_or_create(user_id, vendor_name)
        return None

    async def _resolve_account(
        self, user_id: uuid.UUID, account_id: uuid.UUID | None, currency: str | None
    ) -> Account | None:
        """The account it is paid from: yours, not archived, and in the subscription's currency."""
        if account_id is None:
            return None
        account = await self.db.scalar(
            select(Account).where(Account.id == account_id, Account.user_id == user_id)
        )
        if account is None:
            raise AccountNotFoundError
        if account.archived_at is not None:
            raise TransactionRuleError(f'"{account.name}" is archived. Unarchive it to use it')
        if currency is not None and currency != account.currency:
            raise TransactionRuleError(
                f'"{account.name}" is in {account.currency}, so the subscription must be too'
            )
        return account

    @staticmethod
    def _conditions(
        user_id: uuid.UUID,
        status: SubscriptionStatus | None,
        q: str | None = None,
        interval_unit: IntervalUnit | None = None,
    ) -> list:
        """Filters shared by the list and the count. `q` is a case-insensitive "contains" over
        name, category and vendor name; wildcard characters in it are matched literally."""
        conditions = [Subscription.user_id == user_id]
        if status is not None:
            conditions.append(Subscription.status == status)
        if interval_unit is not None:
            conditions.append(Subscription.interval_unit == interval_unit)
        if q and q.strip():
            term = q.strip()
            conditions.append(
                or_(
                    Subscription.name.icontains(term, autoescape=True),
                    Subscription.category_ref.has(Category.name.icontains(term, autoescape=True)),
                    Subscription.vendor.has(Vendor.name.icontains(term, autoescape=True)),
                )
            )
        return conditions

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        status: SubscriptionStatus | None = None,
        *,
        q: str | None = None,
        interval_unit: IntervalUnit | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[Subscription]:
        stmt = (
            select(Subscription)
            .where(*self._conditions(user_id, status, q, interval_unit))
            .order_by(Subscription.name)
        )
        if limit is not None:
            stmt = stmt.limit(limit).offset(offset)
        return list((await self.db.scalars(stmt)).all())

    async def count_for_user(
        self,
        user_id: uuid.UUID,
        status: SubscriptionStatus | None = None,
        *,
        q: str | None = None,
        interval_unit: IntervalUnit | None = None,
    ) -> int:
        stmt = select(func.count(Subscription.id)).where(
            *self._conditions(user_id, status, q, interval_unit)
        )
        return (await self.db.scalar(stmt)) or 0

    async def get(self, user_id: uuid.UUID, subscription_id: uuid.UUID) -> Subscription | None:
        stmt = select(Subscription).where(
            Subscription.id == subscription_id, Subscription.user_id == user_id
        )
        return await self.db.scalar(stmt)

    @staticmethod
    def _check_not_salary(category: Category) -> None:
        if category.is_salary:  # a subscription is spending, and Salary is for income only
            raise TransactionRuleError("The Salary category is only for income")

    async def create(self, user_id: uuid.UUID, data: SubscriptionCreate) -> Subscription:
        fields = data.model_dump(
            exclude={
                "vendor_id",
                "vendor_name",
                "currency",
                "exchange_rate",
                "category",
                "account_id",
            }
        )
        base = await self._base_currency(user_id)
        account = await self._resolve_account(user_id, data.account_id, data.currency)
        currency = account.currency if account else (data.currency or base)
        rate, base_amount = price_in_base(
            data.amount,
            currency,
            data.exchange_rate or (account.exchange_rate if account else None),
            base,
        )
        vendor = await self._resolve_vendor(user_id, data.vendor_id, data.vendor_name)
        category = await self.categories.get_or_create(user_id, data.category)
        self._check_not_salary(category)
        subscription = Subscription(
            user_id=user_id,
            vendor=vendor,
            account=account,
            category_ref=category,
            currency=currency,
            exchange_rate=rate,
            base_amount=base_amount,
            **fields,
        )
        self.db.add(subscription)
        await self.db.flush()
        if data.remind_days_before is None:
            # the column's default would fill an empty value in: "no reminder" must stay empty
            subscription.remind_days_before = None
            await self.db.flush()
        await self.db.refresh(subscription)
        return subscription

    async def update(self, subscription: Subscription, data: SubscriptionUpdate) -> Subscription:
        changes = data.model_dump(exclude_unset=True)
        vendor_touched = "vendor_id" in changes or "vendor_name" in changes
        vendor_id = changes.pop("vendor_id", None)
        vendor_name = changes.pop("vendor_name", None)
        if vendor_touched:  # explicit null for both unlinks the vendor
            subscription.vendor = await self._resolve_vendor(
                subscription.user_id, vendor_id, vendor_name
            )

        if "account_id" in changes:
            account_id = changes.pop("account_id")
            wanted = changes.get("currency")
            subscription.account = await self._resolve_account(
                subscription.user_id, account_id, wanted
            )
            account = subscription.account
            if account is not None and wanted is None and account.currency != subscription.currency:
                changes["currency"] = account.currency
                changes.setdefault("exchange_rate", account.exchange_rate)
        elif subscription.account is not None and "currency" in changes:
            await self._resolve_account(
                subscription.user_id, subscription.account.id, changes["currency"]
            )

        if changes.keys() & {"amount", "currency", "exchange_rate"}:
            base = await self._base_currency(subscription.user_id)
            currency = changes.get("currency", subscription.currency)
            rate = changes.pop("exchange_rate", None)
            # A stored rate only carries over while the currency stays the same.
            if rate is None and currency == subscription.currency:
                rate = subscription.exchange_rate
            amount = changes.get("amount", subscription.amount)
            subscription.exchange_rate, subscription.base_amount = price_in_base(
                amount, currency, rate, base
            )

        if (name := changes.pop("category", None)) is not None:
            category = await self.categories.get_or_create(subscription.user_id, name)
            self._check_not_salary(category)
            subscription.category_ref = category
        for field, value in changes.items():
            setattr(subscription, field, value)
        if (
            subscription.status is SubscriptionStatus.COMPLETED
            and "status" not in changes
            and "installments_total" in changes
        ):
            # more payments were added (or the end was removed): it carries on
            payments = (await self._payments_made([subscription.id])).get(subscription.id, 0)
            total = subscription.installments_total
            if total is None or payments < total:
                subscription.status = SubscriptionStatus.ACTIVE
        await self.db.flush()
        await self._refresh_planned(subscription, changed=set(data.model_fields_set))
        await self.db.refresh(subscription)
        return subscription

    async def delete(self, subscription: Subscription) -> None:
        await self.db.delete(subscription)
        await self.db.flush()

    async def from_transaction(
        self, user_id: uuid.UUID, transaction_id: uuid.UUID, data: SubscriptionFromTransaction
    ) -> Subscription:
        """Create a subscription from an existing transaction and link that transaction to it.

        The transaction's date becomes the first billing date, so the next one is a full interval
        later. Amount, currency, rate, vendor, method and category are copied.
        """
        stmt = select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
            Transaction.live(),
        )
        transaction = await self.db.scalar(stmt)
        if transaction is None:
            raise TransactionNotFoundError
        if transaction.type is not TransactionType.EXPENSE:
            raise TransactionRuleError("Only expenses can become subscriptions")
        if transaction.subscription_id is not None:
            raise TransactionAlreadyLinkedError

        subscription = Subscription(
            user_id=user_id,
            name=data.name
            or (transaction.vendor.name if transaction.vendor else transaction.category),
            vendor=transaction.vendor,
            account=transaction.account
            if transaction.account and transaction.account.archived_at is None
            else None,
            amount=transaction.amount,
            currency=transaction.currency,
            exchange_rate=transaction.exchange_rate,
            base_amount=transaction.base_amount,
            payment_method=transaction.payment_method,
            category_ref=transaction.category_ref,
            interval_unit=data.interval_unit,
            interval_count=data.interval_count,
            start_date=transaction.transaction_date,
            status=SubscriptionStatus.ACTIVE,
        )
        self.db.add(subscription)
        transaction.subscription = subscription
        await self.db.flush()
        await self.db.refresh(subscription)
        return subscription

    async def _last_paid_dates(self, ids: list[uuid.UUID]) -> dict[uuid.UUID, date]:
        if not ids:
            return {}
        stmt = (
            select(Transaction.subscription_id, func.max(Transaction.transaction_date))
            .where(Transaction.subscription_id.in_(ids), Transaction.counted())
            .group_by(Transaction.subscription_id)
        )
        return dict((await self.db.execute(stmt)).all())

    async def _last_payments(self, ids: list[uuid.UUID]) -> dict[uuid.UUID, Transaction]:
        """The latest posted payment of each subscription (newest date, then newest entered)."""
        if not ids:
            return {}
        stmt = (
            select(Transaction)
            .where(Transaction.subscription_id.in_(ids), Transaction.counted())
            .order_by(Transaction.transaction_date, Transaction.created_at)
        )
        # oldest first, so the last row seen for a subscription is its latest payment
        return {
            t.subscription_id: t for t in (await self.db.scalars(stmt)).all() if t.subscription_id
        }

    async def _payments_made(self, ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
        """How many posted payments are linked to each subscription."""
        if not ids:
            return {}
        stmt = (
            select(Transaction.subscription_id, func.count(Transaction.id))
            .where(Transaction.subscription_id.in_(ids), Transaction.counted())
            .group_by(Transaction.subscription_id)
        )
        return dict((await self.db.execute(stmt)).all())

    async def present(self, subscriptions: list[Subscription]) -> list[SubscriptionResponse]:
        """Attach the computed schedule fields (last paid, next due, overdue, monthly cost)."""
        last_paid = await self._last_paid_dates([s.id for s in subscriptions])
        payments = await self._payments_made([s.id for s in subscriptions])
        today = date.today()
        out = []
        for s in subscriptions:
            paid = last_paid.get(s.id)
            active = s.status is SubscriptionStatus.ACTIVE
            due = next_due_date(s.start_date, s.interval_unit, s.interval_count, paid)
            out.append(
                SubscriptionResponse(
                    id=s.id,
                    name=s.name,
                    vendor=VendorResponse.model_validate(s.vendor) if s.vendor else None,
                    amount=s.amount,
                    currency=s.currency,
                    exchange_rate=s.exchange_rate,
                    base_amount=s.base_amount,
                    account=AccountRef.model_validate(s.account) if s.account else None,
                    payment_method=s.payment_method,
                    category=s.category,
                    category_id=s.category_id,
                    interval_unit=s.interval_unit,
                    interval_count=s.interval_count,
                    start_date=s.start_date,
                    status=s.status,
                    last_paid_date=paid,
                    next_due_date=due if active else None,
                    is_overdue=active and due < today,
                    monthly_base_cost=monthly_cost(
                        s.base_amount, s.interval_unit, s.interval_count
                    ),
                    installments_total=s.installments_total,
                    payments_made=payments.get(s.id, 0),
                    installments_left=None
                    if s.installments_total is None
                    else max(0, s.installments_total - payments.get(s.id, 0)),
                    remind_days_before=s.remind_days_before,
                    amount_varies=s.amount_varies,
                    created_at=s.created_at,
                )
            )
        return out

    async def summary(self, user_id: uuid.UUID) -> SubscriptionSummary:
        active = await self.list_for_user(user_id, SubscriptionStatus.ACTIVE)
        total = sum(
            (monthly_cost(s.base_amount, s.interval_unit, s.interval_count) for s in active),
            Decimal(0),
        ).quantize(MONTHLY_QUANTUM)
        return SubscriptionSummary(
            active_count=len(active),
            monthly_base_total=total,
            currency=await self._base_currency(user_id),
        )

    # --- planned payments -------------------------------------------------------------------
    # An active subscription keeps its next payment as a planned transaction (so the Upcoming
    # list is the schedule). Marking it paid posts it, and the next cycle is planned in its place.
    # Deleting a planned payment skips that cycle: `planned_through` remembers it was made.

    async def _live_planned(self, subscription_id: uuid.UUID) -> list[Transaction]:
        stmt = select(Transaction).where(
            Transaction.subscription_id == subscription_id,
            Transaction.live(),
            Transaction.planned.is_(True),
        )
        return list((await self.db.scalars(stmt)).all())

    async def _refresh_planned(self, subscription: Subscription, *, changed: set[str]) -> None:
        """After an edit: planned payments made from the old values follow the new ones. A new
        schedule starts over; a paused or cancelled subscription plans nothing."""
        planned = await self._live_planned(subscription.id)
        schedule = {"start_date", "interval_unit", "interval_count"}
        if changed & schedule or subscription.status is not SubscriptionStatus.ACTIVE:
            for transaction in planned:
                transaction.deleted_at = datetime.now(UTC)
            subscription.planned_through = None
            await self.db.flush()
            return
        for transaction in planned:
            if changed & {"amount", "currency", "exchange_rate"}:
                transaction.amount = subscription.amount
                transaction.currency = subscription.currency
                transaction.exchange_rate = subscription.exchange_rate
                transaction.base_amount = subscription.base_amount
            if "name" in changed:
                transaction.description = subscription.name
            if "category" in changed:
                transaction.category_ref = subscription.category_ref
            if "payment_method" in changed:
                transaction.payment_method = subscription.payment_method
            if changed & {"vendor_id", "vendor_name"}:
                transaction.vendor = subscription.vendor
            if "account_id" in changed:
                transaction.account = subscription.account
        await self.db.flush()

    async def sync(self, user_id: uuid.UUID | None, only: Subscription | None = None) -> int:
        """Plan the next payment of each active subscription (yours, or everyone's with no
        `user_id`, which is what the daily job does). Returns how many were made. A payment made
        by hand for a cycle retires the planned one for it."""
        if only is not None:
            subscriptions = [only] if only.status is SubscriptionStatus.ACTIVE else []
        else:
            stmt = select(Subscription).where(Subscription.status == SubscriptionStatus.ACTIVE)
            if user_id is not None:
                stmt = stmt.where(Subscription.user_id == user_id)
            subscriptions = list((await self.db.scalars(stmt)).all())
        last_paid = await self._last_paid_dates([s.id for s in subscriptions])
        payments = await self._payments_made([s.id for s in subscriptions])
        latest = await self._last_payments([s.id for s in subscriptions if s.amount_varies])
        horizon = date.today() + timedelta(days=PLAN_AHEAD_DAYS)
        made = 0
        for s in subscriptions:
            if s.installments_total is not None and payments.get(s.id, 0) >= s.installments_total:
                # the last instalment has been paid: the plan is done and plans nothing more
                s.status = SubscriptionStatus.COMPLETED
                for leftover in await self._live_planned(s.id):
                    leftover.deleted_at = datetime.now(UTC)
                continue
            unit, count, start = s.interval_unit, s.interval_count, s.start_date
            paid = last_paid.get(s.id)
            paid_k = nearest_occurrence_index(start, unit, count, paid) if paid else -1
            through = s.planned_through
            through_k = nearest_occurrence_index(start, unit, count, through) if through else -1
            open_plans = []
            for transaction in await self._live_planned(s.id):
                due_k = nearest_occurrence_index(start, unit, count, transaction.transaction_date)
                if paid and due_k <= paid_k:  # that cycle was paid another way
                    transaction.deleted_at = datetime.now(UTC)
                else:
                    open_plans.append(transaction)
            if open_plans:
                continue
            k = max(paid_k, through_k) + 1
            due = occurrence(start, unit, count, k)
            if due > horizon:
                continue
            account = s.account if s.account and s.account.archived_at is None else None
            # A bill that varies is estimated at what it really came to last time (amount, and the
            # rate it was paid at), the best guess there is; the usual amount is the first guess.
            last = latest.get(s.id)
            if last is not None and last.currency != s.currency:
                last = None  # the bill moved to another currency: start from the usual amount
            self.db.add(
                Transaction(
                    user_id=s.user_id,
                    type=TransactionType.EXPENSE,
                    amount=last.amount if last else s.amount,
                    currency=s.currency,
                    exchange_rate=last.exchange_rate if last else s.exchange_rate,
                    base_amount=last.base_amount if last else s.base_amount,
                    payment_method=s.payment_method,
                    category_ref=s.category_ref,
                    description=s.name,
                    transaction_date=due,
                    planned=True,
                    vendor=s.vendor,
                    subscription=s,
                    account=account,
                )
            )
            s.planned_through = due
            made += 1
        await self.db.flush()
        return made
