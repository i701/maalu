"""Backup and restore of one user's data, as a single JSON file.

The file holds every row the user owns, table by table, straight from the database's own tables
(`INCLUDED`), so a column added to a model is backed up with no change here. What is not in it: the
account itself (email, password, two-factor, sessions), the shared exchange-rate cache, and the
balance snapshots, which are rebuilt from the transactions.

A restore goes only into an **empty** account and gives every row a **new id**, so restoring the
same file twice, or into a second account on the same instance, never collides. It either restores
everything or, if anything is wrong, nothing (the request's transaction rolls back).
"""

import enum
import hashlib
import json
import uuid
from datetime import UTC, date, datetime, time
from decimal import Decimal
from typing import Any

from sqlalchemy import Date as SADate
from sqlalchemy import DateTime, Enum, Table, Uuid, func, insert, select, update
from sqlalchemy import Time as SATime
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.ddl import sort_tables

from app.models import Base, SnapshotDirty, User
from app.services.snapshot import EPOCH

FORMAT = "maalu-backup"
VERSION = 1
CHUNK = 1000

# Tables with a `user_id` column: the user's own rows.
OWNED = (
    "accounts",
    "budget_lines",
    "budgets",
    "categories",
    "goals",
    "subscriptions",
    "tags",
    "transaction_templates",
    "transactions",
    "vendors",
)
# Tables without one, and the column that ties each to a row of an owned table.
CHILDREN = {
    "budget_line_categories": ("line_id", "budget_lines"),
    "goal_entries": ("goal_id", "goals"),
    "template_tags": ("template_id", "transaction_templates"),
    "transaction_splits": ("transaction_id", "transactions"),
    "transaction_tags": ("transaction_id", "transactions"),
    "vendor_tags": ("vendor_id", "vendors"),
}
# Deliberately left out. A test checks every table is in one list or the other, so a new table
# forces a decision here.
EXCLUDED = (
    "users",
    "sessions",
    "recovery_codes",
    "exchange_rates",
    "balance_snapshots",
    "balance_snapshot_dirty",
)
INCLUDED: list[Table] = sort_tables([Base.metadata.tables[n] for n in (*OWNED, *CHILDREN)])


class BackupFormatError(Exception):
    """The file is not a usable Maalu backup. The message is safe to show."""


class BackupNotEmptyError(Exception):
    """Restoring needs an empty account."""


# ── Values to and from JSON ─────────────────────────────────────────────────────────────────────


def _encode(value: Any) -> Any:
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, enum.Enum):
        return value.value
    if isinstance(value, datetime | date | time):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


def _decode(column, raw: Any) -> Any:
    """A JSON value back to what the column holds."""
    if raw is None:
        return None
    kind = column.type
    try:
        if isinstance(kind, Enum):
            return kind.enum_class(raw)
        if isinstance(kind, Uuid):
            return uuid.UUID(raw)
        if isinstance(kind, DateTime):
            moment = datetime.fromisoformat(raw)
            if kind.timezone and moment.tzinfo is None:
                moment = moment.replace(tzinfo=UTC)
            return moment
        if isinstance(kind, SADate):
            return date.fromisoformat(raw)
        if isinstance(kind, SATime):
            return time.fromisoformat(raw)
        if kind.python_type is Decimal:
            return Decimal(raw)
    except (ValueError, TypeError, AttributeError, NotImplementedError, ArithmeticError):
        raise BackupFormatError(f"Bad value for {column.table.name}.{column.name}") from None
    return raw


def _checksum(tables: dict) -> str:
    canonical = json.dumps(tables, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


class BackupService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _mine(table: Table, user_id: uuid.UUID):
        """The condition that picks this user's rows of a table."""
        if table.name in OWNED:
            return table.c.user_id == user_id
        column, parent = CHILDREN[table.name]
        parent_table = Base.metadata.tables[parent]
        return table.c[column].in_(
            select(parent_table.c.id).where(parent_table.c.user_id == user_id)
        )

    # ── Export ──────────────────────────────────────────────────────────────────────────────

    async def export(self, user: User) -> bytes:
        tables: dict[str, list[dict]] = {}
        for table in INCLUDED:
            rows = (
                await self.db.execute(select(table).where(self._mine(table, user.id)))
            ).mappings()
            tables[table.name] = [{k: _encode(v) for k, v in row.items()} for row in rows]
        payload = {
            "format": FORMAT,
            "version": VERSION,
            "created_at": datetime.now(UTC).isoformat(),
            "settings": {
                "base_currency": user.base_currency,
                "start_from_template": user.start_from_template,
                "default_account_id": _encode(user.default_account_id),
            },
            "counts": {name: len(rows) for name, rows in tables.items()},
            "checksum": _checksum(tables),
            "tables": tables,
        }
        return json.dumps(payload, separators=(",", ":")).encode()

    # ── Restore ─────────────────────────────────────────────────────────────────────────────

    async def _is_empty(self, user_id: uuid.UUID) -> bool:
        for table in INCLUDED:
            found = await self.db.scalar(
                select(func.count()).select_from(table).where(self._mine(table, user_id))
            )
            if found:
                return False
        return True

    @staticmethod
    def _read(raw: bytes) -> dict:
        try:
            payload = json.loads(raw)
        except ValueError:
            raise BackupFormatError("This is not a Maalu backup file") from None
        if not isinstance(payload, dict) or payload.get("format") != FORMAT:
            raise BackupFormatError("This is not a Maalu backup file")
        if payload.get("version") != VERSION:
            raise BackupFormatError("This backup was made by a different version of Maalu")
        tables = payload.get("tables")
        if not isinstance(tables, dict) or payload.get("checksum") != _checksum(tables):
            raise BackupFormatError("The backup file is damaged (its checksum does not match)")
        known = {t.name for t in INCLUDED}
        if unknown := set(tables) - known:
            raise BackupFormatError(
                f"The backup has data this version cannot read: {sorted(unknown)}"
            )
        return payload

    async def restore(self, user: User, raw: bytes) -> dict[str, int]:
        """Put a backup into this user's account. Returns how many rows went into each table."""
        payload = self._read(raw)
        if not await self._is_empty(user.id):
            raise BackupNotEmptyError
        tables: dict[str, list[dict]] = payload["tables"]

        # every row gets a new id; foreign keys are rewritten through these maps
        new_ids: dict[str, dict[str, uuid.UUID]] = {
            t.name: {r["id"]: uuid.uuid4() for r in tables.get(t.name, []) if "id" in r}
            for t in INCLUDED
            if "id" in t.c
        }
        counts: dict[str, int] = {}
        try:
            for table in INCLUDED:
                counts[table.name] = await self._restore_table(
                    table, tables.get(table.name, []), user.id, new_ids
                )
        except (SQLAlchemyError, KeyError, TypeError) as exc:
            raise BackupFormatError(
                "The backup does not fit this version of Maalu, nothing was restored"
            ) from exc

        settings = payload.get("settings") or {}
        currency = settings.get("base_currency")
        if isinstance(currency, str) and len(currency) == 3:
            user.base_currency = currency.upper()
        user.start_from_template = bool(settings.get("start_from_template", True))
        default = settings.get("default_account_id")
        user.default_account_id = new_ids["accounts"].get(default) if default else None

        # snapshots are not backed up: mark every account so its history is rebuilt on first read
        marks = [{"account_id": new, "from_date": EPOCH} for new in new_ids["accounts"].values()]
        if marks:
            await self.db.execute(insert(SnapshotDirty), marks)
        await self.db.flush()
        return counts

    async def _restore_table(
        self,
        table: Table,
        rows: list[dict],
        user_id: uuid.UUID,
        new_ids: dict[str, dict[str, uuid.UUID]],
    ) -> int:
        # a column that points back into the same table is filled in after the rows exist
        own_refs = [
            c.name
            for c in table.c
            if any(fk.column.table is table for fk in c.foreign_keys) and not c.primary_key
        ]
        known = set(table.c.keys())
        prepared: list[dict] = []
        later: list[tuple[uuid.UUID, str, uuid.UUID]] = []
        for row in rows:
            if extra := set(row) - known:
                raise BackupFormatError(
                    f"{table.name} has columns this version does not know: {sorted(extra)}"
                )
            values: dict[str, Any] = {}
            for column in table.c:
                raw = row.get(column.name)
                if column.name == "user_id":
                    values[column.name] = user_id
                elif column.name == "id":
                    values[column.name] = new_ids[table.name][raw]
                elif column.foreign_keys:
                    target = next(iter(column.foreign_keys)).column.table.name
                    if raw is None:
                        values[column.name] = None
                    elif target in new_ids and raw in new_ids[target]:
                        values[column.name] = new_ids[target][raw]
                    else:
                        raise BackupFormatError(
                            f"A row in {table.name} points at something that is not in the backup"
                        )
                elif column.name in row:
                    values[column.name] = _decode(column, raw)
            for name in own_refs:
                if values.get(name) is not None:
                    later.append((values["id"], name, values[name]))
                    values[name] = None
            prepared.append(values)

        for start in range(0, len(prepared), CHUNK):
            await self.db.execute(insert(table), prepared[start : start + CHUNK])
        for row_id, name, target in later:
            await self.db.execute(update(table).where(table.c.id == row_id).values({name: target}))
        return len(prepared)
