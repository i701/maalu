import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import VendorLocality
from app.models import Vendor
from app.schemas import VendorCreate, VendorUpdate
from app.services.category import CategoryService
from app.services.tag import TagService


class VendorNotFoundError(Exception):
    pass


class VendorNameTakenError(Exception):
    pass


def normalize_name(name: str) -> str:
    return " ".join(name.split()).casefold()


class VendorService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.categories = CategoryService(db)
        self.tags = TagService(db)

    @staticmethod
    def _conditions(user_id: uuid.UUID, q: str | None, locality: VendorLocality | None) -> list:
        """Filters shared by the list and the count. `q` is a case-insensitive "contains" over
        name, contact and address; %, _ and \\ in it are matched literally, not as wildcards."""
        conditions = [Vendor.user_id == user_id]
        if q and q.strip():
            term = q.strip()
            conditions.append(
                or_(
                    Vendor.name.icontains(term, autoescape=True),
                    Vendor.contact.icontains(term, autoescape=True),
                    Vendor.address.icontains(term, autoescape=True),
                )
            )
        if locality is VendorLocality.LOCAL:
            conditions.append(Vendor.is_local.is_(True))
        elif locality is VendorLocality.FOREIGN:
            conditions.append(Vendor.is_local.is_(False))
        elif locality is VendorLocality.UNKNOWN:
            conditions.append(Vendor.is_local.is_(None))
        return conditions

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        q: str | None = None,
        locality: VendorLocality | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[Vendor]:
        stmt = (
            select(Vendor)
            .where(*self._conditions(user_id, q, locality))
            .order_by(Vendor.normalized_name)
        )
        if limit is not None:
            stmt = stmt.limit(limit).offset(offset)
        return list((await self.db.scalars(stmt)).all())

    async def count_for_user(
        self,
        user_id: uuid.UUID,
        *,
        q: str | None = None,
        locality: VendorLocality | None = None,
    ) -> int:
        stmt = select(func.count(Vendor.id)).where(*self._conditions(user_id, q, locality))
        return (await self.db.scalar(stmt)) or 0

    async def get(self, user_id: uuid.UUID, vendor_id: uuid.UUID) -> Vendor | None:
        stmt = select(Vendor).where(Vendor.id == vendor_id, Vendor.user_id == user_id)
        return await self.db.scalar(stmt)

    async def get_by_name(self, user_id: uuid.UUID, name: str) -> Vendor | None:
        stmt = select(Vendor).where(
            Vendor.user_id == user_id, Vendor.normalized_name == normalize_name(name)
        )
        return await self.db.scalar(stmt)

    async def create(self, user_id: uuid.UUID, data: VendorCreate) -> Vendor:
        """Create a vendor; raises VendorNameTakenError if the user already has that name."""
        vendor = Vendor(
            user_id=user_id,
            name=" ".join(data.name.split()),
            normalized_name=normalize_name(data.name),
            **data.model_dump(exclude={"name", "default_category", "default_tags"}),
            default_category_ref=(
                await self.categories.get_or_create(user_id, data.default_category)
                if data.default_category
                else None
            ),
            default_tags=await self.tags.resolve_many(user_id, data.default_tags),
        )
        try:
            # Savepoint: a name clash doesn't poison the outer transaction.
            async with self.db.begin_nested():
                self.db.add(vendor)
                await self.db.flush()
        except IntegrityError as exc:
            raise VendorNameTakenError from exc
        await self.db.refresh(vendor)  # reload the tags in their sorted order
        return vendor

    async def get_or_create(self, user_id: uuid.UUID, name: str) -> Vendor:
        existing = await self.get_by_name(user_id, name)
        if existing:
            return existing
        try:
            return await self.create(user_id, VendorCreate(name=name))
        except VendorNameTakenError:  # lost a race with a concurrent request
            vendor = await self.get_by_name(user_id, name)
            assert vendor is not None
            return vendor

    async def update(self, vendor: Vendor, data: VendorUpdate) -> Vendor:
        changes = data.model_dump(exclude_unset=True)
        if (name := changes.pop("name", None)) is not None:
            vendor.name = " ".join(name.split())
            vendor.normalized_name = normalize_name(name)
        if "default_category" in changes:
            name = changes.pop("default_category")
            vendor.default_category_ref = (
                await self.categories.get_or_create(vendor.user_id, name) if name else None
            )
        if "default_tags" in changes:
            tags = changes.pop("default_tags") or []
            vendor.default_tags = await self.tags.resolve_many(vendor.user_id, tags)
        for field, value in changes.items():
            setattr(vendor, field, value)
        try:
            async with self.db.begin_nested():
                await self.db.flush()
        except IntegrityError as exc:
            raise VendorNameTakenError from exc
        await self.db.refresh(vendor)
        return vendor

    async def delete(self, vendor: Vendor) -> None:
        await self.db.delete(vendor)
        await self.db.flush()
