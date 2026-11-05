import uuid

from fastapi import APIRouter, HTTPException, status

from app.dependencies import CardServiceDep, CurrentUserId
from app.models import Card
from app.schemas import CardCreate, CardResponse, CardUpdate
from app.services import CardRuleError

router = APIRouter(prefix="/cards", tags=["cards"])


async def _get_or_404(service: CardServiceDep, user_id: uuid.UUID, card_id: uuid.UUID) -> Card:
    card = await service.get(user_id, card_id)
    if card is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Card not found")
    return card


@router.post("", response_model=CardResponse, status_code=status.HTTP_201_CREATED)
async def create_card(data: CardCreate, user_id: CurrentUserId, service: CardServiceDep):
    """A card tied to an account. A debit card spends from its bank account; a credit card is its
    own account (group card) and may name the bank account it is repaid from."""
    try:
        return await service.create(user_id, data)
    except CardRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None


@router.get("", response_model=list[CardResponse])
async def list_cards(
    user_id: CurrentUserId, service: CardServiceDep, account_id: uuid.UUID | None = None
):
    """Every card by name, optionally only the ones tied to an account."""
    return await service.list_for_user(user_id, account_id=account_id)


@router.get("/{card_id}", response_model=CardResponse)
async def get_card(card_id: uuid.UUID, user_id: CurrentUserId, service: CardServiceDep):
    return await _get_or_404(service, user_id, card_id)


@router.patch("/{card_id}", response_model=CardResponse)
async def update_card(
    card_id: uuid.UUID, data: CardUpdate, user_id: CurrentUserId, service: CardServiceDep
):
    card = await _get_or_404(service, user_id, card_id)
    try:
        return await service.update(user_id, card, data)
    except CardRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(card_id: uuid.UUID, user_id: CurrentUserId, service: CardServiceDep):
    """Its transactions are kept, no longer linked to a card."""
    await service.delete(await _get_or_404(service, user_id, card_id))
