import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

NotificationKind = Literal[
    "payment_due",
    "payment_overdue",
    "installments_done",
    "budget_warning",
    "budget_over",
    "goal_reached",
    "split_waiting",
    "money_short",
    "card_due",
    "card_overdue",
    "card_limit",
]


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: NotificationKind
    title: str
    body: str
    link: str | None = Field(description="A page of the app to open for it")
    created_at: datetime
    read_at: datetime | None = Field(description="Null while it is unread")


class UnreadCount(BaseModel):
    count: int
