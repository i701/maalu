import csv
import io
import logging
import uuid
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import TransactionType
from app.models import (
    Account,
    ImportAlias,
    ImportBatch,
    ImportRow,
    Transaction,
    Vendor,
)
from app.schemas import (
    AccountRef,
    BulkResult,
    ImportBatchResponse,
    ImportCommit,
    ImportPreview,
    ImportRowIn,
    ImportSkipped,
    PreviewRow,
    TransactionCreate,
)
from app.services.account import AccountNotFoundError, AccountService
from app.services.errors import TransactionRuleError
from app.services.transaction import TransactionService
from app.services.vendor import normalize_name
from app.statements import Statement, StatementRow, parse_statement

logger = logging.getLogger("maalu.imports")

DEFAULT_CATEGORY = "Uncategorized"
# A transfer between your own accounts shows on the two statements a day or so apart.
TRANSFER_WINDOW = timedelta(days=1)


class ImportNotFoundError(Exception):
    pass


def _signed(row: StatementRow | ImportRowIn) -> Decimal:
    return row.amount if row.type in (TransactionType.INCOME, "income") else -row.amount


class ImportService:
    """Bringing a bank statement in: preview what is in it (and what is already in Maalu), then
    create the transactions the user confirmed as one batch that can be undone."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.transactions = TransactionService(db)
        self.accounts = AccountService(db)

    async def _account(self, user_id: uuid.UUID, account_id: uuid.UUID) -> Account:
        account = await self.db.scalar(
            select(Account).where(Account.id == account_id, Account.user_id == user_id)
        )
        if account is None:
            raise AccountNotFoundError
        if account.archived_at is not None:
            raise TransactionRuleError(f'"{account.name}" is archived. Unarchive it to use it')
        return account

    # --- preview ---------------------------------------------------------------------------

    async def _known_refs(self, user_id: uuid.UUID, account_id: uuid.UUID, refs: set[str]) -> set:
        """References of live transactions an earlier import made for this account."""
        if not refs:
            return set()
        stmt = (
            select(Transaction.import_ref)
            .join(ImportBatch, ImportBatch.id == Transaction.import_batch_id)
            .where(
                Transaction.user_id == user_id,
                ImportBatch.account_id == account_id,
                Transaction.import_ref.in_(refs),
                Transaction.live(),
            )
        )
        return set((await self.db.scalars(stmt)).all())

    async def _neighbours(
        self, user_id: uuid.UUID, account_id: uuid.UUID, statement: Statement
    ) -> list[Transaction]:
        """Live transactions in the account around the statement's dates, to spot ones entered
        by hand or recorded as a transfer from the other account's side."""
        if not statement.rows:
            return []
        first = min(r.date for r in statement.rows) - TRANSFER_WINDOW
        last = max(r.date for r in statement.rows) + TRANSFER_WINDOW
        stmt = select(Transaction).where(
            Transaction.user_id == user_id,
            Transaction.live(),
            Transaction.planned.is_(False),
            or_(Transaction.account_id == account_id, Transaction.to_account_id == account_id),
            Transaction.transaction_date.between(first, last),
        )
        return list((await self.db.scalars(stmt)).all())

    @staticmethod
    def _duplicate(row, account_id, neighbours: list[Transaction], used: set) -> str | None:
        """`transfer`, then `possible`: each existing transaction explains at most one row."""
        for t in neighbours:
            if t.id in used or abs(t.transaction_date - row.date) > TRANSFER_WINDOW:
                continue
            if t.type is TransactionType.TRANSFER:
                out = t.account_id == account_id and row.type is TransactionType.EXPENSE
                arrived = t.to_account_id == account_id and row.type is TransactionType.INCOME
                money = t.amount if out else t.to_amount
                if (out or arrived) and money == row.amount:
                    used.add(t.id)
                    return "transfer"
        for t in neighbours:
            if (
                t.id not in used
                and t.account_id == account_id
                and t.type is row.type
                and t.import_ref is None
                and t.amount == row.amount
                and t.transaction_date == row.date
            ):
                used.add(t.id)
                return "possible"
        return None

    async def _suggestions(self, user_id: uuid.UUID) -> tuple[dict, dict]:
        """Remembered names, and every vendor by its own name, both keyed by normalised text."""
        aliases = {
            a.normalized_text: a
            for a in (
                await self.db.scalars(select(ImportAlias).where(ImportAlias.user_id == user_id))
            ).all()
        }
        vendors = {
            v.normalized_name: v
            for v in (await self.db.scalars(select(Vendor).where(Vendor.user_id == user_id))).all()
        }
        return aliases, vendors

    async def preview(self, user_id: uuid.UUID, account_id: uuid.UUID, content: bytes):
        account = await self._account(user_id, account_id)
        statement = parse_statement(content)  # StatementError says what is wrong with the file
        known = await self._known_refs(
            user_id, account.id, {r.reference for r in statement.rows if r.reference}
        )
        neighbours = await self._neighbours(user_id, account.id, statement)
        aliases, vendors = await self._suggestions(user_id)
        by_id = {v.id: v for v in vendors.values()}
        used: set = set()
        rows: list[PreviewRow] = []
        for index, r in enumerate(statement.rows):
            key = normalize_name(r.counterparty) if r.counterparty else ""
            alias = aliases.get(key)
            vendor = by_id.get(alias.vendor_id) if alias and alias.vendor_id else vendors.get(key)
            counter = alias.account_id if alias and alias.account_id != account.id else None
            duplicate = (
                "reference"
                if r.reference and r.reference in known
                else self._duplicate(r, account.id, neighbours, used)
            )
            rows.append(
                PreviewRow(
                    index=index,
                    date=r.date,
                    time=r.time,
                    type=r.type.value,
                    amount=r.amount,
                    counterparty=r.counterparty,
                    description=r.description,
                    reference=r.reference,
                    kind=r.kind,
                    payment_method=r.payment_method,
                    balance=r.balance,
                    vendor=vendor.name if vendor else None,
                    category=vendor.default_category if vendor else None,
                    tags=[t.name for t in vendor.default_tags] if vendor else [],
                    transfer_account_id=counter,
                    duplicate=duplicate,
                )
            )
        fresh = [r for r in rows if r.duplicate not in ("reference", "transfer")]
        now = (await self.accounts.present([account]))[0].balance
        after = now + sum((_signed(r) for r in fresh), Decimal(0))
        return ImportPreview(
            profile=statement.profile,
            account=AccountRef.model_validate(account),
            opening_balance=statement.opening_balance,
            closing_balance=statement.closing_balance,
            rows=rows,
            new_count=len(fresh),
            duplicate_count=len(rows) - len(fresh),
            balance_now=now,
            balance_after=after,
            balance_matches=None
            if statement.closing_balance is None
            else after == statement.closing_balance,
        )

    # --- import ----------------------------------------------------------------------------

    async def _counter_account(
        self, user_id: uuid.UUID, account: Account, counter_id: uuid.UUID
    ) -> Account:
        if counter_id == account.id:
            raise TransactionRuleError("A transfer needs a different account")
        counter = await self._account(user_id, counter_id)
        if counter.currency != account.currency:
            raise TransactionRuleError(
                f'"{counter.name}" is in {counter.currency}: enter that transfer by hand'
            )
        return counter

    def _body(self, row: ImportRowIn, account: Account, counter: Account | None):
        if counter is not None:
            out = row.type == "expense"
            return TransactionCreate(
                type=TransactionType.TRANSFER,
                amount=row.amount,
                description=row.description,
                transaction_date=row.date,
                transaction_time=row.time,
                account_id=account.id if out else counter.id,
                to_account_id=counter.id if out else account.id,
                tags=row.tags,
            )
        return TransactionCreate(
            type=TransactionType(row.type),
            amount=row.amount,
            payment_method=row.payment_method,
            category=row.category or DEFAULT_CATEGORY,
            description=row.description,
            transaction_date=row.date,
            transaction_time=row.time,
            account_id=account.id,
            vendor_name=row.vendor_name,
            tags=row.tags,
        )

    async def _remember(self, user_id: uuid.UUID, row: ImportRowIn, made: Transaction) -> None:
        """Keep what the user decided about this name, so the next statement fills it in."""
        key = normalize_name(row.counterparty) if row.counterparty else ""
        if not key:
            return
        vendor_id = made.vendor.id if made.vendor else None
        account_id = made.to_account_id if row.type == "expense" else made.account_id
        if made.type is not TransactionType.TRANSFER:
            account_id = None
        if vendor_id is None and account_id is None:
            return
        if vendor_id and made.vendor and normalize_name(made.vendor.name) == key:
            return  # the name is the vendor's own: found without an alias
        alias = await self.db.scalar(
            select(ImportAlias).where(
                ImportAlias.user_id == user_id, ImportAlias.normalized_text == key
            )
        )
        if alias is None:
            alias = ImportAlias(user_id=user_id, normalized_text=key)
            self.db.add(alias)
        alias.vendor_id, alias.account_id = vendor_id, account_id
        await self.db.flush()

    async def _import_row(
        self, user_id: uuid.UUID, account: Account, batch: ImportBatch, row: ImportRowIn
    ) -> Transaction:
        counter = (
            await self._counter_account(user_id, account, row.transfer_account_id)
            if row.transfer_account_id
            else None
        )
        made = await self.transactions.create(user_id, self._body(row, account, counter))
        made.import_batch_id, made.import_ref = batch.id, row.reference
        await self.db.flush()
        await self._remember(user_id, row, made)
        return made

    async def commit(
        self, user_id: uuid.UUID, data: ImportCommit
    ) -> tuple[ImportBatch, list[ImportSkipped]]:
        account = await self._account(user_id, data.account_id)
        known = await self._known_refs(
            user_id, account.id, {r.reference for r in data.rows if r.reference}
        )
        batch = ImportBatch(
            user_id=user_id, account_id=account.id, filename=data.filename, profile=data.profile
        )
        self.db.add(batch)
        await self.db.flush()
        skipped: list[ImportSkipped] = []
        seen: set[str] = set()
        imported = left_out = 0
        for index, row in enumerate(data.rows):
            made: Transaction | None = None
            outcome, reason = "imported", None
            if row.skip:
                outcome, left_out = "left_out", left_out + 1
            elif row.reference and (row.reference in known or row.reference in seen):
                outcome, reason = "skipped", "Already imported"
            else:
                try:
                    # a savepoint, so one row going wrong undoes only itself
                    async with self.db.begin_nested():
                        made = await self._import_row(user_id, account, batch, row)
                except (TransactionRuleError, AccountNotFoundError) as exc:
                    outcome, reason = "failed", str(exc) or "Account not found"
                except Exception:  # never let one bad row take the whole import down
                    logger.exception("importing row %d failed", index + 1)
                    outcome, reason = "failed", "Something went wrong with this row"
            if outcome == "imported":
                imported += 1
                if row.reference:
                    seen.add(row.reference)
            elif outcome != "left_out":
                skipped.append(ImportSkipped(index=index, outcome=outcome, reason=reason or ""))
            self.db.add(
                ImportRow(
                    batch_id=batch.id,
                    position=index + 1,
                    transaction_date=row.date,
                    transaction_time=row.time,
                    type=row.type,
                    amount=row.amount,
                    counterparty=row.counterparty,
                    description=row.description,
                    reference=row.reference,
                    outcome=outcome,
                    reason=reason,
                    transaction_id=made.id if made is not None else None,
                )
            )
        batch.imported_count = imported
        batch.skipped_count = left_out + len(skipped)
        await self.db.flush()
        return batch, skipped

    # --- history and undo ------------------------------------------------------------------

    async def get(self, user_id: uuid.UUID, batch_id: uuid.UUID) -> ImportBatch | None:
        return await self.db.scalar(
            select(ImportBatch).where(ImportBatch.id == batch_id, ImportBatch.user_id == user_id)
        )

    async def list_for_user(
        self, user_id: uuid.UUID, *, limit: int | None = None, offset: int = 0
    ) -> list[ImportBatch]:
        stmt = (
            select(ImportBatch)
            .where(ImportBatch.user_id == user_id)
            .order_by(ImportBatch.created_at.desc(), ImportBatch.id)
        )
        if limit is not None:
            stmt = stmt.limit(limit).offset(offset)
        return list((await self.db.scalars(stmt)).all())

    async def count_for_user(self, user_id: uuid.UUID) -> int:
        stmt = select(func.count(ImportBatch.id)).where(ImportBatch.user_id == user_id)
        return (await self.db.scalar(stmt)) or 0

    async def present(self, batches: list[ImportBatch]) -> list[ImportBatchResponse]:
        ids = [b.id for b in batches]
        live: dict = {}
        if ids:
            stmt = (
                select(Transaction.import_batch_id, func.count(Transaction.id))
                .where(Transaction.import_batch_id.in_(ids), Transaction.live())
                .group_by(Transaction.import_batch_id)
            )
            live = dict((await self.db.execute(stmt)).all())
        account_ids = {b.account_id for b in batches if b.account_id}
        accounts = {}
        if account_ids:
            found = await self.db.scalars(select(Account).where(Account.id.in_(account_ids)))
            accounts = {a.id: a for a in found}
        return [
            ImportBatchResponse(
                id=b.id,
                account=AccountRef.model_validate(accounts[b.account_id])
                if b.account_id in accounts
                else None,
                filename=b.filename,
                profile=b.profile,
                imported_count=b.imported_count,
                skipped_count=b.skipped_count,
                transaction_count=live.get(b.id, 0),
                created_at=b.created_at,
            )
            for b in batches
        ]

    async def undo(self, batch: ImportBatch) -> BulkResult:
        """Move everything the import made, that is still live, to the trash."""
        stmt = select(Transaction.id).where(
            Transaction.import_batch_id == batch.id, Transaction.live()
        )
        ids = list((await self.db.scalars(stmt)).all())
        if not ids:
            return BulkResult(updated=0, skipped=[])
        return await self.transactions.bulk_trash(batch.user_id, ids)

    # --- the report ------------------------------------------------------------------------

    async def report(self, batch: ImportBatch) -> str:
        """A CSV of every row of the import and what became of it, for the user to keep or check
        against the bank. Text from the bank is made safe to open in a spreadsheet."""
        rows = (
            await self.db.scalars(
                select(ImportRow).where(ImportRow.batch_id == batch.id).order_by(ImportRow.position)
            )
        ).all()
        out = io.StringIO()
        writer = csv.writer(out, lineterminator="\n")
        writer.writerow(REPORT_HEADER)
        for r in rows:
            writer.writerow(
                [
                    r.position,
                    r.transaction_date.isoformat(),
                    r.transaction_time.isoformat() if r.transaction_time else "",
                    r.type,
                    f"{r.amount:.2f}",
                    _safe(r.counterparty),
                    _safe(r.description or ""),
                    _safe(r.reference or ""),
                    OUTCOME_LABELS.get(r.outcome, r.outcome),
                    _safe(r.reason or ""),
                ]
            )
        return out.getvalue()


REPORT_HEADER = [
    "Row",
    "Date",
    "Time",
    "Type",
    "Amount",
    "Counterparty",
    "Description",
    "Reference",
    "Result",
    "Reason",
]
OUTCOME_LABELS = {
    "imported": "Imported",
    "skipped": "Skipped",
    "left_out": "Left out",
    "failed": "Failed",
}


def _safe(text: str) -> str:
    """A cell that starts like a spreadsheet formula is shown as text instead."""
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text
