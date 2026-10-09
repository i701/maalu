import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import PaymentMethod
from app.models import Subscription, Transaction, User, Vendor
from app.schemas import TransactionCreate, TransactionUpdate
from app.services.money import price_in_base
from app.services.subscription import SubscriptionNotFoundError
from app.services.vendor import VendorNotFoundError, VendorService


class TransactionService:
    """Business logic for transactions. Knows nothing about HTTP."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.vendors = VendorService(db)

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

    async def _resolve_subscription(
        self, user_id: uuid.UUID, subscription_id: uuid.UUID | None
    ) -> Subscription | None:
        if subscription_id is None:
            return None
        stmt = select(Subscription).where(
            Subscription.id == subscription_id, Subscription.user_id == user_id
        )
        subscription = await self.db.scalar(stmt)
        if subscription is None:
            raise SubscriptionNotFoundError
        return subscription

    async def _base_currency(self, user_id: uuid.UUID) -> str:
        user = await self.db.get(User, user_id)
        assert user is not None
        return user.base_currency

    async def create(self, user_id: uuid.UUID, data: TransactionCreate) -> Transaction:
        fields = data.model_dump(
            exclude={"vendor_id", "vendor_name", "subscription_id", "currency", "exchange_rate"}
        )
        base = await self._base_currency(user_id)
        currency = data.currency or base
        rate, base_amount = price_in_base(data.amount, currency, data.exchange_rate, base)
        vendor = await self._resolve_vendor(user_id, data.vendor_id, data.vendor_name)
        subscription = await self._resolve_subscription(user_id, data.subscription_id)
        transaction = Transaction(
            user_id=user_id,
            vendor=vendor,
            subscription=subscription,
            currency=currency,
            exchange_rate=rate,
            base_amount=base_amount,
            **fields,
        )
        self.db.add(transaction)
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        vendor_id: uuid.UUID | None = None,
        subscription_id: uuid.UUID | None = None,
        payment_method: PaymentMethod | None = None,
        currency: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Transaction]:
        stmt = select(Transaction).where(Transaction.user_id == user_id)
        if vendor_id is not None:
            stmt = stmt.where(Transaction.vendor_id == vendor_id)
        if subscription_id is not None:
            stmt = stmt.where(Transaction.subscription_id == subscription_id)
        if currency is not None:
            stmt = stmt.where(Transaction.currency == currency.upper())
        if payment_method is not None:
            stmt = stmt.where(Transaction.payment_method == payment_method)
        stmt = (
            stmt.order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list((await self.db.scalars(stmt)).all())

    async def get(self, user_id: uuid.UUID, transaction_id: uuid.UUID) -> Transaction | None:
        stmt = select(Transaction).where(
            Transaction.id == transaction_id, Transaction.user_id == user_id
        )
        return await self.db.scalar(stmt)

    async def update(self, transaction: Transaction, data: TransactionUpdate) -> Transaction:
        changes = data.model_dump(exclude_unset=True)
        vendor_touched = "vendor_id" in changes or "vendor_name" in changes
        vendor_id = changes.pop("vendor_id", None)
        vendor_name = changes.pop("vendor_name", None)
        if vendor_touched:  # explicit null for both unlinks the vendor
            transaction.vendor = await self._resolve_vendor(
                transaction.user_id, vendor_id, vendor_name
            )

        if "subscription_id" in changes:  # explicit null unlinks
            transaction.subscription = await self._resolve_subscription(
                transaction.user_id, changes.pop("subscription_id")
            )

        if changes.keys() & {"amount", "currency", "exchange_rate"}:
            base = await self._base_currency(transaction.user_id)
            currency = changes.get("currency", transaction.currency)
            rate = changes.pop("exchange_rate", None)
            # A stored rate only carries over while the currency stays the same:
            # switching to another foreign currency needs a new rate.
            if rate is None and currency == transaction.currency:
                rate = transaction.exchange_rate
            amount = changes.get("amount", transaction.amount)
            transaction.exchange_rate, transaction.base_amount = price_in_base(
                amount, currency, rate, base
            )

        for field, value in changes.items():
            setattr(transaction, field, value)
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction

    async def delete(self, transaction: Transaction) -> None:
        await self.db.delete(transaction)
        await self.db.flush()
