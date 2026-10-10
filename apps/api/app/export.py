"""Build an .xlsx workbook of transactions. Pure functions: no database, no HTTP."""

import io
from collections.abc import Sequence
from datetime import date
from decimal import Decimal

from openpyxl import Workbook
from openpyxl.cell import WriteOnlyCell
from openpyxl.styles import Alignment, Font

from app.enums import TransactionType
from app.models import Transaction

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
EXPORT_LIMIT = 50_000

_MONEY = "#,##0.00##"
_RATE = "0.00######"
_BOLD = Font(bold=True)

# (header, width). "{base}" is replaced with the user's base currency code.
_COLUMNS = [
    ("Date", 12),
    ("Type", 10),
    ("Category", 18),
    ("Vendor", 22),
    ("Description", 32),
    ("Account", 18),
    ("To account", 18),
    ("Payment method", 16),
    ("Subscription", 18),
    ("Amount", 14),
    ("Currency", 9),
    ("Received", 14),
    ("Rate", 11),
    ("Amount ({base})", 16),
    ("Signed ({base})", 16),
]


def _num(value: Decimal | None) -> float | None:
    return float(value) if value is not None else None


def _signed_base(t: Transaction) -> Decimal | None:
    """Income positive, expense negative, transfers blank (they only move money around), so a
    plain SUM of the column is the net result."""
    if t.type is TransactionType.INCOME:
        return t.base_amount
    if t.type is TransactionType.EXPENSE:
        return -t.base_amount
    return None


def build_workbook(
    rows: Sequence[Transaction],
    *,
    base_currency: str,
    filter_labels: Sequence[str],
    generated_on: date,
) -> bytes:
    """Two sheets: Transactions (one row each, real numbers and dates) and Summary."""
    wb = Workbook(write_only=True)  # streams rows to disk-light XML: fine for tens of thousands

    ws = wb.create_sheet("Transactions")
    ws.freeze_panes = "A2"
    for i, (_, width) in enumerate(_COLUMNS):
        ws.column_dimensions[chr(ord("A") + i)].width = width

    header = []
    for name, _ in _COLUMNS:
        cell = WriteOnlyCell(ws, value=name.format(base=base_currency))
        cell.font = _BOLD
        header.append(cell)
    ws.append(header)

    income = expense = Decimal(0)
    for t in rows:
        if t.type is TransactionType.INCOME:
            income += t.base_amount
        elif t.type is TransactionType.EXPENSE:
            expense += t.base_amount

        is_transfer = t.type is TransactionType.TRANSFER
        values = [
            (t.transaction_date, "yyyy-mm-dd"),
            (t.type.value.capitalize(), None),
            (None if is_transfer else t.category, None),
            (t.vendor.name if t.vendor else None, None),
            (t.description, None),
            (t.account.name if t.account else None, None),
            (t.to_account.name if t.to_account else None, None),
            (None if is_transfer else t.payment_method.value.replace("_", " ").capitalize(), None),
            (t.subscription.name if t.subscription else None, None),
            (_num(t.amount), _MONEY),
            (t.currency, None),
            (_num(t.to_amount), _MONEY),
            (_num(t.exchange_rate), _RATE),
            (_num(t.base_amount), _MONEY),
            (_num(_signed_base(t)), _MONEY),
        ]
        out = []
        for value, number_format in values:
            cell = WriteOnlyCell(ws, value=value)
            if number_format:
                cell.number_format = number_format
            out.append(cell)
        ws.append(out)

    ws.auto_filter.ref = f"A1:{chr(ord('A') + len(_COLUMNS) - 1)}{len(rows) + 1}"

    summary = wb.create_sheet("Summary")
    summary.column_dimensions["A"].width = 22
    summary.column_dimensions["B"].width = 48
    facts: list[tuple[str, object, str | None]] = [
        ("Generated on", generated_on, "yyyy-mm-dd"),
        ("Base currency", base_currency, None),
        ("Filters", "; ".join(filter_labels) if filter_labels else "None (all transactions)", None),
        ("Transactions", len(rows), None),
        (f"Income ({base_currency})", float(income), _MONEY),
        (f"Expense ({base_currency})", float(expense), _MONEY),
        (f"Net ({base_currency})", float(income - expense), _MONEY),
    ]
    for label, value, number_format in facts:
        key = WriteOnlyCell(summary, value=label)
        key.font = _BOLD
        cell = WriteOnlyCell(summary, value=value)
        cell.alignment = Alignment(horizontal="left", wrap_text=True, vertical="top")
        if number_format:
            cell.number_format = number_format
        summary.append([key, cell])

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
