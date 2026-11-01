import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LinkCreate(BaseModel):
    url: str = Field(
        min_length=1,
        max_length=2000,
        description="A web address. http or https only; https:// is added when no scheme is typed.",
    )
    title: str | None = Field(default=None, max_length=200)


class LinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    transaction_id: uuid.UUID
    url: str
    title: str | None
    created_at: datetime
