import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.dependencies import BudgetServiceDep, CurrentUserId
from app.schemas import (
    BudgetLineCreate,
    BudgetLineUpdate,
    BudgetMoveCreate,
    BudgetResponse,
    BudgetSettingsUpdate,
)
from app.schemas.budget import BudgetMoveLogEntry
from app.services import (
    BudgetCategoryTakenError,
    BudgetLineNotFoundError,
    BudgetLineRuleError,
    CategoryNotFoundError,
)

router = APIRouter(prefix="/budget", tags=["budget"])

_CATEGORY_NOT_FOUND = HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Category not found")


@router.get("", response_model=BudgetResponse)
async def get_budget(
    user_id: CurrentUserId,
    service: BudgetServiceDep,
    on: Annotated[
        date | None, Query(description="Any day in the period to show; defaults to today")
    ] = None,
):
    """The budget for one period: every line with what was spent, what is left and whether it is
    close to or over its limit."""
    return await service.view(user_id, on)


@router.patch("", response_model=BudgetResponse)
async def update_budget(
    data: BudgetSettingsUpdate, user_id: CurrentUserId, service: BudgetServiceDep
):
    await service.update_settings(user_id, data)
    return await service.view(user_id)


@router.post("/lines", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_line(data: BudgetLineCreate, user_id: CurrentUserId, service: BudgetServiceDep):
    try:
        await service.create_line(user_id, data)
    except CategoryNotFoundError:
        raise _CATEGORY_NOT_FOUND from None
    except BudgetCategoryTakenError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from None
    except BudgetLineRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    return await service.view(user_id)


@router.patch("/lines/{line_id}", response_model=BudgetResponse)
async def update_line(
    line_id: uuid.UUID,
    data: BudgetLineUpdate,
    user_id: CurrentUserId,
    service: BudgetServiceDep,
):
    line = await service.get_line(user_id, line_id)
    if line is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Budget line not found")
    try:
        await service.update_line(user_id, line, data)
    except CategoryNotFoundError:
        raise _CATEGORY_NOT_FOUND from None
    except BudgetCategoryTakenError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from None
    except BudgetLineRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    return await service.view(user_id)


@router.post("/moves", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_move(data: BudgetMoveCreate, user_id: CurrentUserId, service: BudgetServiceDep):
    """Move money from one monthly limit to another for one period, or add to one for that period
    only (leave out `from_line_id`). Returns the budget for that period."""
    try:
        on = await service.create_move(user_id, data)
    except BudgetLineNotFoundError:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "Budget line not found"
        ) from None
    except BudgetLineRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    return await service.view(user_id, on)


@router.post("/moves/{move_id}/undo", response_model=BudgetResponse)
async def undo_move(move_id: uuid.UUID, user_id: CurrentUserId, service: BudgetServiceDep):
    """Undo a move: the budget stops counting it, and the limit's history keeps it, marked undone.
    Returns the budget for its period."""
    on = await service.undo_move(user_id, move_id)
    if on is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Move not found or already undone")
    return await service.view(user_id, on)


@router.get("/lines/{line_id}/moves", response_model=list[BudgetMoveLogEntry])
async def line_history(line_id: uuid.UUID, user_id: CurrentUserId, service: BudgetServiceDep):
    """Every move into or out of a limit, in every period, undone ones too; newest first."""
    line = await service.get_line(user_id, line_id)
    if line is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Budget line not found")
    return await service.history(user_id, line)


@router.delete("/lines/{line_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_line(line_id: uuid.UUID, user_id: CurrentUserId, service: BudgetServiceDep):
    line = await service.get_line(user_id, line_id)
    if line is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Budget line not found")
    await service.delete_line(line)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
