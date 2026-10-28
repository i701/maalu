from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.dependencies import CurrentUserId, StatsServiceDep
from app.schemas.stats import BalanceTrendResponse, MonthlyResponse
from app.services import StatsRangeError

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/monthly", response_model=MonthlyResponse)
async def monthly(
    user_id: CurrentUserId,
    service: StatsServiceDep,
    months: Annotated[int, Query(ge=1, le=24, description="How many months to return")] = 6,
    to: Annotated[date | None, Query(description="Last month ends here; default today")] = None,
):
    """Income and expense per calendar month, ending with the month of `to`."""
    return await service.monthly(user_id, months, to or date.today())


@router.get("/balance-trend", response_model=BalanceTrendResponse)
async def balance_trend(
    user_id: CurrentUserId,
    service: StatsServiceDep,
    start: Annotated[date, Query(alias="from", description="First day, YYYY-MM-DD")],
    to: Annotated[date, Query(description="Last day, inclusive")],
):
    """What your accounts were worth at the end of each day, in your base currency."""
    try:
        return await service.balance_trend(user_id, start, to)
    except StatsRangeError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
