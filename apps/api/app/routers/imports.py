import re
import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from app.dependencies import CurrentUserId, ImportServiceDep
from app.pagination import PageDep, set_total
from app.schemas import (
    BulkResult,
    ImportBatchResponse,
    ImportCommit,
    ImportPreview,
    ImportResult,
)
from app.services import AccountNotFoundError, TransactionRuleError
from app.statements import MAX_STATEMENT_BYTES, StatementError

router = APIRouter(prefix="/imports", tags=["imports"])

_ACCOUNT_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Import not found")


@router.post(
    "/preview",
    response_model=ImportPreview,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "application/octet-stream": {"schema": {"type": "string", "format": "binary"}}
            },
        }
    },
)
async def preview_import(
    request: Request,
    user_id: CurrentUserId,
    service: ImportServiceDep,
    account_id: Annotated[uuid.UUID, Query(description="The account the statement belongs to")],
):
    """Read a CSV statement (BML or MIB; send the file as the request body) and say what is in it,
    what Maalu already knows about each row and which rows are already recorded. Nothing is
    saved: send the rows you want to `POST /imports`."""
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > MAX_STATEMENT_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "That file is too large")
    body = await request.body()
    try:
        return await service.preview(user_id, account_id, body)
    except AccountNotFoundError:
        raise _ACCOUNT_NOT_FOUND from None
    except (StatementError, TransactionRuleError) as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None


@router.post("", response_model=ImportResult, status_code=status.HTTP_201_CREATED)
async def import_rows(data: ImportCommit, user_id: CurrentUserId, service: ImportServiceDep):
    """Create the transactions you confirmed, as one batch you can undo. Rows already imported
    (same bank reference) and rows that cannot be made are skipped and listed with the reason,
    never failing the rest. The names you matched to a vendor or to one of your own accounts are
    remembered for the next statement."""
    try:
        batch, skipped = await service.commit(user_id, data)
    except AccountNotFoundError:
        raise _ACCOUNT_NOT_FOUND from None
    except TransactionRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    return ImportResult(batch=(await service.present([batch]))[0], skipped=skipped)


@router.get("", response_model=list[ImportBatchResponse])
async def list_imports(
    user_id: CurrentUserId, service: ImportServiceDep, response: Response, page: PageDep
):
    """Earlier imports, newest first. The total is in `X-Total-Count`."""
    set_total(response, await service.count_for_user(user_id))
    batches = await service.list_for_user(user_id, limit=page.limit, offset=page.offset)
    return await service.present(batches)


@router.get(
    "/{batch_id}/report",
    response_class=Response,
    responses={200: {"content": {"text/csv": {}}, "description": "The report, as a CSV file"}},
)
async def import_report(batch_id: uuid.UUID, user_id: CurrentUserId, service: ImportServiceDep):
    """A CSV of every row of that import and what became of it: imported, skipped (already
    there), left out by you, or failed with the reason."""
    batch = await service.get(user_id, batch_id)
    if batch is None:
        raise _NOT_FOUND
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", batch.filename.rsplit(".", 1)[0]).strip("-") or "import"
    return Response(
        await service.report(batch),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{stem}-report.csv"'},
    )


@router.delete("/{batch_id}", response_model=BulkResult)
async def undo_import(batch_id: uuid.UUID, user_id: CurrentUserId, service: ImportServiceDep):
    """Undo an import: everything it made that is still there goes to the trash (so it can be
    restored from there). Transactions you already deleted are left alone."""
    batch = await service.get(user_id, batch_id)
    if batch is None:
        raise _NOT_FOUND
    return await service.undo(batch)
