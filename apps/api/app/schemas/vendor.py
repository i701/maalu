import uuid
from datetime import datetime
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.schemas.category import CategoryName
from app.schemas.tag import TagNames, TagRef
from app.schemas.types import CurrencyCode

VendorName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class _VendorDetails(BaseModel):
    address: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] | None = None
    is_local: bool | None = None
    currency: CurrencyCode | None = None
    contact: Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)] | None = None

    @field_validator("address", "contact")
    @classmethod
    def _blank_to_none(cls, v: str | None) -> str | None:
        return v or None


class VendorCreate(_VendorDetails):
    name: VendorName
    default_category: CategoryName | None = Field(
        default=None, description="By name: found or created. Pre-filled when you pick the vendor."
    )
    default_tags: TagNames = Field(
        default_factory=list, description="By name: found or created. Pre-filled likewise."
    )


class VendorUpdate(_VendorDetails):
    """Partial update: only provided fields change. Send null to clear an optional field."""

    name: VendorName | None = None
    default_category: CategoryName | None = Field(
        default=None, description="Explicit null clears it."
    )
    default_tags: TagNames | None = Field(
        default=None, description="Replaces the list. An empty list or null clears it."
    )

    @field_validator("name")
    @classmethod
    def _name_not_null(cls, v: str | None) -> str | None:
        if v is None:
            raise ValueError("name cannot be null")
        return v


class VendorMerge(BaseModel):
    into_id: uuid.UUID = Field(description="The vendor that takes over everything in this one")


class VendorResponse(_VendorDetails):
    # Every field is always sent (null when empty), so the schema says so: clients can then rely on
    # the keys being there instead of treating them as optional.
    model_config = ConfigDict(
        from_attributes=True, json_schema_serialization_defaults_required=True
    )

    id: uuid.UUID
    name: str
    default_category: str | None
    default_tags: list[TagRef]
    created_at: datetime


class VendorRef(BaseModel):
    """Link a vendor by id (existing) or by name (found or created). Not both."""

    vendor_id: uuid.UUID | None = None
    vendor_name: VendorName | None = None

    @model_validator(mode="after")
    def _one_vendor_ref(self):
        if self.vendor_id is not None and self.vendor_name is not None:
            raise ValueError("Provide either vendor_id or vendor_name, not both")
        return self
