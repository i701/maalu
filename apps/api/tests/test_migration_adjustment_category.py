"""The data migration that took the category off balance adjustments (d3f5a7c9e1b2).

An adjustment used to be filed under an auto-created category, which could have been renamed since.
The migration clears it on every adjustment and deletes that category once nothing else uses it. It
is plain SQL, so it runs here on the test database; the old state is seeded with the ORM, since the
app no longer makes adjustments with a category.
"""

import importlib.util
import uuid
from datetime import date
from decimal import Decimal
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
from app.enums import PaymentMethod, TransactionType
from app.models import Transaction
from httpx import AsyncClient

MIGRATION = (
    Path(__file__).parents[1] / "migrations/versions/d3f5a7c9e1b2_adjustments_have_no_category.py"
)


async def run_migration(client: AsyncClient) -> None:
    spec = importlib.util.spec_from_file_location("adjustment_category_migration", MIGRATION)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    def upgrade(sync_connection):
        with Operations.context(MigrationContext.configure(sync_connection)):
            module.upgrade()

    async with client.session_factory() as db:  # type: ignore[attr-defined]
        await (await db.connection()).run_sync(upgrade)
        await db.commit()


async def file_old_style_adjustment(
    client: AsyncClient, headers, account_id: str, category_id: str
):
    me = (await client.get("/api/v1/users/me", headers=headers)).json()
    async with client.session_factory() as db:  # type: ignore[attr-defined]
        db.add(
            Transaction(
                user_id=uuid.UUID(me["id"]),
                type=TransactionType.INCOME,
                amount=Decimal(10),
                currency="MVR",
                exchange_rate=Decimal(1),
                base_amount=Decimal(10),
                payment_method=PaymentMethod.OTHER,
                transaction_date=date.today(),
                account_id=uuid.UUID(account_id),
                category_id=uuid.UUID(category_id),
                adjustment=True,
                description="Balance adjustment",
            )
        )
        await db.commit()


async def category(client, headers, name, **extra) -> dict:
    resp = await client.post("/api/v1/categories", json={"name": name, **extra}, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_the_category_adjustments_were_in_goes_whatever_it_was_renamed_to(client, auth):
    acc = (
        await client.post(
            "/api/v1/accounts",
            json={"group": "cash", "name": "Wallet", "opening_amount": "100"},
            headers=auth,
        )
    ).json()
    # the renamed auto-created category (an emoji added), with only adjustments in it
    renamed = await category(client, auth, "Balance adjustment ⚖️")
    for _ in range(4):
        await file_old_style_adjustment(client, auth, acc["id"], renamed["id"])

    await run_migration(client)

    names = [c["name"] for c in (await client.get("/api/v1/categories", headers=auth)).json()]
    assert "Balance adjustment ⚖️" not in names
    rows = (await client.get("/api/v1/transactions", headers=auth)).json()
    adjustments = [r for r in rows if r["adjustment"]]
    assert len(adjustments) == 4
    assert all(r["category_id"] is None for r in adjustments)
    # still reads as what it is, and the balance is untouched
    assert all(r["category"] == "Balance adjustment" for r in adjustments)
    assert (await client.get(f"/api/v1/accounts/{acc['id']}", headers=auth)).json()["balance"] in (
        "140.0000",
        "140",
    )


async def test_a_category_something_else_still_uses_is_kept_and_only_the_adjustments_leave_it(
    client, auth
):
    acc = (
        await client.post(
            "/api/v1/accounts",
            json={"group": "cash", "name": "Wallet", "opening_amount": "100"},
            headers=auth,
        )
    ).json()
    shared = await category(client, auth, "Shared")
    limited = await category(client, auth, "Limited")
    parent = await category(client, auth, "Parent")
    await category(client, auth, "Child", parent_id=parent["id"])
    # a real purchase in one, a budget limit on another, sub-categories under a third
    spent = await client.post(
        "/api/v1/transactions",
        json={
            "type": "expense",
            "amount": "10",
            "payment_method": "cash",
            "category": "Shared",
            "transaction_date": date.today().isoformat(),
            "account_id": acc["id"],
        },
        headers=auth,
    )
    assert spent.status_code == 201, spent.text
    line = await client.post(
        "/api/v1/budget/lines",
        json={"name": "Limited", "category_ids": [limited["id"]], "amount": "500"},
        headers=auth,
    )
    assert line.status_code in (200, 201), line.text
    for cat in (shared, limited, parent):
        await file_old_style_adjustment(client, auth, acc["id"], cat["id"])

    await run_migration(client)

    names = {c["name"] for c in (await client.get("/api/v1/categories", headers=auth)).json()}
    assert {"Shared", "Limited", "Parent", "Child"} <= names
    rows = (await client.get("/api/v1/transactions", headers=auth)).json()
    assert all(r["category_id"] is None for r in rows if r["adjustment"])
    # the real purchase kept its category
    assert [r["category"] for r in rows if not r["adjustment"]] == ["Shared"]
