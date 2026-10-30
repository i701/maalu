import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app import two_factor
from app.config import settings
from app.models import Account, RecoveryCode, User
from app.schemas import UserCreate, UserUpdate
from app.security import DUMMY_HASH, hash_password, verify_password
from app.services.account import AccountNotFoundError
from app.services.errors import TransactionRuleError


class EmailAlreadyRegisteredError(Exception):
    pass


class RegistrationClosedError(Exception):
    pass


class InvalidPasswordError(Exception):
    pass


class InvalidTwoFactorCodeError(Exception):
    """A wrong authenticator or recovery code (or one that was already used)."""


class TwoFactorLockedError(Exception):
    """Too many wrong codes in a row: the second factor is locked for a few minutes."""


class TwoFactorStateError(Exception):
    """Two-factor is already on, or not set up yet. The message is safe to show."""


# Wrong codes in a row before the second factor locks, and for how long.
MAX_CODE_FAILURES = 5
LOCK_MINUTES = 5


def _aware(moment: datetime) -> datetime:
    """SQLite hands back naive datetimes (the tests use it); they are UTC."""
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, user_id: uuid.UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        return await self.db.scalar(select(User).where(User.email == email.lower()))

    async def registration_open(self) -> bool:
        """Whether a new account may be created: see `Settings.registration`."""
        if settings.registration != "auto":
            return settings.registration == "open"
        return await self.db.scalar(select(func.count()).select_from(User)) == 0

    async def register(self, data: UserCreate) -> User:
        if not await self.registration_open():
            raise RegistrationClosedError
        user = User(
            email=data.email.lower(),
            hashed_password=hash_password(data.password),
            base_currency=data.base_currency,
        )
        self.db.add(user)
        try:
            await self.db.flush()
        except IntegrityError as exc:  # unique(email): also covers concurrent registrations
            await self.db.rollback()
            raise EmailAlreadyRegisteredError from exc
        return user

    async def authenticate(self, email: str, password: str) -> User | None:
        user = await self.get_by_email(email)
        if user is None:
            verify_password(password, DUMMY_HASH)
            return None
        if not verify_password(password, user.hashed_password) or not user.is_active:
            return None
        return user

    async def update(self, user: User, data: UserUpdate) -> User:
        changes = data.model_dump(exclude_unset=True)
        if "default_account_id" in changes:
            account_id = changes["default_account_id"]
            if account_id is not None:
                account = await self.db.scalar(
                    select(Account).where(Account.id == account_id, Account.user_id == user.id)
                )
                if account is None:
                    raise AccountNotFoundError
                if account.archived_at is not None:
                    raise TransactionRuleError(
                        f'"{account.name}" is archived. Unarchive it to use it'
                    )
            user.default_account_id = account_id
        if "start_from_template" in changes:
            user.start_from_template = changes["start_from_template"]
        await self.db.flush()
        return user

    # --- Two-factor (an authenticator app) ---------------------------------------------------

    async def two_factor_setup(self, user: User) -> tuple[str, str]:
        """Start setup: a secret and its `otpauth://` address. It counts only once
        `two_factor_enable` has seen a right code from it. Asking again before that returns the same
        secret, so a repeated or racing request can never leave the screen and the server holding
        different ones."""
        if user.two_factor_enabled:
            raise TwoFactorStateError("Two-factor is already on")
        secret = two_factor.decrypt_secret(user.two_factor_secret or "")
        if secret is None:
            secret = two_factor.new_secret()
            user.two_factor_secret = two_factor.encrypt_secret(secret)
            await self.db.flush()
        return secret, two_factor.provisioning_uri(secret, user.email)

    async def two_factor_enable(self, user: User, code: str) -> list[str]:
        """Turn it on after a right code from the app, and return the recovery codes (once)."""
        if user.two_factor_enabled:
            raise TwoFactorStateError("Two-factor is already on")
        secret = two_factor.decrypt_secret(user.two_factor_secret or "")
        if secret is None:
            raise TwoFactorStateError("Start the setup first")
        step = two_factor.matching_step(secret, code)
        if step is None:
            raise InvalidTwoFactorCodeError
        user.two_factor_enabled = True
        user.two_factor_last_step = step
        user.two_factor_failures = 0
        user.two_factor_locked_until = None
        codes = await self._replace_recovery_codes(user)
        await self.db.flush()
        return codes

    async def check_second_factor(self, user: User, code: str) -> None:
        """Accept an authenticator code (once per time step) or an unused recovery code, or raise.
        Five wrong codes in a row lock this for five minutes; the count is saved even though the
        request then fails."""
        now = datetime.now(UTC)
        if user.two_factor_locked_until and _aware(user.two_factor_locked_until) > now:
            raise TwoFactorLockedError
        if await self._accepts(user, code):
            user.two_factor_failures = 0
            user.two_factor_locked_until = None
            await self.db.flush()
            return
        user.two_factor_failures += 1
        if user.two_factor_failures >= MAX_CODE_FAILURES:
            user.two_factor_failures = 0
            user.two_factor_locked_until = now + timedelta(minutes=LOCK_MINUTES)
        await self.db.commit()  # the request fails next, which would roll the count back
        raise InvalidTwoFactorCodeError

    async def _accepts(self, user: User, code: str) -> bool:
        if two_factor.looks_like_recovery_code(code):
            recovery = await self.db.scalar(
                select(RecoveryCode).where(
                    RecoveryCode.user_id == user.id,
                    RecoveryCode.code_hash == two_factor.hash_recovery_code(code),
                    RecoveryCode.used_at.is_(None),
                )
            )
            if recovery is None:
                return False
            recovery.used_at = datetime.now(UTC)
            return True
        secret = two_factor.decrypt_secret(user.two_factor_secret or "")
        step = two_factor.matching_step(secret, code) if secret else None
        if step is None or (user.two_factor_last_step and step <= user.two_factor_last_step):
            return False
        user.two_factor_last_step = step
        return True

    async def _confirm(self, user: User, password: str, code: str) -> None:
        """The password and a second-factor code, for changes that need proof it is you."""
        if not user.two_factor_enabled:
            raise TwoFactorStateError("Two-factor is not on")
        if not verify_password(password, user.hashed_password):
            raise InvalidPasswordError
        await self.check_second_factor(user, code)

    async def two_factor_disable(self, user: User, password: str, code: str) -> None:
        await self._confirm(user, password, code)
        await self.reset_two_factor(user)

    async def new_recovery_codes(self, user: User, password: str, code: str) -> list[str]:
        """Replace the recovery codes (the old ones stop working) and return the new ones once."""
        await self._confirm(user, password, code)
        codes = await self._replace_recovery_codes(user)
        await self.db.flush()
        return codes

    async def reset_two_factor(self, user: User) -> None:
        """Turn two-factor off and forget its secret and codes. Also what the `disable-2fa` command
        does for someone who has lost both their app and their recovery codes."""
        await self.db.execute(delete(RecoveryCode).where(RecoveryCode.user_id == user.id))
        user.two_factor_enabled = False
        user.two_factor_secret = None
        user.two_factor_last_step = None
        user.two_factor_failures = 0
        user.two_factor_locked_until = None
        await self.db.flush()

    async def _replace_recovery_codes(self, user: User) -> list[str]:
        await self.db.execute(delete(RecoveryCode).where(RecoveryCode.user_id == user.id))
        codes = two_factor.new_recovery_codes()
        self.db.add_all(
            RecoveryCode(user_id=user.id, code_hash=two_factor.hash_recovery_code(c)) for c in codes
        )
        return codes
