import uuid
from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.dependencies import CurrentUserId, TransactionServiceDep
from app.enums import PaymentMethod, TransactionType
from app.export import XLSX_MEDIA_TYPE
from app.pagination import MAX_LIMIT, PageDep, set_total
from app.schemas import (
    BulkIds,
    BulkResult,
    BulkUpdate,
    CategoryTotals,
    TagMatch,
    TransactionCreate,
    TransactionResponse,
    TransactionTotals,
    TransactionUpdate,
)
from app.services import (
    AccountCurrencyMismatchError,
    AccountNotFoundError,
    ExchangeRateRequiredError,
    SubscriptionNotFoundError,
    TransactionRuleError,
    VendorNotFoundError,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])

_RATE_REQUIRED = HTTPException(
    status.HTTP_422_UNPROCESSABLE_CONTENT,
    "exchange_rate is required when currency differs from your base currency",
)
_SUBSCRIPTION_NOT_FOUND = HTTPException(
    status.HTTP_422_UNPROCESSABLE_CONTENT, "Subscription not found"
)


def _check_range(low: Decimal | None, high: Decimal | None) -> None:
    if low is not None and high is not None and low > high:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "min_amount can't be greater than max_amount"
        )


def _check_dates(start: date | None, end: date | None) -> None:
    if start is not None and end is not None and start > end:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "date_from can't be after date_to"
        )


_ACCOUNT_NOT_FOUND = HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Account not found")
_VENDOR_NOT_FOUND = HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Vendor not found")


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: TransactionCreate, user_id: CurrentUserId, service: TransactionServiceDep
):
    try:
        return await service.create(user_id, data)
    except VendorNotFoundError:
        raise _VENDOR_NOT_FOUND from None
    except ExchangeRateRequiredError:
        raise _RATE_REQUIRED from None
    except SubscriptionNotFoundError:
        raise _SUBSCRIPTION_NOT_FOUND from None
    except AccountNotFoundError:
        raise _ACCOUNT_NOT_FOUND from None
    except TransactionRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    except AccountCurrencyMismatchError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"Transactions in this account must be in {exc.currency}",
        ) from None


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    user_id: CurrentUserId,
    service: TransactionServiceDep,
    response: Response,
    vendor_id: uuid.UUID | None = None,
    subscription_id: uuid.UUID | None = None,
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    tag_id: Annotated[
        list[uuid.UUID] | None,
        Query(description="Repeat to filter by several tags; see `tag_match`"),
    ] = None,
    tag_match: Annotated[
        TagMatch, Query(description="`any`: has at least one of the tags. `all`: has every one.")
    ] = "any",
    payment_method: PaymentMethod | None = None,
    transaction_type: Annotated[TransactionType | None, Query(alias="type")] = None,
    currency: str | None = None,
    q: Annotated[
        str | None,
        Query(
            max_length=100,
            description="Search category, description, vendor, subscription, accounts",
        ),
    ] = None,
    min_amount: Annotated[
        Decimal | None,
        Query(ge=0, max_digits=19, decimal_places=4, description="Base currency, inclusive"),
    ] = None,
    max_amount: Annotated[
        Decimal | None,
        Query(ge=0, max_digits=19, decimal_places=4, description="Base currency, inclusive"),
    ] = None,
    date_from: Annotated[date | None, Query(description="Inclusive, YYYY-MM-DD")] = None,
    date_to: Annotated[date | None, Query(description="Inclusive, YYYY-MM-DD")] = None,
    limit: Annotated[int, Query(ge=1, le=MAX_LIMIT)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    """One page (default 50) of matching transactions. The total number of matches, ignoring
    `limit`/`offset`, is in the `X-Total-Count` header."""
    filters = {
        "transaction_type": transaction_type,
        "vendor_id": vendor_id,
        "subscription_id": subscription_id,
        "account_id": account_id,
        "category_id": category_id,
        "tag_ids": tag_id,
        "tag_match": tag_match,
        "payment_method": payment_method,
        "currency": currency,
        "q": q,
        "min_amount": min_amount,
        "max_amount": max_amount,
        "date_from": date_from,
        "date_to": date_to,
    }
    _check_range(min_amount, max_amount)
    _check_dates(date_from, date_to)
    set_total(response, await service.count_for_user(user_id, **filters))
    return await service.list_for_user(user_id, **filters, limit=limit, offset=offset)


@router.get("/export", response_class=Response, responses={200: {"content": {XLSX_MEDIA_TYPE: {}}}})
async def export_transactions(
    user_id: CurrentUserId,
    service: TransactionServiceDep,
    vendor_id: uuid.UUID | None = None,
    subscription_id: uuid.UUID | None = None,
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    tag_id: Annotated[
        list[uuid.UUID] | None,
        Query(description="Repeat to filter by several tags; see `tag_match`"),
    ] = None,
    tag_match: Annotated[
        TagMatch, Query(description="`any`: has at least one of the tags. `all`: has every one.")
    ] = "any",
    payment_method: PaymentMethod | None = None,
    transaction_type: Annotated[TransactionType | None, Query(alias="type")] = None,
    currency: str | None = None,
    q: Annotated[
        str | None,
        Query(
            max_length=100,
            description="Search category, description, vendor, subscription, accounts",
        ),
    ] = None,
    min_amount: Annotated[
        Decimal | None,
        Query(ge=0, max_digits=19, decimal_places=4, description="Base currency, inclusive"),
    ] = None,
    max_amount: Annotated[
        Decimal | None,
        Query(ge=0, max_digits=19, decimal_places=4, description="Base currency, inclusive"),
    ] = None,
    date_from: Annotated[date | None, Query(description="Inclusive, YYYY-MM-DD")] = None,
    date_to: Annotated[date | None, Query(description="Inclusive, YYYY-MM-DD")] = None,
):
    """Download the transactions matching the same filters as the list as an Excel (.xlsx) file.
    Not paginated: you get every match (up to 50,000), oldest first."""
    _check_range(min_amount, max_amount)
    _check_dates(date_from, date_to)
    try:
        content = await service.export_xlsx(
            user_id,
            transaction_type=transaction_type,
            vendor_id=vendor_id,
            subscription_id=subscription_id,
            account_id=account_id,
            category_id=category_id,
            tag_ids=tag_id,
            tag_match=tag_match,
            payment_method=payment_method,
            currency=currency,
            q=q,
            min_amount=min_amount,
            max_amount=max_amount,
            date_from=date_from,
            date_to=date_to,
        )
    except TransactionRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    filename = f"maalu-transactions-{date.today().isoformat()}.xlsx"
    return Response(
        content,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# Declared before "/{transaction_id}" so "summary" isn't parsed as an id.
@router.get("/summary", response_model=TransactionTotals)
async def transaction_totals(
    user_id: CurrentUserId,
    service: TransactionServiceDep,
    vendor_id: uuid.UUID | None = None,
    subscription_id: uuid.UUID | None = None,
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    tag_id: Annotated[
        list[uuid.UUID] | None,
        Query(description="Repeat to filter by several tags; see `tag_match`"),
    ] = None,
    tag_match: Annotated[
        TagMatch, Query(description="`any`: has at least one of the tags. `all`: has every one.")
    ] = "any",
    payment_method: PaymentMethod | None = None,
    transaction_type: Annotated[TransactionType | None, Query(alias="type")] = None,
    currency: str | None = None,
    q: Annotated[
        str | None,
        Query(
            max_length=100,
            description="Search category, description, vendor, subscription, accounts",
        ),
    ] = None,
    min_amount: Annotated[
        Decimal | None,
        Query(ge=0, max_digits=19, decimal_places=4, description="Base currency, inclusive"),
    ] = None,
    max_amount: Annotated[
        Decimal | None,
        Query(ge=0, max_digits=19, decimal_places=4, description="Base currency, inclusive"),
    ] = None,
    date_from: Annotated[date | None, Query(description="Inclusive, YYYY-MM-DD")] = None,
    date_to: Annotated[date | None, Query(description="Inclusive, YYYY-MM-DD")] = None,
):
    """Total income and expense (in your base currency) of the transactions matching the same
    filters as the list. Transfers are not counted."""
    _check_range(min_amount, max_amount)
    _check_dates(date_from, date_to)
    return await service.totals_for_user(
        user_id,
        transaction_type=transaction_type,
        vendor_id=vendor_id,
        subscription_id=subscription_id,
        account_id=account_id,
        category_id=category_id,
        tag_ids=tag_id,
        tag_match=tag_match,
        payment_method=payment_method,
        currency=currency,
        q=q,
        min_amount=min_amount,
        max_amount=max_amount,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/categories", response_model=CategoryTotals)
async def category_totals(
    user_id: CurrentUserId,
    service: TransactionServiceDep,
    vendor_id: uuid.UUID | None = None,
    subscription_id: uuid.UUID | None = None,
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    tag_id: Annotated[
        list[uuid.UUID] | None,
        Query(description="Repeat to filter by several tags; see `tag_match`"),
    ] = None,
    tag_match: Annotated[
        TagMatch, Query(description="`any`: has at least one of the tags. `all`: has every one.")
    ] = "any",
    payment_method: PaymentMethod | None = None,
    transaction_type: Annotated[TransactionType | None, Query(alias="type")] = None,
    currency: str | None = None,
    q: Annotated[
        str | None,
        Query(
            max_length=100,
            description="Search category, description, vendor, subscription, accounts",
        ),
    ] = None,
    min_amount: Annotated[
        Decimal | None,
        Query(ge=0, max_digits=19, decimal_places=4, description="Base currency, inclusive"),
    ] = None,
    max_amount: Annotated[
        Decimal | None,
        Query(ge=0, max_digits=19, decimal_places=4, description="Base currency, inclusive"),
    ] = None,
    date_from: Annotated[date | None, Query(description="Inclusive, YYYY-MM-DD")] = None,
    date_to: Annotated[date | None, Query(description="Inclusive, YYYY-MM-DD")] = None,
):
    """Income and expense per category (in your base currency) of the transactions matching the
    same filters as the list. A split transaction counts toward each of its items' categories.
    Transfers are not counted."""
    _check_range(min_amount, max_amount)
    _check_dates(date_from, date_to)
    return await service.category_totals_for_user(
        user_id,
        transaction_type=transaction_type,
        vendor_id=vendor_id,
        subscription_id=subscription_id,
        account_id=account_id,
        category_id=category_id,
        tag_ids=tag_id,
        tag_match=tag_match,
        payment_method=payment_method,
        currency=currency,
        q=q,
        min_amount=min_amount,
        max_amount=max_amount,
        date_from=date_from,
        date_to=date_to,
    )


# The bulk routes are declared before "/{transaction_id}" so "bulk" isn't parsed as an id.
@router.patch("/bulk", response_model=BulkResult)
async def bulk_update_transactions(
    data: BulkUpdate, user_id: CurrentUserId, service: TransactionServiceDep
):
    """Change the same things on up to 500 transactions. Where a field does not apply (a category
    on a transfer), that transaction is left alone and listed in `skipped`."""
    return await service.bulk_update(user_id, data)


@router.post("/bulk/trash", response_model=BulkResult)
async def bulk_trash_transactions(
    data: BulkIds, user_id: CurrentUserId, service: TransactionServiceDep
):
    """Move up to 500 transactions to the trash."""
    return await service.bulk_trash(user_id, data.ids)


@router.post("/bulk/restore", response_model=BulkResult)
async def bulk_restore_transactions(
    data: BulkIds, user_id: CurrentUserId, service: TransactionServiceDep
):
    """Bring transactions back from the trash."""
    return await service.bulk_restore(user_id, data.ids)


@router.post("/bulk/purge", response_model=BulkResult)
async def bulk_purge_transactions(
    data: BulkIds, user_id: CurrentUserId, service: TransactionServiceDep
):
    """Delete transactions for good. Only ones already in the trash."""
    return await service.bulk_purge(user_id, data.ids)


# Declared before "/{transaction_id}" so "trash" isn't parsed as an id.
@router.get("/trash", response_model=list[TransactionResponse])
async def list_trash(
    user_id: CurrentUserId, service: TransactionServiceDep, response: Response, page: PageDep
):
    """Deleted transactions, most recently deleted first. They count toward nothing."""
    set_total(response, await service.count_trashed(user_id))
    return await service.list_trashed(user_id, limit=page.limit, offset=page.offset)


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: uuid.UUID, user_id: CurrentUserId, service: TransactionServiceDep
):
    transaction = await service.get(user_id, transaction_id)
    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    return transaction


@router.patch("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: uuid.UUID,
    data: TransactionUpdate,
    user_id: CurrentUserId,
    service: TransactionServiceDep,
):
    transaction = await service.get(user_id, transaction_id)
    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    try:
        return await service.update(transaction, data)
    except VendorNotFoundError:
        raise _VENDOR_NOT_FOUND from None
    except ExchangeRateRequiredError:
        raise _RATE_REQUIRED from None
    except SubscriptionNotFoundError:
        raise _SUBSCRIPTION_NOT_FOUND from None
    except AccountNotFoundError:
        raise _ACCOUNT_NOT_FOUND from None
    except TransactionRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    except AccountCurrencyMismatchError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"Transactions in this account must be in {exc.currency}",
        ) from None


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: uuid.UUID, user_id: CurrentUserId, service: TransactionServiceDep
):
    """Move to the trash. It can be restored until it is deleted for good."""
    transaction = await service.get(user_id, transaction_id)
    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    await service.trash(transaction)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{transaction_id}/restore", response_model=TransactionResponse)
async def restore_transaction(
    transaction_id: uuid.UUID, user_id: CurrentUserId, service: TransactionServiceDep
):
    transaction = await service.get_trashed(user_id, transaction_id)
    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found in the trash")
    return await service.restore(transaction)


@router.delete("/{transaction_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction_permanently(
    transaction_id: uuid.UUID, user_id: CurrentUserId, service: TransactionServiceDep
):
    """Delete for good. Only a transaction already in the trash can be."""
    transaction = await service.get_trashed(user_id, transaction_id)
    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found in the trash")
    await service.delete(transaction)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
