import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.dependencies import (
    CurrentUserId,
    SubscriptionCandidateServiceDep,
    SubscriptionServiceDep,
)
from app.enums import IntervalUnit, SubscriptionStatus
from app.pagination import PageDep, set_total
from app.schemas import (
    CandidateAccept,
    CandidateKey,
    SubscriptionCandidate,
    SubscriptionCreate,
    SubscriptionFromTransaction,
    SubscriptionResponse,
    SubscriptionSummary,
    SubscriptionUpdate,
)
from app.services import (
    AccountNotFoundError,
    CandidateNotFoundError,
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
_ACCOUNT_NOT_FOUND = HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Account not found")
_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Subscription not found")


async def _present_one(service: SubscriptionServiceDep, subscription) -> SubscriptionResponse:
    await service.sync(subscription.user_id, subscription)  # its next payment is planned
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
    except AccountNotFoundError:
        raise _ACCOUNT_NOT_FOUND from None
    except TransactionRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    return await _present_one(service, subscription)


@router.get("", response_model=list[SubscriptionResponse])
async def list_subscriptions(
    user_id: CurrentUserId,
    service: SubscriptionServiceDep,
    response: Response,
    page: PageDep,
    status_filter: SubscriptionStatus | None = None,
    interval_unit: IntervalUnit | None = None,
    q: Annotated[
        str | None, Query(max_length=100, description="Search name, category, vendor")
    ] = None,
):
    """All subscriptions, or one page with `limit`/`offset`, optionally filtered. The total
    number of matches, ignoring paging, is in `X-Total-Count`."""
    await service.sync(user_id)  # so every active subscription has its next payment planned
    filters = {"q": q, "interval_unit": interval_unit}
    set_total(response, await service.count_for_user(user_id, status_filter, **filters))
    subscriptions = await service.list_for_user(
        user_id, status_filter, **filters, limit=page.limit, offset=page.offset
    )
    return await service.present(subscriptions)


# Declared before "/{subscription_id}" so "summary" isn't parsed as an id.
@router.get("/summary", response_model=SubscriptionSummary)
async def subscription_summary(user_id: CurrentUserId, service: SubscriptionServiceDep):
    """Active count and total monthly cost in your base currency."""
    return await service.summary(user_id)


def _candidate_response(c) -> SubscriptionCandidate:
    s = c.series
    return SubscriptionCandidate(
        vendor_id=c.vendor.id,
        vendor_name=c.vendor.name,
        currency=c.currency,
        amount=s.amount,
        amount_varies=s.varies,
        interval_unit=s.unit,
        interval_count=s.count,
        occurrences=len(s.charges),
        first_date=s.charges[0].on,
        last_date=s.charges[-1].on,
        next_due=s.next_due,
        confidence=s.confidence,
        category=c.category,
        account_id=c.account_id,
        account_name=c.account_name,
        payment_method=c.payment_method,
        transaction_ids=[t.id for t in c.transactions],
    )


# Declared before "/{subscription_id}" so these are not parsed as an id.
@router.get("/candidates", response_model=list[SubscriptionCandidate])
async def list_candidates(user_id: CurrentUserId, service: SubscriptionCandidateServiceDep):
    """Charges that repeat in what you have already paid (same vendor, same rhythm, a similar
    amount) and are not a subscription yet. Nothing is created: these are suggestions."""
    return [_candidate_response(c) for c in await service.candidates(user_id)]


@router.post(
    "/candidates/accept",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def accept_candidate(
    data: CandidateAccept,
    user_id: CurrentUserId,
    candidates: SubscriptionCandidateServiceDep,
    service: SubscriptionServiceDep,
):
    """Make the suggested subscription and link the payments already made to it, so the next one
    is planned. The pattern is found again here; only the changes in `data` are taken from you."""
    try:
        subscription = await candidates.accept(
            user_id,
            data.vendor_id,
            data.currency,
            name=data.name,
            interval_unit=data.interval_unit,
            interval_count=data.interval_count,
            amount=data.amount,
        )
    except CandidateNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That suggestion is gone") from None
    except TransactionRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    except ExchangeRateRequiredError:
        raise _RATE_REQUIRED from None
    return await _present_one(service, subscription)


@router.post("/candidates/dismiss", status_code=status.HTTP_204_NO_CONTENT)
async def dismiss_candidate(
    data: CandidateKey, user_id: CurrentUserId, service: SubscriptionCandidateServiceDep
):
    """ "Not a subscription": stop suggesting this vendor (in this currency)."""
    try:
        await service.dismiss(user_id, data.vendor_id, data.currency)
    except CandidateNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vendor not found") from None


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
    except AccountNotFoundError:
        raise _ACCOUNT_NOT_FOUND from None
    except TransactionRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
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
