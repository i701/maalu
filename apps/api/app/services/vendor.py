import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Vendor
from app.schemas import VendorCreate, VendorUpdate


class VendorNotFoundError(Exception):
    pass


class VendorNameTakenError(Exception):
    pass


def normalize_name(name: str) -> str:
    return " ".join(name.split()).casefold()


class VendorService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_user(self, user_id: uuid.UUID) -> list[Vendor]:
        stmt = select(Vendor).where(Vendor.user_id == user_id).order_by(Vendor.normalized_name)
        return list((await self.db.scalars(stmt)).all())

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
            **data.model_dump(exclude={"name"}),
        )
        try:
            # Savepoint: a name clash doesn't poison the outer transaction.
            async with self.db.begin_nested():
                self.db.add(vendor)
                await self.db.flush()
        except IntegrityError as exc:
            raise VendorNameTakenError from exc
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
        for field, value in changes.items():
            setattr(vendor, field, value)
        try:
            async with self.db.begin_nested():
                await self.db.flush()
        except IntegrityError as exc:
            raise VendorNameTakenError from exc
        return vendor

    async def delete(self, vendor: Vendor) -> None:
        await self.db.delete(vendor)
        await self.db.flush()
