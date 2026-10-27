import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.dependencies import CategoryServiceDep, CurrentUserId
from app.models import Category
from app.pagination import PageDep, set_total
from app.schemas import (
    CategoryCreate,
    CategoryMerge,
    CategoryResponse,
    CategoryUpdate,
)
from app.services import CategoryInUseError, CategoryNameTakenError

router = APIRouter(prefix="/categories", tags=["categories"])

_NAME_TAKEN = HTTPException(status.HTTP_409_CONFLICT, "Category name already exists")


async def _get_or_404(
    service: CategoryServiceDep, user_id: uuid.UUID, category_id: uuid.UUID
) -> Category:
    category = await service.get(user_id, category_id)
    if category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    return category


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate, user_id: CurrentUserId, service: CategoryServiceDep
):
    try:
        category = await service.create(user_id, data.name)
    except CategoryNameTakenError:
        raise _NAME_TAKEN from None
    return (await service.present(user_id, [category]))[0]


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    user_id: CurrentUserId,
    service: CategoryServiceDep,
    response: Response,
    page: PageDep,
    q: Annotated[str | None, Query(max_length=100, description="Search the name")] = None,
):
    """All categories, or one page with `limit`/`offset`, optionally searched. The total number of
    matches, ignoring paging, is in `X-Total-Count`."""
    set_total(response, await service.count_for_user(user_id, q=q))
    categories = await service.list_for_user(user_id, q=q, limit=page.limit, offset=page.offset)
    return await service.present(user_id, categories)


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: uuid.UUID, user_id: CurrentUserId, service: CategoryServiceDep):
    category = await _get_or_404(service, user_id, category_id)
    return (await service.present(user_id, [category]))[0]


@router.patch("/{category_id}", response_model=CategoryResponse)
async def rename_category(
    category_id: uuid.UUID,
    data: CategoryUpdate,
    user_id: CurrentUserId,
    service: CategoryServiceDep,
):
    category = await _get_or_404(service, user_id, category_id)
    try:
        await service.rename(category, data.name)
    except CategoryNameTakenError:
        raise _NAME_TAKEN from None
    return (await service.present(user_id, [category]))[0]


@router.post("/{category_id}/merge", response_model=CategoryResponse)
async def merge_category(
    category_id: uuid.UUID,
    data: CategoryMerge,
    user_id: CurrentUserId,
    service: CategoryServiceDep,
):
    """Move every transaction, item and subscription of this category into another one, then
    delete this one."""
    source = await _get_or_404(service, user_id, category_id)
    target = await _get_or_404(service, user_id, data.into_id)
    if source.id == target.id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Choose a different category")
    await service.merge(source, target)
    return (await service.present(user_id, [target]))[0]


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: uuid.UUID, user_id: CurrentUserId, service: CategoryServiceDep
):
    """Only a category nothing uses can be deleted; merge it into another one otherwise."""
    category = await _get_or_404(service, user_id, category_id)
    try:
        await service.delete(user_id, category)
    except CategoryInUseError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This category is still used. Merge it into another one instead.",
        ) from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)
