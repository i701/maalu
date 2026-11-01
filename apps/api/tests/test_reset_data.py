from decimal import Decimal

from app import admin
from app.models import Account, Category, ImportBatch, Transaction, User, UserSession
from httpx import AsyncClient
from sqlalchemy import func, select

TX = "/api/v1/transactions"


async def count(db, model) -> int:
    return (await db.scalar(select(func.count()).select_from(model))) or 0


async def test_reset_data_clears_the_data_but_keeps_who_can_sign_in(client: AsyncClient, auth):
    account = (
        await client.post(
            "/api/v1/accounts",
            json={"group": "cash", "name": "Wallet", "opening_amount": "10"},
            headers=auth,
        )
    ).json()
    await client.patch("/api/v1/users/me", json={"default_account_id": account["id"]}, headers=auth)
    body = {
        "type": "expense",
        "amount": "5",
        "payment_method": "cash",
        "category": "Misc",
        "transaction_date": "2026-03-01",
        "account_id": account["id"],
    }
    await client.post(TX, json=body, headers=auth)
    rows = [
        {
            "date": "2026-03-02",
            "type": "expense",
            "amount": "1",
            "counterparty": "X",
            "reference": "R1",
        }
    ]
    await client.post(
        "/api/v1/imports",
        json={"account_id": account["id"], "filename": "s.csv", "profile": "bml", "rows": rows},
        headers=auth,
    )

    async with client.session_factory() as db:
        assert await count(db, Transaction) == 2
        assert await count(db, ImportBatch) == 1
        cleared = await admin.reset_data(client.session_factory)
    assert "transactions" in cleared
    assert "users" not in cleared
    assert "sessions" not in cleared

    async with client.session_factory() as db:
        for model in (Account, Transaction, Category, ImportBatch):
            assert await count(db, model) == 0, model
        assert await count(db, User) == 1
        assert await count(db, UserSession) == 1  # still signed in

    # the same login keeps working, with nothing in it, and no default account left behind
    me = await client.get("/api/v1/users/me", headers=auth)
    assert me.status_code == 200
    assert me.json()["default_account_id"] is None
    assert (await client.get("/api/v1/accounts", headers=auth)).json() == []
    # and it can be started over
    again = await client.post(
        "/api/v1/accounts",
        json={"group": "cash", "name": "Wallet", "opening_amount": "1"},
        headers=auth,
    )
    assert again.status_code == 201
    assert Decimal(again.json()["balance"]) == Decimal("1")


async def test_reset_data_keeps_every_user_and_their_settings(client: AsyncClient, signup):
    await signup("a@example.com")
    await signup("b@example.com")
    await admin.reset_data(client.session_factory)
    async with client.session_factory() as db:
        assert await count(db, User) == 2


def test_only_a_database_on_this_machine_counts_as_local():
    assert admin.is_local_database("postgresql+asyncpg://maalu:maalu@localhost:5432/maalu")
    assert admin.is_local_database("postgresql://u:p@127.0.0.1/db")
    assert not admin.is_local_database("postgresql+asyncpg://u:p@db.example.com:5432/maalu")
    assert not admin.is_local_database(
        "postgresql+asyncpg://u:p@db:5432/maalu"
    )  # docker-compose.prod


def test_the_command_refuses_a_remote_database(monkeypatch, capsys):
    monkeypatch.setattr(admin.settings, "database_url", "postgresql+asyncpg://u:p@db:5432/maalu")
    assert admin.main(["reset-data"]) == 1
    assert "this machine" in capsys.readouterr().err
