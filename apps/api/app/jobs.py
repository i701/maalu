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
from app.services import AttachmentService, SessionService, SnapshotService, SubscriptionService

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


async def snapshot_balances(session_factory=SessionLocal) -> None:
    """Rebuild stale snapshots and add the days since each account's last one, for every user."""
    async with session_factory() as session:
        await SnapshotService(session).repair()
        await session.commit()


@app.periodic(cron="10 0 * * *")
@app.task(name="snapshot_balances", queueing_lock="snapshot_balances")
async def snapshot_balances_job(timestamp: int) -> None:
    """Daily, just after midnight UTC: snapshot yesterday for every account, at the exchange rate
    the account has now. Reading the balance chart does the same for one user, so this keeps the
    day's rate honest even if nobody opened the app."""
    await snapshot_balances()
    logger.info("balance snapshots are up to date")


async def purge_orphan_attachments(session_factory=SessionLocal) -> int:
    """Delete stored attachment files with no row (over a day old); returns how many went."""
    async with session_factory() as session:
        return await AttachmentService(session).purge_orphans()


@app.periodic(cron="30 4 * * *")
@app.task(name="purge_orphan_attachments", queueing_lock="purge_orphan_attachments")
async def purge_orphan_attachments_job(timestamp: int) -> None:
    """Daily, at 04:30: remove attachment files nothing points at any more. Deleting a transaction
    for good, an account, or a failed upload leaves the file behind; this is what cleans up after
    all of them, so none of those paths has to touch storage."""
    removed = await purge_orphan_attachments()
    logger.info("removed %d orphan attachment files", removed)


async def plan_subscriptions(session_factory=SessionLocal) -> int:
    """Plan the next payment of every active subscription that has none; returns how many."""
    async with session_factory() as session:
        made = await SubscriptionService(session).sync(None)
        await session.commit()
    return made


@app.periodic(cron="20 0 * * *")
@app.task(name="plan_subscriptions", queueing_lock="plan_subscriptions")
async def plan_subscriptions_job(timestamp: int) -> None:
    """Daily, at 00:20: plan the next payment of each subscription whose date has come within
    reach (a yearly one appears a month ahead). Opening the Upcoming list or the Subscriptions
    page does the same for one user, so this mostly covers the days nobody opened the app."""
    made = await plan_subscriptions()
    logger.info("planned %d subscription payments", made)
