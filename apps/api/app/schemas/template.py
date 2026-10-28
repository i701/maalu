import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.enums import PaymentMethod, TransactionType
from app.schemas.account import AccountRef
from app.schemas.tag import TagRef
from app.schemas.transaction import Amount, Category, TagNames
from app.schemas.types import CurrencyCode
from app.schemas.vendor import VendorRef

TemplateName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]


class TemplateCreate(VendorRef):
    """Everything but the name and type is optional: a template pre-fills whatever it has."""

    name: TemplateName
    type: TransactionType
    amount: Amount | None = Field(default=None, description="Left out when it differs every time")
    payment_method: PaymentMethod = PaymentMethod.OTHER
    category: Category | None = Field(default=None, description="By name: found or created")
    description: str | None = None
    tags: TagNames = Field(default_factory=list, description="By name: found or created")
    account_id: uuid.UUID | None = Field(
        default=None, description="Its currency is used. For a transfer: the account it leaves."
    )
    to_account_id: uuid.UUID | None = Field(default=None, description="Transfers only")
    currency: CurrencyCode | None = Field(
        default=None, description="Defaults to your base currency; ignored with an account"
    )


class TemplateUpdate(BaseModel):
    """Rename. To change what a template fills in, delete it and save it again."""

    name: TemplateName


class TemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: TransactionType
    amount: Decimal | None
    currency: str
    payment_method: PaymentMethod
    category: str | None
    vendor: str | None
    description: str | None
    account: AccountRef | None
    to_account: AccountRef | None
    tags: list[TagRef]
    created_at: datetime
