"""Two-factor authentication with an authenticator app (TOTP) and single-use recovery codes.

Pure helpers: no database, no FastAPI. `services/user.py` keeps the state (the secret, the last used
time step, the failure count and the recovery codes) and the routers turn the errors into responses.
"""

import base64
import hashlib
import hmac
import secrets
import time

import pyotp
import segno
from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

ISSUER = "Maalu"
STEP_SECONDS = 30
# Time steps accepted either side of the current one, for a phone clock that is a little off.
WINDOW = 1
RECOVERY_CODE_COUNT = 10
# No look-alikes (0/o, 1/l/i).
_RECOVERY_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"


def _fernet() -> Fernet:
    """Encrypts the secrets at rest, with a key derived from `SECRET_KEY`. Changing `SECRET_KEY`
    makes stored secrets unreadable, so two-factor has to be set up again (the same change signs
    everyone out)."""
    digest = hashlib.sha256(f"maalu-two-factor:{settings.secret_key}".encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def _now() -> float:
    """The clock the codes are checked against (a test replaces it)."""
    return time.time()


def new_secret() -> str:
    return pyotp.random_base32()


def encrypt_secret(secret: str) -> str:
    return _fernet().encrypt(secret.encode()).decode()


def decrypt_secret(stored: str) -> str | None:
    try:
        return _fernet().decrypt(stored.encode()).decode()
    except InvalidToken:
        return None


def provisioning_uri(secret: str, email: str) -> str:
    """The `otpauth://` address an authenticator app reads (usually from the QR code)."""
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=ISSUER)


def qr_data_uri(uri: str) -> str:
    """The QR code of `uri` as an SVG data URI, ready for an `<img src>`."""
    return segno.make(uri, error="m").svg_data_uri(scale=6, border=2, dark="#000", light="#fff")


def matching_step(secret: str, code: str) -> int | None:
    """The time step `code` is valid for (within `WINDOW` of now), or None. A caller that stores the
    last accepted step and refuses anything not newer stops a code being used twice."""
    code = code.replace(" ", "")
    if not (code.isascii() and code.isdigit() and len(code) == 6):
        return None
    totp = pyotp.TOTP(secret)
    current = int(_now() // STEP_SECONDS)
    found: int | None = None
    for step in range(current - WINDOW, current + WINDOW + 1):
        if hmac.compare_digest(totp.at(step * STEP_SECONDS), code) and found is None:
            found = step
    return found


def new_recovery_codes() -> list[str]:
    """Ten codes like `k7m2p-9xqrt`, each usable once."""
    return [
        "-".join("".join(secrets.choice(_RECOVERY_ALPHABET) for _ in range(5)) for _ in range(2))
        for _ in range(RECOVERY_CODE_COUNT)
    ]


def normalize_recovery_code(code: str) -> str:
    return code.replace("-", "").replace(" ", "").lower()


def looks_like_recovery_code(code: str) -> bool:
    return len(normalize_recovery_code(code)) == 10


def hash_recovery_code(code: str) -> str:
    """The codes are random and long, so a plain SHA-256 is enough (there is nothing to guess)."""
    return hashlib.sha256(normalize_recovery_code(code).encode()).hexdigest()
