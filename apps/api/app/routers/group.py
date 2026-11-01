import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.dependencies import CurrentUserId, GroupServiceDep
from app.pagination import PageDep, set_total
from app.schemas import (
    GroupCreate,
    GroupDetail,
    GroupMembers,
    GroupRemoved,
    GroupResponse,
    GroupUpdate,
    TransactionResponse,
)
from app.services import GroupRuleError

router = APIRouter(prefix="/groups", tags=["groups"])

_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Group not found")


async def _get_or_404(service: GroupServiceDep, user_id: uuid.UUID, group_id: uuid.UUID):
    group = await service.get(user_id, group_id)
    if group is None:
        raise _NOT_FOUND
    return group


def _rule(exc: GroupRuleError) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc))


async def _present_one(service: GroupServiceDep, group) -> GroupResponse:
    return (await service.present([group]))[0]


@router.get("", response_model=list[GroupResponse])
async def list_groups(
    user_id: CurrentUserId,
    service: GroupServiceDep,
    response: Response,
    page: PageDep,
    q: Annotated[str | None, Query(max_length=100, description="Search name and note")] = None,
):
    """Your groups, the one with the most recent transaction first. The total number of matches,
    ignoring paging, is in `X-Total-Count`."""
    set_total(response, await service.count_for_user(user_id, q=q))
    groups = await service.list_for_user(user_id, q=q, limit=page.limit, offset=page.offset)
    return await service.present(groups)


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(data: GroupCreate, user_id: CurrentUserId, service: GroupServiceDep):
    """Bundle two to fifty transactions under a name. Each must be yours, not in the trash, not a
    transfer and not already in a group. Nothing about them changes: the group adds them up."""
    try:
        group = await service.create(user_id, data.name, data.note, data.transaction_ids)
    except GroupRuleError as exc:
        raise _rule(exc) from None
    return await _present_one(service, group)


@router.get("/{group_id}", response_model=GroupDetail)
async def get_group(group_id: uuid.UUID, user_id: CurrentUserId, service: GroupServiceDep):
    """A group with its summary and its transactions (those not in the trash), newest first."""
    group = await _get_or_404(service, user_id, group_id)
    summary = await _present_one(service, group)
    members = await service.members(group)
    return GroupDetail(
        **summary.model_dump(),
        transactions=[TransactionResponse.model_validate(t) for t in members],
    )


@router.patch("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: uuid.UUID, data: GroupUpdate, user_id: CurrentUserId, service: GroupServiceDep
):
    group = await _get_or_404(service, user_id, group_id)
    group = await service.update(group, data.model_dump(exclude_unset=True))
    return await _present_one(service, group)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(group_id: uuid.UUID, user_id: CurrentUserId, service: GroupServiceDep):
    """Delete the group. Its transactions are kept and just stop being grouped."""
    await service.delete(await _get_or_404(service, user_id, group_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{group_id}/transactions", response_model=GroupResponse)
async def add_to_group(
    group_id: uuid.UUID, data: GroupMembers, user_id: CurrentUserId, service: GroupServiceDep
):
    """Add transactions to a group (at most fifty in all). Same rules as when creating one."""
    group = await _get_or_404(service, user_id, group_id)
    try:
        group = await service.add(group, data.transaction_ids)
    except GroupRuleError as exc:
        raise _rule(exc) from None
    return await _present_one(service, group)


@router.post("/{group_id}/transactions/remove", response_model=GroupRemoved)
async def remove_from_group(
    group_id: uuid.UUID, data: GroupMembers, user_id: CurrentUserId, service: GroupServiceDep
):
    """Take transactions out of a group (they are not deleted). A group left with fewer than two
    transactions is deleted."""
    group = await _get_or_404(service, user_id, group_id)
    removed, dissolved = await service.remove(group, data.transaction_ids)
    return GroupRemoved(removed=removed, dissolved=dissolved)
