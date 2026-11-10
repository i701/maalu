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


class EmailStatus(BaseModel):
    """Whether this server can send email, so Settings can say so instead of letting a switch do
    nothing."""

    configured: bool = Field(description="SMTP_HOST and SMTP_FROM are set on the server.")
    sender: str | None = Field(description="The address emails come from, when configured.")


class UnreadCount(BaseModel):
    count: int
