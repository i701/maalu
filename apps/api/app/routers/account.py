import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.dependencies import AccountServiceDep, CurrentUserId, TransactionServiceDep
from app.pagination import PageDep, set_total
from app.schemas import (
    AccountAdjust,
    AccountCreate,
    AccountResponse,
    AccountSummary,
    AccountTrend,
    AccountUpdate,
    BalanceAfter,
    BalanceHistory,
    CardStatement,
    TransactionResponse,
)
from app.services import (
    AccountAutoRateError,
    AccountHasTransactionsError,
    AccountLimitError,
    AccountNumberTakenError,
    AccountSpendableError,
    AccountStatementError,
    ExchangeRateRequiredError,
    TransactionRuleError,
)

router = APIRouter(prefix="/accounts", tags=["accounts"])

_RATE_REQUIRED = HTTPException(
    status.HTTP_422_UNPROCESSABLE_CONTENT,
    "exchange_rate is required when currency differs from your base currency",
)
_NO_AUTO_RATE = HTTPException(
    status.HTTP_422_UNPROCESSABLE_CONTENT,
    "An account in your base currency has no exchange rate to keep up to date",
)
_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
_NO_SPENDABLE = HTTPException(
    status.HTTP_422_UNPROCESSABLE_CONTENT,
    "Cards, overdrafts and loans are money you owe, so they can't be everyday money",
)
_NO_LIMIT = HTTPException(
    status.HTTP_422_UNPROCESSABLE_CONTENT, "Only cards and overdrafts have a credit limit"
)


def _bad_statement(exc: AccountStatementError) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc))


def _number_taken(exc: AccountNumberTakenError) -> HTTPException:
    return HTTPException(
        status.HTTP_409_CONFLICT, f'The account "{exc.name}" already has this account number'
    )


async def _present_one(service: AccountServiceDep, account) -> AccountResponse:
    return (await service.present([account]))[0]


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(data: AccountCreate, user_id: CurrentUserId, service: AccountServiceDep):
    try:
        account = await service.create(user_id, data)
    except ExchangeRateRequiredError:
        raise _RATE_REQUIRED from None
    except AccountNumberTakenError as exc:
        raise _number_taken(exc) from None
    except AccountLimitError:
        raise _NO_LIMIT from None
    except AccountSpendableError:
        raise _NO_SPENDABLE from None
    except AccountStatementError as exc:
        raise _bad_statement(exc) from None
    except AccountAutoRateError:
        raise _NO_AUTO_RATE from None
    return await _present_one(service, account)


@router.get("", response_model=list[AccountResponse])
async def list_accounts(
    user_id: CurrentUserId,
    service: AccountServiceDep,
    response: Response,
    page: PageDep,
    q: Annotated[
        str | None, Query(max_length=100, description="Search name, bank, number, description")
    ] = None,
    bank: Annotated[
        str | None,
        Query(max_length=100, description="Only the accounts whose bank is exactly this"),
    ] = None,
    archived: Annotated[bool, Query(description="List the archived accounts instead")] = False,
):
    """All accounts in use, or one page with `limit`/`offset`, optionally searched by name or
    filtered to one bank. The total number of matches, ignoring paging, is in `X-Total-Count`.
    Built for autocomplete pickers. Archived accounts are left out unless `archived=true`."""
    set_total(response, await service.count_for_user(user_id, q=q, bank=bank, archived=archived))
    accounts = await service.list_for_user(
        user_id, q=q, bank=bank, archived=archived, limit=page.limit, offset=page.offset
    )
    return await service.present(accounts)


# Declared before "/{account_id}" so "summary" isn't parsed as an id.
@router.get("/summary", response_model=AccountSummary)
async def account_summary(user_id: CurrentUserId, service: AccountServiceDep):
    """Assets, liabilities and total in your base currency."""
    return await service.summary(user_id)


@router.get("/statements", response_model=list[CardStatement])
async def card_statements(user_id: CurrentUserId, service: AccountServiceDep):
    """Where each credit card with its statement days set stands against its last statement,
    soonest due first."""
    return await service.statements(user_id)


@router.get("/trends", response_model=list[AccountTrend])
async def account_trends(
    user_id: CurrentUserId,
    service: AccountServiceDep,
    days: Annotated[int, Query(ge=7, le=365, description="How many days back, ending today")] = 30,
):
    """Each active account's recent balance curve (one number per day, in the account's own
    currency), for the small charts on the accounts page: one request instead of one per account."""
    return await service.trends(user_id, days)


@router.get("/{account_id}/statement", response_model=CardStatement)
async def card_statement(account_id: uuid.UUID, user_id: CurrentUserId, service: AccountServiceDep):
    """One credit card against its last statement. 422 for an account with no statement days."""
    account = await service.get(user_id, account_id)
    if account is None:
        raise _NOT_FOUND
    if account.statement_day is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "This account has no statement days set"
        )
    return await service.statement(account)


@router.get("/{account_id}/balance-history", response_model=BalanceHistory)
async def balance_history(
    account_id: uuid.UUID,
    user_id: CurrentUserId,
    service: AccountServiceDep,
    days: Annotated[int, Query(ge=7, le=730, description="How many days back, ending today")] = 90,
):
    """The account's balance at the end of each day, in its own currency (oldest first)."""
    account = await service.get(user_id, account_id)
    if account is None:
        raise _NOT_FOUND
    return await service.balance_history(account, days)


@router.get("/{account_id}/balances-after", response_model=list[BalanceAfter])
async def balances_after(
    account_id: uuid.UUID,
    user_id: CurrentUserId,
    service: AccountServiceDep,
    limit: Annotated[int, Query(ge=1, le=2000)] = 500,
):
    """What the account held right after each of its newest `limit` transactions (the running
    balance for a statement-style list). Planned and trashed transactions have none."""
    account = await service.get(user_id, account_id)
    if account is None:
        raise _NOT_FOUND
    return await service.balances_after(account, limit)


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
    except AccountNumberTakenError as exc:
        raise _number_taken(exc) from None
    except AccountLimitError:
        raise _NO_LIMIT from None
    except AccountSpendableError:
        raise _NO_SPENDABLE from None
    except AccountStatementError as exc:
        raise _bad_statement(exc) from None
    except AccountAutoRateError:
        raise _NO_AUTO_RATE from None
    except AccountHasTransactionsError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Currency can't change while transactions are linked to this account",
        ) from None
    return await _present_one(service, account)


@router.post(
    "/{account_id}/adjust",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def adjust_account(
    account_id: uuid.UUID,
    data: AccountAdjust,
    user_id: CurrentUserId,
    service: AccountServiceDep,
    transactions: TransactionServiceDep,
):
    """Make the account match its bank. Send `new_balance` (what the bank says it holds) or
    `amount` (what to add, negative to take away). The difference is recorded as a dated income or
    expense (a "Balance adjustment") that changes the balance and its history from that date, but
    is **not** income or spending in any total, report or budget. Delete it to undo it."""
    account = await service.get(user_id, account_id)
    if account is None:
        raise _NOT_FOUND
    try:
        return await transactions.create_adjustment(
            user_id,
            account,
            new_balance=data.new_balance,
            amount=data.amount,
            day=data.date or datetime.now(UTC).date(),
            note=data.note,
        )
    except TransactionRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None


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
