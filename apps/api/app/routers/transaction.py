import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.dependencies import CurrentUserId, TransactionServiceDep
from app.enums import PaymentMethod
from app.schemas import TransactionCreate, TransactionResponse, TransactionUpdate
from app.services import ExchangeRateRequiredError, SubscriptionNotFoundError, VendorNotFoundError

router = APIRouter(prefix="/transactions", tags=["transactions"])

_RATE_REQUIRED = HTTPException(
    status.HTTP_422_UNPROCESSABLE_CONTENT,
    "exchange_rate is required when currency differs from your base currency",
)
_SUBSCRIPTION_NOT_FOUND = HTTPException(
    status.HTTP_422_UNPROCESSABLE_CONTENT, "Subscription not found"
)
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


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    user_id: CurrentUserId,
    service: TransactionServiceDep,
    vendor_id: uuid.UUID | None = None,
    subscription_id: uuid.UUID | None = None,
    payment_method: PaymentMethod | None = None,
    currency: str | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return await service.list_for_user(
        user_id,
        vendor_id=vendor_id,
        subscription_id=subscription_id,
        payment_method=payment_method,
        currency=currency,
        limit=limit,
        offset=offset,
    )


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


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: uuid.UUID, user_id: CurrentUserId, service: TransactionServiceDep
):
    transaction = await service.get(user_id, transaction_id)
    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    await service.delete(transaction)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
