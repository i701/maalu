import uuid

from fastapi import APIRouter, HTTPException, Response, status

from app import api_scopes
from app.dependencies import (
    ApiKeyServiceDep,
    CurrentSession,
    CurrentUser,
    PrincipalDep,
)
from app.models import ApiKey
from app.schemas.api_key import (
    ApiKeyCreate,
    ApiKeyResponse,
    ApiKeyRotate,
    ApiKeySecret,
    ApiKeyUpdate,
    AreaInfo,
    RoleInfo,
    ScopeCatalog,
    WhoAmI,
)
from app.services import ApiKeyNotFoundError, ApiKeyRuleError
from app.services.api_key import grace_until, status_of

# Managing keys needs a person signed in: every route here depends on `CurrentSession`, which an API
# key can never satisfy, so a key cannot make a stronger key (and the path rules also refuse it).
router = APIRouter(prefix="/api-keys", tags=["api-keys"])
whoami_router = APIRouter(tags=["api-keys"])

_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "API key not found")


def _present(key: ApiKey) -> ApiKeyResponse:
    return ApiKeyResponse(
        id=key.id,
        name=key.name,
        role=key.role,
        scopes=list(key.scopes),
        prefix=key.prefix,
        status=status_of(key),
        created_at=key.created_at,
        expires_at=key.expires_at,
        rotated_at=key.rotated_at,
        grace_until=grace_until(key),
        last_used_at=key.last_used_at,
        last_used_ip=key.last_used_ip,
    )


@router.get("/scopes", response_model=ScopeCatalog)
async def scope_catalog(_session: CurrentSession):
    """The permissions a key can hold, and the roles that bundle them (for the form)."""
    return ScopeCatalog(
        areas=[AreaInfo(key=k, label=v) for k, v in api_scopes.AREAS.items()],
        actions=[AreaInfo(key=k, label=v) for k, v in api_scopes.ACTIONS.items()],
        roles=[
            RoleInfo(
                key=k, label=r["label"], description=r["description"], scopes=list(r["scopes"])
            )
            for k, r in api_scopes.ROLES.items()
        ],
    )


@router.get("", response_model=list[ApiKeyResponse])
async def list_keys(user: CurrentUser, _session: CurrentSession, service: ApiKeyServiceDep):
    """Your API keys, newest first. A secret is never shown again after it was made."""
    return [_present(k) for k in await service.list_for_user(user.id)]


@router.post("", response_model=ApiKeySecret, status_code=status.HTTP_201_CREATED)
async def create_key(
    data: ApiKeyCreate, user: CurrentUser, _session: CurrentSession, service: ApiKeyServiceDep
):
    """Make a key. Its secret is in the answer, **once**: copy it now."""
    try:
        key, secret = await service.create(
            user.id,
            name=data.name,
            role=data.role,
            scopes=data.scopes,
            expires_in_days=data.expires_in_days,
        )
    except ApiKeyRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    return ApiKeySecret(key=_present(key), secret=secret)


@router.patch("/{key_id}", response_model=ApiKeyResponse)
async def update_key(
    key_id: uuid.UUID,
    data: ApiKeyUpdate,
    user: CurrentUser,
    _session: CurrentSession,
    service: ApiKeyServiceDep,
):
    """Rename a key, change what it may do, or change how long it works (counted from now; an
    explicit null means it never expires). The secret stays the same."""
    try:
        key = await service.get(user.id, key_id)
        key = await service.update(key, data.model_dump(exclude_unset=True))
    except ApiKeyNotFoundError:
        raise _NOT_FOUND from None
    except ApiKeyRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    return _present(key)


@router.post("/{key_id}/rotate", response_model=ApiKeySecret)
async def rotate_key(
    key_id: uuid.UUID,
    data: ApiKeyRotate,
    user: CurrentUser,
    _session: CurrentSession,
    service: ApiKeyServiceDep,
):
    """Replace the secret (the new one is in the answer, once). With a grace period the old secret
    keeps working that many hours, so whatever uses it can be switched over; without one it stops
    at once. The permissions, name and end date are unchanged."""
    try:
        key = await service.get(user.id, key_id)
    except ApiKeyNotFoundError:
        raise _NOT_FOUND from None
    secret = await service.rotate(key, data.grace_hours)
    return ApiKeySecret(key=_present(key), secret=secret)


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_key(
    key_id: uuid.UUID, user: CurrentUser, _session: CurrentSession, service: ApiKeyServiceDep
):
    """Delete a key: it stops working at once."""
    try:
        await service.delete(user.id, key_id)
    except ApiKeyNotFoundError:
        raise _NOT_FOUND from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@whoami_router.get("/whoami", response_model=WhoAmI)
async def whoami(principal: PrincipalDep):
    """Who is asking and, for a key, what it may do: a script can check itself before it starts."""
    if principal.key is None:
        return WhoAmI(kind="session", key_name=None, role=None, scopes=None, expires_at=None)
    key = principal.key
    return WhoAmI(
        kind="api_key",
        key_name=key.name,
        role=key.role,
        scopes=list(key.scopes),
        expires_at=key.expires_at,
    )
