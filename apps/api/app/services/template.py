import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import TransactionType
from app.models import Account, TransactionTemplate, User
from app.schemas import TemplateCreate
from app.services.account import AccountNotFoundError
from app.services.category import CategoryService, normalize_name
from app.services.errors import TransactionRuleError
from app.services.tag import TagService
from app.services.vendor import VendorNotFoundError, VendorService


class TemplateNotFoundError(Exception):
    pass


class TemplateNameTakenError(Exception):
    pass


class TemplateService:
    """Saved starting points for transactions. Knows nothing about HTTP."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.vendors = VendorService(db)
        self.categories = CategoryService(db)
        self.tags = TagService(db)

    async def list_for_user(
        self, user_id: uuid.UUID, *, limit: int | None = None, offset: int = 0
    ) -> list[TransactionTemplate]:
        stmt = (
            select(TransactionTemplate)
            .where(TransactionTemplate.user_id == user_id)
            .order_by(TransactionTemplate.normalized_name)
        )
        if limit is not None:
            stmt = stmt.limit(limit).offset(offset)
        return list((await self.db.scalars(stmt)).all())

    async def count_for_user(self, user_id: uuid.UUID) -> int:
        stmt = select(func.count(TransactionTemplate.id)).where(
            TransactionTemplate.user_id == user_id
        )
        return (await self.db.scalar(stmt)) or 0

    async def get(self, user_id: uuid.UUID, template_id: uuid.UUID) -> TransactionTemplate | None:
        stmt = select(TransactionTemplate).where(
            TransactionTemplate.id == template_id, TransactionTemplate.user_id == user_id
        )
        return await self.db.scalar(stmt)

    async def _account(self, user_id: uuid.UUID, account_id: uuid.UUID | None) -> Account | None:
        if account_id is None:
            return None
        account = await self.db.scalar(
            select(Account).where(Account.id == account_id, Account.user_id == user_id)
        )
        if account is None:
            raise AccountNotFoundError
        if account.archived_at is not None:
            raise TransactionRuleError(f'"{account.name}" is archived. Unarchive it to use it')
        return account

    async def create(self, user_id: uuid.UUID, data: TemplateCreate) -> TransactionTemplate:
        is_transfer = data.type is TransactionType.TRANSFER
        if is_transfer and (data.category or data.vendor_id or data.vendor_name):
            raise TransactionRuleError("A transfer has no category or vendor")
        if not is_transfer and data.to_account_id is not None:
            raise TransactionRuleError("Only a transfer has a destination account")
        if is_transfer and data.account_id and data.account_id == data.to_account_id:
            raise TransactionRuleError("Choose two different accounts")

        account = await self._account(user_id, data.account_id)
        to_account = await self._account(user_id, data.to_account_id)
        user = await self.db.get(User, user_id)
        assert user is not None
        vendor = None
        if data.vendor_id is not None:
            vendor = await self.vendors.get(user_id, data.vendor_id)
            if vendor is None:
                raise VendorNotFoundError
        elif data.vendor_name is not None:
            vendor = await self.vendors.get_or_create(user_id, data.vendor_name)
        category = (
            await self.categories.get_or_create(user_id, data.category) if data.category else None
        )

        template = TransactionTemplate(
            user_id=user_id,
            name=" ".join(data.name.split()),
            normalized_name=normalize_name(data.name),
            type=data.type,
            amount=data.amount,
            currency=account.currency if account else (data.currency or user.base_currency),
            payment_method=data.payment_method,
            category_ref=category,
            vendor_ref=vendor,
            account=account,
            to_account=to_account,
            description=data.description,
            tags=await self.tags.resolve_many(user_id, data.tags),
        )
        return await self._save(template)

    async def rename(self, template: TransactionTemplate, name: str) -> TransactionTemplate:
        template.name = " ".join(name.split())
        template.normalized_name = normalize_name(name)
        return await self._save(template)

    async def _save(self, template: TransactionTemplate) -> TransactionTemplate:
        try:
            async with self.db.begin_nested():  # a name clash doesn't poison the outer transaction
                self.db.add(template)
                await self.db.flush()
        except IntegrityError as exc:
            raise TemplateNameTakenError from exc
        await self.db.refresh(template)
        return template

    async def delete(self, template: TransactionTemplate) -> None:
        await self.db.delete(template)
        await self.db.flush()
