import uuid
from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.config import settings

ALGORITHM = "HS256"

_password_hash = PasswordHash.recommended()  # argon2id
# Verified against when a login email is unknown, so timing doesn't reveal which emails exist.
DUMMY_HASH = _password_hash.hash("maalu-dummy-password")


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return _password_hash.verify(password, hashed)


def create_access_token(user_id: uuid.UUID) -> str:
    now = datetime.now(UTC)
    claims = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(claims, settings.secret_key, algorithm=ALGORITHM)


CHALLENGE_MINUTES = 5


def create_challenge_token(user_id: uuid.UUID) -> str:
    """Proof that the password was right and a code is still needed. It is not an access token:
    `decode_access_token` refuses it, and it only opens `/auth/login/2fa`."""
    now = datetime.now(UTC)
    claims = {
        "sub": str(user_id),
        "scope": "two-factor",
        "iat": now,
        "exp": now + timedelta(minutes=CHALLENGE_MINUTES),
    }
    return jwt.encode(claims, settings.secret_key, algorithm=ALGORITHM)


def _decode(token: str) -> dict | None:
    try:
        return jwt.decode(
            token, settings.secret_key, algorithms=[ALGORITHM], options={"require": ["exp", "sub"]}
        )
    except jwt.PyJWTError:
        return None


def decode_access_token(token: str) -> uuid.UUID | None:
    """Return the user id from a valid access token, or None if invalid, expired or not an access
    token (a challenge token has a scope and is refused here)."""
    payload = _decode(token)
    if payload is None or "scope" in payload:
        return None
    try:
        return uuid.UUID(payload["sub"])
    except ValueError:
        return None


def decode_challenge_token(token: str) -> uuid.UUID | None:
    """Return the user id from a valid, unexpired challenge token, or None."""
    payload = _decode(token)
    if payload is None or payload.get("scope") != "two-factor":
        return None
    try:
        return uuid.UUID(payload["sub"])
    except ValueError:
        return None
