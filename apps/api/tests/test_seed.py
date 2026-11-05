import random
from collections.abc import AsyncIterator
from datetime import date, timedelta
from decimal import Decimal

import pytest
from app import seed as seed_module
from app.enums import TransactionType
from app.models import Account, Base, Subscription, Transaction, User, Vendor
from app.services import (
    AccountService,
    BudgetService,
    CardService,
    GoalService,
    SubscriptionService,
)
from sqlalchemy import event, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

TODAY = date.today()  # subscriptions plan their next payment against the real date


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


async def run(db: AsyncSession, seed: int = 1, email: str = seed_module.DEMO_EMAIL):
    summary = await seed_module.seed(db, rng=random.Random(seed), today=TODAY, email=email)
    await db.commit()
    return summary


async def count(db: AsyncSession, model) -> int:
    return (await db.scalar(select(func.count()).select_from(model))) or 0


async def user_id(db: AsyncSession):
    return await db.scalar(select(User.id))


async def test_seeds_a_realistic_first_month(db: AsyncSession):
    summary = await run(db)

    assert await count(db, User) == 1
    assert summary.accounts == await count(db, Account) == 6
    assert summary.vendors == await count(db, Vendor) > 15
    assert summary.subscriptions == await count(db, Subscription) == 9
    assert sum(summary.transactions.values()) < 200  # a month or so, not a firehose
    for kind in ("income", "expense", "transfer"):
        assert summary.transactions[kind] > 0, kind

    dates = (
        await db.scalars(select(Transaction.transaction_date).where(Transaction.planned.is_(False)))
    ).all()
    assert min(dates) >= (TODAY.replace(day=1) - timedelta(days=1)).replace(day=1)
    assert max(dates) <= TODAY
    amounts = (await db.scalars(select(Transaction.amount))).all()
    assert all(a > 0 for a in amounts)


async def test_salaries_of_ten_thousand_are_split_and_the_next_is_expected(db: AsyncSession):
    await run(db)
    posted = (
        await db.scalars(
            select(Transaction).where(
                Transaction.type == TransactionType.INCOME,
                Transaction.planned.is_(False),
                Transaction.refund_of_id.is_(None),
            )
        )
    ).all()
    assert [t.amount for t in posted] == [Decimal("10000.0000")] * 2  # last month and this
    planned = (await db.scalars(select(Transaction).where(Transaction.planned.is_(True)))).all()
    salaries = [t for t in planned if t.type == TransactionType.INCOME]
    assert len(salaries) == 1
    assert salaries[0].transaction_date > TODAY
    # each month: 1,000 to MIB Savings (the emergency fund goal), 500 to BML Savings
    transfers = (
        await db.scalars(
            select(Transaction).where(
                Transaction.type == TransactionType.TRANSFER,
                Transaction.description.like("From salary%"),
            )
        )
    ).all()
    assert (
        sorted(t.amount for t in transfers)
        == [Decimal("500.0000")] * 2 + [Decimal("1000.0000")] * 2
    )


async def test_every_bill_was_paid_once_and_the_next_is_planned(db: AsyncSession):
    await run(db)
    uid = await user_id(db)
    service = SubscriptionService(db)
    shown = await service.present(await service.list_for_user(uid))
    assert all(s.last_paid_date for s in shown)
    assert not any(s.is_overdue for s in shown)
    planned = (
        await db.scalars(
            select(Transaction).where(
                Transaction.planned.is_(True), Transaction.subscription_id.is_not(None)
            )
        )
    ).all()
    assert len(planned) == 9  # one upcoming payment per bill
    assert any(s.amount_varies for s in shown)


async def test_accounts_goals_and_budget_are_in_place(db: AsyncSession):
    await run(db)
    uid = await user_id(db)
    service = AccountService(db)
    accounts = await service.present(await service.list_for_user(uid))
    by_name = {a.name: a for a in accounts}
    assert {
        "BML Current",
        "BML Savings",
        "MIB Current",
        "MIB Savings",
    } <= set(by_name)
    assert by_name["BML USD"].currency == "USD"
    assert all(a.balance >= 0 for a in accounts)  # nothing overdrawn during the month
    goals = await GoalService(db).list_for_user(uid)
    assert {g.name for g in goals} == {"Emergency fund", "Holiday", "New laptop"}
    budget = await BudgetService(db).view(uid, TODAY)
    assert len(budget.lines) == 4


async def test_debit_cards_are_tied_to_their_bank_accounts(db: AsyncSession):
    await run(db)
    uid = await user_id(db)
    cards = await CardService(db).list_for_user(uid)
    assert {c.name: c.account.name for c in cards} == {
        "BML Visa debit": "BML Current",
        "MIB Visa debit": "MIB Current",
    }
    paid = await db.scalar(select(func.count()).where(Transaction.card_id.is_not(None)))
    assert paid is not None
    assert paid > 10  # day-to-day spending was paid with them


async def test_rerunning_replaces_the_demo_user_instead_of_piling_up(db: AsyncSession):
    await run(db, seed=1)
    first_user = await db.scalar(select(User.id))
    await run(db, seed=2)
    assert await count(db, User) == 1
    assert await db.scalar(select(User.id)) != first_user  # a fresh user
    assert await count(db, Account) == 6  # not 12
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


async def test_seeding_another_email_leaves_the_demo_user_alone(db: AsyncSession):
    demo = await run(db)
    other = await run(db, seed=2, email="sample@maalu.dev")
    assert demo.user == seed_module.DEMO_EMAIL
    assert other.user == "sample@maalu.dev"
    assert await count(db, User) == 2

    async def rows_of(email: str) -> int:
        stmt = (
            select(func.count())
            .select_from(Transaction)
            .join(User, User.id == Transaction.user_id)
            .where(User.email == email)
        )
        return (await db.scalar(stmt)) or 0

    demo_rows = await rows_of(seed_module.DEMO_EMAIL)
    assert demo_rows > 0
    await run(db, seed=3, email="sample@maalu.dev")  # replaces only theirs
    assert await count(db, User) == 2
    assert await rows_of(seed_module.DEMO_EMAIL) == demo_rows
