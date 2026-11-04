import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.enums import SalaryRuleMode

Value = Annotated[Decimal, Field(gt=0, max_digits=19, decimal_places=4)]
Amount = Annotated[Decimal, Field(gt=0, max_digits=19, decimal_places=4)]
TargetType = Literal["account", "goal"]


def _check_value(mode: SalaryRuleMode | None, value: Decimal | None) -> None:
    if mode is SalaryRuleMode.PERCENT and value is not None and value > 100:
        raise ValueError("A share can't be more than 100%")


class SalaryRuleCreate(BaseModel):
    account_id: uuid.UUID | None = Field(
        default=None, description="Send money to this account (a transfer from the salary's)"
    )
    goal_id: uuid.UUID | None = Field(
        default=None, description="Set money aside for this goal (or move it to its account)"
    )
    mode: SalaryRuleMode
    value: Value = Field(
        description="A percentage of the salary (up to 100), or an amount in its currency"
    )

    @model_validator(mode="after")
    def _one_target(self) -> Self:
        if (self.account_id is None) == (self.goal_id is None):
            raise ValueError("Choose an account or a goal, not both and not neither")
        _check_value(self.mode, self.value)
        return self


class SalaryRuleUpdate(BaseModel):
    """Partial update: how much a rule sends. The target can't change; delete the rule instead."""

    mode: SalaryRuleMode | None = None
    value: Value | None = None


class SalaryRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    target_type: TargetType
    account_id: uuid.UUID | None
    goal_id: uuid.UUID | None
    target_name: str
    mode: SalaryRuleMode
    value: Decimal
    created_at: datetime


class SalarySplitItem(BaseModel):
    """One line of the proposed split."""

    rule_id: uuid.UUID
    target_type: TargetType
    target_id: uuid.UUID
    target_name: str
    amount: Decimal = Field(description="What this rule works out to, in the salary's currency")
    mode: SalaryRuleMode
    value: Decimal
    ok: bool = Field(description="False when it can't be made (see `reason`)")
    reason: str | None = None


class SalarySplitMade(BaseModel):
    kind: Literal["transfer", "entry"]
    id: uuid.UUID
    target_name: str
    amount: Decimal


class SalarySplitPlan(BaseModel):
    """What a salary's rules would send on, or, once it has been split, what was made."""

    salary_id: uuid.UUID
    amount: Decimal
    currency: str
    account_id: uuid.UUID
    account_name: str
    applied: bool = Field(description="True once the split has been made (undo it to redo it)")
    items: list[SalarySplitItem]
    total: Decimal = Field(description="The lines that can be made, added up")
    left: Decimal = Field(description="What stays in the account (salary less total)")
    over: bool = Field(description="True when the lines add up to more than the salary")
    made: list[SalarySplitMade] = Field(default_factory=list, description="What a split made")


class SalarySplitLine(BaseModel):
    target_type: TargetType
    target_id: uuid.UUID
    amount: Amount


class SalarySplitApply(BaseModel):
    items: list[SalarySplitLine] = Field(min_length=1, max_length=50)


class SalarySplitResult(BaseModel):
    transfers: int = Field(description="Transfers made between accounts")
    entries: int = Field(description="Amounts set aside for goals tracked by hand")
