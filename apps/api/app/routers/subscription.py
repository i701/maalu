import uuid

from fastapi import APIRouter, HTTPException, Response, status

from app.dependencies import CurrentUserId, SubscriptionServiceDep
from app.enums import SubscriptionStatus
from app.schemas import (
    SubscriptionCreate,
    SubscriptionFromTransaction,
    SubscriptionResponse,
    SubscriptionSummary,
    SubscriptionUpdate,
)
from app.services import (
    ExchangeRateRequiredError,
    TransactionAlreadyLinkedError,
    TransactionNotFoundError,
    TransactionRuleError,
    VendorNotFoundError,
)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

_RATE_REQUIRED = HTTPException(
    status.HTTP_422_UNPROCESSABLE_CONTENT,
    "exchange_rate is required when currency differs from your base currency",
)
_VENDOR_NOT_FOUND = HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Vendor not found")
_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Subscription not found")


async def _present_one(service: SubscriptionServiceDep, subscription) -> SubscriptionResponse:
    return (await service.present([subscription]))[0]


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    data: SubscriptionCreate, user_id: CurrentUserId, service: SubscriptionServiceDep
):
    try:
        subscription = await service.create(user_id, data)
    except VendorNotFoundError:
        raise _VENDOR_NOT_FOUND from None
    except ExchangeRateRequiredError:
        raise _RATE_REQUIRED from None
    return await _present_one(service, subscription)


@router.get("", response_model=list[SubscriptionResponse])
async def list_subscriptions(
    user_id: CurrentUserId,
    service: SubscriptionServiceDep,
    status_filter: SubscriptionStatus | None = None,
):
    return await service.present(await service.list_for_user(user_id, status_filter))


# Declared before "/{subscription_id}" so "summary" isn't parsed as an id.
@router.get("/summary", response_model=SubscriptionSummary)
async def subscription_summary(user_id: CurrentUserId, service: SubscriptionServiceDep):
    """Active count and total monthly cost in your base currency."""
    return await service.summary(user_id)


@router.post(
    "/from-transaction/{transaction_id}",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def subscription_from_transaction(
    transaction_id: uuid.UUID,
    data: SubscriptionFromTransaction,
    user_id: CurrentUserId,
    service: SubscriptionServiceDep,
):
    """Mark an existing transaction as the first payment of a new subscription."""
    try:
        subscription = await service.from_transaction(user_id, transaction_id, data)
    except TransactionNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found") from None
    except TransactionRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    except TransactionAlreadyLinkedError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Transaction already belongs to a subscription"
        ) from None
    return await _present_one(service, subscription)


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription(
    subscription_id: uuid.UUID, user_id: CurrentUserId, service: SubscriptionServiceDep
):
    subscription = await service.get(user_id, subscription_id)
    if subscription is None:
        raise _NOT_FOUND
    return await _present_one(service, subscription)


@router.patch("/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: uuid.UUID,
    data: SubscriptionUpdate,
    user_id: CurrentUserId,
    service: SubscriptionServiceDep,
):
    subscription = await service.get(user_id, subscription_id)
    if subscription is None:
        raise _NOT_FOUND
    try:
        subscription = await service.update(subscription, data)
    except VendorNotFoundError:
        raise _VENDOR_NOT_FOUND from None
    except ExchangeRateRequiredError:
        raise _RATE_REQUIRED from None
    return await _present_one(service, subscription)


@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription(
    subscription_id: uuid.UUID, user_id: CurrentUserId, service: SubscriptionServiceDep
):
    """Linked transactions are kept and just lose the subscription link."""
    subscription = await service.get(user_id, subscription_id)
    if subscription is None:
        raise _NOT_FOUND
    await service.delete(subscription)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
