"""Turning two transactions that are the two sides of one move of your own money into a transfer.

Maalu keeps a transfer as one row (`account` to `to_account`). But the money leaving one account
and arriving in another shows up in each account's own list, so it often ends up entered, or
imported, as two rows: an expense and an income. Both then count in the reports as spending and
income although nothing was spent or earned. Linking makes them one transfer.

The expense row becomes the transfer (it keeps its date, amount, account and notes, and loses its
category, vendor and subscription, which transfers do not have) and the income row goes to the
trash. Suggestions only ever propose; nothing is merged without the user saying so.
"""

import uuid
from datetime import timedelta

from sqlalchemy import delete, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import TransactionType
from app.models import Category, Transaction, TransactionSplit, TransferDismissal
from app.schemas import TransactionUpdate
from app.services.errors import TransactionRuleError
from app.services.transaction import TransactionService

SUGGEST_WINDOW = timedelta(days=2)  # the two sides are entered a day or two apart at most
SCAN_LIMIT = 3000  # rows looked at per side


class TransferLinkNotFoundError(Exception):
    """One of the two transactions is not one of yours (or is not there)."""


def _closeness(expense: Transaction, income: Transaction) -> tuple:
    """Smaller is closer: the days between them, then the time of day when both have one."""
    days = abs((expense.transaction_date - income.transaction_date).days)
    if expense.transaction_time and income.transaction_time and days == 0:
        a, b = expense.transaction_time, income.transaction_time
        gap = abs(
            (a.hour * 3600 + a.minute * 60 + a.second) - (b.hour * 3600 + b.minute * 60 + b.second)
        )
    else:
        gap = 0
    return days, gap


class TransferLinkService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.transactions = TransactionService(db)

    # --- what can be linked ----------------------------------------------------------------

    @staticmethod
    def _eligible():
        """Rows that can be one side: posted, live, in an account, not a correction."""
        return [
            Transaction.live(),
            Transaction.planned.is_(False),
            Transaction.adjustment.is_(False),
            Transaction.account_id.is_not(None),
        ]

    async def _row(self, user_id: uuid.UUID, transaction_id: uuid.UUID) -> Transaction:
        row = await self.db.scalar(
            select(Transaction).where(
                Transaction.id == transaction_id, Transaction.user_id == user_id
            )
        )
        if row is None:
            raise TransferLinkNotFoundError
        return row

    @staticmethod
    def _check_pair(expense: Transaction, income: Transaction) -> None:
        for row in (expense, income):
            if row.deleted_at is not None:
                raise TransactionRuleError("A transaction in the trash can't be linked")
            if row.planned:
                raise TransactionRuleError("A planned transaction can't be linked yet")
            if row.adjustment:
                raise TransactionRuleError("A balance adjustment can't be part of a transfer")
            if row.account_id is None:
                raise TransactionRuleError(
                    "Both sides need an account: put the transaction in one first"
                )
        if expense.type is not TransactionType.EXPENSE or income.type is not TransactionType.INCOME:
            raise TransactionRuleError("Link one expense and one income")
        if income.refund_of_id is not None:
            raise TransactionRuleError("A refund is money back for a purchase, not a transfer")
        if income.category_is_salary:
            raise TransactionRuleError("Salary is pay, not money moved between your accounts")
        if expense.account_id == income.account_id:
            raise TransactionRuleError("Money moving within one account is not a transfer")
        if expense.splits:
            raise TransactionRuleError(
                "A purchase with items can't become a transfer: remove its items first"
            )
        if TransactionService._has_refunds(expense):
            raise TransactionRuleError("This purchase has refunds, so it can't become a transfer")

    # --- suggestions -------------------------------------------------------------------------

    async def suggestions(
        self, user_id: uuid.UUID, limit: int = 20
    ) -> list[tuple[Transaction, Transaction, int]]:
        """Likely pairs: an expense and an income in different accounts, the same amount in the same
        currency, within two days of each other. Each transaction is in at most one pair (the
        closest wins) and pairs the user dismissed are left out."""
        no_items = ~exists().where(TransactionSplit.transaction_id == Transaction.id)
        expenses = (
            await self.db.scalars(
                select(Transaction)
                .where(
                    Transaction.user_id == user_id,
                    Transaction.type == TransactionType.EXPENSE,
                    Transaction.refunded_amount == 0,
                    no_items,
                    *self._eligible(),
                )
                .order_by(Transaction.transaction_date.desc())
                .limit(SCAN_LIMIT)
            )
        ).all()
        incomes = (
            await self.db.scalars(
                select(Transaction)
                .where(
                    Transaction.user_id == user_id,
                    Transaction.type == TransactionType.INCOME,
                    Transaction.refund_of_id.is_(None),
                    ~Transaction.category_ref.has(Category.is_salary.is_(True)),
                    *self._eligible(),
                )
                .order_by(Transaction.transaction_date.desc())
                .limit(SCAN_LIMIT)
            )
        ).all()
        dismissed = {
            (d.expense_id, d.income_id)
            for d in (
                await self.db.scalars(
                    select(TransferDismissal).where(TransferDismissal.user_id == user_id)
                )
            ).all()
        }
        by_amount: dict[tuple, list[Transaction]] = {}
        for income in incomes:
            by_amount.setdefault((income.amount, income.currency), []).append(income)

        candidates = []
        for expense in expenses:
            for income in by_amount.get((expense.amount, expense.currency), []):
                if (
                    income.account_id != expense.account_id
                    and abs(expense.transaction_date - income.transaction_date) <= SUGGEST_WINDOW
                    and (expense.id, income.id) not in dismissed
                ):
                    candidates.append(
                        (_closeness(expense, income), expense.id, income.id, expense, income)
                    )
        taken: set[uuid.UUID] = set()
        out: list[tuple[Transaction, Transaction, int]] = []
        for close, _e, _i, expense, income in sorted(candidates, key=lambda c: (c[0], str(c[1]))):
            if expense.id in taken or income.id in taken:
                continue
            taken.update({expense.id, income.id})
            out.append((expense, income, close[0]))
        out.sort(key=lambda pair: pair[0].transaction_date, reverse=True)
        return out[:limit]

    async def dismiss(
        self, user_id: uuid.UUID, expense_id: uuid.UUID, income_id: uuid.UUID
    ) -> None:
        """Remember that this pair is not a transfer, so it is not suggested again."""
        await self._row(user_id, expense_id)
        await self._row(user_id, income_id)
        exists_already = await self.db.scalar(
            select(TransferDismissal.id).where(
                TransferDismissal.user_id == user_id,
                TransferDismissal.expense_id == expense_id,
                TransferDismissal.income_id == income_id,
            )
        )
        if exists_already is None:
            self.db.add(
                TransferDismissal(user_id=user_id, expense_id=expense_id, income_id=income_id)
            )
            await self.db.flush()

    # --- linking -----------------------------------------------------------------------------

    async def link(
        self, user_id: uuid.UUID, expense_id: uuid.UUID, income_id: uuid.UUID
    ) -> Transaction:
        """Make the expense a transfer to the income's account (for what the income received), keep
        both rows' tags, and move the income to the trash. Raises TransactionRuleError when the pair
        is not one that can be merged."""
        expense = await self._row(user_id, expense_id)
        income = await self._row(user_id, income_id)
        self._check_pair(expense, income)

        tags = sorted({t.name for t in expense.tags} | {t.name for t in income.tags})
        changes: dict = {
            "type": TransactionType.TRANSFER,
            "to_account_id": income.account_id,
            "to_amount": income.amount,
            "tags": tags,
        }
        if not (expense.description or "").strip() and income.description:
            changes["description"] = income.description  # keep a note rather than lose it
        merged = await self.transactions.update(expense, TransactionUpdate(**changes))
        await self.transactions.trash(income)
        await self.db.execute(
            delete(TransferDismissal).where(
                or_(
                    TransferDismissal.expense_id.in_([expense.id, income.id]),
                    TransferDismissal.income_id.in_([expense.id, income.id]),
                )
            )
        )
        await self.db.flush()
        return merged
