"""Reading bank statements (CSV) into plain rows. Pure functions, no I/O or database.

Each bank has a profile: `detect` picks it from the header row, and its parser turns every line
into a `StatementRow`. Rows always carry a positive amount and a direction, like transactions do.
A profile is only about the file's *shape*: what each row means (a vendor, a category, one of your
own accounts) is decided later, in the review.

Profiles so far: `bml` (Bank of Maldives, separate debit and credit columns) and `mib` (Maldives
Islamic Bank, one signed amount column).
"""

import csv
import io
import re
from dataclasses import dataclass, field
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation

from app.enums import PaymentMethod, TransactionType

MAX_STATEMENT_BYTES = 2_000_000
MAX_STATEMENT_ROWS = 2_000


class StatementError(Exception):
    """The file is not a statement we can read; the message says why, in plain words."""


@dataclass(frozen=True)
class StatementRow:
    date: date
    time: time | None
    type: TransactionType  # income (money in) or expense (money out)
    amount: Decimal  # always positive
    counterparty: str  # who it was with, as the bank wrote it ("" when it says nothing)
    description: str  # the bank's own words for the row, for the transaction's note
    reference: str | None  # the bank's id for the row, what makes a re-import safe
    kind: str  # the bank's transaction type ("Purchase", "Transfer Debit", ...)
    payment_method: PaymentMethod
    balance: Decimal | None  # running balance after the row, when the statement has one


@dataclass
class Statement:
    profile: str
    rows: list[StatementRow] = field(default_factory=list)
    opening_balance: Decimal | None = None
    closing_balance: Decimal | None = None


# A date and time as the banks write them inside descriptions: 04-10-2026 12-31-39.
_DATETIME = re.compile(r"(\d{2})-(\d{2})-(\d{4}) (\d{2})-(\d{2})-(\d{2})")
_DATE = re.compile(r"(\d{2})-(\d{2})-(\d{4})")
# What is left of a counterparty after cleaning: a dangling ", -" or " -" the bank adds.
_TRAILING_DASH = re.compile(r"[\s,]*-\s*$")


def _money(value: str | None) -> Decimal | None:
    """A statement amount ("1,234.50", "-.15", "" ) as a Decimal, or None when blank."""
    text = (value or "").strip().replace(",", "")
    if not text:
        return None
    try:
        return Decimal(text)
    except InvalidOperation:
        raise StatementError(f'"{value}" is not an amount') from None


def _when(text: str) -> tuple[date, time | None] | None:
    """The date (and time) written inside a description, if any."""
    if m := _DATETIME.search(text):
        d, mo, y, h, mi, s = (int(g) for g in m.groups())
        try:
            return date(y, mo, d), time(h, mi, s)
        except ValueError:
            return None
    if m := _DATE.search(text):
        d, mo, y = (int(g) for g in m.groups())
        try:
            return date(y, mo, d), None
        except ValueError:
            return None
    return None


def _clean(text: str) -> str:
    return _TRAILING_DASH.sub("", " ".join(text.split()))


def _method(kind: str) -> PaymentMethod:
    return PaymentMethod.DEBIT_CARD if "purchase" in kind.lower() else PaymentMethod.BANK_TRANSFER


def _headers(row: list[str]) -> list[str]:
    return [h.strip().lower() for h in row]


def detect(header: list[str]) -> str | None:
    """The profile a header row belongs to, or None."""
    names = set(_headers(header))
    if {"transaction code description", "debit amount", "credit amount"} <= names:
        return "bml"
    if {"posted date", "transaction type", "amount", "running balance"} <= names:
        return "mib"
    return None


def parse_statement(content: bytes) -> Statement:
    """Read a CSV statement. Raises `StatementError` when it is not one we know."""
    if len(content) > MAX_STATEMENT_BYTES:
        raise StatementError("That file is too large to be a statement")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise StatementError("That file is not a text (CSV) statement") from None
    table = [row for row in csv.reader(io.StringIO(text)) if any(c.strip() for c in row)]
    if not table:
        raise StatementError("That file is empty")
    profile = detect(table[0])
    if profile is None:
        raise StatementError("This is not a statement from a bank Maalu knows (BML or MIB, as CSV)")
    names = _headers(table[0])
    lines = [dict(zip(names, row, strict=False)) for row in table[1:]]
    statement = _PARSERS[profile](lines)
    if len(statement.rows) > MAX_STATEMENT_ROWS:
        raise StatementError(f"A statement can have up to {MAX_STATEMENT_ROWS} rows")
    _order(statement)
    return statement


def _order(statement: Statement) -> None:
    """Oldest first, whichever way the bank wrote the file, and work out the balances."""
    rows = statement.rows
    if len(rows) > 1 and rows[0].date > rows[-1].date:
        rows.reverse()
    if rows and rows[0].balance is not None and statement.opening_balance is None:
        signed = rows[0].amount if rows[0].type is TransactionType.INCOME else -rows[0].amount
        statement.opening_balance = rows[0].balance - signed
    if rows and rows[-1].balance is not None:
        statement.closing_balance = rows[-1].balance


def _bml(lines: list[dict[str, str]]) -> Statement:
    statement = Statement(profile="bml")
    for number, line in enumerate(lines, start=2):
        debit = _money(line.get("debit amount"))
        credit = _money(line.get("credit amount"))
        amount = debit if debit else credit
        if not amount:
            continue  # nothing moved
        kind = line.get("transaction code description", "").strip()
        parts = [
            line.get(k, "").strip()
            for k in ("transaction description 1", "transaction description 2")
        ]
        extra = line.get("transaction description 3", "").strip()
        everything = " ".join([*parts, extra])
        when = _when(everything)
        try:
            posted = datetime.strptime(line.get("posted date", "").strip(), "%Y/%m/%d").date()
        except ValueError:
            raise StatementError(f"Line {number}: the date is not readable") from None
        # A credit through Favara carries the sender in the first text field; everything else
        # (transfers, purchases) names the other side in the second.
        who = parts[0] if kind.lower().startswith("favara") else (parts[1] or parts[0])
        who = "" if _DATE.search(who) else _clean(who)
        noted = [kind, who, "" if extra.lower() == "internet banking" or _when(extra) else extra]
        statement.rows.append(
            StatementRow(
                date=when[0] if when else posted,
                time=when[1] if when else None,
                type=TransactionType.EXPENSE if debit else TransactionType.INCOME,
                amount=abs(amount),
                counterparty=who,
                description=" · ".join(p for p in noted if p),
                reference=line.get("reference number", "").strip() or None,
                kind=kind,
                payment_method=_method(kind),
                balance=_money(line.get("running balance")),
            )
        )
    return statement


def _mib(lines: list[dict[str, str]]) -> Statement:
    statement = Statement(profile="mib")
    for number, line in enumerate(lines, start=2):
        kind = line.get("transaction type", "").strip()
        balance = _money(line.get("running balance"))
        if kind.startswith("**B/F"):  # the balance brought forward, not a transaction
            statement.opening_balance = balance
            continue
        amount = _money(line.get("amount"))
        if not amount:
            continue
        try:
            posted = datetime.strptime(line.get("posted date", "").strip(), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            raise StatementError(f"Line {number}: the date is not readable") from None
        # "05-05-2026 07-41-55 | MADVIPS2026... | BML - ABDLA.AIDHAAN, -": when, bank id, who
        parts = [p.strip() for p in line.get("description", "").split("|")]
        when = _when(parts[0]) if parts else None
        named = [_clean(p) for p in parts[1:] if not p.startswith("MADVIPS")]
        who = next((n for n in reversed(named) if n and not _when(n)), "")
        statement.rows.append(
            StatementRow(
                date=when[0] if when else posted.date(),
                time=when[1] if when else None,
                type=TransactionType.EXPENSE if amount < 0 else TransactionType.INCOME,
                amount=abs(amount),
                counterparty=who,
                description=" · ".join(p for p in (kind, who) if p),
                reference=line.get("reference", "").strip() or None,
                kind=kind,
                payment_method=_method(kind),
                balance=balance,
            )
        )
    return statement


_PARSERS = {"bml": _bml, "mib": _mib}
