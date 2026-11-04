import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.enums import AccentColor, CategoryKind

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
    kind: CategoryKind | None = Field(
        default=None, description="Whether spending here is a need or a want. Left out: not sorted."
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
    kind: CategoryKind | None = Field(
        default=None,
        description="Need or want. Explicit null clears it (not sorted).",
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


class CategoryKindBulk(BaseModel):
    ids: list[uuid.UUID] = Field(min_length=1, max_length=500)
    kind: CategoryKind | None = Field(
        default=None, description="Need or want for all of them. Null clears it."
    )


class CategoryKindResult(BaseModel):
    updated: int = Field(description="Categories that were set (yours, found)")


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    color: str = Field(description="One of the accent colours")
    kind: CategoryKind | None = Field(
        default=None, description="Its own need or want; null when not sorted"
    )
    effective_kind: CategoryKind | None = Field(
        default=None, description="Its kind, or its parent's when it has none of its own"
    )
    parent_id: uuid.UUID | None = Field(default=None, description="Set on a sub-category")
    parent: str | None = Field(default=None, description="The parent's name")
    child_count: int = Field(default=0, description="Its sub-categories")
    created_at: datetime
    transaction_count: int = Field(
        default=0, description="Transactions that are in this category, or have an item that is"
    )
    subscription_count: int = 0
    budget_line_count: int = 0
