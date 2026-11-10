"""Fill the database with a realistic first month for local development.

    just seed                      # the demo user, a month into using Maalu
    just seed --seed 7             # the small day-to-day variations change; the story does not
    just seed --email me@x.dev     # seed this user instead (the demo user is left alone)

The data is what a person with a 10,000 MVR salary would have a month after starting to track their
money: last calendar month in full and this month so far, so the dashboard is never empty. Accounts
at BML and MIB (current and savings) plus a USD account and some cash; the bills
they pay every month (rent, internet, electricity, water, health insurance, phone, Netflix, iCloud,
a VPS); the salary and how it was split; groceries, taxis and meals; a budget, savings goals, and
the next bills and salary still to come. Everything goes
through the real services, so every business rule applies and the data is always valid. Only the
seeded user's data is replaced; nothing else is touched.
"""

import argparse
import asyncio
import random
from dataclasses import dataclass
from datetime import date, time, timedelta
from decimal import Decimal

from sqlalchemy import delete, func, select, update
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import SessionLocal
from app.enums import (
    AccountGroup,
    CardKind,
    CategoryKind,
    IntervalUnit,
    PaymentMethod,
    SalaryRuleMode,
    TransactionType,
)
from app.models import (
    Account,
    BalanceSnapshot,
    BudgetLine,
    BudgetMove,
    Goal,
    GoalEntry,
    SalaryRule,
    Subscription,
    Transaction,
    TransactionSplit,
    TransactionTemplate,
    User,
    Vendor,
)
from app.schemas import (
    AccountCreate,
    BudgetLineCreate,
    BudgetSettingsUpdate,
    CardCreate,
    GoalCreate,
    GoalEntryCreate,
    SalaryRuleCreate,
    SubscriptionCreate,
    TemplateCreate,
    TransactionCreate,
    UserCreate,
    VendorCreate,
)
from app.services import (
    AccountService,
    BudgetService,
    CardService,
    CategoryService,
    GoalService,
    SalarySplitService,
    SubscriptionService,
    TemplateService,
    TransactionService,
    UserService,
)
from app.services.vendor import VendorService

DEMO_EMAIL = "demo@maalu.dev"
DEMO_PASSWORD = "maalu-demo-1234"
BASE = "MVR"
USD_RATE = Decimal("15.42")
SALARY = Decimal("10000")

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}

CASH, DEBIT, TRANSFER = PaymentMethod.CASH, PaymentMethod.DEBIT_CARD, PaymentMethod.BANK_TRANSFER

# key, group, name, what it held when they started (an opening amount), currency, bank, number
# (the numbers are made up)
ACCOUNTS = [
    ("bml", AccountGroup.ACCOUNTS, "BML Current", "1850", BASE, "BML", "7770000000001"),
    ("bml_save", AccountGroup.SAVINGS, "BML Savings", "3000", BASE, "BML", "7730000000002"),
    ("usd", AccountGroup.ACCOUNTS, "BML USD", "10", "USD", "BML", "7730000000003"),
    ("mib", AccountGroup.ACCOUNTS, "MIB Current", "400", BASE, "MIB", "90101400000001000"),
    ("mib_save", AccountGroup.SAVINGS, "MIB Savings", "6500", BASE, "MIB", "90101400000002000"),
    ("cash", AccountGroup.CASH, "Cash", "300", BASE, None, None),
]

# name -> (is_local, usual currency, contact, address)
VENDORS = {
    "Ensis Mart": (True, BASE, "+960 330 1122", "Majeedhee Magu, Male'"),
    "Hulhumale Fresh": (True, BASE, "+960 330 4455", "Hulhumale Phase 2"),
    "Male Fish Market": (True, BASE, None, "Male' Fish Market"),
    "Island Cafe": (True, BASE, "+960 777 1010", "Boduthakurufaanu Magu"),
    "Sea House Restaurant": (True, BASE, "+960 332 2020", "Ameenee Magu"),
    "Hiya Pharmacy": (True, BASE, "+960 331 7788", "Orchid Magu"),
    "Bookshop Male": (True, BASE, None, "Chaandhanee Magu"),
    "Cinema Male": (True, BASE, None, "Male' City"),
    "Gift Cards MV": (True, BASE, "+960 779 1234", "Majeedhee Magu, Male'"),
    "Landlord": (True, BASE, None, None),
    "STELCO": (True, BASE, "+960 332 3261", "Ameer Ahmed Magu"),
    "MWSC": (True, BASE, "+960 333 0000", None),
    "Dhiraagu": (True, BASE, "+960 123", "Ameenee Magu"),
    "Ooredoo": (True, BASE, "+960 123 4567", None),
    "Allied Insurance": (True, BASE, "+960 332 0011", "Boduthakurufaanu Magu"),
    "Netflix": (False, "USD", None, None),
    "Apple": (False, "USD", None, None),
    "DigitalOcean": (False, "USD", None, None),
}

# Where the local shops are (latitude, longitude), so the Places map has something to show. Every
# purchase from one is marked there, with a little scatter.
PLACES = {
    "Ensis Mart": (4.1752, 73.5100),
    "Hulhumale Fresh": (4.2147, 73.5400),
    "Male Fish Market": (4.1766, 73.5163),
    "Island Cafe": (4.1740, 73.5085),
    "Sea House Restaurant": (4.1782, 73.5127),
    "Hiya Pharmacy": (4.1768, 73.5106),
    "Bookshop Male": (4.1757, 73.5090),
    "Cinema Male": (4.1765, 73.5115),
}

# Categories: name -> (parent, need or want). Software stays unsorted so the demo shows that too.
CATEGORIES = {
    "Food & drink": (None, CategoryKind.NEED),
    "Lifestyle": (None, CategoryKind.WANT),
    "Rent": (None, CategoryKind.NEED),
    "Utilities": (None, CategoryKind.NEED),
    "Insurance": (None, CategoryKind.NEED),
    "Transport": (None, CategoryKind.NEED),
    "Health": (None, CategoryKind.NEED),
    "Groceries": ("Food & drink", CategoryKind.NEED),
    "Dining": ("Food & drink", CategoryKind.WANT),
    "Shopping": ("Lifestyle", CategoryKind.WANT),
    "Entertainment": ("Lifestyle", CategoryKind.WANT),
    "Gift cards": ("Lifestyle", CategoryKind.WANT),
    "Software": (None, None),
}

# The bills they pay every month. name, vendor, usual amount, currency, day of the month it falls
# due, paid from, method, category, whether the amount varies, what it came to last time.
BILLS = [
    ("Rent", "Landlord", "3200", BASE, 5, "bml", TRANSFER, "Rent", False, "3200"),
    ("Home broadband", "Dhiraagu", "399", BASE, 8, "bml", TRANSFER, "Utilities", False, "399"),
    ("Mobile plan", "Ooredoo", "250", BASE, 10, "bml", TRANSFER, "Utilities", False, "250"),
    ("Electricity", "STELCO", "500", BASE, 12, "bml", TRANSFER, "Utilities", True, "463.80"),
    ("Water", "MWSC", "120", BASE, 15, "bml", TRANSFER, "Utilities", True, "96.50"),
    (
        "Health insurance",
        "Allied Insurance",
        "480",
        BASE,
        3,
        "bml",
        TRANSFER,
        "Insurance",
        False,
        "480",
    ),
    ("Netflix", "Netflix", "15.49", "USD", 14, "usd", DEBIT, "Entertainment", False, "15.49"),
    ("iCloud+", "Apple", "2.99", "USD", 20, "usd", DEBIT, "Software", False, "2.99"),
    ("VPS server", "DigitalOcean", "24", "USD", 22, "usd", DEBIT, "Software", True, "27.12"),
]

# Day-to-day spending: which days of each month (0 is the 1st) something was bought.
GROCERY_DAYS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28]
DINING_DAYS = [2, 8, 12, 17, 22, 27]
TAXI_DAYS = [0, 1, 3, 5, 7, 9, 12, 14, 16, 19, 21, 23, 26, 28]


@dataclass
class SeedSummary:
    user: str
    accounts: int
    vendors: int
    subscriptions: int
    transactions: dict[str, int]


def _spot(vendor: str | None, rng: random.Random) -> dict:
    """The location fields for a purchase from a shop with a known place, else none."""
    if vendor not in PLACES:
        return {}
    lat, lng = PLACES[vendor]
    return {
        "latitude": Decimal(str(lat + rng.uniform(-0.0003, 0.0003))).quantize(Decimal("0.000001")),
        "longitude": Decimal(str(lng + rng.uniform(-0.0003, 0.0003))).quantize(Decimal("0.000001")),
        "place": vendor,
    }


def _money(value: float) -> Decimal:
    return Decimal(str(round(value, 2)))


def _clock(rng: random.Random, low: int, high: int) -> time:
    """A time of day between two hours, as the wall clock would read it."""
    return time(rng.randint(low, high), rng.choice([0, 5, 12, 20, 30, 41, 50, 55]))


async def _categories(db: AsyncSession, uid) -> None:
    svc = CategoryService(db)
    for name, (parent, kind) in CATEGORIES.items():
        category = await svc.get_or_create(uid, name)
        category.kind = kind
        if parent:
            category.parent_id = (await svc.get_or_create(uid, parent)).id
    await db.flush()


async def scale_money(db: AsyncSession, user_id, factor: int) -> None:
    """Multiply every amount of the user's data by `factor`, to see how the app copes with big
    numbers (millions, billions): `just seed --scale 1000` turns a 10,000 salary into 10,000,000.
    Only amounts change (balances, budgets and goals follow from them, and a percent salary rule is
    left alone). The balance history is derived, so it is dropped and built again from the new
    figures the first time it is read."""
    if factor < 1:
        raise ValueError("The scale must be at least 1")
    if factor == 1:
        return

    def times(table, *names):
        return {n: getattr(table, n) * factor for n in names}

    for table, names in (
        (Account, ("opening_amount", "credit_limit")),
        (Transaction, ("amount", "base_amount", "to_amount")),
        (Subscription, ("amount", "base_amount")),
        (Goal, ("target_amount", "monthly_amount")),
        (BudgetLine, ("amount",)),
        (BudgetMove, ("amount",)),
        (TransactionTemplate, ("amount",)),
    ):
        await db.execute(
            update(table).where(table.user_id == user_id).values(**times(table, *names))
        )
    mine = select(Transaction.id).where(Transaction.user_id == user_id)
    await db.execute(
        update(TransactionSplit)
        .where(TransactionSplit.transaction_id.in_(mine))
        .values(**times(TransactionSplit, "amount", "tax_amount"))
    )
    await db.execute(
        update(GoalEntry)
        .where(GoalEntry.goal_id.in_(select(Goal.id).where(Goal.user_id == user_id)))
        .values(**times(GoalEntry, "amount"))
    )
    await db.execute(
        update(SalaryRule)
        .where(SalaryRule.user_id == user_id, SalaryRule.mode == SalaryRuleMode.FIXED)
        .values(**times(SalaryRule, "value"))
    )
    accounts = select(Account.id).where(Account.user_id == user_id)
    await db.execute(delete(BalanceSnapshot).where(BalanceSnapshot.account_id.in_(accounts)))
    await db.flush()


async def seed(
    db: AsyncSession,
    *,
    rng: random.Random,
    today: date,
    email: str = DEMO_EMAIL,
) -> SeedSummary:
    """Replace the data of the user with this email (the demo user by default; made if missing)
    with a realistic first month. Only that user is touched. The caller commits."""
    await db.execute(delete(User).where(User.email == email))  # children cascade
    await db.flush()
    user = await UserService(db).register(
        UserCreate(email=email, password=DEMO_PASSWORD, base_currency=BASE)
    )
    uid = user.id
    tx_svc, subs_svc = TransactionService(db), SubscriptionService(db)

    this_month = today.replace(day=1)
    last_month = (this_month - timedelta(days=1)).replace(day=1)
    next_month = (this_month + timedelta(days=32)).replace(day=1)
    months = [last_month, this_month]

    def day(first: date, n: int) -> date | None:
        """The n-th day of the month starting `first`, or None while it is still to come."""
        d = first + timedelta(days=n)
        return d if d <= today and d.month == first.month else None

    # --- accounts
    accounts: dict[str, Account] = {}
    for key, group, name, opening, currency, bank, number in ACCOUNTS:
        accounts[key] = await AccountService(db).create(
            uid,
            AccountCreate(
                group=group,
                name=name,
                opening_amount=Decimal(opening),
                currency=currency,
                exchange_rate=None if currency == BASE else USD_RATE,
                bank=bank,
                account_number=number,
            ),
        )

    # --- vendors and categories
    for name, (is_local, currency, contact, address) in VENDORS.items():
        place = PLACES.get(name)
        await VendorService(db).create(
            uid,
            VendorCreate(
                name=name,
                is_local=is_local,
                currency=currency,
                contact=contact,
                address=address,
                **(
                    {
                        "latitude": Decimal(str(place[0])),
                        "longitude": Decimal(str(place[1])),
                        "place": name,
                    }
                    if place
                    else {}
                ),
            ),
        )
    await _categories(db, uid)

    # their debit cards: each spends from its bank account (the card has no balance of its own)
    cards = {}
    for key, name, digits in (("bml", "BML Visa debit", "4164"), ("mib", "MIB Visa debit", "2815")):
        cards[key] = await CardService(db).create(
            uid,
            CardCreate(
                name=name, kind=CardKind.DEBIT, last_digits=digits, account_id=accounts[key].id
            ),
        )

    counts = {"income": 0, "expense": 0, "transfer": 0}

    async def add(**fields) -> Transaction:
        tx = await tx_svc.create(uid, TransactionCreate(**fields))
        counts[fields["type"].value] += 1
        return tx

    async def move(on: date, source: str, target: str, amount: str, note: str, **extra):
        return await add(
            type=TransactionType.TRANSFER,
            amount=Decimal(amount),
            transaction_date=on,
            account_id=accounts[source].id,
            to_account_id=accounts[target].id,
            description=note,
            **extra,
        )

    async def spend(on, category, vendor, amount, account, method, note=None, hours=(9, 20)):
        if on is None:
            return None
        return await add(
            type=TransactionType.EXPENSE,
            amount=amount,
            payment_method=method,
            category=category,
            transaction_date=on,
            transaction_time=_clock(rng, *hours),
            vendor_name=vendor,
            account_id=accounts[account].id,
            card_id=cards[account].id if method is DEBIT and account in cards else None,
            description=note,
            **_spot(vendor, rng),
        )

    # --- goals, and the salary rules that feed them
    goals = GoalService(db)
    await goals.create(
        uid,
        GoalCreate(
            name="Emergency fund",
            target_amount=Decimal("30000"),
            monthly_amount=Decimal("1000"),
            account_id=accounts["mib_save"].id,
        ),
    )
    await goals.create(
        uid,
        GoalCreate(
            name="Holiday",
            target_amount=Decimal("12000"),
            target_date=today + timedelta(days=180),
            monthly_amount=Decimal("500"),
            account_id=accounts["bml_save"].id,
        ),
    )
    laptop = await goals.create(
        uid,
        GoalCreate(
            name="New laptop",
            target_amount=Decimal("8000"),
            target_date=today + timedelta(days=240),
            monthly_amount=Decimal("600"),
        ),
    )
    split = SalarySplitService(db)
    for account, amount in (("mib_save", "1000"), ("bml_save", "500")):
        await split.create_rule(
            uid,
            SalaryRuleCreate(
                account_id=accounts[account].id,
                mode=SalaryRuleMode.FIXED,
                value=Decimal(amount),
                auto=True,
            ),
        )

    # --- the bills: paid when they fell due, and the next one planned (after the loop)
    subscriptions: list[Subscription] = []
    for name, vendor, amount, _currency, due_day, source, method, category, varies, _real in BILLS:
        sub = await subs_svc.create(
            uid,
            SubscriptionCreate(
                name=name,
                vendor_name=vendor,
                amount=Decimal(amount),
                account_id=accounts[source].id,
                payment_method=method,
                category=category,
                interval_unit=IntervalUnit.MONTH,
                interval_count=1,
                start_date=last_month + timedelta(days=due_day - 1),
                amount_varies=varies,
            ),
        )
        subscriptions.append(sub)

    # --- each month: the salary and its split, moves between accounts, bills, everyday spending
    for first in months:
        salary = await add(
            type=TransactionType.INCOME,
            amount=SALARY,
            payment_method=TRANSFER,
            category="Salary",
            transaction_date=first,
            transaction_time=time(9, 30),
            account_id=accounts["bml"].id,
            description="Salary",
        )
        await split.on_posted(uid, salary)  # the two rules move their share at once
        counts["transfer"] += 2
        await goals.add_entry(
            laptop, GoalEntryCreate(amount=Decimal("600"), entry_date=first, note="Set aside")
        )
        second = first + timedelta(days=1)
        await move(second, "bml", "mib", "2000", "Spending money for the month")
        await move(second, "bml", "cash", "800", "Cash withdrawal")
        top_up = Decimal("700")
        await move(
            second,
            "bml",
            "usd",
            str(top_up),
            "Top up USD account",
            to_amount=(top_up / USD_RATE).quantize(Decimal("0.01")),
        )
        for sub, bill in zip(subscriptions, BILLS, strict=True):
            _, vendor, amount, currency, due_day, source, method, category, varies, real = bill
            due = day(first, due_day - 1)
            if due is None:
                continue
            paid = Decimal(real) if first == last_month else Decimal(amount)
            if varies and first == this_month:
                paid = (Decimal(amount) * Decimal(str(rng.uniform(0.85, 1.1)))).quantize(
                    Decimal("0.01")
                )
            await add(
                type=TransactionType.EXPENSE,
                amount=paid,
                payment_method=method,
                category=category,
                transaction_date=due,
                vendor_name=vendor,
                subscription_id=sub.id,
                account_id=accounts[source].id,
                exchange_rate=USD_RATE if currency != BASE else None,
            )

        for i, n in enumerate(GROCERY_DAYS):
            if i % 4 == 3:
                amount = _money(rng.uniform(60, 120))
                await spend(
                    day(first, n),
                    "Groceries",
                    "Male Fish Market",
                    amount,
                    "cash",
                    CASH,
                    hours=(7, 10),
                )
            else:
                shop = "Hulhumale Fresh" if i % 4 == 2 else "Ensis Mart"
                note = "Weekly shop" if i % 4 == 0 else None
                amount = _money(rng.uniform(90, 210))
                await spend(day(first, n), "Groceries", shop, amount, "mib", DEBIT, note, (16, 20))
        for i, n in enumerate(DINING_DAYS):
            if i % 2 == 0:
                amount = _money(rng.uniform(30, 70))
                await spend(
                    day(first, n), "Dining", "Island Cafe", amount, "cash", CASH, hours=(8, 15)
                )
            else:
                amount = _money(rng.uniform(90, 160))
                await spend(
                    day(first, n),
                    "Dining",
                    "Sea House Restaurant",
                    amount,
                    "mib",
                    DEBIT,
                    "With friends",
                    (19, 21),
                )
        for n in TAXI_DAYS:
            amount = Decimal(rng.choice([15, 20, 25, 30, 35]))
            await spend(day(first, n), "Transport", None, amount, "cash", CASH, "Taxi", (7, 21))

    # a few one-off purchases
    books = await spend(
        day(last_month, 13),
        "Shopping",
        "Bookshop Male",
        Decimal("240"),
        "mib",
        DEBIT,
        "Study books",
        (12, 18),
    )
    if books is not None:  # one of them was the wrong edition: half of it went back
        await add(
            type=TransactionType.INCOME,
            amount=Decimal("120"),
            transaction_date=day(last_month, 16),
            refund_of_id=books.id,
            account_id=accounts["mib"].id,
            description="Returned the wrong edition",
        )
    await spend(
        day(last_month, 10), "Health", "Hiya Pharmacy", Decimal("135"), "mib", DEBIT, None, (10, 19)
    )
    await spend(
        day(last_month, 19),
        "Entertainment",
        "Cinema Male",
        Decimal("140"),
        "mib",
        DEBIT,
        "Movie night",
        (19, 21),
    )
    await spend(
        day(this_month, 2), "Health", "Hiya Pharmacy", Decimal("85"), "mib", DEBIT, None, (10, 19)
    )
    await add(
        type=TransactionType.EXPENSE,
        amount=Decimal("385"),
        payment_method=DEBIT,
        category="Gift cards",
        transaction_date=day(last_month, 8),
        vendor_name="Gift Cards MV",
        card_id=cards["bml"].id,
        description="Apple gift card ($25)",
    )
    # the next salary is expected on the 1st
    await add(
        type=TransactionType.INCOME,
        amount=SALARY,
        payment_method=TRANSFER,
        category="Salary",
        transaction_date=next_month,
        account_id=accounts["bml"].id,
        description="Salary",
        planned=True,
    )
    await subs_svc.sync(uid)

    # --- a monthly budget, a few templates
    budget = BudgetService(db)
    await budget.update_settings(uid, BudgetSettingsUpdate(warn_percent=80))
    categories = CategoryService(db)

    async def limit(name: str, amount: str, *names: str):
        ids = [(await categories.get_by_name(uid, n)).id for n in names]
        await budget.create_line(
            uid, BudgetLineCreate(name=name, category_ids=ids, amount=Decimal(amount))
        )

    await limit("Groceries", "1600", "Groceries")
    await limit("Eating out", "600", "Dining")
    await limit("Getting around", "500", "Transport")
    await limit("Fun and shopping", "900", "Shopping", "Entertainment", "Gift cards")

    templates = TemplateService(db)
    await templates.create(
        uid,
        TemplateCreate(
            name="Groceries",
            type=TransactionType.EXPENSE,
            payment_method=DEBIT,
            category="Groceries",
            vendor_name="Ensis Mart",
            account_id=accounts["mib"].id,
        ),
    )
    await templates.create(
        uid,
        TemplateCreate(
            name="Taxi",
            type=TransactionType.EXPENSE,
            amount=Decimal("25"),
            payment_method=CASH,
            category="Transport",
            description="Taxi",
            account_id=accounts["cash"].id,
        ),
    )

    await db.flush()
    n_vendors = await db.scalar(select(func.count(Vendor.id)).where(Vendor.user_id == uid))
    return SeedSummary(
        user=email,
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
    parser = argparse.ArgumentParser(description="Seed the database with a realistic first month.")
    parser.add_argument("--seed", type=int, default=None, help="random seed, for reproducible data")
    parser.add_argument(
        "--scale",
        type=int,
        default=1,
        help="multiply every amount by this (1000 = salaries in the millions), to try big numbers",
    )
    parser.add_argument(
        "--email",
        default=DEMO_EMAIL,
        help="seed this user instead of the demo user (its data is replaced; yours is untouched)",
    )
    args = parser.parse_args()
    _assert_local_database()

    rng = random.Random(args.seed)
    async with SessionLocal() as db:
        summary = await seed(db, rng=rng, today=date.today(), email=args.email)
        if args.scale != 1:
            user_id = await db.scalar(select(User.id).where(User.email == args.email))
            await scale_money(db, user_id, args.scale)
        await db.commit()

    t = summary.transactions
    print(
        f"Seeded {summary.accounts} accounts, {summary.vendors} vendors, "
        f"{summary.subscriptions} bills and {sum(t.values())} transactions "
        f"({t['income']} income, {t['expense']} expense, {t['transfer']} transfer)."
    )
    print(f"Sign in as {summary.user} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
