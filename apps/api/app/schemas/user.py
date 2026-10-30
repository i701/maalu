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
    created_at: datetime


class RegistrationStatus(BaseModel):
    open: bool = Field(description="Whether a new account can be created right now.")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
