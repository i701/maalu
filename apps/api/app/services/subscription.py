import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import SubscriptionStatus, TransactionType
from app.models import Subscription, Transaction, User, Vendor
from app.schedule import MONTHLY_QUANTUM, monthly_cost, next_due_date
from app.schemas import (
    SubscriptionCreate,
    SubscriptionFromTransaction,
    SubscriptionResponse,
    SubscriptionSummary,
    SubscriptionUpdate,
    VendorResponse,
)
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

    async def list_for_user(
        self, user_id: uuid.UUID, status: SubscriptionStatus | None = None
    ) -> list[Subscription]:
        stmt = select(Subscription).where(Subscription.user_id == user_id)
        if status is not None:
            stmt = stmt.where(Subscription.status == status)
        stmt = stmt.order_by(Subscription.name)
        return list((await self.db.scalars(stmt)).all())

    async def get(self, user_id: uuid.UUID, subscription_id: uuid.UUID) -> Subscription | None:
        stmt = select(Subscription).where(
            Subscription.id == subscription_id, Subscription.user_id == user_id
        )
        return await self.db.scalar(stmt)

    async def create(self, user_id: uuid.UUID, data: SubscriptionCreate) -> Subscription:
        fields = data.model_dump(exclude={"vendor_id", "vendor_name", "currency", "exchange_rate"})
        base = await self._base_currency(user_id)
        currency = data.currency or base
        rate, base_amount = price_in_base(data.amount, currency, data.exchange_rate, base)
        vendor = await self._resolve_vendor(user_id, data.vendor_id, data.vendor_name)
        subscription = Subscription(
            user_id=user_id,
            vendor=vendor,
            currency=currency,
            exchange_rate=rate,
            base_amount=base_amount,
            **fields,
        )
        self.db.add(subscription)
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

        for field, value in changes.items():
            setattr(subscription, field, value)
        await self.db.flush()
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
            Transaction.id == transaction_id, Transaction.user_id == user_id
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
            amount=transaction.amount,
            currency=transaction.currency,
            exchange_rate=transaction.exchange_rate,
            base_amount=transaction.base_amount,
            payment_method=transaction.payment_method,
            category=transaction.category,
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
            .where(Transaction.subscription_id.in_(ids))
            .group_by(Transaction.subscription_id)
        )
        return dict((await self.db.execute(stmt)).all())

    async def present(self, subscriptions: list[Subscription]) -> list[SubscriptionResponse]:
        """Attach the computed schedule fields (last paid, next due, overdue, monthly cost)."""
        last_paid = await self._last_paid_dates([s.id for s in subscriptions])
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
                    payment_method=s.payment_method,
                    category=s.category,
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
