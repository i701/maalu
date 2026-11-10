import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ApiKey(Base):
    """A long-lived secret for something that is not a person at a browser (a bot, a script, an AI
    agent). It carries **scopes**, what it may do (`app/api_scopes.py`), and an optional end date.

    Only the SHA-256 hash of the secret is stored, so a copy of the database holds nothing that
    signs in, and the secret is shown once, when it is made or rotated. Rotating replaces the secret
    and can keep the old one working for a short grace period (`previous_*`), so the thing using it
    can be switched over without a gap."""

    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    # "viewer", "assistant" ... or "custom": a label for the list; `scopes` is what counts
    role: Mapped[str] = mapped_column(String(32))
    scopes: Mapped[list[str]] = mapped_column(JSON)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    # The first characters of the secret, to tell keys apart in a list ("mlk_Ab3dE…")
    prefix: Mapped[str] = mapped_column(String(16))
    previous_hash: Mapped[str | None] = mapped_column(String(64), index=True, default=None)
    previous_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    # None = it never expires
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), default=lambda: datetime.now(UTC)
    )
    rotated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    last_used_ip: Mapped[str | None] = mapped_column(String(45), default=None)
