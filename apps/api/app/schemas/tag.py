import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

TagName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]

# How a filter by several tags matches: any one of them, or every one.
TagMatch = Literal["any", "all"]

# The most tags one transaction or template can have.
MAX_TAGS = 10

# Tag names on a request.
TagNames = Annotated[list[TagName], Field(max_length=MAX_TAGS)]


class TagCreate(BaseModel):
    name: TagName


class TagUpdate(BaseModel):
    """Rename. Every transaction and template with the tag follows."""

    name: TagName


class TagMerge(BaseModel):
    into_id: uuid.UUID = Field(description="The tag that takes over everything in this one")


class TagRef(BaseModel):
    """Compact form embedded in transaction and template responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    color: str = Field(description="One of the accent colour names: blue, green, orange...")


class TagResponse(TagRef):
    created_at: datetime
    transaction_count: int = Field(default=0, description="Transactions (not in the trash) with it")
    template_count: int = 0
