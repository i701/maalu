from datetime import UTC, datetime, timedelta

from app import jobs
from app.models import UserSession
from app.services import session as session_service
from procrastinate import testing
from sqlalchemy import select


async def test_purge_removes_only_expired_sessions(client, signup, monkeypatch):
    headers = await signup("jobs@example.com")
    sessions = (await client.get("/api/v1/auth/sessions", headers=headers)).json()
    assert len(sessions) == 1

    factory = client.session_factory
    # a month later the one session has expired
    later = datetime.now(UTC) + timedelta(days=60)
    monkeypatch.setattr(session_service, "_now", lambda: later)
    assert await jobs.purge_expired_sessions(factory) == 1
    async with factory() as db:
        assert (await db.scalars(select(UserSession))).all() == []

    # nothing left to remove, and a live session is not touched
    assert await jobs.purge_expired_sessions(factory) == 0


async def test_live_sessions_survive_the_purge(client, signup):
    await signup("live@example.com")
    assert await jobs.purge_expired_sessions(client.session_factory) == 0
    async with client.session_factory() as db:
        assert len((await db.scalars(select(UserSession))).all()) == 1


def test_conninfo_drops_the_sqlalchemy_driver():
    url = "postgresql+asyncpg://maalu:pw@db:5432/maalu"
    assert jobs.conninfo(url) == "postgresql://maalu:pw@db:5432/maalu"


async def test_the_daily_purge_is_scheduled_and_can_be_deferred():
    assert any(
        p.task.name == "purge_expired_sessions"
        for p in jobs.app.periodic_registry.periodic_tasks.values()
    )
    with jobs.app.replace_connector(testing.InMemoryConnector()) as app:
        async with app.open_async():
            await jobs.purge_expired_sessions_job.defer_async(timestamp=0)
            assert [j["task_name"] for j in app.connector.jobs.values()] == [
                "purge_expired_sessions"
            ]
