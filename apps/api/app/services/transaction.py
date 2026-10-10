import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import PaymentMethod, TransactionType
from app.export import EXPORT_LIMIT, build_workbook
from app.models import Account, Subscription, Transaction, User, Vendor
from app.schemas import TransactionCreate, TransactionTotals, TransactionUpdate
from app.services.account import AccountCurrencyMismatchError, AccountNotFoundError
from app.services.errors import TransactionRuleError
from app.services.money import BASE_AMOUNT_QUANTUM, price_in_base
from app.services.subscription import SubscriptionNotFoundError
from app.services.vendor import VendorNotFoundError, VendorService

TRANSFER_CATEGORY = "Transfer"
# Transfers have no payment method of their own; this fills the required column.
TRANSFER_PAYMENT_METHOD = PaymentMethod.OTHER

# Changing any of these means the money fields have to be recomputed.
MONEY_KEYS = {
    "type",
    "amount",
    "currency",
    "exchange_rate",
    "account_id",
    "to_account_id",
    "to_amount",
}


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

    async def _resolve_account(
        self, user_id: uuid.UUID, account_id: uuid.UUID | None
    ) -> Account | None:
        if account_id is None:
            return None
        stmt = select(Account).where(Account.id == account_id, Account.user_id == user_id)
        account = await self.db.scalar(stmt)
        if account is None:
            raise AccountNotFoundError
        return account

    async def _base_currency(self, user_id: uuid.UUID) -> str:
        user = await self.db.get(User, user_id)
        assert user is not None
        return user.base_currency

    @staticmethod
    def _money_fields(
        *,
        transaction_type: TransactionType,
        amount: Decimal,
        currency: str | None,
        exchange_rate: Decimal | None,
        account: Account | None,
        to_account: Account | None,
        to_amount: Decimal | None,
        base: str,
    ) -> dict:
        """Work out currency, rate, base amount (and to_amount for transfers) for a transaction.

        - income/expense: with an account, the account's currency is used (a different one is
          rejected); the rate is entered manually when the currency isn't the base currency.
        - transfer: the amount leaves the source account in its currency and is valued with that
          account's own rate, so the user never types a rate. Between two accounts in different
          currencies they say how much arrived (`to_amount`) instead.
        """
        if transaction_type is TransactionType.TRANSFER:
            if account is None or to_account is None:
                raise TransactionRuleError("A transfer needs a from-account and a to-account")
            if account.id == to_account.id:
                raise TransactionRuleError("Choose two different accounts")
            if to_account.currency == account.currency:
                received = amount
            elif to_amount is None:
                raise TransactionRuleError(
                    f"Enter the amount received in {to_account.currency} "
                    f"(the accounts use different currencies)"
                )
            else:
                received = to_amount
            return {
                "currency": account.currency,
                "exchange_rate": account.exchange_rate,
                "base_amount": (amount * account.exchange_rate).quantize(BASE_AMOUNT_QUANTUM),
                "to_amount": received,
            }

        if account is not None:
            if currency and currency != account.currency:
                raise AccountCurrencyMismatchError(account.currency)
            currency = account.currency  # a transaction in an account uses its currency
        currency = currency or base
        rate, base_amount = price_in_base(amount, currency, exchange_rate, base)
        return {
            "currency": currency,
            "exchange_rate": rate,
            "base_amount": base_amount,
            "to_amount": None,
        }

    async def create(self, user_id: uuid.UUID, data: TransactionCreate) -> Transaction:
        base = await self._base_currency(user_id)
        account = await self._resolve_account(user_id, data.account_id)
        to_account = await self._resolve_account(user_id, data.to_account_id)
        money = self._money_fields(
            transaction_type=data.type,
            amount=data.amount,
            currency=data.currency,
            exchange_rate=data.exchange_rate,
            account=account,
            to_account=to_account,
            to_amount=data.to_amount,
            base=base,
        )
        is_transfer = data.type is TransactionType.TRANSFER
        transaction = Transaction(
            user_id=user_id,
            type=data.type,
            amount=data.amount,
            category=TRANSFER_CATEGORY if is_transfer else data.category,
            payment_method=TRANSFER_PAYMENT_METHOD if is_transfer else data.payment_method,
            description=data.description,
            transaction_date=data.transaction_date,
            account=account,
            to_account=to_account,
            vendor=await self._resolve_vendor(user_id, data.vendor_id, data.vendor_name),
            subscription=await self._resolve_subscription(user_id, data.subscription_id),
            **money,
        )
        self.db.add(transaction)
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction

    @staticmethod
    def _conditions(
        user_id: uuid.UUID,
        *,
        transaction_type: TransactionType | None,
        vendor_id: uuid.UUID | None,
        subscription_id: uuid.UUID | None,
        account_id: uuid.UUID | None,
        payment_method: PaymentMethod | None,
        currency: str | None,
        q: str | None = None,
        min_amount: Decimal | None = None,
        max_amount: Decimal | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list:
        """Filters shared by the list, the count and the totals, so they always agree.

        `q` is a case-insensitive "contains" over category, description, vendor, subscription and
        account names (a transfer matches either of its accounts). `%`, `_` and `\\` in it are
        matched literally, not as wildcards. The amount range compares `base_amount` (your base
        currency), so transactions in different currencies are comparable. Dates are inclusive.
        """
        conditions = [Transaction.user_id == user_id]
        if min_amount is not None:
            conditions.append(Transaction.base_amount >= min_amount)
        if max_amount is not None:
            conditions.append(Transaction.base_amount <= max_amount)
        if date_from is not None:
            conditions.append(Transaction.transaction_date >= date_from)
        if date_to is not None:
            conditions.append(Transaction.transaction_date <= date_to)
        if q and q.strip():
            term = q.strip()
            conditions.append(
                or_(
                    Transaction.category.icontains(term, autoescape=True),
                    Transaction.description.icontains(term, autoescape=True),
                    Transaction.vendor.has(Vendor.name.icontains(term, autoescape=True)),
                    Transaction.subscription.has(
                        Subscription.name.icontains(term, autoescape=True)
                    ),
                    Transaction.account.has(Account.name.icontains(term, autoescape=True)),
                    Transaction.to_account.has(Account.name.icontains(term, autoescape=True)),
                )
            )
        if transaction_type is not None:
            conditions.append(Transaction.type == transaction_type)
        if vendor_id is not None:
            conditions.append(Transaction.vendor_id == vendor_id)
        if subscription_id is not None:
            conditions.append(Transaction.subscription_id == subscription_id)
        if account_id is not None:  # a transfer belongs to both of its accounts
            conditions.append(
                or_(Transaction.account_id == account_id, Transaction.to_account_id == account_id)
            )
        if currency is not None:
            conditions.append(Transaction.currency == currency.upper())
        if payment_method is not None:
            conditions.append(Transaction.payment_method == payment_method)
        return conditions

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        transaction_type: TransactionType | None = None,
        vendor_id: uuid.UUID | None = None,
        subscription_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        payment_method: PaymentMethod | None = None,
        currency: str | None = None,
        q: str | None = None,
        min_amount: Decimal | None = None,
        max_amount: Decimal | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Transaction]:
        conditions = self._conditions(
            user_id,
            transaction_type=transaction_type,
            vendor_id=vendor_id,
            subscription_id=subscription_id,
            account_id=account_id,
            payment_method=payment_method,
            currency=currency,
            q=q,
            min_amount=min_amount,
            max_amount=max_amount,
            date_from=date_from,
            date_to=date_to,
        )
        stmt = (
            select(Transaction)
            .where(*conditions)
            .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list((await self.db.scalars(stmt)).all())

    async def count_for_user(
        self,
        user_id: uuid.UUID,
        *,
        transaction_type: TransactionType | None = None,
        vendor_id: uuid.UUID | None = None,
        subscription_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        payment_method: PaymentMethod | None = None,
        currency: str | None = None,
        q: str | None = None,
        min_amount: Decimal | None = None,
        max_amount: Decimal | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> int:
        conditions = self._conditions(
            user_id,
            transaction_type=transaction_type,
            vendor_id=vendor_id,
            subscription_id=subscription_id,
            account_id=account_id,
            payment_method=payment_method,
            currency=currency,
            q=q,
            min_amount=min_amount,
            max_amount=max_amount,
            date_from=date_from,
            date_to=date_to,
        )
        return (await self.db.scalar(select(func.count(Transaction.id)).where(*conditions))) or 0

    async def totals_for_user(
        self,
        user_id: uuid.UUID,
        *,
        transaction_type: TransactionType | None = None,
        vendor_id: uuid.UUID | None = None,
        subscription_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        payment_method: PaymentMethod | None = None,
        currency: str | None = None,
        q: str | None = None,
        min_amount: Decimal | None = None,
        max_amount: Decimal | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> TransactionTotals:
        """Income and expense totals (base currency) for the rows the same filters would list."""
        conditions = self._conditions(
            user_id,
            transaction_type=transaction_type,
            vendor_id=vendor_id,
            subscription_id=subscription_id,
            account_id=account_id,
            payment_method=payment_method,
            currency=currency,
            q=q,
            min_amount=min_amount,
            max_amount=max_amount,
            date_from=date_from,
            date_to=date_to,
        )
        stmt = (
            select(Transaction.type, func.sum(Transaction.base_amount))
            .where(
                *conditions, Transaction.type.in_([TransactionType.INCOME, TransactionType.EXPENSE])
            )
            .group_by(Transaction.type)
        )
        sums = {
            kind: Decimal(str(total or 0)) for kind, total in (await self.db.execute(stmt)).all()
        }
        return TransactionTotals(
            income=sums.get(TransactionType.INCOME, Decimal(0)),
            expense=sums.get(TransactionType.EXPENSE, Decimal(0)),
            currency=await self._base_currency(user_id),
        )

    async def export_xlsx(
        self,
        user_id: uuid.UUID,
        *,
        transaction_type: TransactionType | None = None,
        vendor_id: uuid.UUID | None = None,
        subscription_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        payment_method: PaymentMethod | None = None,
        currency: str | None = None,
        q: str | None = None,
        min_amount: Decimal | None = None,
        max_amount: Decimal | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> bytes:
        """An Excel file of every transaction matching the filters, oldest first.

        Raises TransactionRuleError instead of silently truncating when there are too many rows.
        """
        filters = {
            "transaction_type": transaction_type,
            "vendor_id": vendor_id,
            "subscription_id": subscription_id,
            "account_id": account_id,
            "payment_method": payment_method,
            "currency": currency,
            "q": q,
            "min_amount": min_amount,
            "max_amount": max_amount,
            "date_from": date_from,
            "date_to": date_to,
        }
        conditions = self._conditions(user_id, **filters)
        matches = (await self.db.scalar(select(func.count(Transaction.id)).where(*conditions))) or 0
        if matches > EXPORT_LIMIT:
            raise TransactionRuleError(
                f"{matches:,} transactions match; exports are limited to {EXPORT_LIMIT:,}. "
                "Narrow the filters and try again."
            )
        stmt = (
            select(Transaction)
            .where(*conditions)
            .order_by(Transaction.transaction_date, Transaction.created_at)
        )
        rows = list((await self.db.scalars(stmt)).all())
        return build_workbook(
            rows,
            base_currency=await self._base_currency(user_id),
            filter_labels=await self._filter_labels(user_id, **filters),
            generated_on=date.today(),
        )

    async def _filter_labels(
        self,
        user_id: uuid.UUID,
        *,
        transaction_type: TransactionType | None,
        vendor_id: uuid.UUID | None,
        subscription_id: uuid.UUID | None,
        account_id: uuid.UUID | None,
        payment_method: PaymentMethod | None,
        currency: str | None,
        q: str | None,
        min_amount: Decimal | None,
        max_amount: Decimal | None,
        date_from: date | None,
        date_to: date | None,
    ) -> list[str]:
        """Human-readable description of the active filters, for the Summary sheet."""
        labels: list[str] = []
        if q and q.strip():
            labels.append(f"Search: {q.strip()}")
        if transaction_type is not None:
            labels.append(f"Type: {transaction_type.value}")
        if payment_method is not None:
            labels.append(f"Payment method: {payment_method.value.replace('_', ' ')}")
        if currency:
            labels.append(f"Currency: {currency.upper()}")
        if vendor_id is not None:
            vendor = await self.vendors.get(user_id, vendor_id)
            labels.append(f"Vendor: {vendor.name if vendor else 'unknown'}")
        if account_id is not None:
            account = await self._resolve_account_or_none(user_id, account_id)
            labels.append(f"Account: {account.name if account else 'unknown'}")
        if subscription_id is not None:
            labels.append("Subscription: selected")
        if min_amount is not None or max_amount is not None:
            low = f"{min_amount:,}" if min_amount is not None else "any"
            high = f"{max_amount:,}" if max_amount is not None else "any"
            labels.append(f"Amount: {low} to {high}")
        if date_from is not None or date_to is not None:
            start = date_from.isoformat() if date_from else "start"
            end = date_to.isoformat() if date_to else "today"
            labels.append(f"Dates: {start} to {end}")
        return labels

    async def _resolve_account_or_none(
        self, user_id: uuid.UUID, account_id: uuid.UUID
    ) -> Account | None:
        stmt = select(Account).where(Account.id == account_id, Account.user_id == user_id)
        return await self.db.scalar(stmt)

    async def get(self, user_id: uuid.UUID, transaction_id: uuid.UUID) -> Transaction | None:
        stmt = select(Transaction).where(
            Transaction.id == transaction_id, Transaction.user_id == user_id
        )
        return await self.db.scalar(stmt)

    async def update(self, transaction: Transaction, data: TransactionUpdate) -> Transaction:
        changes = data.model_dump(exclude_unset=True)
        user_id = transaction.user_id
        old_type = transaction.type
        new_type = changes.get("type", old_type)
        is_transfer = new_type is TransactionType.TRANSFER

        # Links. An explicit null unlinks.
        if "vendor_id" in changes or "vendor_name" in changes:
            transaction.vendor = await self._resolve_vendor(
                user_id, changes.pop("vendor_id", None), changes.pop("vendor_name", None)
            )
        if "subscription_id" in changes:
            transaction.subscription = await self._resolve_subscription(
                user_id, changes.pop("subscription_id")
            )
            if transaction.subscription and new_type is not TransactionType.EXPENSE:
                raise TransactionRuleError("Only expenses can belong to a subscription")
        account = transaction.account
        if "account_id" in changes:
            account = await self._resolve_account(user_id, changes.pop("account_id"))
        to_account = transaction.to_account
        if "to_account_id" in changes:
            to_account = await self._resolve_account(user_id, changes.pop("to_account_id"))
        if not is_transfer:
            to_account = None  # only transfers have a destination

        # Money fields: recompute whenever something that feeds them changed.
        if data.model_fields_set & MONEY_KEYS:
            currency = changes.get("currency", transaction.currency)
            rate = changes.get("exchange_rate")
            # A stored rate only carries over while the currency stays the same: switching to
            # another foreign currency needs a new rate.
            if rate is None and currency == transaction.currency:
                rate = transaction.exchange_rate
            money = self._money_fields(
                transaction_type=new_type,
                amount=changes.get("amount", transaction.amount),
                currency=currency,
                exchange_rate=rate,
                account=account,
                to_account=to_account,
                to_amount=changes.get("to_amount", transaction.to_amount),
                base=await self._base_currency(user_id),
            )
            for field, value in money.items():
                setattr(transaction, field, value)
            for key in ("currency", "exchange_rate", "to_amount"):
                changes.pop(key, None)
        transaction.account = account
        transaction.to_account = to_account

        # Type-specific housekeeping when the kind of transaction changes.
        if is_transfer:
            transaction.vendor = None
            transaction.subscription = None
            changes.pop("category", None)
            changes.pop("payment_method", None)
            transaction.category = TRANSFER_CATEGORY
            transaction.payment_method = TRANSFER_PAYMENT_METHOD
        elif old_type is TransactionType.TRANSFER:
            if "category" not in changes:
                raise TransactionRuleError("Choose a category for this transaction")
            if "payment_method" not in changes:
                raise TransactionRuleError("Choose a payment method for this transaction")
        elif new_type is not TransactionType.EXPENSE:
            transaction.subscription = None  # income can't be a subscription payment

        for field, value in changes.items():
            setattr(transaction, field, value)
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction

    async def delete(self, transaction: Transaction) -> None:
        await self.db.delete(transaction)
        await self.db.flush()
