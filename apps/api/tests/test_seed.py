import random
from collections.abc import AsyncIterator
from datetime import date
from decimal import Decimal

import pytest
from app import seed as seed_module
from app.enums import SubscriptionStatus, TransactionType
from app.models import Account, Base, Subscription, Transaction, User, Vendor
from app.services import AccountService, SubscriptionService
from sqlalchemy import event, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

TODAY = date(2026, 10, 10)


@pytest.fixture
async def db() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(
        "sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )

    @event.listens_for(engine.sync_engine, "connect")
    def _fks(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        yield session
    await engine.dispose()


async def run(db: AsyncSession, n: int = 60, seed: int = 1):
    summary = await seed_module.seed(db, transactions=n, rng=random.Random(seed), today=TODAY)
    await db.commit()
    return summary


async def count(db: AsyncSession, model) -> int:
    return (await db.scalar(select(func.count()).select_from(model))) or 0


async def test_seeds_every_table_with_valid_data(db: AsyncSession):
    summary = await run(db)

    assert await count(db, User) == 1
    assert summary.accounts == await count(db, Account) == 8
    assert summary.vendors == await count(db, Vendor) > 15
    assert summary.subscriptions == await count(db, Subscription) == 9
    transactions = await count(db, Transaction)
    assert sum(summary.transactions.values()) == transactions > 60
    # all three kinds exist
    for kind in ("income", "expense", "transfer"):
        assert summary.transactions[kind] > 0, kind

    amounts = (await db.scalars(select(Transaction.amount))).all()
    assert all(a > 0 for a in amounts)  # always positive; the type carries the direction
    transfers = (
        await db.scalars(select(Transaction).where(Transaction.type == TransactionType.TRANSFER))
    ).all()
    assert all(t.account_id and t.to_account_id and t.to_amount for t in transfers)
    # at least one cross-currency transfer (MVR -> USD): what arrived differs from what left
    assert any(t.to_amount != t.amount for t in transfers)


async def test_subscriptions_have_realistic_payment_history(db: AsyncSession):
    await run(db)
    user_id = await db.scalar(select(User.id))
    service = SubscriptionService(db)
    shown = await service.present(await service.list_for_user(user_id))
    by_status = {s: [x for x in shown if x.status is s] for s in SubscriptionStatus}

    assert by_status[SubscriptionStatus.ACTIVE]
    assert by_status[SubscriptionStatus.PAUSED]
    assert by_status[SubscriptionStatus.CANCELLED]
    assert all(s.last_paid_date for s in shown)  # every one has paid at least once
    # paused / cancelled subscriptions never show as overdue
    assert not any(s.is_overdue for s in by_status[SubscriptionStatus.PAUSED])
    assert not any(s.is_overdue for s in by_status[SubscriptionStatus.CANCELLED])


async def test_accounts_have_computed_balances_and_liabilities(db: AsyncSession):
    await run(db)
    user_id = await db.scalar(select(User.id))
    service = AccountService(db)
    accounts = await service.present(await service.list_for_user(user_id))
    by_name = {a.name: a for a in accounts}

    assert by_name["Visa Credit"].is_liability
    assert by_name["Car Loan"].is_liability
    assert by_name["Car Loan"].balance < 0  # still owed
    assert by_name["USD Account"].currency == "USD"
    assert Decimal(by_name["USD Account"].exchange_rate) > 1
    assert all(a.transaction_count > 0 for a in accounts if a.name != "Dhiraagu Top-up")
    summary = await service.summary(user_id)
    assert summary.assets > 0
    assert summary.liabilities > 0


async def test_rerunning_replaces_the_demo_user_instead_of_piling_up(db: AsyncSession):
    await run(db, seed=1)
    first_user = await db.scalar(select(User.id))
    await run(db, seed=2)
    assert await count(db, User) == 1
    assert await db.scalar(select(User.id)) != first_user  # a fresh user
    assert await count(db, Account) == 8  # not 16
    assert await count(db, Subscription) == 9


async def test_same_seed_gives_the_same_data(db: AsyncSession):
    a = await run(db, seed=42)
    b = await run(db, seed=42)
    assert a.transactions == b.transactions


async def test_refuses_to_run_against_a_remote_database(monkeypatch):
    monkeypatch.setattr(
        seed_module.settings, "database_url", "postgresql+asyncpg://u:p@db.example.com/maalu"
    )
    with pytest.raises(SystemExit):
        seed_module._assert_local_database()
    monkeypatch.setattr(
        seed_module.settings, "database_url", "postgresql+asyncpg://u:p@localhost:5432/maalu"
    )
    seed_module._assert_local_database()  # local is fine
