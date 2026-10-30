"""Fill the database with realistic random data for local development.

    just seed          # a demo user with ~250 random transactions
    just seed 600      # more transactions
    just seed 250 --seed 7   # reproducible

Everything goes through the real services, so all business rules (account currencies, transfers,
subscription links...) apply and the data is always valid. Only the demo user's data is replaced;
nothing else is touched.
"""

import argparse
import asyncio
import random
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import SessionLocal
from app.enums import (
    AccountGroup,
    IntervalUnit,
    PaymentMethod,
    SubscriptionStatus,
    TransactionType,
)
from app.models import Account, Subscription, Transaction, User, Vendor
from app.schedule import occurrence
from app.schemas import (
    AccountCreate,
    SubscriptionCreate,
    TransactionCreate,
    UserCreate,
    VendorCreate,
)
from app.services import (
    AccountService,
    CategoryService,
    SubscriptionService,
    TransactionService,
    UserService,
)
from app.services.vendor import VendorService

DEMO_EMAIL = "demo@maalu.dev"
DEMO_PASSWORD = "maalu-demo-1234"
BASE = "MVR"
USD_RATE = Decimal("15.42")
HISTORY_DAYS = 180

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}

# (group, name, opening amount, currency)
ACCOUNTS = [
    (AccountGroup.CASH, "Wallet", "1500", BASE),
    (AccountGroup.ACCOUNTS, "BML Current", "18000", BASE),
    (AccountGroup.SAVINGS, "BML Savings", "60000", BASE),
    (AccountGroup.DEBIT_CARD, "MIB Debit", "5200", BASE),
    (AccountGroup.CARD, "Visa Credit", "0", BASE),
    (AccountGroup.PREPAID, "Dhiraagu Top-up", "120", BASE),
    (AccountGroup.ACCOUNTS, "USD Account", "2500", "USD"),
    (AccountGroup.LOAN, "Car Loan", "-45000", BASE),
]

# name -> (is_local, usual currency, contact, address)
VENDORS = {
    "Ensis Mart": (True, BASE, "+960 330 1122", "Majeedhee Magu, Male'"),
    "Hulhumale Fresh": (True, BASE, "+960 330 4455", "Hulhumale Phase 2"),
    "Male Fish Market": (True, BASE, None, "Male' Fish Market"),
    "Island Cafe": (True, BASE, "+960 777 1010", "Boduthakurufaanu Magu"),
    "Sea House Restaurant": (True, BASE, "+960 332 2020", "Ameenee Magu"),
    "Fuel Station Male": (True, BASE, None, "Kalaafaanu Magu"),
    "Hiya Pharmacy": (True, BASE, "+960 331 7788", "Orchid Magu"),
    "STELCO": (True, BASE, "+960 332 3261", "Ameer Ahmed Magu"),
    "MWSC": (True, BASE, "+960 333 0000", None),
    "Thilafushi Hardware": (True, BASE, "+960 779 8899", "Thilafushi"),
    "Bookshop Male": (True, BASE, None, "Chaandhanee Magu"),
    "Cinema Male": (True, BASE, None, "Male' City"),
    "Dhiraagu": (True, BASE, "+960 123", "Ameenee Magu"),
    "Ooredoo": (True, BASE, "+960 123 4567", None),
    "Tropic Gym": (True, BASE, "+960 778 5544", "Hulhumale Phase 1"),
    "Amazon": (False, "USD", None, None),
    "Steam": (False, "USD", None, None),
    "Booking.com": (False, "USD", None, None),
    "Netflix": (False, "USD", None, None),
    "Spotify": (False, "USD", None, None),
    "Apple": (False, "USD", None, None),
    "Namecheap": (False, "USD", None, None),
}

# (category, vendors (None = no vendor), amount range in MVR)
EVERYDAY = [
    ("Groceries", ["Ensis Mart", "Hulhumale Fresh", "Male Fish Market"], (80, 600), 28),
    ("Dining", ["Island Cafe", "Sea House Restaurant"], (60, 450), 20),
    ("Transport", [None], (20, 300), 14),
    ("Fuel", ["Fuel Station Male"], (150, 600), 8),
    ("Utilities", ["STELCO", "MWSC"], (200, 1200), 6),
    ("Health", ["Hiya Pharmacy"], (100, 1500), 6),
    ("Shopping", ["Thilafushi Hardware", "Bookshop Male"], (150, 2500), 8),
    ("Entertainment", ["Cinema Male"], (50, 400), 6),
]
# Paid from the USD account: (category, vendor, amount range in USD)
FOREIGN = [
    ("Shopping", "Amazon", (5, 90)),
    ("Entertainment", "Steam", (5, 60)),
    ("Travel", "Booking.com", (60, 400)),
]

# name, vendor, amount, currency, unit, count, days ago it started, status, payment method, category
SUBSCRIPTIONS = [
    (
        "Netflix",
        "Netflix",
        "15.49",
        "USD",
        IntervalUnit.MONTH,
        1,
        170,
        "active",
        PaymentMethod.CREDIT_CARD,
        "Entertainment",
    ),
    (
        "Spotify",
        "Spotify",
        "9.99",
        "USD",
        IntervalUnit.MONTH,
        1,
        150,
        "active",
        PaymentMethod.CREDIT_CARD,
        "Entertainment",
    ),
    (
        "iCloud+",
        "Apple",
        "2.99",
        "USD",
        IntervalUnit.MONTH,
        1,
        120,
        "active",
        PaymentMethod.CREDIT_CARD,
        "Software",
    ),
    (
        "Home broadband",
        "Dhiraagu",
        "399",
        BASE,
        IntervalUnit.MONTH,
        1,
        175,
        "active",
        PaymentMethod.BANK_TRANSFER,
        "Utilities",
    ),
    (
        "Mobile plan",
        "Ooredoo",
        "150",
        BASE,
        IntervalUnit.MONTH,
        1,
        160,
        "paused",
        PaymentMethod.DEBIT_CARD,
        "Utilities",
    ),
    (
        "Gym membership",
        "Tropic Gym",
        "600",
        BASE,
        IntervalUnit.MONTH,
        1,
        140,
        "active",
        PaymentMethod.DEBIT_CARD,
        "Health",
    ),
    (
        "Weekly fish box",
        "Male Fish Market",
        "120",
        BASE,
        IntervalUnit.WEEK,
        1,
        56,
        "active",
        PaymentMethod.CASH,
        "Groceries",
    ),
    (
        "Domain renewal",
        "Namecheap",
        "14.88",
        "USD",
        IntervalUnit.YEAR,
        1,
        200,
        "active",
        PaymentMethod.CREDIT_CARD,
        "Software",
    ),
    (
        "Prime video",
        "Amazon",
        "5.99",
        "USD",
        IntervalUnit.MONTH,
        1,
        150,
        "cancelled",
        PaymentMethod.CREDIT_CARD,
        "Entertainment",
    ),
]


@dataclass
class SeedSummary:
    user: str
    accounts: int
    vendors: int
    subscriptions: int
    transactions: dict[str, int]


# Some sub-categories, so the demo shows parents (one is used directly too: Transport).
CATEGORY_GROUPS = {
    "Food & drink": ["Groceries", "Dining"],
    "Transport": ["Fuel"],
    "Lifestyle": ["Shopping", "Entertainment"],
}


async def _group_categories(db: AsyncSession, uid) -> None:
    categories = CategoryService(db)
    for parent_name, children in CATEGORY_GROUPS.items():
        parent = await categories.get_or_create(uid, parent_name)
        for name in children:
            child = await categories.get_by_name(uid, name)
            if child is not None:
                child.parent_id = parent.id
    await db.flush()


def _money(value: float) -> Decimal:
    return Decimal(str(round(value, 2)))


def _usd_rate(rng: random.Random) -> Decimal:
    return (
        USD_RATE + Decimal(rng.randint(-2, 3)) / 100
    )  # the rate you'd type by hand varies a little


def _method_for(group: AccountGroup) -> PaymentMethod:
    return {
        AccountGroup.CASH: PaymentMethod.CASH,
        AccountGroup.CARD: PaymentMethod.CREDIT_CARD,
        AccountGroup.DEBIT_CARD: PaymentMethod.DEBIT_CARD,
    }.get(group, PaymentMethod.BANK_TRANSFER)


async def seed(
    db: AsyncSession, *, transactions: int, rng: random.Random, today: date
) -> SeedSummary:
    """Replace the demo user's data with fresh random data. The caller commits."""
    await db.execute(delete(User).where(User.email == DEMO_EMAIL))  # children cascade
    await db.flush()
    user = await UserService(db).register(
        UserCreate(email=DEMO_EMAIL, password=DEMO_PASSWORD, base_currency=BASE)
    )
    uid = user.id
    vendors_svc, accounts_svc = VendorService(db), AccountService(db)
    subs_svc, tx_svc = SubscriptionService(db), TransactionService(db)

    # --- accounts
    accounts: dict[str, Account] = {}
    for group, name, opening, currency in ACCOUNTS:
        accounts[name] = await accounts_svc.create(
            uid,
            AccountCreate(
                group=group,
                name=name,
                opening_amount=Decimal(opening),
                currency=currency,
                exchange_rate=None if currency == BASE else USD_RATE,
                description=rng.choice([None, None, "Seeded demo account"]),
            ),
        )

    # --- vendors
    for name, (is_local, currency, contact, address) in VENDORS.items():
        await vendors_svc.create(
            uid,
            VendorCreate(
                name=name, is_local=is_local, currency=currency, contact=contact, address=address
            ),
        )

    counts = {"income": 0, "expense": 0, "transfer": 0}

    async def add(**fields) -> Transaction:
        tx = await tx_svc.create(uid, TransactionCreate(**fields))
        counts[fields["type"].value] += 1
        return tx

    def when(days_ago: int) -> date:
        return today - timedelta(days=days_ago)

    mvr_spending = [
        accounts["Wallet"],
        accounts["BML Current"],
        accounts["MIB Debit"],
        accounts["Visa Credit"],
        accounts["Dhiraagu Top-up"],
    ]
    spending_weights = [4, 5, 5, 4, 1]

    # --- subscriptions + their payment history
    subscriptions: list[Subscription] = []
    for (
        name,
        vendor,
        amount,
        currency,
        unit,
        count,
        started,
        status,
        method,
        category,
    ) in SUBSCRIPTIONS:
        sub = await subs_svc.create(
            uid,
            SubscriptionCreate(
                name=name,
                vendor_name=vendor,
                amount=Decimal(amount),
                currency=None if currency == BASE else currency,
                exchange_rate=None if currency == BASE else USD_RATE,
                payment_method=method,
                category=category,
                interval_unit=unit,
                interval_count=count,
                start_date=when(started),
                status=SubscriptionStatus(status),
            ),
        )
        subscriptions.append(sub)

        # Pay each cycle that has come due. Some active ones are left unpaid so they show as
        # overdue; paused/cancelled ones stop paying part-way.
        due, k = [], 0
        while (d := occurrence(sub.start_date, unit, count, k)) <= today:
            due.append(d)
            k += 1
        if status != "active":
            due = due[: max(1, len(due) // 2)]
        elif due and rng.random() < 0.3:
            due = due[:-1]
        for d in due:
            usd = currency != BASE
            await add(
                type=TransactionType.EXPENSE,
                amount=Decimal(amount),
                payment_method=method,
                category=category,
                transaction_date=d,
                vendor_name=vendor,
                subscription_id=sub.id,
                account_id=(accounts["USD Account"] if usd else accounts["BML Current"]).id,
                exchange_rate=_usd_rate(rng) if usd else None,
            )

    # --- monthly structure: salary, saving, card + loan payments, a cross-currency top-up
    months = HISTORY_DAYS // 30
    for m in range(months):
        base_ago = m * 30
        await add(
            type=TransactionType.INCOME,
            amount=_money(rng.uniform(22000, 24500)),
            payment_method=PaymentMethod.BANK_TRANSFER,
            category="Salary",
            transaction_date=when(base_ago + 2),
            account_id=accounts["BML Current"].id,
            description="Monthly salary",
        )
        await add(
            type=TransactionType.TRANSFER,
            amount=Decimal("3000"),
            transaction_date=when(base_ago + 3),
            account_id=accounts["BML Current"].id,
            to_account_id=accounts["BML Savings"].id,
            description="Monthly saving",
        )
        await add(
            type=TransactionType.TRANSFER,
            amount=Decimal("1500"),
            transaction_date=when(base_ago + 5),
            account_id=accounts["BML Current"].id,
            to_account_id=accounts["Car Loan"].id,
            description="Loan repayment",
        )
        await add(
            type=TransactionType.TRANSFER,
            amount=_money(rng.uniform(600, 1800)),
            transaction_date=when(base_ago + 8),
            account_id=accounts["BML Current"].id,
            to_account_id=accounts["Visa Credit"].id,
            description="Card payment",
        )
        await add(
            type=TransactionType.TRANSFER,
            amount=_money(rng.uniform(300, 1200)),
            transaction_date=when(base_ago + 10),
            account_id=accounts["BML Current"].id,
            to_account_id=accounts["Wallet"].id,
            description="Cash withdrawal",
        )
        # MVR -> USD: the amount received is what you actually got, so no rate is typed
        mvr = Decimal(rng.choice([1542, 3084, 4626]))
        await add(
            type=TransactionType.TRANSFER,
            amount=mvr,
            to_amount=(mvr / USD_RATE).quantize(Decimal("0.01")),
            transaction_date=when(base_ago + 12),
            account_id=accounts["BML Current"].id,
            to_account_id=accounts["USD Account"].id,
            description="Top up USD account",
        )

    # --- random everyday income / expenses
    weights = [w for *_, w in EVERYDAY]
    for _ in range(transactions):
        day = when(rng.randint(0, HISTORY_DAYS))
        roll = rng.random()
        if roll < 0.06:  # freelance income, paid in USD
            await add(
                type=TransactionType.INCOME,
                amount=_money(rng.uniform(150, 700)),
                payment_method=PaymentMethod.BANK_TRANSFER,
                category="Freelance",
                transaction_date=day,
                account_id=accounts["USD Account"].id,
                exchange_rate=_usd_rate(rng),
            )
        elif roll < 0.10:  # small cash income
            await add(
                type=TransactionType.INCOME,
                amount=_money(rng.uniform(100, 900)),
                payment_method=PaymentMethod.CASH,
                category=rng.choice(["Gift", "Refund", "Side job"]),
                transaction_date=day,
                account_id=accounts["Wallet"].id,
            )
        elif roll < 0.22:  # a purchase from abroad, paid from the USD account
            category, vendor, (low, high) = rng.choice(FOREIGN)
            await add(
                type=TransactionType.EXPENSE,
                amount=_money(rng.uniform(low, high)),
                payment_method=PaymentMethod.CREDIT_CARD,
                category=category,
                transaction_date=day,
                vendor_name=vendor,
                account_id=accounts["USD Account"].id,
                exchange_rate=_usd_rate(rng),
            )
        else:
            category, vendor_choices, (low, high), _w = rng.choices(EVERYDAY, weights=weights)[0]
            account = rng.choices(mvr_spending, weights=spending_weights)[0]
            vendor = rng.choice(vendor_choices)
            bought = await add(
                type=TransactionType.EXPENSE,
                amount=_money(rng.uniform(low, high)),
                payment_method=_method_for(account.group),
                category=category,
                transaction_date=day,
                vendor_name=vendor,
                account_id=account.id,
                description=rng.choice([None, None, None, "Weekly shop", "With friends", "Urgent"]),
            )
            # now and then part of it goes back a few days later
            back = day + timedelta(days=rng.randint(1, 12))
            if rng.random() < 0.06 and back <= today:
                await add(
                    type=TransactionType.INCOME,
                    amount=(bought.amount / 2).quantize(Decimal("0.01")) or bought.amount,
                    transaction_date=back,
                    refund_of_id=bought.id,
                    account_id=account.id,
                    description="Returned",
                )

    await db.flush()
    await _group_categories(db, uid)
    n_vendors = await db.scalar(select(func.count(Vendor.id)).where(Vendor.user_id == uid))
    return SeedSummary(
        user=DEMO_EMAIL,
        accounts=len(accounts),
        vendors=n_vendors or 0,
        subscriptions=len(subscriptions),
        transactions=counts,
    )


def _assert_local_database() -> None:
    host = make_url(settings.database_url).host
    if host not in LOCAL_HOSTS:
        raise SystemExit(
            f"Refusing to seed {host!r}: it isn't a local database. "
            "Seeding replaces the demo user's data and is meant for development only."
        )


async def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the database with random demo data.")
    parser.add_argument(
        "transactions", nargs="?", type=int, default=250, help="random rows (default 250)"
    )
    parser.add_argument("--seed", type=int, default=None, help="random seed, for reproducible data")
    args = parser.parse_args()
    _assert_local_database()

    rng = random.Random(args.seed)
    async with SessionLocal() as db:
        summary = await seed(db, transactions=args.transactions, rng=rng, today=date.today())
        await db.commit()

    t = summary.transactions
    print(
        f"Seeded {summary.accounts} accounts, {summary.vendors} vendors, "
        f"{summary.subscriptions} subscriptions and {sum(t.values())} transactions "
        f"({t['income']} income, {t['expense']} expense, {t['transfer']} transfer)."
    )
    print(f"Sign in as {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
