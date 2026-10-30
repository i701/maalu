import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.types import CurrencyCode


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    base_currency: CurrencyCode


class UserUpdate(BaseModel):
    """Partial update of your settings: only provided fields change."""

    default_account_id: uuid.UUID | None = Field(
        default=None,
        description="The account a new transaction starts in. Explicit null clears it.",
    )
    start_from_template: bool = Field(
        default=True,
        description="Whether the transaction form offers to start from a template.",
    )


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    base_currency: str
    default_account_id: uuid.UUID | None
    start_from_template: bool
    two_factor_enabled: bool = Field(
        description="Whether signing in also needs a code from an authenticator app."
    )
    created_at: datetime


class RegistrationStatus(BaseModel):
    open: bool = Field(description="Whether a new account can be created right now.")


class Token(BaseModel):
    access_token: str | None = Field(
        default=None, description="The bearer token. Missing while a second factor is still needed."
    )
    token_type: str = "bearer"
    two_factor_required: bool = Field(
        default=False,
        description="The password was right but a code is needed: send it with `challenge_token` "
        "to `/auth/login/2fa`.",
    )
    challenge_token: str | None = Field(
        default=None, description="Proof of the right password, valid for five minutes."
    )


class TwoFactorChallenge(BaseModel):
    challenge_token: str
    code: str = Field(
        min_length=6, max_length=32, description="An authenticator code, or a recovery code."
    )


class TwoFactorCode(BaseModel):
    code: str = Field(min_length=6, max_length=32)


class TwoFactorConfirm(BaseModel):
    """Proof it is you, for turning two-factor off or making new recovery codes."""

    password: str = Field(max_length=128)
    code: str = Field(
        min_length=6, max_length=32, description="An authenticator code, or a recovery code."
    )


class TwoFactorSetup(BaseModel):
    secret: str = Field(description="The key to type into an authenticator app by hand.")
    otpauth_uri: str
    qr_data_uri: str = Field(description="The QR code of `otpauth_uri`, as an SVG data URI.")


class RecoveryCodes(BaseModel):
    recovery_codes: list[str] = Field(
        description="Shown once. Each works once in place of an authenticator code."
    )


class SessionResponse(BaseModel):
    """One sign-in of yours, for the list of where you are signed in."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime = Field(description="When it ends if it is not used again.")
    user_agent: str | None = Field(
        description="The browser it signed in from, as it reported itself."
    )
    ip_address: str | None
    current: bool = Field(
        default=False, description="Whether this is the session making the request."
    )


class EndedSessions(BaseModel):
    ended: int
