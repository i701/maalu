import os
from collections.abc import AsyncIterator, Awaitable, Callable

os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production-use")

import pytest
from app.database import get_db
from app.main import create_app
from app.models import Base
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    engine = create_async_engine(
        "sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )

    @event.listens_for(engine.sync_engine, "connect")
    def _enable_sqlite_fks(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with sessions() as session:
            yield session
            await session.commit()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    await engine.dispose()


Signup = Callable[[str], Awaitable[dict[str, str]]]


@pytest.fixture
def signup(client: AsyncClient) -> Signup:
    """Register a user and return their bearer auth headers."""

    async def _signup(email: str) -> dict[str, str]:
        creds = {"email": email, "password": "correct-horse-battery", "base_currency": "MVR"}
        assert (await client.post("/api/v1/auth/register", json=creds)).status_code == 201
        resp = await client.post(
            "/api/v1/auth/login", data={"username": email, "password": creds["password"]}
        )
        return {"Authorization": f"Bearer {resp.json()['access_token']}"}

    return _signup


@pytest.fixture
async def auth(signup: Signup) -> dict[str, str]:
    return await signup("alice@example.com")
