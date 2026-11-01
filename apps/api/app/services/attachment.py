"""Files kept with a transaction (receipts).

The bytes go to storage (`app/storage.py`), the row says what exists. Upload writes the file first
and the row second, so a failure between them leaves at worst an orphan file, which
`purge_orphans` (the daily job) removes. A row whose file is missing would be a broken attachment,
which is worse."""

import contextlib
import re
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Transaction, TransactionAttachment
from app.storage import KEY_PATTERN, MissingFileError, Storage, get_storage, storage_key

PNG = b"\x89PNG\r\n\x1a\n"
# a file younger than this may still be mid-upload (its row is written after the file)
ORPHAN_MIN_AGE = timedelta(hours=24)
BATCH = 500


class AttachmentNotFoundError(Exception):
    """No such attachment, or no such transaction, for this user."""


class AttachmentRuleError(Exception):
    """The file is not acceptable. The message is safe to show."""


class AttachmentTooLargeError(AttachmentRuleError):
    pass


def detect_mime_type(body: bytes) -> str | None:
    """What the bytes are: a JPEG, PNG, WebP or PDF, or None. Decided from the content only, since a
    type the client names could be used to slip an HTML or SVG file through."""
    if body[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if body[:8] == PNG:
        return "image/png"
    if body[:5] == b"%PDF-":
        return "application/pdf"
    if body[:4] == b"RIFF" and body[8:12] == b"WEBP":
        return "image/webp"
    return None


def clean_filename(name: str) -> str:
    """A name safe to show and to put in a header: no path, no control characters, at most 255."""
    name = re.sub(r"[/\\]", "_", name)
    name = re.sub(r"[\x00-\x1f\x7f]", "", name).strip()[:255]
    return name or "attachment"


class AttachmentService:
    def __init__(self, db: AsyncSession, storage: Storage | None = None) -> None:
        self.db = db
        self.storage = storage or get_storage()

    async def _transaction(
        self, user_id: uuid.UUID, transaction_id: uuid.UUID, *, live: bool
    ) -> Transaction:
        stmt = select(Transaction).where(
            Transaction.id == transaction_id, Transaction.user_id == user_id
        )
        if live:
            stmt = stmt.where(Transaction.deleted_at.is_(None))
        found = await self.db.scalar(stmt)
        if found is None:
            raise AttachmentNotFoundError
        return found

    async def get(self, user_id: uuid.UUID, attachment_id: uuid.UUID) -> TransactionAttachment:
        found = await self.db.scalar(
            select(TransactionAttachment).where(
                TransactionAttachment.id == attachment_id, TransactionAttachment.user_id == user_id
            )
        )
        if found is None:
            raise AttachmentNotFoundError
        return found

    async def list_for_transaction(
        self, user_id: uuid.UUID, transaction_id: uuid.UUID
    ) -> list[TransactionAttachment]:
        await self._transaction(user_id, transaction_id, live=False)
        rows = await self.db.scalars(
            select(TransactionAttachment)
            .where(TransactionAttachment.transaction_id == transaction_id)
            .order_by(TransactionAttachment.created_at, TransactionAttachment.id)
        )
        return list(rows.all())

    async def upload(
        self, user_id: uuid.UUID, transaction_id: uuid.UUID, filename: str, body: bytes
    ) -> TransactionAttachment:
        await self._transaction(user_id, transaction_id, live=True)
        if not body:
            raise AttachmentRuleError("The file is empty")
        if len(body) > settings.attachment_max_bytes:
            limit = settings.attachment_max_bytes // (1024 * 1024)
            raise AttachmentTooLargeError(f"The file is too large (the limit is {limit} MB)")
        mime = detect_mime_type(body)
        if mime is None:
            raise AttachmentRuleError("Only JPEG, PNG, WebP and PDF files can be attached")
        have = await self.db.scalar(
            select(func.count())
            .select_from(TransactionAttachment)
            .where(TransactionAttachment.transaction_id == transaction_id)
        )
        if (have or 0) >= settings.attachments_per_transaction:
            raise AttachmentRuleError(
                f"A transaction can have at most {settings.attachments_per_transaction} files"
            )

        attachment_id = uuid.uuid4()
        key = storage_key(user_id, attachment_id)
        await self.storage.put(key, body, mime)
        try:
            row = TransactionAttachment(
                id=attachment_id,
                user_id=user_id,
                transaction_id=transaction_id,
                filename=clean_filename(filename),
                mime_type=mime,
                size=len(body),
            )
            self.db.add(row)
            await self.db.flush()
        except Exception:
            await self.storage.delete(key)
            raise
        return row

    async def read(
        self, user_id: uuid.UUID, attachment_id: uuid.UUID
    ) -> tuple[TransactionAttachment, bytes]:
        row = await self.get(user_id, attachment_id)
        try:
            return row, await self.storage.get(storage_key(user_id, row.id))
        except MissingFileError:
            raise AttachmentNotFoundError from None

    async def delete(self, user_id: uuid.UUID, attachment_id: uuid.UUID) -> None:
        row = await self.get(user_id, attachment_id)
        key = storage_key(user_id, row.id)
        await self.db.delete(row)
        await self.db.flush()
        # the row is the truth, so a file that will not go is only an orphan for the sweep
        with contextlib.suppress(Exception):
            await self.storage.delete(key)

    async def purge_orphans(self, min_age: timedelta = ORPHAN_MIN_AGE) -> int:
        """Delete stored files that have no row: left by a failed upload, a transaction deleted for
        good, or an account removed. Anything not named like our keys, or younger than `min_age`
        (it may be mid-upload), is left alone. Returns how many were deleted."""
        cutoff = datetime.now(UTC) - min_age
        keys = [
            o.key
            for o in await self.storage.list()
            if KEY_PATTERN.match(o.key) and o.last_modified <= cutoff
        ]
        deleted = 0
        for start in range(0, len(keys), BATCH):
            batch = keys[start : start + BATCH]
            ids = [uuid.UUID(k.split("/")[1]) for k in batch]
            known = set(
                (
                    await self.db.scalars(
                        select(TransactionAttachment.id).where(TransactionAttachment.id.in_(ids))
                    )
                ).all()
            )
            for key, attachment_id in zip(batch, ids, strict=True):
                if attachment_id not in known:
                    await self.storage.delete(key)
                    deleted += 1
        return deleted
