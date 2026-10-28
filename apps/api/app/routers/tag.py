import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.dependencies import CurrentUserId, TagServiceDep
from app.models import Tag
from app.pagination import PageDep, set_total
from app.schemas import TagCreate, TagMerge, TagResponse, TagUpdate
from app.services import TagNameTakenError

router = APIRouter(prefix="/tags", tags=["tags"])

_NAME_TAKEN = HTTPException(status.HTTP_409_CONFLICT, "Tag name already exists")


async def _get_or_404(service: TagServiceDep, user_id: uuid.UUID, tag_id: uuid.UUID) -> Tag:
    tag = await service.get(user_id, tag_id)
    if tag is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tag not found")
    return tag


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(data: TagCreate, user_id: CurrentUserId, service: TagServiceDep):
    """Tags are also created by name when you put them on a transaction."""
    try:
        tag = await service.create(user_id, data.name)
    except TagNameTakenError:
        raise _NAME_TAKEN from None
    return (await service.present(user_id, [tag]))[0]


@router.get("", response_model=list[TagResponse])
async def list_tags(
    user_id: CurrentUserId,
    service: TagServiceDep,
    response: Response,
    page: PageDep,
    q: Annotated[str | None, Query(max_length=100, description="Search the name")] = None,
):
    """All tags by name, or one page with `limit`/`offset`, optionally searched. The total number
    of matches, ignoring paging, is in `X-Total-Count`."""
    set_total(response, await service.count_for_user(user_id, q=q))
    tags = await service.list_for_user(user_id, q=q, limit=page.limit, offset=page.offset)
    return await service.present(user_id, tags)


@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(tag_id: uuid.UUID, user_id: CurrentUserId, service: TagServiceDep):
    tag = await _get_or_404(service, user_id, tag_id)
    return (await service.present(user_id, [tag]))[0]


@router.patch("/{tag_id}", response_model=TagResponse)
async def rename_tag(
    tag_id: uuid.UUID, data: TagUpdate, user_id: CurrentUserId, service: TagServiceDep
):
    tag = await _get_or_404(service, user_id, tag_id)
    try:
        await service.rename(tag, data.name)
    except TagNameTakenError:
        raise _NAME_TAKEN from None
    return (await service.present(user_id, [tag]))[0]


@router.post("/{tag_id}/merge", response_model=TagResponse)
async def merge_tag(
    tag_id: uuid.UUID, data: TagMerge, user_id: CurrentUserId, service: TagServiceDep
):
    """Give everything with this tag the other one instead, then delete this one."""
    source = await _get_or_404(service, user_id, tag_id)
    target = await _get_or_404(service, user_id, data.into_id)
    if source.id == target.id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Choose a different tag")
    await service.merge(source, target)
    return (await service.present(user_id, [target]))[0]


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(tag_id: uuid.UUID, user_id: CurrentUserId, service: TagServiceDep):
    """Removes the tag from every transaction and template that has it. Nothing else changes."""
    tag = await _get_or_404(service, user_id, tag_id)
    await service.delete(tag)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
