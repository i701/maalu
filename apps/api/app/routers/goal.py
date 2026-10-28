import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.dependencies import CurrentUserId, GoalServiceDep
from app.models import Goal
from app.schemas import GoalCreate, GoalEntryCreate, GoalResponse, GoalUpdate
from app.services import (
    AccountNotFoundError,
    GoalAccountTakenError,
    GoalEntryNotFoundError,
    GoalRuleError,
)

router = APIRouter(prefix="/goals", tags=["goals"])

_ACCOUNT_NOT_FOUND = HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Account not found")
_ACCOUNT_TAKEN = HTTPException(
    status.HTTP_409_CONFLICT, "Another goal already follows that account"
)

OnQuery = Annotated[
    date | None,
    Query(description="Any day in the budget period to report contributions for; default today"),
]


async def _get_or_404(service: GoalServiceDep, user_id: uuid.UUID, goal_id: uuid.UUID) -> Goal:
    goal = await service.get(user_id, goal_id)
    if goal is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Goal not found")
    return goal


async def _one(service: GoalServiceDep, user_id: uuid.UUID, goal: Goal, on: date | None):
    return (await service.present(user_id, [goal], on))[0]


@router.get("", response_model=list[GoalResponse])
async def list_goals(user_id: CurrentUserId, service: GoalServiceDep, on: OnQuery = None):
    """Every goal with its progress, and, for goals with a monthly plan, what was set aside in the
    budget period containing `on`."""
    return await service.list_for_user(user_id, on)


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(data: GoalCreate, user_id: CurrentUserId, service: GoalServiceDep):
    try:
        goal = await service.create(user_id, data)
    except AccountNotFoundError:
        raise _ACCOUNT_NOT_FOUND from None
    except GoalAccountTakenError:
        raise _ACCOUNT_TAKEN from None
    except GoalRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    return await _one(service, user_id, goal, None)


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: uuid.UUID, user_id: CurrentUserId, service: GoalServiceDep, on: OnQuery = None
):
    return await _one(service, user_id, await _get_or_404(service, user_id, goal_id), on)


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: uuid.UUID, data: GoalUpdate, user_id: CurrentUserId, service: GoalServiceDep
):
    goal = await _get_or_404(service, user_id, goal_id)
    try:
        await service.update(user_id, goal, data)
    except AccountNotFoundError:
        raise _ACCOUNT_NOT_FOUND from None
    except GoalAccountTakenError:
        raise _ACCOUNT_TAKEN from None
    except GoalRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    return await _one(service, user_id, goal, None)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(goal_id: uuid.UUID, user_id: CurrentUserId, service: GoalServiceDep):
    await service.delete(await _get_or_404(service, user_id, goal_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{goal_id}/entries", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def add_entry(
    goal_id: uuid.UUID, data: GoalEntryCreate, user_id: CurrentUserId, service: GoalServiceDep
):
    """Set money aside (positive) or take it back out (negative). Only for goals without a linked
    account."""
    goal = await _get_or_404(service, user_id, goal_id)
    try:
        await service.add_entry(goal, data)
    except GoalRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    return await _one(service, user_id, goal, None)


@router.delete("/{goal_id}/entries/{entry_id}", response_model=GoalResponse)
async def delete_entry(
    goal_id: uuid.UUID, entry_id: uuid.UUID, user_id: CurrentUserId, service: GoalServiceDep
):
    goal = await _get_or_404(service, user_id, goal_id)
    try:
        await service.delete_entry(goal, entry_id)
    except GoalEntryNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entry not found") from None
    except GoalRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    return await _one(service, user_id, goal, None)
