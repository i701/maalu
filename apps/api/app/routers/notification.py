import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.dependencies import CurrentUserId, NotificationServiceDep
from app.pagination import PageDep, set_total
from app.schemas import NotificationResponse, UnreadCount

router = APIRouter(prefix="/notifications", tags=["notifications"])

_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    user_id: CurrentUserId,
    service: NotificationServiceDep,
    response: Response,
    page: PageDep,
    unread: Annotated[bool, Query(description="Only the ones not read yet")] = False,
):
    """Your notifications, newest first (it first looks for new ones, at most every few minutes).
    The total is in `X-Total-Count`."""
    await service.sync(user_id)
    set_total(response, await service.count_for_user(user_id, unread=unread))
    return await service.list_for_user(user_id, unread=unread, limit=page.limit, offset=page.offset)


# Declared before "/{notification_id}" so these are not parsed as an id.
@router.get("/unread-count", response_model=UnreadCount)
async def unread_count(user_id: CurrentUserId, service: NotificationServiceDep):
    """How many are unread, for the badge on the bell."""
    await service.sync(user_id)
    return UnreadCount(count=await service.count_for_user(user_id, unread=True))


@router.post("/read-all", response_model=UnreadCount)
async def read_all(user_id: CurrentUserId, service: NotificationServiceDep):
    """Mark everything read. Answers with the new unread count (zero)."""
    await service.mark_all_read(user_id)
    return UnreadCount(count=0)


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def read_notification(
    notification_id: uuid.UUID, user_id: CurrentUserId, service: NotificationServiceDep
):
    notification = await service.get(user_id, notification_id)
    if notification is None:
        raise _NOT_FOUND
    return await service.mark_read(notification)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: uuid.UUID, user_id: CurrentUserId, service: NotificationServiceDep
):
    """Dismiss one for good: it is hidden and the event it was about is not announced again."""
    notification = await service.get(user_id, notification_id)
    if notification is None:
        raise _NOT_FOUND
    await service.dismiss(notification)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
