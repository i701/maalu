"""Background jobs, run by a separate worker process (procrastinate, queued in Postgres).

The API never runs these. The worker (`just dev-worker`; the `worker` service in
`docker-compose.prod.yml`) picks up jobs, and fires the periodic ones on their schedule, so a daily
job runs once however many workers there are. To add a job: write a function below with
`@app.task`, add `@app.periodic(cron=...)` above it if it runs on a schedule, or defer it from the
API with `await my_job.defer_async(...)`. Jobs open their own database session
(`SessionLocal`), since there is no request.
"""

import logging

import procrastinate

from app.config import settings
from app.database import SessionLocal
from app.services import SessionService

logger = logging.getLogger("maalu.jobs")


def conninfo(database_url: str) -> str:
    """The URL for psycopg: SQLAlchemy's `postgresql+asyncpg://` without the driver part."""
    return database_url.replace("+asyncpg", "", 1)


app = procrastinate.App(
    connector=procrastinate.PsycopgConnector(conninfo=conninfo(settings.database_url)),
    import_paths=["app.jobs"],
)


async def purge_expired_sessions(session_factory=SessionLocal) -> int:
    """Delete every user's expired sessions, and return how many went."""
    async with session_factory() as session:
        removed = await SessionService(session).purge_expired()
        await session.commit()
    return removed


@app.periodic(cron="17 3 * * *")
@app.task(name="purge_expired_sessions", queueing_lock="purge_expired_sessions")
async def purge_expired_sessions_job(timestamp: int) -> None:
    """Daily, at 03:17: forget sessions that have expired. Sign-in only tidies the signing-in user's
    own, so a device nobody signs in from again would otherwise stay in the table for good."""
    removed = await purge_expired_sessions()
    logger.info("purged %d expired sessions", removed)
