import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

CategoryName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]


class CategoryCreate(BaseModel):
    name: CategoryName


class CategoryUpdate(BaseModel):
    """Rename. Every transaction, item and subscription in the category follows."""

    name: CategoryName


class CategoryMerge(BaseModel):
    into_id: uuid.UUID = Field(description="The category that takes over everything in this one")


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    created_at: datetime
    transaction_count: int = Field(
        default=0, description="Transactions that are in this category, or have an item that is"
    )
    subscription_count: int = 0
    budget_line_count: int = 0
