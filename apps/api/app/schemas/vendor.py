import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator, model_validator

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


class VendorUpdate(_VendorDetails):
    """Partial update: only provided fields change. Send null to clear an optional field."""

    name: VendorName | None = None

    @field_validator("name")
    @classmethod
    def _name_not_null(cls, v: str | None) -> str | None:
        if v is None:
            raise ValueError("name cannot be null")
        return v


class VendorResponse(_VendorDetails):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
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
