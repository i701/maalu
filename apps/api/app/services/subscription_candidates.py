"""Suggesting subscriptions from what has already been paid.

Import (and typing in transactions by hand) fills the history with charges that repeat: the same
vendor, the same rhythm, a similar amount. This finds them (`subscription_detect` decides what
counts as a pattern) and offers to turn each into a subscription, which links the payments already
made so the next one is planned in its place.

Nothing is created without the person saying so. A suggestion is worked out again every time, never
stored, so it can only describe what is in the data now; accepting re-checks it on the server and
never trusts a list sent by the client. "Not a subscription" is the one thing remembered."""

import uuid
from collections import Counter, defaultdict
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import IntervalUnit, PaymentMethod, TransactionType
from app.models import Subscription, SubscriptionDismissal, Transaction, Vendor
from app.schemas import SubscriptionCreate
from app.services.errors import TransactionRuleError
from app.services.subscription import SubscriptionService
from app.subscription_detect import Charge, Series, detect

# How far back payments are looked at (a yearly subscription needs more than a year).
WINDOW_DAYS = 800
SCAN_LIMIT = 4000


class CandidateNotFoundError(Exception):
    """There is no such suggestion any more (it was accepted, dismissed, or the pattern is gone)."""


class Candidate:
    """One suggestion: a vendor's pattern, with what a subscription made from it would hold."""

    def __init__(
        self,
        vendor: Vendor,
        currency: str,
        series: Series,
        transactions: list[Transaction],
    ) -> None:
        self.vendor = vendor
        self.currency = currency
        self.series = series
        self.transactions = transactions
        latest = transactions[-1]
        self.category = Counter(t.category for t in transactions).most_common(1)[0][0]
        accounts = Counter(
            t.account_id
            for t in transactions
            if t.account is not None and t.account.archived_at is None
        )
        self.account_id: uuid.UUID | None = accounts.most_common(1)[0][0] if accounts else None
        self.payment_method: PaymentMethod = Counter(
            t.payment_method for t in transactions
        ).most_common(1)[0][0]
        self.exchange_rate: Decimal = latest.exchange_rate
        self.account_name = next(
            (t.account.name for t in transactions if t.account_id == self.account_id and t.account),
            None,
        )


class SubscriptionCandidateService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.subscriptions = SubscriptionService(db)

    async def candidates(self, user_id: uuid.UUID, today: date | None = None) -> list[Candidate]:
        today = today or date.today()
        taken = set(
            (
                await self.db.scalars(
                    select(Subscription.vendor_id).where(
                        Subscription.user_id == user_id, Subscription.vendor_id.is_not(None)
                    )
                )
            ).all()
        )
        dismissed = set(
            (
                await self.db.execute(
                    select(SubscriptionDismissal.vendor_id, SubscriptionDismissal.currency).where(
                        SubscriptionDismissal.user_id == user_id
                    )
                )
            ).all()
        )
        rows = (
            await self.db.scalars(
                select(Transaction)
                .where(
                    Transaction.user_id == user_id,
                    Transaction.counted(),
                    Transaction.type == TransactionType.EXPENSE,
                    Transaction.adjustment.is_(False),
                    Transaction.subscription_id.is_(None),
                    Transaction.vendor_id.is_not(None),
                    Transaction.transaction_date >= today - timedelta(days=WINDOW_DAYS),
                    Transaction.transaction_date <= today,
                )
                .order_by(Transaction.transaction_date.desc())
                .limit(SCAN_LIMIT)
            )
        ).all()
        groups: dict[tuple[uuid.UUID, str], list[Transaction]] = defaultdict(list)
        for t in rows:
            if t.vendor_id in taken or (t.vendor_id, t.currency) in dismissed:
                continue
            groups[(t.vendor_id, t.currency)].append(t)

        found: list[Candidate] = []
        for (_vendor_id, currency), items in groups.items():
            by_id = {t.id: t for t in items}
            series = detect([Charge(t.id, t.transaction_date, t.amount) for t in items], today)
            if series is None:
                continue
            ordered = [by_id[c.id] for c in series.charges]
            found.append(Candidate(ordered[-1].vendor, currency, series, ordered))
        # the most certain first, then the biggest cost
        found.sort(key=lambda c: (c.series.confidence != "high", -c.series.amount))
        return found

    async def accept(
        self,
        user_id: uuid.UUID,
        vendor_id: uuid.UUID,
        currency: str,
        *,
        name: str | None = None,
        interval_unit: IntervalUnit | None = None,
        interval_count: int | None = None,
        amount: Decimal | None = None,
    ) -> Subscription:
        """Make the subscription and link the payments already made to it."""
        candidate = next(
            (
                c
                for c in await self.candidates(user_id)
                if c.vendor.id == vendor_id and c.currency == currency
            ),
            None,
        )
        if candidate is None:
            raise CandidateNotFoundError
        series = candidate.series
        base = await self.subscriptions._base_currency(user_id)
        data = SubscriptionCreate(
            name=name or candidate.vendor.name,
            amount=amount or series.amount,
            currency=currency,
            exchange_rate=None if currency == base else candidate.exchange_rate,
            account_id=candidate.account_id,
            payment_method=candidate.payment_method,
            category=candidate.category,
            vendor_id=candidate.vendor.id,
            interval_unit=interval_unit or series.unit,
            interval_count=interval_count or series.count,
            start_date=candidate.transactions[0].transaction_date,
            amount_varies=series.varies,
        )
        try:
            subscription = await self.subscriptions.create(user_id, data)
        except ValueError as exc:  # a rule of the subscription itself (for example the account)
            raise TransactionRuleError(str(exc)) from exc
        for t in candidate.transactions:
            t.subscription_id = subscription.id
        await self.db.flush()
        return subscription

    async def dismiss(self, user_id: uuid.UUID, vendor_id: uuid.UUID, currency: str) -> None:
        """Remember that this vendor is not a subscription. Does nothing twice."""
        vendor = await self.db.scalar(
            select(Vendor).where(Vendor.id == vendor_id, Vendor.user_id == user_id)
        )
        if vendor is None:
            raise CandidateNotFoundError
        exists = await self.db.scalar(
            select(SubscriptionDismissal.id).where(
                SubscriptionDismissal.user_id == user_id,
                SubscriptionDismissal.vendor_id == vendor_id,
                SubscriptionDismissal.currency == currency,
            )
        )
        if exists is None:
            self.db.add(
                SubscriptionDismissal(user_id=user_id, vendor_id=vendor_id, currency=currency)
            )
            await self.db.flush()
