"""Commands for whoever runs the server, for example
`uv run python -m app.admin disable-2fa you@example.com`.

They work on the database directly, so they are for the operator and need no login. They are how
someone who has lost their password, or both their authenticator app and their recovery codes, gets
back in without email.
"""

import asyncio
import getpass
import sys
from urllib.parse import urlparse

from sqlalchemy import delete, update
from sqlalchemy.sql.ddl import sort_tables

from app.config import settings
from app.database import SessionLocal
from app.models import User
from app.models.base import Base
from app.services import SessionService, UserService

USAGE = (
    "usage: python -m app.admin disable-2fa EMAIL | reset-password EMAIL | create-bucket "
    "| reset-data"
)
MIN_PASSWORD = 8
MAX_PASSWORD = 128


async def disable_two_factor(email: str, session_factory=SessionLocal) -> bool:
    """Turn two-factor off for the account with this email. False when there is no such account."""
    async with session_factory() as session:
        users = UserService(session)
        user = await users.get_by_email(email)
        if user is None:
            return False
        await users.reset_two_factor(user)
        await session.commit()
        return True


async def reset_password(email: str, password: str, session_factory=SessionLocal) -> bool:
    """Set a new password for the account with this email and sign it out everywhere. False when
    there is no such account. Two-factor is left as it is."""
    async with session_factory() as session:
        users = UserService(session)
        user = await users.get_by_email(email)
        if user is None:
            return False
        await users.set_password(user, password)
        await SessionService(session).end_all(user.id)
        await session.commit()
        return True


def ask_for_password() -> str | None:
    """A new password typed twice, hidden. None (with a message) when it is not acceptable."""
    try:
        first = getpass.getpass("New password: ")
        again = getpass.getpass("New password again: ")
    except (EOFError, KeyboardInterrupt):
        print(
            "\nNo terminal to type the password in. Run it in one (in Docker: exec -it).",
            file=sys.stderr,
        )
        return None
    if again != first:
        print("The two passwords are not the same", file=sys.stderr)
        return None
    if not MIN_PASSWORD <= len(first) <= MAX_PASSWORD:
        print(f"Use {MIN_PASSWORD} to {MAX_PASSWORD} characters", file=sys.stderr)
        return None
    return first


# What reset-data leaves alone: who can sign in (accounts, their sessions, two-factor and recovery
# codes) and the exchange-rate cache. Every other table is data and goes, including later ones.
KEEP_ON_RESET = frozenset({"users", "sessions", "recovery_codes", "exchange_rates"})
LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})


def is_local_database(url: str) -> bool:
    """Whether the database URL points at this machine: reset-data is for development only."""
    return urlparse(url.replace("+asyncpg", "", 1)).hostname in LOCAL_HOSTS


async def reset_data(session_factory=SessionLocal) -> list[str]:
    """Delete everything users have entered (accounts, transactions, categories, budgets, imports,
    and the rest) but keep the users, their sessions and two-factor, so you stay signed in and
    start from an empty account. Returns the tables cleared. The background job queue is not part
    of the app's tables and is untouched."""
    data = [t for t in Base.metadata.tables.values() if t.name not in KEEP_ON_RESET]
    tables = list(reversed(sort_tables(data)))  # sorted among themselves: users is not in the way
    async with session_factory() as session:
        # a user's default account is a link into the data being deleted
        await session.execute(update(User).values(default_account_id=None))
        for table in tables:  # children first, so no foreign key is ever in the way
            await session.execute(delete(table))
        await session.commit()
    return [t.name for t in tables]


def create_bucket() -> int:
    """Create the attachments bucket if it is missing (development, or a first setup)."""
    from app.storage import S3Storage, get_storage

    storage = get_storage()
    if not isinstance(storage, S3Storage):
        print(
            "No bucket is set (ATTACHMENTS_S3_BUCKET): attachments go to a folder.", file=sys.stderr
        )
        return 1
    created = storage.ensure_bucket()
    print(f"Bucket {storage.bucket} {'created' if created else 'already exists'}.")
    return 0


def main(argv: list[str]) -> int:
    if argv == ["create-bucket"]:
        return create_bucket()
    if argv == ["reset-data"]:
        if not is_local_database(settings.database_url):
            print("reset-data only runs against a database on this machine.", file=sys.stderr)
            return 1
        cleared = asyncio.run(reset_data())
        print(f"Cleared {len(cleared)} tables. Users, sessions and two-factor were kept.")
        return 0
    if len(argv) != 2 or argv[0] not in ("disable-2fa", "reset-password"):
        print(USAGE, file=sys.stderr)
        return 2
    command, email = argv
    if command == "reset-password":
        password = ask_for_password()
        if password is None:
            return 2
        if not asyncio.run(reset_password(email, password)):
            print(f"No account with the email {email}", file=sys.stderr)
            return 1
        print(f"The password for {email} is changed, and they are signed out everywhere.")
        return 0
    if not asyncio.run(disable_two_factor(email)):
        print(f"No account with the email {email}", file=sys.stderr)
        return 1
    print(f"Two-factor is off for {email}. They can sign in with their password.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
