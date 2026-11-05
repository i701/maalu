import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import LIABILITY_GROUPS, AccountGroup, CardKind
from app.models import Account, Card
from app.schemas import CardCreate, CardUpdate


class CardNotFoundError(Exception):
    pass


class CardRuleError(Exception):
    pass


class CardService:
    """Cards: a debit card is tied to the bank account it spends from, a credit card to its own
    account (group card) and, optionally, the bank account it is repaid from."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_user(self, user_id: uuid.UUID, *, account_id: uuid.UUID | None = None):
        stmt = select(Card).where(Card.user_id == user_id).order_by(Card.name, Card.created_at)
        if account_id is not None:
            stmt = stmt.where(
                (Card.account_id == account_id) | (Card.repay_account_id == account_id)
            )
        return list((await self.db.scalars(stmt)).all())

    async def get(self, user_id: uuid.UUID, card_id: uuid.UUID) -> Card | None:
        return await self.db.scalar(select(Card).where(Card.id == card_id, Card.user_id == user_id))

    async def _account(self, user_id: uuid.UUID, account_id: uuid.UUID) -> Account:
        account = await self.db.scalar(
            select(Account).where(Account.id == account_id, Account.user_id == user_id)
        )
        if account is None:
            raise CardRuleError("Account not found")
        if account.archived_at is not None:
            raise CardRuleError("That account is archived")
        return account

    async def _check(
        self,
        user_id: uuid.UUID,
        kind: CardKind,
        account_id: uuid.UUID,
        repay_account_id: uuid.UUID | None,
    ) -> None:
        account = await self._account(user_id, account_id)
        if kind is CardKind.CREDIT:
            if account.group is not AccountGroup.CARD:
                raise CardRuleError(
                    "A credit card is its own account: pick an account in the Credit cards group"
                )
        elif account.group in LIABILITY_GROUPS:
            raise CardRuleError(
                "A debit card spends from a bank account. Pick the bank account it belongs to"
            )
        if repay_account_id is not None:
            if kind is not CardKind.CREDIT:
                raise CardRuleError("Only a credit card is repaid from an account")
            repay = await self._account(user_id, repay_account_id)
            if repay.group in LIABILITY_GROUPS:
                raise CardRuleError("A credit card is repaid from a bank account, not a debt")

    async def create(self, user_id: uuid.UUID, data: CardCreate) -> Card:
        await self._check(user_id, data.kind, data.account_id, data.repay_account_id)
        card = Card(user_id=user_id, **data.model_dump())
        self.db.add(card)
        await self.db.flush()
        await self.db.refresh(card)
        return card

    async def update(self, user_id: uuid.UUID, card: Card, data: CardUpdate) -> Card:
        changes = data.model_dump(exclude_unset=True)
        account_id = changes.get("account_id", card.account_id)
        repay_id = changes.get("repay_account_id", card.repay_account_id)
        # an account it already has stays valid even once archived
        if "account_id" in changes and account_id != card.account_id:
            await self._check(user_id, card.kind, account_id, None)
        if repay_id is not None and repay_id != card.repay_account_id:
            await self._check(user_id, card.kind, card.account_id, repay_id)
        for field, value in changes.items():
            setattr(card, field, value)
        await self.db.flush()
        await self.db.refresh(card)
        return card

    async def delete(self, card: Card) -> None:
        """Its transactions stay, unlinked from it."""
        await self.db.delete(card)
        await self.db.flush()
