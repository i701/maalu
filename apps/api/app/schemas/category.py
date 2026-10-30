import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.enums import AccentColor

CategoryName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]


class CategoryCreate(BaseModel):
    name: CategoryName
    color: AccentColor | None = Field(
        default=None, description="One of the accent colours. Left out, the one you use least."
    )
    parent_id: uuid.UUID | None = Field(
        default=None,
        description="Makes this a sub-category of that top-level category. One level only.",
    )


class CategoryUpdate(BaseModel):
    """Partial update: only the fields sent change. A rename carries to every transaction, item and
    subscription in the category. `parent_id: null` makes it a top-level category again."""

    name: CategoryName | None = None
    color: AccentColor | None = None
    parent_id: uuid.UUID | None = Field(
        default=None,
        description="Its parent (a top-level category without a parent of its own). Explicit "
        "null removes the parent. A category with sub-categories can't have one.",
    )

    @field_validator("name", "color")
    @classmethod
    def _not_null(cls, v):
        # Only runs when the field is sent: omitting it is fine, null is not.
        if v is None:
            raise ValueError("cannot be null")
        return v


class CategoryMerge(BaseModel):
    into_id: uuid.UUID = Field(description="The category that takes over everything in this one")


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    color: str = Field(description="One of the accent colours")
    parent_id: uuid.UUID | None = Field(default=None, description="Set on a sub-category")
    parent: str | None = Field(default=None, description="The parent's name")
    child_count: int = Field(default=0, description="Its sub-categories")
    created_at: datetime
    transaction_count: int = Field(
        default=0, description="Transactions that are in this category, or have an item that is"
    )
    subscription_count: int = 0
    budget_line_count: int = 0
