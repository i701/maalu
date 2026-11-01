"""Web links kept with a transaction. Only the address is stored, and it is only ever shown as a
link, so nothing on the server fetches it."""

import re
import uuid
from urllib.parse import urlsplit

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Transaction, TransactionLink
from app.services.attachment import AttachmentNotFoundError, AttachmentRuleError

MAX_URL = 2000


def normalize_url(raw: str) -> str:
    """The address to store: trimmed, `https://` added when no scheme was typed, and only http or
    https with a host and no embedded password. Raises `AttachmentRuleError` otherwise."""
    url = raw.strip()
    if re.search(r"\s", url):
        raise AttachmentRuleError("A web address cannot contain spaces")
    if "://" not in url:
        # "mailto:x", "javascript:alert(1)", "data:..." have a scheme but no "//": refuse, don't
        # mistake them for a host
        if re.match(r"^[a-z][a-z0-9+.-]*:", url, re.IGNORECASE) and not re.match(
            r"^[^/]*:\d+(/|$)", url
        ):
            raise AttachmentRuleError("Only http and https links can be added")
        url = f"https://{url}"
    try:
        parts = urlsplit(url)
        host = parts.hostname
        parts.port  # noqa: B018  (raises ValueError for a bad port)
    except ValueError:
        raise AttachmentRuleError("That is not a valid web address") from None
    if parts.scheme.lower() not in ("http", "https"):
        raise AttachmentRuleError("Only http and https links can be added")
    if not host or ("." not in host and host != "localhost"):
        raise AttachmentRuleError("That is not a valid web address")
    if parts.username or parts.password:
        raise AttachmentRuleError("Leave the user name and password out of the address")
    if len(url) > MAX_URL:
        raise AttachmentRuleError(f"The address is too long (at most {MAX_URL} characters)")
    return url


class LinkService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

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

    async def list_for_transaction(
        self, user_id: uuid.UUID, transaction_id: uuid.UUID
    ) -> list[TransactionLink]:
        await self._transaction(user_id, transaction_id, live=False)
        rows = await self.db.scalars(
            select(TransactionLink)
            .where(TransactionLink.transaction_id == transaction_id)
            .order_by(TransactionLink.created_at, TransactionLink.id)
        )
        return list(rows.all())

    async def add(
        self, user_id: uuid.UUID, transaction_id: uuid.UUID, url: str, title: str | None
    ) -> TransactionLink:
        await self._transaction(user_id, transaction_id, live=True)
        address = normalize_url(url)
        have = await self.db.scalar(
            select(func.count())
            .select_from(TransactionLink)
            .where(TransactionLink.transaction_id == transaction_id)
        )
        if (have or 0) >= settings.links_per_transaction:
            raise AttachmentRuleError(
                f"A transaction can have at most {settings.links_per_transaction} links"
            )
        row = TransactionLink(
            user_id=user_id,
            transaction_id=transaction_id,
            url=address,
            title=(title or "").strip()[:200] or None,
        )
        self.db.add(row)
        await self.db.flush()
        return row

    async def delete(self, user_id: uuid.UUID, link_id: uuid.UUID) -> None:
        row = await self.db.scalar(
            select(TransactionLink).where(
                TransactionLink.id == link_id, TransactionLink.user_id == user_id
            )
        )
        if row is None:
            raise AttachmentNotFoundError
        await self.db.delete(row)
        await self.db.flush()
