import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import case, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app import card_cycle
from app.enums import (
    CREDIT_LIMIT_GROUPS,
    LIABILITY_GROUPS,
    AccountGroup,
    TransactionType,
    is_spendable,
)
from app.models import Account, Transaction, User
from app.schemas import (
    AccountBalancePoint,
    AccountCreate,
    AccountResponse,
    AccountSummary,
    AccountTrend,
    AccountUpdate,
    BalanceAfter,
    BalanceHistory,
    CardStatement,
)
from app.services.exchange_rate import MarketRateUnavailableError, market_rate
from app.services.money import BASE_AMOUNT_QUANTUM, price_in_base


class AccountNotFoundError(Exception):
    pass


class AccountCurrencyMismatchError(Exception):
    def __init__(self, currency: str) -> None:
        super().__init__(currency)
        self.currency = currency


class AccountNumberTakenError(Exception):
    """Another of the user's accounts already has this account number."""

    def __init__(self, name: str) -> None:
        super().__init__(name)
        self.name = name


class AccountAutoRateError(Exception):
    """An account in the base currency has no rate to keep up to date."""


class AccountLimitError(Exception):
    """A credit limit on an account that cannot have one."""


class AccountSpendableError(Exception):
    """An account that is owed money (a card, overdraft or loan) can't be everyday money."""


class AccountStatementError(Exception):
    """Statement days on something that is not a credit card, or only one of the two."""


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
                    Account.bank.icontains(term, autoescape=True),
                    # spaces never stay in a stored number, so ignore them in the search too
                    Account.account_number.icontains(term.replace(" ", ""), autoescape=True),
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

    async def _check_number(
        self, user_id: uuid.UUID, number: str | None, *, exclude: uuid.UUID | None = None
    ) -> None:
        """Refuse a number another account of the user already carries."""
        if number is None:
            return
        stmt = select(Account.name).where(
            Account.user_id == user_id, Account.account_number == number
        )
        if exclude is not None:
            stmt = stmt.where(Account.id != exclude)
        taken = await self.db.scalar(stmt)
        if taken is not None:
            raise AccountNumberTakenError(taken)

    @staticmethod
    def _check_limit(group: AccountGroup, limit: Decimal | None) -> None:
        if limit is not None and group not in CREDIT_LIMIT_GROUPS:
            raise AccountLimitError

    @staticmethod
    def _check_statement(group: AccountGroup, statement_day: int | None, due_day: int | None):
        if (statement_day is None) != (due_day is None):
            raise AccountStatementError("Give both the statement day and the due day, or neither")
        if statement_day is not None and group is not AccountGroup.CARD:
            raise AccountStatementError("Only credit cards have a statement")

    @staticmethod
    def _check_spendable(group: AccountGroup, spendable: bool | None) -> None:
        if spendable and group in LIABILITY_GROUPS:
            raise AccountSpendableError

    async def _follow_market(self, account: Account, base: str) -> None:
        """Set the account's rate from the latest market rate, now. If the source cannot be
        reached the rate stays as it is: the daily job will do it later."""
        try:
            found = await market_rate(self.db, account.currency, base, date.today())
        except MarketRateUnavailableError:
            return
        if found is not None:
            account.exchange_rate = found.rate

    async def create(self, user_id: uuid.UUID, data: AccountCreate) -> Account:
        self._check_limit(data.group, data.credit_limit)
        self._check_statement(data.group, data.statement_day, data.due_day)
        self._check_spendable(data.group, data.spendable)
        await self._check_number(user_id, data.account_number)
        base = await self._base_currency(user_id)
        currency = data.currency or base
        if data.auto_rate and currency == base:
            raise AccountAutoRateError
        rate, _ = price_in_base(Decimal(1), currency, data.exchange_rate, base)
        account = Account(
            user_id=user_id,
            group=data.group,
            name=data.name,
            opening_amount=data.opening_amount,
            currency=currency,
            exchange_rate=rate,
            description=data.description,
            bank=data.bank,
            account_number=data.account_number,
            credit_limit=data.credit_limit,
            statement_day=data.statement_day,
            due_day=data.due_day,
            exclude_from_stats=data.exclude_from_stats,
            spendable=data.spendable,
            auto_rate=data.auto_rate,
        )
        if data.auto_rate:
            await self._follow_market(account, base)
        self.db.add(account)
        await self.db.flush()
        await self.db.refresh(account)
        return account

    async def _transaction_count(self, account_id: uuid.UUID) -> int:
        stmt = select(func.count(Transaction.id)).where(
            or_(Transaction.account_id == account_id, Transaction.to_account_id == account_id),
            Transaction.live(),
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
        group = changes.get("group", account.group)
        if changes.get("credit_limit") is not None:
            self._check_limit(group, changes["credit_limit"])
        elif group not in CREDIT_LIMIT_GROUPS:
            changes["credit_limit"] = None  # moved out of cards and overdrafts: no limit any more
        if group is not AccountGroup.CARD and not changes.keys() & {"statement_day", "due_day"}:
            changes["statement_day"] = changes["due_day"] = None  # no longer a card: no statement
        elif changes.get("statement_day", 0) is None and "due_day" not in changes:
            changes["due_day"] = None  # clearing the statement day clears the due day with it
        self._check_statement(
            group,
            changes.get("statement_day", account.statement_day),
            changes.get("due_day", account.due_day),
        )
        spendable = changes.get("spendable", account.spendable)
        if group in LIABILITY_GROUPS and "spendable" not in changes:
            changes["spendable"] = None  # moved to what is owed: no everyday-money choice left
        else:
            self._check_spendable(group, spendable)
        if "account_number" in changes:
            await self._check_number(account.user_id, changes["account_number"], exclude=account.id)

        base = await self._base_currency(account.user_id)
        new_currency = changes.get("currency", account.currency)
        if new_currency == base:
            if changes.get("auto_rate"):
                raise AccountAutoRateError
            changes["auto_rate"] = False  # nothing to follow in the base currency
        turned_on = bool(changes.get("auto_rate")) and not account.auto_rate
        if changes.keys() & {"currency", "exchange_rate"}:
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
        if turned_on:
            await self._follow_market(account, base)
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
                .where(Transaction.account_id.in_(ids), Transaction.counted())
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
                .where(Transaction.to_account_id.in_(ids), Transaction.counted())
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
                    bank=a.bank,
                    account_number=a.account_number,
                    credit_limit=a.credit_limit,
                    statement_day=a.statement_day,
                    due_day=a.due_day,
                    exclude_from_stats=a.exclude_from_stats,
                    spendable=a.spendable,
                    counts_as_spendable=is_spendable(a.group, a.spendable),
                    auto_rate=a.auto_rate,
                    is_liability=a.group in LIABILITY_GROUPS,
                    balance=balance,
                    base_balance=(balance * a.exchange_rate).quantize(BASE_AMOUNT_QUANTUM),
                    transaction_count=count,
                    archived_at=a.archived_at,
                    created_at=a.created_at,
                )
            )
        return out

    async def _movements(self, account: Account) -> list[tuple[uuid.UUID, date, Decimal]]:
        """Every counted movement of the account, oldest first, as (transaction id, day, signed
        change in the account's currency): income and the source of a transfer as in `present`, and
        a transfer's `to_amount` when it arrived here. Same-day order matches the lists read
        backwards: untimed before timed, then by when it was entered."""
        stmt = (
            select(
                Transaction.id,
                Transaction.transaction_date,
                Transaction.type,
                Transaction.amount,
                Transaction.to_amount,
                Transaction.account_id,
            )
            .where(
                or_(Transaction.account_id == account.id, Transaction.to_account_id == account.id),
                Transaction.counted(),
            )
            .order_by(
                Transaction.transaction_date,
                Transaction.transaction_time.asc().nulls_first(),
                Transaction.created_at,
            )
        )
        moves = []
        for tid, day, kind, amount, to_amount, source in (await self.db.execute(stmt)).all():
            if source == account.id:
                delta = amount if kind is TransactionType.INCOME else -amount
            else:  # the other side of a transfer
                delta = to_amount or Decimal(0)
            moves.append((tid, day, Decimal(str(delta))))
        return moves

    async def balance_history(
        self, account: Account, days: int, today: date | None = None
    ) -> BalanceHistory:
        """The balance at the end of each of the last `days` days, ending today. A day with
        nothing on it repeats the one before; what is dated later than today is not in it."""
        today = today or date.today()
        start = today - timedelta(days=days - 1)
        balance = account.opening_amount
        by_day: dict[date, Decimal] = {}
        for _, day, delta in await self._movements(account):
            if day > today:
                continue
            if day < start:
                balance += delta
            else:
                by_day[day] = by_day.get(day, Decimal(0)) + delta
        points = []
        for offset in range(days):
            day = start + timedelta(days=offset)
            balance += by_day.get(day, Decimal(0))
            points.append(AccountBalancePoint(date=day, balance=balance))
        return BalanceHistory(currency=account.currency, points=points)

    async def trends(
        self, user_id: uuid.UUID, days: int, today: date | None = None
    ) -> list[AccountTrend]:
        """The recent balance curve of every active account, for the small charts on the accounts
        page: one entry per account, in the same order as the list. An archived account has none."""
        out = []
        for account in await self.list_for_user(user_id):
            history = await self.balance_history(account, days, today)
            out.append(
                AccountTrend(
                    account_id=account.id,
                    currency=account.currency,
                    balances=[p.balance for p in history.points],
                )
            )
        return out

    async def balances_after(self, account: Account, limit: int) -> list[BalanceAfter]:
        """What the account held right after each of its newest `limit` transactions."""
        balance = account.opening_amount
        out = []
        for tid, _, delta in await self._movements(account):
            balance += delta
            out.append(BalanceAfter(transaction_id=tid, balance=balance))
        return out[-limit:]

    async def statement(self, account: Account, today: date | None = None) -> CardStatement:
        """Where a credit card stands against the statement that last closed. What was owed on
        the closing day is the statement; repayments, refunds and income since then are taken
        off it, and spending since then waits for the next one."""
        today = today or date.today()
        assert account.statement_day is not None
        assert account.due_day is not None
        closed_on = card_cycle.last_close(today, account.statement_day)
        due_on = card_cycle.due_date(closed_on, account.due_day)
        at_close = account.opening_amount
        paid = spent = Decimal(0)
        for _, day, delta in await self._movements(account):
            if day <= closed_on:
                at_close += delta
            elif day <= today:
                if delta > 0:
                    paid += delta
                else:
                    spent -= delta
        owed_then = max(Decimal(0), -at_close)
        remaining = max(Decimal(0), owed_then - paid)
        if owed_then == 0:
            state = "none"
        elif remaining == 0:
            state = "paid"
        else:
            state = "overdue" if today > due_on else "due"
        owed_now = max(Decimal(0), -(at_close + paid - spent))
        return CardStatement(
            account_id=account.id,
            account_name=account.name,
            currency=account.currency,
            statement_day=account.statement_day,
            due_day=account.due_day,
            closed_on=closed_on,
            due_on=due_on,
            next_closes_on=card_cycle.next_close(today, account.statement_day),
            statement_balance=owed_then,
            paid_since=paid,
            remaining=remaining,
            remaining_base=(remaining * account.exchange_rate).quantize(BASE_AMOUNT_QUANTUM),
            spent_since=spent,
            owed_now=owed_now,
            credit_limit=account.credit_limit,
            state=state,
            days_until_due=(due_on - today).days,
        )

    async def statements(
        self, user_id: uuid.UUID, today: date | None = None
    ) -> list[CardStatement]:
        """The statement of every credit card in use that has its days set, soonest due first."""
        accounts = await self.list_for_user(user_id)
        found = [
            await self.statement(a, today)
            for a in accounts
            if a.group is AccountGroup.CARD and a.statement_day is not None
        ]
        return sorted(found, key=lambda s: (s.due_on, s.account_name))

    async def summary(self, user_id: uuid.UUID) -> AccountSummary:
        # an account excluded from the stats is not part of what you are worth
        accounts = [
            a
            for a in await self.present(await self.list_for_user(user_id))
            if not a.exclude_from_stats
        ]
        assets = sum((a.base_balance for a in accounts if not a.is_liability), Decimal(0))
        liabilities = sum((-a.base_balance for a in accounts if a.is_liability), Decimal(0))
        return AccountSummary(
            assets=assets,
            liabilities=liabilities,
            total=assets - liabilities,
            currency=await self._base_currency(user_id),
        )
