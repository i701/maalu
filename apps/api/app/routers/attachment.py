import uuid
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from app.config import settings
from app.dependencies import AttachmentServiceDep, CurrentUserId, LinkServiceDep
from app.schemas import AttachmentResponse, LinkCreate, LinkResponse
from app.services import AttachmentNotFoundError, AttachmentRuleError, AttachmentTooLargeError

router = APIRouter(tags=["attachments"])


def _not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, "Attachment not found")


@router.get("/transactions/{transaction_id}/attachments", response_model=list[AttachmentResponse])
async def list_attachments(
    transaction_id: uuid.UUID, user_id: CurrentUserId, service: AttachmentServiceDep
):
    """The files attached to a transaction, oldest first."""
    try:
        return await service.list_for_transaction(user_id, transaction_id)
    except AttachmentNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found") from None


@router.post(
    "/transactions/{transaction_id}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "application/octet-stream": {"schema": {"type": "string", "format": "binary"}}
            },
        }
    },
)
async def upload_attachment(
    transaction_id: uuid.UUID,
    request: Request,
    user_id: CurrentUserId,
    service: AttachmentServiceDep,
    filename: Annotated[str, Query(max_length=1000, description="The file's name, for display")],
):
    """Attach a file (the request body is the file itself): a JPEG, PNG, WebP or PDF, up to the size
    limit, at most ten per transaction. The type is read from the bytes, not from any header."""
    limit = settings.attachment_max_bytes
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > limit:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "The file is too large")
    body = await request.body()
    try:
        return await service.upload(user_id, transaction_id, filename, body)
    except AttachmentNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found") from None
    except AttachmentTooLargeError as exc:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, str(exc)) from None
    except AttachmentRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None


@router.get(
    "/attachments/{attachment_id}",
    response_class=Response,
    responses={200: {"content": {"application/octet-stream": {}}, "description": "The file"}},
)
async def download_attachment(
    attachment_id: uuid.UUID,
    user_id: CurrentUserId,
    service: AttachmentServiceDep,
    download: bool = False,
) -> Response:
    """The file itself, shown in the browser unless `download` is true."""
    try:
        row, body = await service.read(user_id, attachment_id)
    except AttachmentNotFoundError:
        raise _not_found() from None
    disposition = "attachment" if download else "inline"
    return Response(
        body,
        media_type=row.mime_type,
        headers={
            "Content-Disposition": f"{disposition}; filename*=UTF-8''{quote(row.filename)}",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=3600",
        },
    )


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    attachment_id: uuid.UUID, user_id: CurrentUserId, service: AttachmentServiceDep
):
    try:
        await service.delete(user_id, attachment_id)
    except AttachmentNotFoundError:
        raise _not_found() from None


@router.get("/transactions/{transaction_id}/links", response_model=list[LinkResponse])
async def list_links(transaction_id: uuid.UUID, user_id: CurrentUserId, service: LinkServiceDep):
    """The web links attached to a transaction, oldest first."""
    try:
        return await service.list_for_transaction(user_id, transaction_id)
    except AttachmentNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found") from None


@router.post(
    "/transactions/{transaction_id}/links",
    response_model=LinkResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_link(
    transaction_id: uuid.UUID, data: LinkCreate, user_id: CurrentUserId, service: LinkServiceDep
):
    """Attach a web link (an online receipt or order page). http and https only; the address is
    stored as given and never fetched. At most ten per transaction."""
    try:
        return await service.add(user_id, transaction_id, data.url, data.title)
    except AttachmentNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found") from None
    except AttachmentRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None


@router.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_link(link_id: uuid.UUID, user_id: CurrentUserId, service: LinkServiceDep):
    try:
        await service.delete(user_id, link_id)
    except AttachmentNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link not found") from None
