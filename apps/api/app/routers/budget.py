import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.dependencies import BudgetServiceDep, CurrentUserId
from app.schemas import (
    BudgetLineCreate,
    BudgetLineUpdate,
    BudgetResponse,
    BudgetSettingsUpdate,
)
from app.services import BudgetCategoryTakenError, CategoryNotFoundError

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
    return await service.view(user_id)


@router.delete("/lines/{line_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_line(line_id: uuid.UUID, user_id: CurrentUserId, service: BudgetServiceDep):
    line = await service.get_line(user_id, line_id)
    if line is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Budget line not found")
    await service.delete_line(line)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
