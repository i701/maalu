import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Account, User
from app.schemas import UserCreate, UserUpdate
from app.security import DUMMY_HASH, hash_password, verify_password
from app.services.account import AccountNotFoundError
from app.services.errors import TransactionRuleError


class EmailAlreadyRegisteredError(Exception):
    pass


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, user_id: uuid.UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        return await self.db.scalar(select(User).where(User.email == email.lower()))

    async def register(self, data: UserCreate) -> User:
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
        await self.db.flush()
        return user
