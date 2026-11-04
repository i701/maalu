import uuid

from fastapi import APIRouter, HTTPException, Response, status

from app.dependencies import CurrentUserId, SalarySplitServiceDep
from app.schemas import (
    SalaryRuleCreate,
    SalaryRuleResponse,
    SalaryRuleUpdate,
    SalarySplitApply,
    SalarySplitPlan,
    SalarySplitResult,
)
from app.services import (
    SalaryRuleNotFoundError,
    SalaryRuleTakenError,
    SalarySplitAppliedError,
    SalarySplitError,
    SalarySplitNotAppliedError,
    TransactionRuleError,
)

router = APIRouter(tags=["salary"])

_RULE_404 = HTTPException(status.HTTP_404_NOT_FOUND, "Rule not found")
_SALARY_404 = HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")


def _unprocessable(exc: Exception) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc))


@router.get("/salary-rules", response_model=list[SalaryRuleResponse])
async def list_rules(user_id: CurrentUserId, service: SalarySplitServiceDep):
    """What each account or goal gets when a salary is split, oldest first."""
    return await service.list_rules(user_id)


@router.post(
    "/salary-rules", response_model=SalaryRuleResponse, status_code=status.HTTP_201_CREATED
)
async def create_rule(
    data: SalaryRuleCreate, user_id: CurrentUserId, service: SalarySplitServiceDep
):
    try:
        return await service.create_rule(user_id, data)
    except SalaryRuleTakenError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "That account or goal already has a rule"
        ) from None
    except SalarySplitError as exc:
        raise _unprocessable(exc) from None


@router.patch("/salary-rules/{rule_id}", response_model=SalaryRuleResponse)
async def update_rule(
    rule_id: uuid.UUID,
    data: SalaryRuleUpdate,
    user_id: CurrentUserId,
    service: SalarySplitServiceDep,
):
    try:
        return await service.update_rule(user_id, rule_id, data)
    except SalaryRuleNotFoundError:
        raise _RULE_404 from None
    except SalarySplitError as exc:
        raise _unprocessable(exc) from None


@router.delete("/salary-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(rule_id: uuid.UUID, user_id: CurrentUserId, service: SalarySplitServiceDep):
    try:
        await service.delete_rule(user_id, rule_id)
    except SalaryRuleNotFoundError:
        raise _RULE_404 from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/transactions/{transaction_id}/salary-split", response_model=SalarySplitPlan)
async def salary_split_plan(
    transaction_id: uuid.UUID, user_id: CurrentUserId, service: SalarySplitServiceDep
):
    """What the salary rules would send on from this salary (nothing is made), or, after a split,
    what it made. Only a posted income in the Salary category can be split."""
    try:
        return await service.plan(user_id, transaction_id)
    except SalaryRuleNotFoundError:
        raise _SALARY_404 from None
    except SalarySplitError as exc:
        raise _unprocessable(exc) from None


@router.post("/transactions/{transaction_id}/salary-split", response_model=SalarySplitResult)
async def apply_salary_split(
    transaction_id: uuid.UUID,
    data: SalarySplitApply,
    user_id: CurrentUserId,
    service: SalarySplitServiceDep,
):
    """Make the split: a transfer from the salary's account into each account, an amount set aside
    for each goal tracked by hand. The lines are the ones you confirmed (amounts may differ from the
    plan) and can't add up to more than the salary. 409 when it was already split."""
    try:
        return await service.apply(user_id, transaction_id, data)
    except SalaryRuleNotFoundError:
        raise _SALARY_404 from None
    except SalarySplitAppliedError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This salary has already been split. Undo it to split again"
        ) from None
    except (SalarySplitError, TransactionRuleError) as exc:
        raise _unprocessable(exc) from None


@router.delete(
    "/transactions/{transaction_id}/salary-split", status_code=status.HTTP_204_NO_CONTENT
)
async def undo_salary_split(
    transaction_id: uuid.UUID, user_id: CurrentUserId, service: SalarySplitServiceDep
):
    """Take a split back: its transfers go to the trash and its set-asides are removed."""
    try:
        await service.undo(user_id, transaction_id)
    except SalaryRuleNotFoundError:
        raise _SALARY_404 from None
    except SalarySplitNotAppliedError:
        raise HTTPException(status.HTTP_409_CONFLICT, "This salary has not been split") from None
    except SalarySplitError as exc:
        raise _unprocessable(exc) from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)
