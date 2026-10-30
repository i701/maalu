"""Commands for whoever runs the server, for example
`uv run python -m app.admin disable-2fa you@example.com`.

They work on the database directly, so they are for the operator and need no login. They are how
someone who has lost their password, or both their authenticator app and their recovery codes, gets
back in without email.
"""

import asyncio
import getpass
import sys

from app.database import SessionLocal
from app.services import SessionService, UserService

USAGE = "usage: python -m app.admin disable-2fa EMAIL | reset-password EMAIL"
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


def main(argv: list[str]) -> int:
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
