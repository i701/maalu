from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.dependencies import CurrentUserId, TransferLinkServiceDep
from app.schemas import TransactionResponse, TransferPair, TransferSuggestion
from app.services import TransactionRuleError, TransferLinkNotFoundError

# Mounted before the transactions router, so these fixed paths are not read as a transaction id.
router = APIRouter(prefix="/transactions", tags=["transfers"])

_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")


@router.get("/transfer-suggestions", response_model=list[TransferSuggestion])
async def transfer_suggestions(
    user_id: CurrentUserId,
    service: TransferLinkServiceDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    """Pairs that look like one move of your own money entered twice: an expense and an income in
    different accounts, the same amount in the same currency, within two days. The closest first
    pairing wins, so a transaction is in at most one pair. Nothing is merged: that is `POST
    /transactions/link-transfer`, once you confirm."""
    return [
        TransferSuggestion(expense=e, income=i, days_apart=days)
        for e, i, days in await service.suggestions(user_id, limit)
    ]


@router.post("/transfer-suggestions/dismiss", status_code=status.HTTP_204_NO_CONTENT)
async def dismiss_suggestion(
    data: TransferPair, user_id: CurrentUserId, service: TransferLinkServiceDep
):
    """Say that this pair is not a transfer, so it is not suggested again."""
    try:
        await service.dismiss(user_id, data.expense_id, data.income_id)
    except TransferLinkNotFoundError:
        raise _NOT_FOUND from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/link-transfer", response_model=TransactionResponse)
async def link_transfer(
    data: TransferPair, user_id: CurrentUserId, service: TransferLinkServiceDep
):
    """Make an expense and an income that are the two sides of one transfer into that transfer.
    The expense becomes the transfer (from its account to the income's account, for the amount the
    income received) and the income goes to the trash. They need different accounts; a purchase
    with items or refunds, a refund, a planned or adjustment row can't be linked."""
    try:
        return await service.link(user_id, data.expense_id, data.income_id)
    except TransferLinkNotFoundError:
        raise _NOT_FOUND from None
    except TransactionRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
