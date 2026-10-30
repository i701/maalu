from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.dependencies import BackupServiceDep, CurrentUser
from app.schemas import BackupRestored
from app.services import BackupFormatError, BackupNotEmptyError

router = APIRouter(prefix="/backup", tags=["backup"])

# A backup is one JSON file held in memory, so cap what a restore will read.
MAX_BACKUP_BYTES = 200 * 1024 * 1024


@router.get(
    "",
    response_class=Response,
    responses={200: {"content": {"application/json": {}}, "description": "The backup file"}},
)
async def download_backup(user: CurrentUser, service: BackupServiceDep) -> Response:
    """Everything you own (accounts, transactions, categories, tags, budgets, goals, templates...)
    as one JSON file. It holds no password, sessions or two-factor secret, but it is your
    financial data in plain text: keep it somewhere safe."""
    stamp = datetime.now(UTC).strftime("%Y-%m-%d")
    return Response(
        await service.export(user),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="maalu-backup-{stamp}.json"'},
    )


@router.post(
    "/restore",
    response_model=BackupRestored,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"application/json": {"schema": {"type": "object"}}},
        }
    },
)
async def restore_backup(
    request: Request, user: CurrentUser, service: BackupServiceDep
) -> BackupRestored:
    """Restore a backup file (send its contents as the request body) into this account. The account
    must be empty (409 otherwise). Every row gets a new id, and your base currency becomes the
    backup's. Either everything is restored or, on any problem, nothing."""
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > MAX_BACKUP_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "The backup file is too large")
    body = await request.body()
    if len(body) > MAX_BACKUP_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "The backup file is too large")
    try:
        return BackupRestored(restored=await service.restore(user, body))
    except BackupNotEmptyError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This account already has data. Restore into a new, empty account",
        ) from None
    except BackupFormatError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
