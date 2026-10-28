import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.dependencies import AccountServiceDep, CurrentUserId
from app.pagination import PageDep, set_total
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
async def list_accounts(
    user_id: CurrentUserId,
    service: AccountServiceDep,
    response: Response,
    page: PageDep,
    q: Annotated[str | None, Query(max_length=100, description="Search name, description")] = None,
    archived: Annotated[bool, Query(description="List the archived accounts instead")] = False,
):
    """All accounts in use, or one page with `limit`/`offset`, optionally searched by name. The
    total number of matches, ignoring paging, is in `X-Total-Count`. Built for autocomplete
    pickers. Archived accounts are left out unless `archived=true`."""
    set_total(response, await service.count_for_user(user_id, q=q, archived=archived))
    accounts = await service.list_for_user(
        user_id, q=q, archived=archived, limit=page.limit, offset=page.offset
    )
    return await service.present(accounts)


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


@router.post("/{account_id}/archive", response_model=AccountResponse)
async def archive_account(
    account_id: uuid.UUID, user_id: CurrentUserId, service: AccountServiceDep
):
    """Close an account you no longer use. Its transactions stay in the history, but it leaves
    the overview, the totals and the pickers. Undo with `unarchive`."""
    account = await service.get(user_id, account_id)
    if account is None:
        raise _NOT_FOUND
    return await _present_one(service, await service.archive(account))


@router.post("/{account_id}/unarchive", response_model=AccountResponse)
async def unarchive_account(
    account_id: uuid.UUID, user_id: CurrentUserId, service: AccountServiceDep
):
    account = await service.get(user_id, account_id)
    if account is None:
        raise _NOT_FOUND
    return await _present_one(service, await service.unarchive(account))


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(account_id: uuid.UUID, user_id: CurrentUserId, service: AccountServiceDep):
    """Linked transactions are kept and just lose the account link."""
    account = await service.get(user_id, account_id)
    if account is None:
        raise _NOT_FOUND
    await service.delete(account)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
