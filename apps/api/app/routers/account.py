import uuid

from fastapi import APIRouter, HTTPException, Response, status

from app.dependencies import AccountServiceDep, CurrentUserId
from app.schemas import AccountCreate, AccountResponse, AccountSummary, AccountUpdate
from app.services import (
    AccountHasTransactionsError,
    ExchangeRateRequiredError,
)

router = APIRouter(prefix="/accounts", tags=["accounts"])

_RATE_REQUIRED = HTTPException(
    status.HTTP_422_UNPROCESSABLE_CONTENT,
    "exchange_rate is required when currency differs from your base currency",
)
_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")


async def _present_one(service: AccountServiceDep, account) -> AccountResponse:
    return (await service.present([account]))[0]


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(data: AccountCreate, user_id: CurrentUserId, service: AccountServiceDep):
    try:
        account = await service.create(user_id, data)
    except ExchangeRateRequiredError:
        raise _RATE_REQUIRED from None
    return await _present_one(service, account)


@router.get("", response_model=list[AccountResponse])
async def list_accounts(user_id: CurrentUserId, service: AccountServiceDep):
    return await service.present(await service.list_for_user(user_id))


# Declared before "/{account_id}" so "summary" isn't parsed as an id.
@router.get("/summary", response_model=AccountSummary)
async def account_summary(user_id: CurrentUserId, service: AccountServiceDep):
    """Assets, liabilities and total in your base currency."""
    return await service.summary(user_id)


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(account_id: uuid.UUID, user_id: CurrentUserId, service: AccountServiceDep):
    account = await service.get(user_id, account_id)
    if account is None:
        raise _NOT_FOUND
    return await _present_one(service, account)


@router.patch("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: uuid.UUID,
    data: AccountUpdate,
    user_id: CurrentUserId,
    service: AccountServiceDep,
):
    account = await service.get(user_id, account_id)
    if account is None:
        raise _NOT_FOUND
    try:
        account = await service.update(account, data)
    except ExchangeRateRequiredError:
        raise _RATE_REQUIRED from None
    except AccountHasTransactionsError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Currency can't change while transactions are linked to this account",
        ) from None
    return await _present_one(service, account)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(account_id: uuid.UUID, user_id: CurrentUserId, service: AccountServiceDep):
    """Linked transactions are kept and just lose the account link."""
    account = await service.get(user_id, account_id)
    if account is None:
        raise _NOT_FOUND
    await service.delete(account)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
