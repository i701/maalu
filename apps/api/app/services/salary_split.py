import uuid
from dataclasses import dataclass
from decimal import ROUND_HALF_EVEN, Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import SalaryRuleMode, TransactionType
from app.models import Account, Goal, GoalEntry, SalaryRule, Transaction, User
from app.schemas import (
    GoalEntryCreate,
    SalaryRuleCreate,
    SalaryRuleResponse,
    SalaryRuleUpdate,
    SalarySplitApply,
    SalarySplitItem,
    SalarySplitMade,
    SalarySplitPlan,
    SalarySplitResult,
    TransactionCreate,
)
from app.services.goal import GoalService
from app.services.transaction import TransactionService

QUANTUM = Decimal("0.0001")
ZERO = Decimal(0)


class SalaryRuleNotFoundError(Exception):
    pass


class SalaryRuleTakenError(Exception):
    """That account or goal already has a rule."""


class SalarySplitError(Exception):
    """Something that stops a split. The message is safe to show."""


class SalarySplitAppliedError(Exception):
    """The salary has already been split: undo it to split it again."""


class SalarySplitNotAppliedError(Exception):
    pass


@dataclass
class _Destination:
    """Where a line of the split goes: a transfer into `account`, or, for a goal tracked by hand, an
    amount set aside (`goal` with no account)."""

    name: str
    account: Account | None
    goal: Goal | None


class SalarySplitService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.transactions = TransactionService(db)
        self.goals = GoalService(db)

    # --- rules -------------------------------------------------------------------------------

    @staticmethod
    def _present(rule: SalaryRule) -> SalaryRuleResponse:
        target = rule.account or rule.goal
        assert target is not None
        return SalaryRuleResponse(
            id=rule.id,
            target_type="account" if rule.account_id else "goal",
            account_id=rule.account_id,
            goal_id=rule.goal_id,
            target_name=target.name,
            mode=rule.mode,
            value=rule.value,
            created_at=rule.created_at,
        )

    async def _rules(self, user_id: uuid.UUID) -> list[SalaryRule]:
        stmt = (
            select(SalaryRule)
            .where(SalaryRule.user_id == user_id)
            .order_by(SalaryRule.created_at, SalaryRule.id)
        )
        return list((await self.db.scalars(stmt)).all())

    async def list_rules(self, user_id: uuid.UUID) -> list[SalaryRuleResponse]:
        return [self._present(r) for r in await self._rules(user_id)]

    async def _get_rule(self, user_id: uuid.UUID, rule_id: uuid.UUID) -> SalaryRule:
        rule = await self.db.scalar(
            select(SalaryRule).where(SalaryRule.id == rule_id, SalaryRule.user_id == user_id)
        )
        if rule is None:
            raise SalaryRuleNotFoundError
        return rule

    async def create_rule(self, user_id: uuid.UUID, data: SalaryRuleCreate) -> SalaryRuleResponse:
        if data.account_id is not None:
            account = await self.db.scalar(
                select(Account).where(Account.id == data.account_id, Account.user_id == user_id)
            )
            if account is None:
                raise SalarySplitError("Account not found")
            if account.archived_at is not None:
                raise SalarySplitError(f'"{account.name}" is archived. Unarchive it first')
        else:
            goal = await self.goals.get(user_id, data.goal_id)  # type: ignore[arg-type]
            if goal is None:
                raise SalarySplitError("Goal not found")
        taken = select(SalaryRule.id).where(SalaryRule.user_id == user_id)
        taken = taken.where(
            SalaryRule.account_id == data.account_id
            if data.account_id is not None
            else SalaryRule.goal_id == data.goal_id
        )
        if await self.db.scalar(taken) is not None:
            raise SalaryRuleTakenError
        rule = SalaryRule(
            user_id=user_id,
            account_id=data.account_id,
            goal_id=data.goal_id,
            mode=data.mode,
            value=data.value,
        )
        self.db.add(rule)
        await self.db.flush()
        await self.db.refresh(rule)
        return self._present(rule)

    async def update_rule(
        self, user_id: uuid.UUID, rule_id: uuid.UUID, data: SalaryRuleUpdate
    ) -> SalaryRuleResponse:
        rule = await self._get_rule(user_id, rule_id)
        changes = data.model_dump(exclude_unset=True, exclude_none=True)
        mode = changes.get("mode", rule.mode)
        value = changes.get("value", rule.value)
        if mode is SalaryRuleMode.PERCENT and value > 100:
            raise SalarySplitError("A share can't be more than 100%")
        for field, v in changes.items():
            setattr(rule, field, v)
        await self.db.flush()
        return self._present(rule)

    async def delete_rule(self, user_id: uuid.UUID, rule_id: uuid.UUID) -> None:
        await self.db.delete(await self._get_rule(user_id, rule_id))
        await self.db.flush()

    # --- the split ---------------------------------------------------------------------------

    async def _salary(self, user_id: uuid.UUID, transaction_id: uuid.UUID) -> Transaction:
        salary = await self.transactions.get(user_id, transaction_id)
        if salary is None:
            raise SalaryRuleNotFoundError
        if (
            salary.type is not TransactionType.INCOME
            or not salary.category_is_salary
            or salary.planned
            or salary.account is None
            or salary.refund_of_id is not None
        ):
            raise SalarySplitError("Only a posted income in the Salary category can be split")
        return salary

    async def _destination(
        self, user_id: uuid.UUID, salary: Transaction, target_type: str, target_id: uuid.UUID
    ) -> _Destination:
        """Where money for this target would go, or why it can't."""
        assert salary.account is not None
        if target_type == "account":
            account = await self.db.scalar(
                select(Account).where(Account.id == target_id, Account.user_id == user_id)
            )
            if account is None:
                raise SalarySplitError("That account no longer exists")
            return self._check_account(salary, account, account.name)
        goal = await self.goals.get(user_id, target_id)
        if goal is None:
            raise SalarySplitError("That goal no longer exists")
        if goal.account is not None:  # it follows an account: money for it moves to that account
            return self._check_account(salary, goal.account, goal.name)
        user = await self.db.get(User, user_id)
        assert user is not None
        if salary.currency != user.base_currency:
            raise SalarySplitError(
                f"Goals are kept in {user.base_currency}, but this salary is in {salary.currency}"
            )
        return _Destination(name=goal.name, account=None, goal=goal)

    @staticmethod
    def _check_account(salary: Transaction, account: Account, name: str) -> _Destination:
        assert salary.account is not None
        if account.id == salary.account.id:
            raise SalarySplitError("That is the account the salary arrived in")
        if account.archived_at is not None:
            raise SalarySplitError(f'"{account.name}" is archived')
        if account.currency != salary.account.currency:
            raise SalarySplitError(
                f"{account.name} is in {account.currency}: moving money between currencies "
                "isn't supported here yet"
            )
        return _Destination(name=name, account=account, goal=None)

    @staticmethod
    def _worth(rule: SalaryRule, salary: Transaction) -> Decimal:
        if rule.mode is SalaryRuleMode.FIXED:
            return rule.value
        return (salary.amount * rule.value / 100).quantize(QUANTUM, ROUND_HALF_EVEN)

    async def _made(self, user_id: uuid.UUID, salary: Transaction) -> list[SalarySplitMade]:
        transfers = (
            await self.db.scalars(
                select(Transaction).where(
                    Transaction.user_id == user_id,
                    Transaction.split_from_id == salary.id,
                    Transaction.deleted_at.is_(None),
                )
            )
        ).all()
        entries = (
            await self.db.execute(
                select(GoalEntry, Goal.name)
                .join(Goal, Goal.id == GoalEntry.goal_id)
                .where(Goal.user_id == user_id, GoalEntry.split_from_id == salary.id)
            )
        ).all()
        made = [
            SalarySplitMade(
                kind="transfer",
                id=t.id,
                target_name=t.to_account.name if t.to_account else "Account",
                amount=t.amount,
            )
            for t in transfers
        ]
        made += [
            SalarySplitMade(kind="entry", id=e.id, target_name=name, amount=e.amount)
            for e, name in entries
        ]
        return made

    async def plan(self, user_id: uuid.UUID, transaction_id: uuid.UUID) -> SalarySplitPlan:
        """What the rules would send on from this salary, or what a split of it made."""
        salary = await self._salary(user_id, transaction_id)
        assert salary.account is not None
        items: list[SalarySplitItem] = []
        for rule in await self._rules(user_id):
            target_type = "account" if rule.account_id else "goal"
            target_id = rule.account_id or rule.goal_id
            assert target_id is not None
            ok, reason = True, None
            try:
                await self._destination(user_id, salary, target_type, target_id)
            except SalarySplitError as exc:
                ok, reason = False, str(exc)
            items.append(
                SalarySplitItem(
                    rule_id=rule.id,
                    target_type=target_type,
                    target_id=target_id,
                    target_name=(rule.account or rule.goal).name,  # type: ignore[union-attr]
                    amount=self._worth(rule, salary),
                    mode=rule.mode,
                    value=rule.value,
                    ok=ok,
                    reason=reason,
                )
            )
        made = await self._made(user_id, salary)
        total = sum((i.amount for i in items if i.ok), ZERO)
        return SalarySplitPlan(
            salary_id=salary.id,
            amount=salary.amount,
            currency=salary.currency,
            account_id=salary.account.id,
            account_name=salary.account.name,
            applied=bool(made),
            items=items,
            total=total,
            left=salary.amount - total,
            over=total > salary.amount,
            made=made,
        )

    async def apply(
        self, user_id: uuid.UUID, transaction_id: uuid.UUID, data: SalarySplitApply
    ) -> SalarySplitResult:
        """Make the split the user confirmed: a transfer into each account, an amount set aside for
        each goal tracked by hand. Nothing is trusted from the request but the targets and amounts:
        every line is checked again, and the lines may not add up to more than the salary."""
        salary = await self._salary(user_id, transaction_id)
        assert salary.account is not None
        if await self._made(user_id, salary):
            raise SalarySplitAppliedError
        seen: set[tuple[str, uuid.UUID]] = set()
        planned: list[tuple[_Destination, Decimal]] = []
        for line in data.items:
            key = (line.target_type, line.target_id)
            if key in seen:
                raise SalarySplitError("Each account or goal can only appear once")
            seen.add(key)
            destination = await self._destination(user_id, salary, line.target_type, line.target_id)
            planned.append((destination, line.amount))
        if sum((a for _d, a in planned), ZERO) > salary.amount:
            raise SalarySplitError("The lines add up to more than the salary")

        transfers = entries = 0
        for destination, amount in planned:
            if destination.account is not None:
                made = await self.transactions.create(
                    user_id,
                    TransactionCreate(
                        type=TransactionType.TRANSFER,
                        amount=amount,
                        account_id=salary.account.id,
                        to_account_id=destination.account.id,
                        transaction_date=salary.transaction_date,
                        description=f"From salary: {destination.name}",
                    ),
                )
                made.split_from_id = salary.id
                transfers += 1
            else:
                assert destination.goal is not None
                entry = await self.goals.add_entry(
                    destination.goal,
                    GoalEntryCreate(
                        amount=amount, entry_date=salary.transaction_date, note="From salary"
                    ),
                )
                entry.split_from_id = salary.id
                entries += 1
        await self.db.flush()
        return SalarySplitResult(transfers=transfers, entries=entries)

    async def undo(self, user_id: uuid.UUID, transaction_id: uuid.UUID) -> None:
        """Take the split back: its transfers go to the trash and its set-asides are removed."""
        salary = await self._salary(user_id, transaction_id)
        made = await self._made(user_id, salary)
        if not made:
            raise SalarySplitNotAppliedError
        transfer_ids = [m.id for m in made if m.kind == "transfer"]
        if transfer_ids:
            await self.transactions.bulk_trash(user_id, transfer_ids)
        for m in made:
            if m.kind == "entry":
                entry = await self.db.get(GoalEntry, m.id)
                if entry is not None:
                    await self.db.delete(entry)
        await self.db.flush()
