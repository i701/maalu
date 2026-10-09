import uuid
from datetime import UTC, datetime, timedelta

import jwt
from app.config import settings
from app.security import ALGORITHM
from httpx import AsyncClient

from tests.conftest import Signup

CREDS = {
    "email": "Alice@Example.com",
    "password": "correct-horse-battery",
    "base_currency": "mvr",
}


async def test_register_hides_password_and_normalises_email(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json=CREDS)
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "alice@example.com"
    assert body["base_currency"] == "MVR"
    assert "password" not in body
    assert "hashed_password" not in body


async def test_duplicate_email_conflicts(client: AsyncClient):
    await client.post("/api/v1/auth/register", json=CREDS)
    again = await client.post("/api/v1/auth/register", json={**CREDS, "email": "alice@example.com"})
    assert again.status_code == 409


async def test_weak_password_rejected(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={**CREDS, "password": "short"})
    assert resp.status_code == 422


async def test_login_wrong_password_and_unknown_user(client: AsyncClient):
    await client.post("/api/v1/auth/register", json=CREDS)
    wrong = await client.post(
        "/api/v1/auth/login", data={"username": CREDS["email"], "password": "nope-nope-nope"}
    )
    unknown = await client.post(
        "/api/v1/auth/login", data={"username": "x@example.com", "password": "nope-nope-nope"}
    )
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


async def test_me(client: AsyncClient, auth: dict[str, str]):
    resp = await client.get("/api/v1/users/me", headers=auth)
    assert resp.json()["email"] == "alice@example.com"


async def test_invalid_and_expired_tokens(client: AsyncClient, signup: Signup):
    await signup("alice@example.com")
    assert (
        await client.get("/api/v1/users/me", headers={"Authorization": "Bearer garbage"})
    ).status_code == 401
    expired = jwt.encode(
        {"sub": str(uuid.uuid4()), "exp": datetime.now(UTC) - timedelta(minutes=1)},
        settings.secret_key,
        algorithm=ALGORITHM,
    )
    resp = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {expired}"})
    assert resp.status_code == 401
