import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import case, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import LIABILITY_GROUPS, TransactionType
from app.models import Account, Transaction, User
from app.schemas import AccountCreate, AccountResponse, AccountSummary, AccountUpdate
from app.services.money import BASE_AMOUNT_QUANTUM, price_in_base


class AccountNotFoundError(Exception):
    pass


class AccountCurrencyMismatchError(Exception):
    def __init__(self, currency: str) -> None:
        super().__init__(currency)
        self.currency = currency


class AccountHasTransactionsError(Exception):
    """The account's currency can't change while transactions are linked to it."""


class AccountService:
    """Business logic for accounts. Balances are computed from linked transactions."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _base_currency(self, user_id: uuid.UUID) -> str:
        user = await self.db.get(User, user_id)
        assert user is not None
        return user.base_currency

    @staticmethod
    def _conditions(user_id: uuid.UUID, q: str | None, archived: bool = False) -> list:
        """Filters shared by the list and the count. `q` is a case-insensitive "contains" over
        name and description; %, _ and backslash in it are matched literally. Archived accounts are
        left out unless `archived` asks for exactly those."""
        conditions = [
            Account.user_id == user_id,
            Account.archived_at.is_not(None) if archived else Account.archived_at.is_(None),
        ]
        if q and q.strip():
            term = q.strip()
            conditions.append(
                or_(
                    Account.name.icontains(term, autoescape=True),
                    Account.description.icontains(term, autoescape=True),
                )
            )
        return conditions

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        q: str | None = None,
        archived: bool = False,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[Account]:
        stmt = select(Account).where(*self._conditions(user_id, q, archived)).order_by(Account.name)
        if limit is not None:
            stmt = stmt.limit(limit).offset(offset)
        return list((await self.db.scalars(stmt)).all())

    async def count_for_user(
        self, user_id: uuid.UUID, *, q: str | None = None, archived: bool = False
    ) -> int:
        stmt = select(func.count(Account.id)).where(*self._conditions(user_id, q, archived))
        return (await self.db.scalar(stmt)) or 0

    async def get(self, user_id: uuid.UUID, account_id: uuid.UUID) -> Account | None:
        stmt = select(Account).where(Account.id == account_id, Account.user_id == user_id)
        return await self.db.scalar(stmt)

    async def create(self, user_id: uuid.UUID, data: AccountCreate) -> Account:
        base = await self._base_currency(user_id)
        currency = data.currency or base
        rate, _ = price_in_base(Decimal(1), currency, data.exchange_rate, base)
        account = Account(
            user_id=user_id,
            group=data.group,
            name=data.name,
            opening_amount=data.opening_amount,
            currency=currency,
            exchange_rate=rate,
            description=data.description,
        )
        self.db.add(account)
        await self.db.flush()
        await self.db.refresh(account)
        return account

    async def _transaction_count(self, account_id: uuid.UUID) -> int:
        stmt = select(func.count(Transaction.id)).where(
            or_(Transaction.account_id == account_id, Transaction.to_account_id == account_id),
            Transaction.deleted_at.is_(None),
        )
        return (await self.db.scalar(stmt)) or 0

    async def archive(self, account: Account) -> Account:
        """Close the account: it leaves the overview and pickers but keeps its history."""
        if account.archived_at is None:
            account.archived_at = datetime.now(UTC)
            # An archived account can't be where a new transaction starts.
            await self.db.execute(
                update(User)
                .where(User.id == account.user_id, User.default_account_id == account.id)
                .values(default_account_id=None)
            )
            await self.db.flush()
        return account

    async def unarchive(self, account: Account) -> Account:
        account.archived_at = None
        await self.db.flush()
        return account

    async def update(self, account: Account, data: AccountUpdate) -> Account:
        changes = data.model_dump(exclude_unset=True)

        if changes.keys() & {"currency", "exchange_rate"}:
            base = await self._base_currency(account.user_id)
            currency = changes.get("currency", account.currency)
            if currency != account.currency and await self._transaction_count(account.id):
                raise AccountHasTransactionsError
            rate = changes.pop("exchange_rate", None)
            # A stored rate only carries over while the currency stays the same.
            if rate is None and currency == account.currency:
                rate = account.exchange_rate
            account.exchange_rate, _ = price_in_base(Decimal(1), currency, rate, base)

        for field, value in changes.items():
            setattr(account, field, value)
        await self.db.flush()
        await self.db.refresh(account)
        return account

    async def delete(self, account: Account) -> None:
        await self.db.delete(account)
        await self.db.flush()

    async def present(self, accounts: list[Account]) -> list[AccountResponse]:
        """Attach the computed balance.

        balance = opening amount + income - expenses - transfers out + transfers in, where a
        transfer's inflow is its `to_amount` (in this account's currency).
        """
        ids = [a.id for a in accounts]
        totals: dict[uuid.UUID, tuple[Decimal, int]] = {}

        def add(account_id: uuid.UUID, amount: object, count: int) -> None:
            moved, seen = totals.get(account_id, (Decimal(0), 0))
            totals[account_id] = (moved + Decimal(str(amount)), seen + count)

        if ids:
            # Money that touched the account as income / expense / the source of a transfer.
            signed = case(
                (Transaction.type == TransactionType.INCOME, Transaction.amount),
                else_=-Transaction.amount,
            )
            direct = (
                select(Transaction.account_id, func.sum(signed), func.count(Transaction.id))
                .where(Transaction.account_id.in_(ids), Transaction.deleted_at.is_(None))
                .group_by(Transaction.account_id)
            )
            for account_id, total, count in (await self.db.execute(direct)).all():
                add(account_id, total or 0, count)

            # Money that arrived by transfer.
            incoming = (
                select(
                    Transaction.to_account_id,
                    func.sum(Transaction.to_amount),
                    func.count(Transaction.id),
                )
                .where(Transaction.to_account_id.in_(ids), Transaction.deleted_at.is_(None))
                .group_by(Transaction.to_account_id)
            )
            for account_id, total, count in (await self.db.execute(incoming)).all():
                add(account_id, total or 0, count)

        out = []
        for a in accounts:
            moved, count = totals.get(a.id, (Decimal(0), 0))
            balance = a.opening_amount + moved
            out.append(
                AccountResponse(
                    id=a.id,
                    group=a.group,
                    name=a.name,
                    opening_amount=a.opening_amount,
                    currency=a.currency,
                    exchange_rate=a.exchange_rate,
                    description=a.description,
                    is_liability=a.group in LIABILITY_GROUPS,
                    balance=balance,
                    base_balance=(balance * a.exchange_rate).quantize(BASE_AMOUNT_QUANTUM),
                    transaction_count=count,
                    archived_at=a.archived_at,
                    created_at=a.created_at,
                )
            )
        return out

    async def summary(self, user_id: uuid.UUID) -> AccountSummary:
        accounts = await self.present(await self.list_for_user(user_id))
        assets = sum((a.base_balance for a in accounts if not a.is_liability), Decimal(0))
        liabilities = sum((-a.base_balance for a in accounts if a.is_liability), Decimal(0))
        return AccountSummary(
            assets=assets,
            liabilities=liabilities,
            total=assets - liabilities,
            currency=await self._base_currency(user_id),
        )
