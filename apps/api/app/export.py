"""Build an .xlsx workbook of transactions. Pure functions: no database, no HTTP."""

import io
import uuid
from collections.abc import Sequence
from datetime import date
from decimal import Decimal

from openpyxl import Workbook
from openpyxl.cell import WriteOnlyCell
from openpyxl.styles import Alignment, Font

from app.allocation import allocate_base
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


# The Items sheet: one row per line of a split transaction.
_ITEM_COLUMNS = [
    ("Date", 12),
    ("Type", 10),
    ("Vendor", 22),
    ("Item", 28),
    ("Category", 18),
    ("Quantity", 10),
    ("Amount", 14),
    ("GST", 12),
    ("Currency", 9),
    ("Amount ({base})", 16),
]
_CATEGORY_COLUMNS = [("Type", 10), ("Category", 24), ("Transactions", 14), ("Total ({base})", 16)]


def _categories(t: Transaction) -> str | None:
    """A transaction's category; for a split one, every category it touches."""
    if t.splits:
        return ", ".join(dict.fromkeys(s.category for s in t.splits))
    return t.category


def _write_rows(ws, columns, rows, base_currency: str) -> None:
    """A header row, then `rows` of (value, number_format) pairs, on a write-only sheet."""
    ws.freeze_panes = "A2"
    for i, (_, width) in enumerate(columns):
        ws.column_dimensions[chr(ord("A") + i)].width = width
    header = []
    for name, _ in columns:
        cell = WriteOnlyCell(ws, value=name.format(base=base_currency))
        cell.font = _BOLD
        header.append(cell)
    ws.append(header)
    for values in rows:
        out = []
        for value, number_format in values:
            cell = WriteOnlyCell(ws, value=value)
            if number_format:
                cell.number_format = number_format
            out.append(cell)
        ws.append(out)


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
    category_id: uuid.UUID | None = None,
) -> bytes:
    """Transactions (one row each, real numbers and dates), Items (the lines of split
    transactions, when there are any), By category and Summary."""
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
    item_rows: list[list[tuple]] = []
    category_totals: dict[tuple[str, uuid.UUID], list] = {}
    for t in rows:
        is_transfer = t.type is TransactionType.TRANSFER
        if not is_transfer:
            # Each (category, share of the base amount) the transaction counts toward. Filtering by
            # a category counts only that category's part of a split transaction.
            lines = t.splits
            if lines:
                shares = allocate_base(t.base_amount, t.amount, [s.amount for s in lines])
                parts = [
                    (line.category_ref, share) for line, share in zip(lines, shares, strict=True)
                ]
            else:
                parts = [(t.category_ref, t.base_amount)]
            counted: set[uuid.UUID] = set()
            for category, share in parts:
                if category_id is not None and category.id != category_id:
                    continue
                if t.type is TransactionType.INCOME:
                    income += share
                else:
                    expense += share
                entry = category_totals.setdefault((t.type.value, category.id), [category, 0, 0])
                entry[1] += share
                entry[2] += 0 if category.id in counted else 1
                counted.add(category.id)
            for line, share in zip(lines, [p[1] for p in parts], strict=True) if lines else []:
                item_rows.append(
                    [
                        (t.transaction_date, "yyyy-mm-dd"),
                        (t.type.value.capitalize(), None),
                        (t.vendor.name if t.vendor else None, None),
                        (line.name, None),
                        (line.category, None),
                        (_num(line.quantity), "0.###"),
                        (_num(line.amount), _MONEY),
                        (_num(line.tax_amount), _MONEY),
                        (t.currency, None),
                        (_num(share), _MONEY),
                    ]
                )
        values = [
            (t.transaction_date, "yyyy-mm-dd"),
            (t.type.value.capitalize(), None),
            (None if is_transfer else _categories(t), None),
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

    if item_rows:
        _write_rows(wb.create_sheet("Items"), _ITEM_COLUMNS, item_rows, base_currency)

    by_category = sorted(
        category_totals.items(), key=lambda kv: (kv[0][0], -kv[1][1], kv[1][0].name)
    )
    _write_rows(
        wb.create_sheet("By category"),
        _CATEGORY_COLUMNS,
        [
            [
                (kind.capitalize(), None),
                (category.name, None),
                (count, None),
                (_num(total), _MONEY),
            ]
            for (kind, _), (category, total, count) in by_category
        ],
        base_currency,
    )

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
