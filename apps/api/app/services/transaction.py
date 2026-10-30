import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.allocation import allocate_base
from app.enums import PaymentMethod, TransactionType
from app.export import EXPORT_LIMIT, build_workbook
from app.models import (
    Account,
    Category,
    Subscription,
    Tag,
    Transaction,
    TransactionSplit,
    User,
    Vendor,
)
from app.schemas import (
    MAX_SELECT_ALL,
    BulkResult,
    BulkSkipped,
    BulkUpdate,
    CategoryTotal,
    CategoryTotals,
    PostPlanned,
    SplitInput,
    TagMatch,
    TransactionCreate,
    TransactionTotals,
    TransactionUpdate,
)
from app.services.account import AccountCurrencyMismatchError, AccountNotFoundError
from app.services.category import CategoryService, normalize_name
from app.services.errors import TransactionNotPlannedError, TransactionRuleError
from app.services.money import BASE_AMOUNT_QUANTUM, price_in_base
from app.services.subscription import SubscriptionNotFoundError
from app.services.tag import TagService
from app.services.vendor import VendorNotFoundError, VendorService

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


def _not_applicable(t: Transaction, data: BulkUpdate) -> str:
    """Why nothing in a bulk update could be applied to this transaction."""
    if t.type is TransactionType.TRANSFER:
        return "A transfer has no category, vendor or payment method"
    if data.category and t.splits and not (data.vendor_name or data.payment_method):
        return "A split transaction takes its category from its items"
    if data.category and t.refund_of_id and not (data.vendor_name or data.payment_method):
        return "A refund takes its category from the purchase"
    if data.category and Decimal(str(getattr(t, "refunded_amount", 0) or 0)) > 0:
        return "A purchase with refunds keeps its category"
    return "Nothing to change"


class TransactionService:
    """Business logic for transactions. Knows nothing about HTTP."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.vendors = VendorService(db)
        self.categories = CategoryService(db)
        self.tags = TagService(db)

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
        self,
        user_id: uuid.UUID,
        account_id: uuid.UUID | None,
        *,
        keep_archived: bool = False,
    ) -> Account | None:
        """`keep_archived` lets a transaction stay in an account that was archived after it."""
        if account_id is None:
            return None
        stmt = select(Account).where(Account.id == account_id, Account.user_id == user_id)
        account = await self.db.scalar(stmt)
        if account is None:
            raise AccountNotFoundError
        if account.archived_at is not None and not keep_archived:
            raise TransactionRuleError(f'"{account.name}" is archived. Unarchive it to use it')
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

    async def _build_splits(
        self, user_id: uuid.UUID, splits: list[SplitInput]
    ) -> list[TransactionSplit]:
        resolved: dict[str, Category] = {}
        lines = []
        for position, s in enumerate(splits):
            if s.category not in resolved:
                resolved[s.category] = await self.categories.get_or_create(user_id, s.category)
            lines.append(
                TransactionSplit(
                    position=position,
                    name=s.name,
                    quantity=s.quantity,
                    category_ref=resolved[s.category],
                    amount=s.amount,
                    tax_amount=s.tax_amount,
                )
            )
        return lines

    # --- Refunds ------------------------------------------------------------------------------

    async def _refund_original(self, user_id: uuid.UUID, original_id: uuid.UUID) -> Transaction:
        """The purchase a refund is for: one of your posted, live expenses."""
        stmt = select(Transaction).where(
            Transaction.id == original_id,
            Transaction.user_id == user_id,
            Transaction.live(),
            Transaction.planned.is_(False),
            Transaction.type == TransactionType.EXPENSE,
        )
        original = await self.db.scalar(stmt)
        if original is None:
            raise TransactionRuleError(
                "That purchase can't be refunded: it is not one of your expenses"
            )
        return original

    @staticmethod
    def _refund_parts(
        original: Transaction, inputs: list[SplitInput] | None
    ) -> tuple[Category | None, list[TransactionSplit]]:
        """A refund's category, or its item lines. A purchase without items is refunded in its own
        category; one with items is refunded item by item, each line taking that item's name and
        category, so the money is taken off the right categories."""
        if not original.splits:
            if inputs:
                raise TransactionRuleError("This purchase has no items to refund one by one")
            return original.category_ref, []
        if not inputs:
            raise TransactionRuleError("Choose which items are being refunded")
        by_id = {s.id: s for s in original.splits}
        lines = []
        for position, s in enumerate(inputs):
            item = by_id.get(s.refund_of_split_id) if s.refund_of_split_id else None
            if item is None:
                raise TransactionRuleError("Name the item of the purchase that each line refunds")
            lines.append(
                TransactionSplit(
                    position=position,
                    name=item.name,
                    quantity=s.quantity,
                    category_ref=item.category_ref,
                    amount=s.amount,
                    tax_amount=s.tax_amount,
                    refund_of_split_id=item.id,
                )
            )
        return None, lines

    async def _refunded(self, original_id: uuid.UUID, exclude: uuid.UUID | None) -> Decimal:
        """What the live refunds of a purchase gave back, leaving out the refund `exclude`."""
        stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.refund_of_id == original_id, Transaction.deleted_at.is_(None)
        )
        if exclude is not None:
            stmt = stmt.where(Transaction.id != exclude)
        return Decimal(str(await self.db.scalar(stmt) or 0))

    async def _refunded_on_item(self, item_id: uuid.UUID, exclude: uuid.UUID | None) -> Decimal:
        stmt = (
            select(func.coalesce(func.sum(TransactionSplit.amount), 0))
            .join(Transaction, Transaction.id == TransactionSplit.transaction_id)
            .where(TransactionSplit.refund_of_split_id == item_id, Transaction.deleted_at.is_(None))
        )
        if exclude is not None:
            stmt = stmt.where(Transaction.id != exclude)
        return Decimal(str(await self.db.scalar(stmt) or 0))

    async def _check_refund(
        self,
        original: Transaction,
        *,
        amount: Decimal,
        currency: str,
        lines: list[TransactionSplit],
        exclude: uuid.UUID | None = None,
    ) -> None:
        """A refund can give back no more than is left of the purchase (or of each item), in the
        purchase's currency. `exclude` is the refund being changed, so it does not count twice."""
        if currency != original.currency:
            raise TransactionRuleError(
                f"A refund must be in the currency of the purchase ({original.currency})"
            )
        if original.splits:
            seen: set[uuid.UUID] = set()
            for line in lines:
                item_id = line.refund_of_split_id
                if item_id in seen:
                    raise TransactionRuleError("An item can be refunded only once in one refund")
                seen.add(item_id)
                item = next(s for s in original.splits if s.id == item_id)
                left = item.amount - await self._refunded_on_item(item_id, exclude)
                if line.amount > left:
                    raise TransactionRuleError(
                        f'Only {left:,.2f} of "{item.name}" is left to refund'
                    )
            return
        left = original.amount - await self._refunded(original.id, exclude)
        if amount > left:
            raise TransactionRuleError(f"Only {left:,.2f} of this purchase is left to refund")

    @staticmethod
    def _same_lines(existing: list[TransactionSplit], new: list[SplitInput] | None) -> bool:
        """Whether a purchase's items are being sent back unchanged."""
        if not new or len(new) != len(existing):
            return False
        return all(
            (e.name, e.quantity, e.category, e.amount, e.tax_amount)
            == (n.name, n.quantity, n.category, n.amount, n.tax_amount)
            for e, n in zip(existing, new, strict=True)
        )

    @staticmethod
    def _has_refunds(transaction: Transaction) -> bool:
        """Whether live refunds give back part of this purchase (loaded with the row)."""
        return Decimal(str(getattr(transaction, "refunded_amount", 0) or 0)) > 0

    @staticmethod
    def _check_splits(transaction: Transaction) -> None:
        """If the transaction is split, its lines must add up to the amount, and its own category
        follows the biggest line so category filters and the list keep working."""
        if not transaction.splits:
            return
        total = sum((s.amount for s in transaction.splits), Decimal(0))
        if total != transaction.amount:
            raise TransactionRuleError(
                f"The items add up to {total:,} but the total is {transaction.amount:,}"
            )
        transaction.category_ref = max(transaction.splits, key=lambda s: s.amount).category_ref

    async def create(self, user_id: uuid.UUID, data: TransactionCreate) -> Transaction:
        base = await self._base_currency(user_id)
        account = await self._resolve_account(user_id, data.account_id)
        to_account = await self._resolve_account(user_id, data.to_account_id)
        original = (
            await self._refund_original(user_id, data.refund_of_id) if data.refund_of_id else None
        )
        currency, rate = data.currency, data.exchange_rate
        if original is not None:  # a refund is in the purchase's currency, at its rate by default
            currency = currency or original.currency
            if rate is None and currency == original.currency:
                rate = original.exchange_rate
        money = self._money_fields(
            transaction_type=data.type,
            amount=data.amount,
            currency=currency,
            exchange_rate=rate,
            account=account,
            to_account=to_account,
            to_amount=data.to_amount,
            base=base,
        )
        is_transfer = data.type is TransactionType.TRANSFER
        if original is not None:
            category_ref, refund_lines = self._refund_parts(original, data.splits)
            await self._check_refund(
                original, amount=data.amount, currency=money["currency"], lines=refund_lines
            )
        else:
            category_ref = (
                await self.categories.get_or_create(user_id, data.category)
                if data.category and not is_transfer and not data.splits
                else None
            )
            refund_lines = []
        transaction = Transaction(
            user_id=user_id,
            type=data.type,
            amount=data.amount,
            # a split transaction without its own category takes the biggest item's (_check_splits)
            category_ref=category_ref,
            splits=refund_lines
            or (await self._build_splits(user_id, data.splits) if data.splits else []),
            refund_of=original,
            payment_method=TRANSFER_PAYMENT_METHOD
            if is_transfer
            else (data.payment_method or (original.payment_method if original else None)),
            description=data.description,
            transaction_date=data.transaction_date,
            transaction_time=data.transaction_time,
            planned=data.planned,
            account=account,
            to_account=to_account,
            vendor=await self._resolve_vendor(user_id, data.vendor_id, data.vendor_name)
            or (
                original.vendor
                if original and not data.vendor_id and not data.vendor_name
                else None
            ),
            subscription=await self._resolve_subscription(user_id, data.subscription_id),
            tags=await self.tags.resolve_many(user_id, data.tags or []),
            **money,
        )
        self._check_splits(transaction)
        self.db.add(transaction)
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction

    async def _family(
        self, user_id: uuid.UUID, category_id: uuid.UUID | None
    ) -> list[uuid.UUID] | None:
        """The category, and its sub-categories when it is a parent: what a filter on it covers."""
        return None if category_id is None else await self.categories.family(user_id, category_id)

    async def _build_conditions(self, user_id: uuid.UUID, **filters) -> list:
        """`_conditions` for the same filters, with a category filter widened to its family."""
        category_id = filters.pop("category_id", None)
        return self._conditions(
            user_id, category_ids=await self._family(user_id, category_id), **filters
        )

    @staticmethod
    def _conditions(
        user_id: uuid.UUID,
        *,
        transaction_type: TransactionType | None,
        vendor_id: uuid.UUID | None,
        subscription_id: uuid.UUID | None,
        account_id: uuid.UUID | None,
        category_ids: list[uuid.UUID] | None,
        tag_ids: list[uuid.UUID] | None = None,
        tag_match: TagMatch = "any",
        payment_method: PaymentMethod | None,
        currency: str | None,
        q: str | None = None,
        min_amount: Decimal | None = None,
        max_amount: Decimal | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        trashed: bool = False,
        planned: bool = False,
    ) -> list:
        """Filters shared by the list, the count and the totals, so they always agree.

        `q` is a case-insensitive "contains" over category, description, vendor, subscription and
        account names (a transfer matches either of its accounts). `%`, `_` and `\\` in it are
        matched literally, not as wildcards. The amount range compares `base_amount` (your base
        currency), so transactions in different currencies are comparable. Dates are inclusive.
        """
        conditions = [
            Transaction.user_id == user_id,
            Transaction.deleted_at.is_not(None) if trashed else Transaction.deleted_at.is_(None),
        ]
        if not trashed:
            # The list and everything computed from it shows posted transactions; planned ones are
            # their own list ("upcoming") and never counted.
            conditions.append(Transaction.planned.is_(planned))
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
                    Transaction.category_ref.has(Category.name.icontains(term, autoescape=True)),
                    Transaction.splits.any(
                        or_(
                            TransactionSplit.name.icontains(term, autoescape=True),
                            TransactionSplit.category_ref.has(
                                Category.name.icontains(term, autoescape=True)
                            ),
                        )
                    ),
                    Transaction.description.icontains(term, autoescape=True),
                    Transaction.vendor.has(Vendor.name.icontains(term, autoescape=True)),
                    Transaction.subscription.has(
                        Subscription.name.icontains(term, autoescape=True)
                    ),
                    Transaction.account.has(Account.name.icontains(term, autoescape=True)),
                    Transaction.to_account.has(Account.name.icontains(term, autoescape=True)),
                    Transaction.tags.any(Tag.name.icontains(term, autoescape=True)),
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
        if category_ids:  # the transaction's own category, or any of its items' (a parent's family)
            conditions.append(
                or_(
                    Transaction.category_id.in_(category_ids),
                    Transaction.splits.any(TransactionSplit.category_id.in_(category_ids)),
                )
            )
        if tag_ids:
            if tag_match == "all":  # every one of the tags
                conditions.extend(Transaction.tags.any(Tag.id == tag_id) for tag_id in tag_ids)
            else:  # any one of them
                conditions.append(Transaction.tags.any(Tag.id.in_(tag_ids)))
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
        category_id: uuid.UUID | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        tag_match: TagMatch = "any",
        payment_method: PaymentMethod | None = None,
        currency: str | None = None,
        q: str | None = None,
        min_amount: Decimal | None = None,
        max_amount: Decimal | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        planned: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Transaction]:
        conditions = await self._build_conditions(
            user_id,
            transaction_type=transaction_type,
            vendor_id=vendor_id,
            subscription_id=subscription_id,
            account_id=account_id,
            category_id=category_id,
            tag_ids=tag_ids,
            tag_match=tag_match,
            payment_method=payment_method,
            currency=currency,
            q=q,
            min_amount=min_amount,
            max_amount=max_amount,
            date_from=date_from,
            date_to=date_to,
            planned=planned,
        )
        # Upcoming ones read soonest first; the rest newest first.
        order = (
            (
                Transaction.transaction_date,
                Transaction.transaction_time.asc().nulls_last(),
                Transaction.created_at,
            )
            if planned
            else (
                Transaction.transaction_date.desc(),
                Transaction.transaction_time.desc().nulls_last(),
                Transaction.created_at.desc(),
            )
        )
        stmt = select(Transaction).where(*conditions).order_by(*order).limit(limit).offset(offset)
        return list((await self.db.scalars(stmt)).all())

    async def ids_for_user(self, user_id: uuid.UUID, **filters) -> list[uuid.UUID]:
        """The ids of every transaction the same filters as the list match (not just one page), for
        "select everything that matches". Raises TransactionRuleError past MAX_SELECT_ALL instead of
        handing back a part of them."""
        conditions = await self._build_conditions(user_id, **filters)
        matches = (await self.db.scalar(select(func.count(Transaction.id)).where(*conditions))) or 0
        self._check_select_all(matches)
        return list((await self.db.scalars(select(Transaction.id).where(*conditions))).all())

    @staticmethod
    def _check_select_all(matches: int) -> None:
        if matches > MAX_SELECT_ALL:
            raise TransactionRuleError(
                f"{matches:,} transactions match; you can select up to {MAX_SELECT_ALL:,} at once. "
                "Narrow the filters and try again."
            )

    async def count_for_user(
        self,
        user_id: uuid.UUID,
        *,
        transaction_type: TransactionType | None = None,
        vendor_id: uuid.UUID | None = None,
        subscription_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        category_id: uuid.UUID | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        tag_match: TagMatch = "any",
        payment_method: PaymentMethod | None = None,
        currency: str | None = None,
        q: str | None = None,
        min_amount: Decimal | None = None,
        max_amount: Decimal | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        planned: bool = False,
    ) -> int:
        conditions = await self._build_conditions(
            user_id,
            transaction_type=transaction_type,
            vendor_id=vendor_id,
            subscription_id=subscription_id,
            account_id=account_id,
            category_id=category_id,
            tag_ids=tag_ids,
            tag_match=tag_match,
            payment_method=payment_method,
            currency=currency,
            q=q,
            min_amount=min_amount,
            max_amount=max_amount,
            date_from=date_from,
            date_to=date_to,
            planned=planned,
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
        category_id: uuid.UUID | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        tag_match: TagMatch = "any",
        payment_method: PaymentMethod | None = None,
        currency: str | None = None,
        q: str | None = None,
        min_amount: Decimal | None = None,
        max_amount: Decimal | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> TransactionTotals:
        """Income and expense totals (base currency) for the rows the same filters would list."""
        conditions = await self._build_conditions(
            user_id,
            transaction_type=transaction_type,
            vendor_id=vendor_id,
            subscription_id=subscription_id,
            account_id=account_id,
            category_id=category_id,
            tag_ids=tag_ids,
            tag_match=tag_match,
            payment_method=payment_method,
            currency=currency,
            q=q,
            min_amount=min_amount,
            max_amount=max_amount,
            date_from=date_from,
            date_to=date_to,
        )
        ids = await self._family(user_id, category_id)
        money = Transaction.type.in_([TransactionType.INCOME, TransactionType.EXPENSE])
        stmt = (
            select(Transaction.type, Transaction.is_refund(), func.sum(Transaction.base_amount))
            .where(*conditions, money)
            .group_by(Transaction.type, Transaction.is_refund())
        )
        if ids is not None:
            # Only the part of a split transaction that is in this category counts, not all of it.
            stmt = stmt.where(~Transaction.splits.any())
        income = expense = refunded = Decimal(0)

        def put(kind: TransactionType, is_refund: bool, amount: Decimal) -> None:
            """A refund is money back for spending: it takes away from expense, not adds to
            income."""
            nonlocal income, expense, refunded
            if is_refund:
                refunded += amount
                expense -= amount
            elif kind is TransactionType.INCOME:
                income += amount
            else:
                expense += amount

        for kind, is_refund, total in (await self.db.execute(stmt)).all():
            put(kind, bool(is_refund), Decimal(str(total or 0)))
        if ids is not None:
            for t, _category, share in await self._split_shares(conditions, money, ids):
                put(t.type, t.refund_of_id is not None, share)
        return TransactionTotals(
            income=income,
            expense=expense,
            refunded=refunded,
            currency=await self._base_currency(user_id),
        )

    async def _split_shares(
        self, conditions: list, money, category_ids: list[uuid.UUID] | None
    ) -> list[tuple[Transaction, Category, Decimal]]:
        """(transaction, category, base-currency share) of every item of the matching split
        transactions, or only of the items in `category_ids` when given."""
        stmt = select(Transaction).where(*conditions, money, Transaction.splits.any())
        out = []
        for t in (await self.db.scalars(stmt)).all():
            shares = allocate_base(t.base_amount, t.amount, [s.amount for s in t.splits])
            for line, share in zip(t.splits, shares, strict=True):
                if category_ids is None or line.category_id in category_ids:
                    out.append((t, line.category_ref, share))
        return out

    async def category_totals_for_user(
        self,
        user_id: uuid.UUID,
        *,
        transaction_type: TransactionType | None = None,
        vendor_id: uuid.UUID | None = None,
        subscription_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        category_id: uuid.UUID | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        tag_match: TagMatch = "any",
        payment_method: PaymentMethod | None = None,
        currency: str | None = None,
        q: str | None = None,
        min_amount: Decimal | None = None,
        max_amount: Decimal | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> CategoryTotals:
        """Income and expense per category (base currency) for the rows the same filters would list.

        Plain transactions count under their own category. A split transaction counts under each
        of its lines' categories, with its base amount shared out in proportion to the lines. A
        refund is money back for spending: it counts under the same categories as an expense, taking
        away what it gives back, and is not income.
        """
        conditions = await self._build_conditions(
            user_id,
            transaction_type=transaction_type,
            vendor_id=vendor_id,
            subscription_id=subscription_id,
            account_id=account_id,
            category_id=category_id,
            tag_ids=tag_ids,
            tag_match=tag_match,
            payment_method=payment_method,
            currency=currency,
            q=q,
            min_amount=min_amount,
            max_amount=max_amount,
            date_from=date_from,
            date_to=date_to,
        )
        money = Transaction.type.in_([TransactionType.INCOME, TransactionType.EXPENSE])
        totals: dict[tuple[TransactionType, uuid.UUID], list] = {}
        ids = await self._family(user_id, category_id)

        def add(kind: TransactionType, category: Category, amount: Decimal, count: int) -> None:
            entry = totals.setdefault((kind, category.id), [category, Decimal(0), 0])
            entry[1] += amount
            entry[2] += count

        plain = (
            select(
                Transaction.type,
                Transaction.is_refund(),
                Category,
                func.sum(Transaction.base_amount),
                func.count(Transaction.id),
            )
            .join(Category, Category.id == Transaction.category_id)
            .where(*conditions, money, ~Transaction.splits.any())
            .group_by(Transaction.type, Transaction.is_refund(), Category.id)
        )
        for kind, is_refund, category, total, count in (await self.db.execute(plain)).all():
            amount = Decimal(str(total or 0))
            if is_refund:
                add(TransactionType.EXPENSE, category, -amount, count)
            else:
                add(kind, category, amount, count)

        # A split transaction counts once toward each category its items are in.
        touched: dict[tuple[TransactionType, uuid.UUID, uuid.UUID], bool] = {}
        split_stmt = select(Transaction).where(*conditions, money, Transaction.splits.any())
        for t in (await self.db.scalars(split_stmt)).all():
            shares = allocate_base(t.base_amount, t.amount, [s.amount for s in t.splits])
            kind = TransactionType.EXPENSE if t.refund_of_id else t.type
            for line, share in zip(t.splits, shares, strict=True):
                if ids is not None and line.category_id not in ids:
                    continue
                first = (kind, t.id, line.category_id) not in touched
                touched[(kind, t.id, line.category_id)] = True
                add(kind, line.category_ref, share * t.spending_sign, 1 if first else 0)

        parent_ids = {c.parent_id for c, _total, _count in totals.values() if c.parent_id}
        parents = {
            pid: (name, color)
            for pid, name, color in (
                await self.db.execute(
                    select(Category.id, Category.name, Category.color).where(
                        Category.id.in_(parent_ids)
                    )
                )
            ).all()
        }
        rows = [
            CategoryTotal(
                type=kind.value,
                category_id=category.id,
                category=category.name,
                color=category.color,
                parent_id=category.parent_id,
                parent=parents.get(category.parent_id, (None, None))[0],
                parent_color=parents.get(category.parent_id, (None, None))[1],
                total=total,
                count=count,
            )
            for (kind, _), (category, total, count) in totals.items()
        ]
        rows.sort(key=lambda r: (r.type, -r.total, r.category))
        return CategoryTotals(currency=await self._base_currency(user_id), categories=rows)

    async def export_xlsx(
        self,
        user_id: uuid.UUID,
        *,
        transaction_type: TransactionType | None = None,
        vendor_id: uuid.UUID | None = None,
        subscription_id: uuid.UUID | None = None,
        account_id: uuid.UUID | None = None,
        category_id: uuid.UUID | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        tag_match: TagMatch = "any",
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
            "category_id": category_id,
            "tag_ids": tag_ids,
            "tag_match": tag_match,
            "payment_method": payment_method,
            "currency": currency,
            "q": q,
            "min_amount": min_amount,
            "max_amount": max_amount,
            "date_from": date_from,
            "date_to": date_to,
        }
        conditions = await self._build_conditions(user_id, **filters)
        ids = await self._family(user_id, category_id)
        matches = (await self.db.scalar(select(func.count(Transaction.id)).where(*conditions))) or 0
        if matches > EXPORT_LIMIT:
            raise TransactionRuleError(
                f"{matches:,} transactions match; exports are limited to {EXPORT_LIMIT:,}. "
                "Narrow the filters and try again."
            )
        stmt = (
            select(Transaction)
            .where(*conditions)
            .order_by(
                Transaction.transaction_date,
                Transaction.transaction_time.asc().nulls_last(),
                Transaction.created_at,
            )
        )
        rows = list((await self.db.scalars(stmt)).all())
        return build_workbook(
            rows,
            base_currency=await self._base_currency(user_id),
            filter_labels=await self._filter_labels(user_id, **filters),
            generated_on=date.today(),
            category_ids=ids,
        )

    async def _filter_labels(
        self,
        user_id: uuid.UUID,
        *,
        transaction_type: TransactionType | None,
        vendor_id: uuid.UUID | None,
        subscription_id: uuid.UUID | None,
        account_id: uuid.UUID | None,
        category_id: uuid.UUID | None,
        tag_ids: list[uuid.UUID] | None = None,
        tag_match: TagMatch = "any",
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
        if category_id is not None:
            category = await self.categories.get(user_id, category_id)
            labels.append(f"Category: {category.name if category else 'unknown'}")
        if tag_ids:
            names = []
            for tag_id in tag_ids:
                tag = await self.tags.get(user_id, tag_id)
                names.append(tag.name if tag else "unknown")
            labels.append(f"Tag: {(' and ' if tag_match == 'all' else ' or ').join(names)}")
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
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
            Transaction.deleted_at.is_(None),
        )
        return await self.db.scalar(stmt)

    async def get_trashed(
        self, user_id: uuid.UUID, transaction_id: uuid.UUID
    ) -> Transaction | None:
        stmt = select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
            Transaction.deleted_at.is_not(None),
        )
        return await self.db.scalar(stmt)

    async def list_trashed(
        self, user_id: uuid.UUID, *, limit: int | None = None, offset: int = 0
    ) -> list[Transaction]:
        """The trash, most recently deleted first."""
        stmt = (
            select(Transaction)
            .where(*self._trash_conditions(user_id))
            .order_by(Transaction.deleted_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list((await self.db.scalars(stmt)).all())

    async def trashed_ids(self, user_id: uuid.UUID) -> list[uuid.UUID]:
        """The ids of everything in the trash, for "select all"."""
        self._check_select_all(await self.count_trashed(user_id))
        stmt = select(Transaction.id).where(*self._trash_conditions(user_id))
        return list((await self.db.scalars(stmt)).all())

    async def count_trashed(self, user_id: uuid.UUID) -> int:
        stmt = select(func.count(Transaction.id)).where(*self._trash_conditions(user_id))
        return (await self.db.scalar(stmt)) or 0

    @staticmethod
    def _trash_conditions(user_id: uuid.UUID) -> list:
        return [Transaction.user_id == user_id, Transaction.deleted_at.is_not(None)]

    def _guard_refunded_purchase(
        self, transaction: Transaction, changes: dict, data: TransactionUpdate
    ) -> None:
        """A purchase that has refunds keeps its amount, currency, category and items: the refunds
        were measured against them. Everything else (date, vendor, account, tags, notes) can
        change. Sending the same values back, as the edit form does, is not a change."""
        current = transaction
        new_category = changes.get("category")
        changed = (
            changes.get("type", current.type) is not current.type
            or ("amount" in changes and changes["amount"] != current.amount)
            or ("currency" in changes and changes["currency"].upper() != current.currency)
            or changes.get("planned") is True
            or (
                new_category is not None
                and not current.splits
                and normalize_name(new_category) != normalize_name(current.category)
            )
        )
        if "splits" in changes:
            if current.splits and self._same_lines(current.splits, data.splits):
                changes.pop("splits")  # unchanged: keep the rows the refunds point at
            else:
                changed = changed or bool(current.splits or data.splits)
        if changed:
            raise TransactionRuleError(
                "This purchase has refunds. Move them to the trash first to change its amount, "
                "category or items"
            )

    async def update(self, transaction: Transaction, data: TransactionUpdate) -> Transaction:
        changes = data.model_dump(exclude_unset=True)
        user_id = transaction.user_id
        old_type = transaction.type
        new_type = changes.get("type", old_type)
        is_transfer = new_type is TransactionType.TRANSFER
        if transaction.type is TransactionType.EXPENSE and self._has_refunds(transaction):
            self._guard_refunded_purchase(transaction, changes, data)

        original = transaction.refund_of  # set when this is a refund
        if original is not None:
            if new_type is not TransactionType.INCOME:
                raise TransactionRuleError("A refund is income. Unlink it from the purchase first")
            if "refund_of_id" in changes:
                if changes.pop("refund_of_id") is not None:
                    raise TransactionRuleError("A refund can't be moved to another purchase")
                # unlink: it becomes plain income, keeping its category and lines as they are
                transaction.refund_of = None
                for line in transaction.splits:
                    line.refund_of_split_id = None
                original = None
            else:
                name = changes.pop("category", None)
                if name is not None and normalize_name(name) != normalize_name(
                    transaction.category
                ):
                    raise TransactionRuleError("A refund takes its category from the purchase")
                if "splits" in changes:
                    changes.pop("splits")
                    category_ref, lines = self._refund_parts(original, data.splits)
                    transaction.splits = lines
                    if category_ref is not None:
                        transaction.category_ref = category_ref
        elif "refund_of_id" in changes:
            changes.pop("refund_of_id")  # already plain income: nothing to unlink

        # Links. An explicit null unlinks.
        if "tags" in changes:
            transaction.tags = await self.tags.resolve_many(user_id, changes.pop("tags") or [])
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
            new_id = changes.pop("account_id")
            account = await self._resolve_account(
                user_id, new_id, keep_archived=new_id == transaction.account_id
            )
        to_account = transaction.to_account
        if "to_account_id" in changes:
            new_id = changes.pop("to_account_id")
            to_account = await self._resolve_account(
                user_id, new_id, keep_archived=new_id == transaction.to_account_id
            )
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

        # Replacing the lines (explicit null removes the split).
        if "splits" in changes:
            new_splits = changes.pop("splits")
            transaction.splits = (
                await self._build_splits(user_id, data.splits) if new_splits else []
            )

        # Type-specific housekeeping when the kind of transaction changes.
        if is_transfer:
            transaction.splits = []
            transaction.vendor = None
            transaction.subscription = None
            changes.pop("category", None)
            changes.pop("payment_method", None)
            transaction.category_ref = None
            transaction.payment_method = TRANSFER_PAYMENT_METHOD
        elif old_type is TransactionType.TRANSFER:
            if "category" not in changes and not data.splits:
                raise TransactionRuleError("Choose a category for this transaction")
            if "payment_method" not in changes:
                raise TransactionRuleError("Choose a payment method for this transaction")
        elif new_type is not TransactionType.EXPENSE:
            transaction.subscription = None  # income can't be a subscription payment

        name = changes.pop("category", None)
        if name is not None and not transaction.splits:  # a split one follows its biggest item
            transaction.category_ref = await self.categories.get_or_create(user_id, name)
        for field, value in changes.items():
            setattr(transaction, field, value)
        self._check_splits(transaction)
        if original is not None:
            await self._check_refund(
                original,
                amount=transaction.amount,
                currency=transaction.currency,
                lines=list(transaction.splits),
                exclude=transaction.id,
            )
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction

    async def trash(self, transaction: Transaction) -> None:
        """Move to the trash: hidden and uncounted, but recoverable. A purchase that has refunds
        stays until its refunds are in the trash too."""
        if transaction.type is TransactionType.EXPENSE and self._has_refunds(transaction):
            raise TransactionRuleError("This purchase has refunds. Move them to the trash first")
        transaction.deleted_at = datetime.now(UTC)
        await self.db.flush()

    async def post(self, transaction: Transaction, data: PostPlanned) -> Transaction:
        """Turn a planned transaction into a real one, from now on counted. The date and amount
        can be corrected on the way (a bill is rarely exactly what was planned)."""
        if not transaction.planned:
            raise TransactionNotPlannedError
        changes: dict = {"planned": False}
        if data.transaction_date is not None:
            changes["transaction_date"] = data.transaction_date
        if "transaction_time" in data.model_fields_set:  # an explicit null clears the time
            changes["transaction_time"] = data.transaction_time
        if data.amount is not None:
            changes["amount"] = data.amount
        return await self.update(transaction, TransactionUpdate(**changes))

    async def restore(self, transaction: Transaction) -> Transaction:
        original = transaction.refund_of
        if original is not None:  # a refund needs its purchase, and room left in it
            if original.deleted_at is not None or original.planned:
                raise TransactionRuleError("Restore the purchase this refund is for first")
            await self._check_refund(
                original,
                amount=transaction.amount,
                currency=transaction.currency,
                lines=list(transaction.splits),
                exclude=transaction.id,
            )
        transaction.deleted_at = None
        await self.db.flush()
        await self.db.refresh(transaction)  # reloads what the row's own values feed (refunded)
        return transaction

    async def _bulk_rows(
        self, user_id: uuid.UUID, ids: list[uuid.UUID], *, trashed: bool
    ) -> tuple[list[Transaction], list[BulkSkipped]]:
        """The transactions with these ids that are live (or in the trash), and a "not found"
        entry for each id that is neither yours nor in that state."""
        wanted = list(dict.fromkeys(ids))  # without repeats, in order
        stmt = select(Transaction).where(
            Transaction.user_id == user_id,
            Transaction.id.in_(wanted),
            Transaction.deleted_at.is_not(None) if trashed else Transaction.deleted_at.is_(None),
        )
        rows = {t.id: t for t in (await self.db.scalars(stmt)).all()}
        missing = [
            BulkSkipped(id=i, reason="Not found" + (" in the trash" if trashed else ""))
            for i in wanted
            if i not in rows
        ]
        return [rows[i] for i in wanted if i in rows], missing

    async def bulk_trash(self, user_id: uuid.UUID, ids: list[uuid.UUID]) -> BulkResult:
        rows, skipped = await self._bulk_rows(user_id, ids, trashed=False)
        now = datetime.now(UTC)
        # Refunds first, so a purchase can go in the same batch as its refunds.
        refunds = [t for t in rows if t.refund_of_id is not None]
        for t in refunds:
            t.deleted_at = now
        await self.db.flush()
        moved = len(refunds)
        for t in rows:
            if t.refund_of_id is not None:
                continue
            still = await self.db.scalar(
                select(func.count(Transaction.id)).where(
                    Transaction.refund_of_id == t.id, Transaction.deleted_at.is_(None)
                )
            )
            if t.type is TransactionType.EXPENSE and still:
                skipped.append(
                    BulkSkipped(
                        id=t.id, reason="This purchase has refunds. Move them to the trash first"
                    )
                )
                continue
            t.deleted_at = now
            moved += 1
        await self.db.flush()
        return BulkResult(updated=moved, skipped=skipped)

    async def bulk_restore(self, user_id: uuid.UUID, ids: list[uuid.UUID]) -> BulkResult:
        rows, skipped = await self._bulk_rows(user_id, ids, trashed=True)
        restored = 0
        # Purchases first, so a refund can come back in the same batch as its purchase.
        for t in sorted(rows, key=lambda t: t.refund_of_id is not None):
            try:
                await self.restore(t)
            except TransactionRuleError as exc:
                skipped.append(BulkSkipped(id=t.id, reason=str(exc)))
            else:
                restored += 1
        return BulkResult(updated=restored, skipped=skipped)

    async def bulk_purge(self, user_id: uuid.UUID, ids: list[uuid.UUID]) -> BulkResult:
        """Delete for good: only what is already in the trash."""
        rows, skipped = await self._bulk_rows(user_id, ids, trashed=True)
        for t in rows:
            await self.db.delete(t)
        await self.db.flush()
        return BulkResult(updated=len(rows), skipped=skipped)

    async def bulk_update(self, user_id: uuid.UUID, data: BulkUpdate) -> BulkResult:
        rows, skipped = await self._bulk_rows(user_id, data.ids, trashed=False)
        category = (
            await self.categories.get_or_create(user_id, data.category) if data.category else None
        )
        vendor = (
            await self.vendors.get_or_create(user_id, data.vendor_name)
            if data.vendor_name
            else None
        )
        to_add = await self.tags.resolve_many(user_id, data.add_tags)
        to_remove = {normalize_name(n) for n in data.remove_tags}

        updated = 0
        for t in rows:
            applied = False
            transfer = t.type is TransactionType.TRANSFER
            if not transfer:
                # a refund takes its category from the purchase; so does one with refunds
                keeps_category = t.refund_of_id is not None or self._has_refunds(t)
                if category is not None and not t.splits and not keeps_category:
                    t.category_ref = category
                    applied = True
                if vendor is not None:
                    t.vendor = vendor
                    applied = True
                if data.payment_method is not None:
                    t.payment_method = data.payment_method
                    applied = True
            if to_add or to_remove:
                kept = [x for x in t.tags if x.normalized_name not in to_remove]
                have = {x.id for x in kept}
                t.tags = [*kept, *(x for x in to_add if x.id not in have)]
                applied = True
            if applied:
                updated += 1
            else:
                skipped.append(BulkSkipped(id=t.id, reason=_not_applicable(t, data)))
        await self.db.flush()
        return BulkResult(updated=updated, skipped=skipped)

    async def delete(self, transaction: Transaction) -> None:
        """Delete for good (used from the trash)."""
        await self.db.delete(transaction)
        await self.db.flush()
