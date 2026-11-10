"""API keys: making, listing, changing, rotating, ending and recognising them."""

import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import api_scopes
from app.models import ApiKey, User
from app.security import hash_session_token

KEY_PREFIX = "mlk_"
MAX_KEYS_PER_USER = 20
# A key in use is noted at most this often (no write on every request).
TOUCH_EVERY = timedelta(minutes=1)


def _now() -> datetime:
    """The clock keys go by (a test replaces it)."""
    return datetime.now(UTC)


def _aware(moment: datetime) -> datetime:
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


class ApiKeyNotFoundError(Exception):
    pass


class ApiKeyRuleError(Exception):
    """A request the rules refuse (an unknown permission, too many keys); the text is for people."""


def new_secret() -> tuple[str, str]:
    """A secret and its hash. 256 random bits need no slow hash; only the hash is stored."""
    secret = KEY_PREFIX + secrets.token_urlsafe(32)
    return secret, hash_session_token(secret)


def status_of(key: ApiKey, now: datetime | None = None) -> str:
    now = now or _now()
    return "expired" if key.expires_at and _aware(key.expires_at) <= now else "active"


def grace_until(key: ApiKey, now: datetime | None = None) -> datetime | None:
    """Until when the previous secret still works, while it does."""
    now = now or _now()
    if key.previous_hash and key.previous_expires_at and _aware(key.previous_expires_at) > now:
        return key.previous_expires_at
    return None


class ApiKeyService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def resolve(role: str | None, scopes: list[str] | None) -> tuple[str, list[str]]:
        """The (role label, scopes) to store: exactly `scopes` when given, else the role's."""
        if scopes is None:
            if role not in api_scopes.ROLES:
                raise ApiKeyRuleError("Choose a role or give the permissions")
            scopes = list(api_scopes.ROLES[role]["scopes"])
        valid = api_scopes.valid_scopes(scopes)
        if valid is None:
            raise ApiKeyRuleError("Unknown permission")
        if not valid:
            raise ApiKeyRuleError("A key needs at least one permission")
        return api_scopes.role_for(set(valid)), valid

    async def list_for_user(self, user_id: uuid.UUID) -> list[ApiKey]:
        result = await self.db.scalars(
            select(ApiKey).where(ApiKey.user_id == user_id).order_by(ApiKey.created_at.desc())
        )
        return list(result)

    async def get(self, user_id: uuid.UUID, key_id: uuid.UUID) -> ApiKey:
        key = await self.db.scalar(
            select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user_id)
        )
        if key is None:
            raise ApiKeyNotFoundError
        return key

    async def create(
        self,
        user_id: uuid.UUID,
        *,
        name: str,
        role: str | None,
        scopes: list[str] | None,
        expires_in_days: int | None,
    ) -> tuple[ApiKey, str]:
        count = len(await self.list_for_user(user_id))
        if count >= MAX_KEYS_PER_USER:
            raise ApiKeyRuleError(f"At most {MAX_KEYS_PER_USER} keys: delete one you no longer use")
        label, stored = self.resolve(role, scopes)
        secret, key_hash = new_secret()
        now = _now()
        key = ApiKey(
            user_id=user_id,
            name=name,
            role=label,
            scopes=stored,
            key_hash=key_hash,
            prefix=secret[:12],
            expires_at=now + timedelta(days=expires_in_days) if expires_in_days else None,
            created_at=now,
        )
        self.db.add(key)
        await self.db.flush()
        return key, secret

    async def update(self, key: ApiKey, changes: dict) -> ApiKey:
        """Change the name, the permissions and the end date. `changes` holds only what was sent,
        so an explicit `expires_in_days: None` (never expires) is told from a missing one."""
        if changes.get("name") is not None:
            key.name = changes["name"]
        if changes.get("scopes") is not None or changes.get("role") is not None:
            key.role, key.scopes = self.resolve(changes.get("role"), changes.get("scopes"))
        if "expires_in_days" in changes:
            days = changes["expires_in_days"]
            key.expires_at = _now() + timedelta(days=days) if days else None
        await self.db.flush()
        return key

    async def rotate(self, key: ApiKey, grace_hours: int) -> str:
        """Replace the secret. With a grace period the old one keeps working for that long, so what
        uses it can be switched over; without one it stops at once. The scopes, name and end date
        stay as they are."""
        secret, key_hash = new_secret()
        now = _now()
        if grace_hours > 0:
            key.previous_hash = key.key_hash
            key.previous_expires_at = now + timedelta(hours=grace_hours)
        else:
            key.previous_hash = None
            key.previous_expires_at = None
        key.key_hash = key_hash
        key.prefix = secret[:12]
        key.rotated_at = now
        await self.db.flush()
        return secret

    async def delete(self, user_id: uuid.UUID, key_id: uuid.UUID) -> None:
        result = await self.db.execute(
            delete(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user_id)
        )
        if not result.rowcount:
            raise ApiKeyNotFoundError

    async def authenticate(self, token: str, ip: str | None = None) -> tuple[ApiKey, User] | None:
        """The key and its user for a secret, or None (unknown, past its end date, or the user is
        switched off). A previous secret works only until its grace period is over."""
        digest = hash_session_token(token)
        now = _now()
        row = (
            await self.db.execute(
                select(ApiKey, User)
                .join(User, User.id == ApiKey.user_id)
                .where(
                    or_(
                        ApiKey.key_hash == digest,
                        (ApiKey.previous_hash == digest) & (ApiKey.previous_expires_at > now),
                    )
                )
            )
        ).first()
        if row is None:
            return None
        key, user = row
        if status_of(key, now) == "expired" or not user.is_active:
            return None
        if key.last_used_at is None or now - _aware(key.last_used_at) >= TOUCH_EVERY:
            key.last_used_at = now
            key.last_used_ip = (ip or "")[:45] or None
            await self.db.flush()
        return key, user
