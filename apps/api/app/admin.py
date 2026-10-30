"""Commands for whoever runs the server: `uv run python -m app.admin disable-2fa you@example.com`.

They work on the database directly, so they are for the operator and need no login. This is how
someone who has lost both their authenticator app and their recovery codes gets back in.
"""

import asyncio
import sys

from app.database import SessionLocal
from app.services import UserService

USAGE = "usage: python -m app.admin disable-2fa EMAIL"


async def disable_two_factor(email: str) -> bool:
    """Turn two-factor off for the account with this email. False when there is no such account."""
    async with SessionLocal() as session:
        users = UserService(session)
        user = await users.get_by_email(email)
        if user is None:
            return False
        await users.reset_two_factor(user)
        await session.commit()
        return True


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[0] != "disable-2fa":
        print(USAGE, file=sys.stderr)
        return 2
    if not asyncio.run(disable_two_factor(argv[1])):
        print(f"No account with the email {argv[1]}", file=sys.stderr)
        return 1
    print(f"Two-factor is off for {argv[1]}. They can sign in with their password.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
