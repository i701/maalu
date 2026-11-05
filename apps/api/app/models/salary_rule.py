import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import SalaryRuleMode
from app.models.account import Account
from app.models.base import Base
from app.models.goal import Goal


class SalaryRule(Base):
    """What a salary sends on when it arrives: a share (percent) or a fixed amount of it for one
    account or one goal. Each target has at most one rule. Nothing happens by itself: the rules
    make the split Maalu proposes when a Salary income is posted."""

    __tablename__ = "salary_rules"
    __table_args__ = (
        CheckConstraint(
            "(account_id IS NOT NULL AND goal_id IS NULL) "
            "OR (account_id IS NULL AND goal_id IS NOT NULL)",
            name="target_is_account_or_goal",
        ),
        UniqueConstraint("user_id", "account_id", name="uq_salary_rules_user_id_account_id"),
        UniqueConstraint("user_id", "goal_id", name="uq_salary_rules_user_id_goal_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # Deleting the account or goal deletes the rule with it.
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="CASCADE"), default=None
    )
    account: Mapped[Account | None] = relationship(lazy="joined")
    goal_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("goals.id", ondelete="CASCADE"), default=None
    )
    goal: Mapped[Goal | None] = relationship(lazy="joined")
    mode: Mapped[SalaryRuleMode] = mapped_column(
        Enum(
            SalaryRuleMode,
            native_enum=False,
            length=32,
            create_constraint=False,
            values_callable=lambda e: [m.value for m in e],
        )
    )
    # A percentage (0 to 100) of the salary, or an amount in the salary's currency.
    value: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    # Off (the default): this line waits for approval on the Pending screen. On: it is made as soon
    # as a salary is posted, without asking.
    auto: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
