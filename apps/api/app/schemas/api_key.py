import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

KeyName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Days = Annotated[int, Field(ge=1, le=3650)]


class ApiKeyResponse(BaseModel):
    """A key as listed: everything but the secret (shown once, when made or rotated)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    role: str = Field(description='A named set of scopes, or "custom". `scopes` is what counts.')
    scopes: list[str] = Field(description="What the key may do, as `area:action`.")
    prefix: str = Field(description="The first characters of the secret, to tell keys apart.")
    status: Literal["active", "expired"]
    created_at: datetime
    expires_at: datetime | None = Field(description="Null: it never expires.")
    rotated_at: datetime | None
    grace_until: datetime | None = Field(
        description="After a rotation: until when the previous secret still works."
    )
    last_used_at: datetime | None
    last_used_ip: str | None


class ApiKeyCreate(BaseModel):
    name: KeyName
    role: str | None = Field(
        default=None,
        description="Start from a role's scopes. Ignored when `scopes` is given.",
    )
    scopes: list[str] | None = Field(
        default=None, description="Exactly what the key may do; overrides `role`."
    )
    expires_in_days: Days | None = Field(
        default=90, description="How long it works from now. Null: it never expires."
    )


class ApiKeyUpdate(BaseModel):
    """Only the fields sent change. `expires_in_days` counts from now (extending or shortening it);
    an explicit null makes it never expire."""

    name: KeyName | None = None
    role: str | None = None
    scopes: list[str] | None = None
    expires_in_days: Days | None = None


class ApiKeyRotate(BaseModel):
    grace_hours: Annotated[int, Field(ge=0, le=168)] = Field(
        default=0,
        description="Keep the old secret working this many hours (0: it stops at once), so what "
        "uses it can be switched over without a gap.",
    )


class ApiKeySecret(BaseModel):
    """A key together with its secret. This is the only time the secret exists in the clear."""

    key: ApiKeyResponse
    secret: str


class AreaInfo(BaseModel):
    key: str
    label: str


class RoleInfo(BaseModel):
    key: str
    label: str
    description: str
    scopes: list[str]


class ScopeCatalog(BaseModel):
    areas: list[AreaInfo]
    actions: list[AreaInfo]
    roles: list[RoleInfo]


class WhoAmI(BaseModel):
    """Who is asking: a person signed in, or a key (with what it may do)."""

    kind: Literal["session", "api_key"]
    key_name: str | None
    role: str | None
    scopes: list[str] | None
    expires_at: datetime | None
