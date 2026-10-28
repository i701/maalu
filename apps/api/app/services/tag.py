import uuid
from collections.abc import Iterable

from sqlalchemy import Uuid, delete, func, insert, literal, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Tag, Transaction, template_tags, transaction_tags
from app.models.tag import TAG_COLORS
from app.schemas import TagResponse
from app.services.category import normalize_name


class TagNotFoundError(Exception):
    pass


class TagNameTakenError(Exception):
    pass


class TagService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _conditions(user_id: uuid.UUID, q: str | None) -> list:
        conditions = [Tag.user_id == user_id]
        if q and q.strip():
            conditions.append(Tag.name.icontains(q.strip(), autoescape=True))
        return conditions

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        q: str | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[Tag]:
        stmt = select(Tag).where(*self._conditions(user_id, q)).order_by(Tag.normalized_name)
        if limit is not None:
            stmt = stmt.limit(limit).offset(offset)
        return list((await self.db.scalars(stmt)).all())

    async def count_for_user(self, user_id: uuid.UUID, *, q: str | None = None) -> int:
        stmt = select(func.count(Tag.id)).where(*self._conditions(user_id, q))
        return (await self.db.scalar(stmt)) or 0

    async def get(self, user_id: uuid.UUID, tag_id: uuid.UUID) -> Tag | None:
        stmt = select(Tag).where(Tag.id == tag_id, Tag.user_id == user_id)
        return await self.db.scalar(stmt)

    async def get_by_name(self, user_id: uuid.UUID, name: str) -> Tag | None:
        stmt = select(Tag).where(
            Tag.user_id == user_id, Tag.normalized_name == normalize_name(name)
        )
        return await self.db.scalar(stmt)

    async def _next_color(self, user_id: uuid.UUID) -> str:
        """The palette colour the user's tags use least, so neighbours rarely look alike."""
        rows = await self.db.execute(
            select(Tag.color, func.count()).where(Tag.user_id == user_id).group_by(Tag.color)
        )
        used = dict(rows.all())
        return min(TAG_COLORS, key=lambda c: (used.get(c, 0), TAG_COLORS.index(c)))

    async def create(self, user_id: uuid.UUID, name: str) -> Tag:
        tag = Tag(
            user_id=user_id,
            name=" ".join(name.split()),
            normalized_name=normalize_name(name),
            color=await self._next_color(user_id),
        )
        try:
            async with self.db.begin_nested():  # a name clash doesn't poison the outer transaction
                self.db.add(tag)
                await self.db.flush()
        except IntegrityError as exc:
            raise TagNameTakenError from exc
        return tag

    async def get_or_create(self, user_id: uuid.UUID, name: str) -> Tag:
        existing = await self.get_by_name(user_id, name)
        if existing:
            return existing
        try:
            return await self.create(user_id, name)
        except TagNameTakenError:  # lost a race with a concurrent request
            tag = await self.get_by_name(user_id, name)
            assert tag is not None
            return tag

    async def resolve_many(self, user_id: uuid.UUID, names: Iterable[str]) -> list[Tag]:
        """The tags with these names, created when new. Names that differ only by case or spacing
        are one tag; the first spelling wins."""
        tags: dict[str, Tag] = {}
        for name in names:
            key = normalize_name(name)
            if key and key not in tags:
                tags[key] = await self.get_or_create(user_id, name)
        return list(tags.values())

    async def rename(self, tag: Tag, name: str) -> Tag:
        tag.name = " ".join(name.split())
        tag.normalized_name = normalize_name(name)
        try:
            async with self.db.begin_nested():
                await self.db.flush()
        except IntegrityError as exc:
            raise TagNameTakenError from exc
        return tag

    async def _usage(self, user_id: uuid.UUID) -> dict[uuid.UUID, tuple[int, int]]:
        """(transactions not in the trash, templates) per tag id."""
        transactions = dict(
            (
                await self.db.execute(
                    select(transaction_tags.c.tag_id, func.count())
                    .join(Transaction, Transaction.id == transaction_tags.c.transaction_id)
                    .where(Transaction.user_id == user_id, Transaction.deleted_at.is_(None))
                    .group_by(transaction_tags.c.tag_id)
                )
            ).all()
        )
        templates = dict(
            (
                await self.db.execute(
                    select(template_tags.c.tag_id, func.count())
                    .join(Tag, Tag.id == template_tags.c.tag_id)
                    .where(Tag.user_id == user_id)
                    .group_by(template_tags.c.tag_id)
                )
            ).all()
        )
        return {
            i: (transactions.get(i, 0), templates.get(i, 0))
            for i in set(transactions) | set(templates)
        }

    async def present(self, user_id: uuid.UUID, tags: list[Tag]) -> list[TagResponse]:
        usage = await self._usage(user_id)
        out = []
        for t in tags:
            tx, templates = usage.get(t.id, (0, 0))
            out.append(
                TagResponse(
                    id=t.id,
                    name=t.name,
                    color=t.color,
                    created_at=t.created_at,
                    transaction_count=tx,
                    template_count=templates,
                )
            )
        return out

    async def merge(self, source: Tag, target: Tag) -> Tag:
        """Give everything tagged `source` the `target` tag instead, then delete `source`."""
        if source.id == target.id:
            raise TagNameTakenError
        for link, owner in ((transaction_tags, "transaction_id"), (template_tags, "template_id")):
            owner_col = link.c[owner]
            # Skip what already has the target, so no row ends up with it twice.
            already = select(owner_col).where(link.c.tag_id == target.id)
            moving = select(owner_col, literal(target.id, Uuid)).where(
                link.c.tag_id == source.id, owner_col.not_in(already)
            )
            await self.db.execute(insert(link).from_select([owner, "tag_id"], moving))
            await self.db.execute(delete(link).where(link.c.tag_id == source.id))
        await self.db.delete(source)
        await self.db.flush()
        await self.db.refresh(target)
        return target

    async def delete(self, tag: Tag) -> None:
        """Deleting a tag only removes it from what carried it, so it never blocks."""
        await self.db.delete(tag)
        await self.db.flush()
