import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import User, UserSession
from app.security import hash_session_token, new_session_token

# Using a session pushes its end out again, but not more than once an hour (no write on every
# request).
TOUCH_EVERY = timedelta(hours=1)


def _now() -> datetime:
    """The clock the sessions go by (a test replaces it)."""
    return datetime.now(UTC)


def _aware(moment: datetime) -> datetime:
    """SQLite hands back naive datetimes (the tests use it); they are UTC."""
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


class SessionService:
    """Sign-ins you can see and end. A session is a row; ending it deletes the row."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self, user_id: uuid.UUID, user_agent: str | None, ip_address: str | None
    ) -> str:
        """Start a session and return its token (the only time it exists in the clear)."""
        token, token_hash = new_session_token()
        now = _now()
        # forget this user's expired sessions as we go, so the table does not fill up
        await self.db.execute(
            delete(UserSession).where(UserSession.user_id == user_id, UserSession.expires_at < now)
        )
        self.db.add(
            UserSession(
                user_id=user_id,
                token_hash=token_hash,
                created_at=now,
                last_used_at=now,
                expires_at=now + timedelta(days=settings.session_days),
                user_agent=(user_agent or "")[:255] or None,
                ip_address=(ip_address or "")[:45] or None,
            )
        )
        await self.db.flush()
        return token

    async def authenticate(self, token: str) -> tuple[UserSession, User] | None:
        """The live session and its user for a bearer token, or None (unknown, expired, ended, or
        the user is switched off). A session in use is renewed."""
        row = (
            await self.db.execute(
                select(UserSession, User)
                .join(User, User.id == UserSession.user_id)
                .where(UserSession.token_hash == hash_session_token(token))
            )
        ).first()
        if row is None:
            return None
        session, user = row
        now = _now()
        if _aware(session.expires_at) <= now or not user.is_active:
            return None
        if now - _aware(session.last_used_at) >= TOUCH_EVERY:
            session.last_used_at = now
            session.expires_at = now + timedelta(days=settings.session_days)
            await self.db.flush()
        return session, user

    async def list_for_user(self, user_id: uuid.UUID) -> list[UserSession]:
        """The user's live sessions, the most recently used first."""
        result = await self.db.scalars(
            select(UserSession)
            .where(UserSession.user_id == user_id, UserSession.expires_at > _now())
            .order_by(UserSession.last_used_at.desc())
        )
        return list(result)

    async def end(self, user_id: uuid.UUID, session_id: uuid.UUID) -> bool:
        """End one of the user's sessions. False if there is no such session of theirs."""
        result = await self.db.execute(
            delete(UserSession).where(UserSession.id == session_id, UserSession.user_id == user_id)
        )
        return result.rowcount > 0

    async def end_others(self, user_id: uuid.UUID, keep: uuid.UUID) -> int:
        """End every session of the user except `keep`. Returns how many were ended."""
        result = await self.db.execute(
            delete(UserSession).where(UserSession.user_id == user_id, UserSession.id != keep)
        )
        return result.rowcount
