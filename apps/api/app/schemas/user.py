import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.types import CurrencyCode


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    base_currency: CurrencyCode


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    base_currency: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
