import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import ROUND_HALF_EVEN, Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import SalaryRuleMode, SplitTaskStatus, TransactionType
from app.models import (
    Account,
    Goal,
    GoalEntry,
    SalaryRule,
    SalarySplitTask,
    Transaction,
    User,
)
from app.schemas import (
    GoalEntryCreate,
    SalaryRuleCreate,
    SalaryRuleResponse,
    SalaryRuleUpdate,
    SalarySplitApply,
    SalarySplitItem,
    SalarySplitLine,
    SalarySplitMade,
    SalarySplitPlan,
    SalarySplitResult,
    SalarySplitTaskResponse,
    TransactionCreate,
)
from app.services import notification
from app.services.errors import TransactionRuleError
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


@dataclass
class _MadeRow:
    """One thing a split made: a transfer into `account_id`, or an amount set aside (`goal_id`)."""

    kind: str
    id: uuid.UUID
    name: str
    amount: Decimal
    account_id: uuid.UUID | None = None
    goal_id: uuid.UUID | None = None


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
            auto=rule.auto,
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
            auto=data.auto,
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

    async def _made_rows(self, user_id: uuid.UUID, salary: Transaction) -> list[_MadeRow]:
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
        rows = [
            _MadeRow(
                kind="transfer",
                id=t.id,
                name=t.to_account.name if t.to_account else "Account",
                amount=t.amount,
                account_id=t.to_account_id,
            )
            for t in transfers
        ]
        rows += [
            _MadeRow(kind="entry", id=e.id, name=name, amount=e.amount, goal_id=e.goal_id)
            for e, name in entries
        ]
        return rows

    async def _made(self, user_id: uuid.UUID, salary: Transaction) -> list[SalarySplitMade]:
        return [
            SalarySplitMade(kind=m.kind, id=m.id, target_name=m.name, amount=m.amount)
            for m in await self._made_rows(user_id, salary)
        ]

    @staticmethod
    def _is_done(destination: _Destination, made: list[_MadeRow]) -> bool:
        """Whether a line's money was already sent: its account got a transfer, or its goal an
        amount set aside."""
        if destination.account is not None:
            return any(m.account_id == destination.account.id for m in made)
        return destination.goal is not None and any(m.goal_id == destination.goal.id for m in made)

    async def plan(self, user_id: uuid.UUID, transaction_id: uuid.UUID) -> SalarySplitPlan:
        """What the rules would send on from this salary, or what a split of it made."""
        salary = await self._salary(user_id, transaction_id)
        assert salary.account is not None
        items: list[SalarySplitItem] = []
        made_rows = await self._made_rows(user_id, salary)
        for rule in await self._rules(user_id):
            target_type = "account" if rule.account_id else "goal"
            target_id = rule.account_id or rule.goal_id
            assert target_id is not None
            ok, reason, done = True, None, False
            try:
                destination = await self._destination(user_id, salary, target_type, target_id)
                done = self._is_done(destination, made_rows)
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
                    auto=rule.auto,
                    done=done,
                )
            )
        made = [
            SalarySplitMade(kind=m.kind, id=m.id, target_name=m.name, amount=m.amount)
            for m in made_rows
        ]
        made_total = sum((m.amount for m in made), ZERO)
        total = sum((i.amount for i in items if i.ok and not i.done), ZERO)
        return SalarySplitPlan(
            salary_id=salary.id,
            title=salary.description or salary.category,
            salary_date=salary.transaction_date,
            amount=salary.amount,
            currency=salary.currency,
            account_id=salary.account.id,
            account_name=salary.account.name,
            applied=bool(made),
            complete=bool(items) and all(i.done for i in items),
            items=items,
            total=total,
            left=salary.amount - made_total - total,
            over=made_total + total > salary.amount,
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
        made_rows = await self._made_rows(user_id, salary)
        seen: set[tuple[str, uuid.UUID]] = set()
        planned: list[tuple[_Destination, Decimal]] = []
        already: list[str] = []
        for line in data.items:
            key = (line.target_type, line.target_id)
            if key in seen:
                raise SalarySplitError("Each account or goal can only appear once")
            seen.add(key)
            destination = await self._destination(user_id, salary, line.target_type, line.target_id)
            if self._is_done(destination, made_rows):
                already.append(destination.name)
                continue
            planned.append((destination, line.amount))
        if already and not planned:
            raise SalarySplitAppliedError
        if already:
            raise SalarySplitError(f'"{already[0]}" has already been made. Take it off the list')
        made_total = sum((m.amount for m in made_rows), ZERO)
        if made_total + sum((a for _d, a in planned), ZERO) > salary.amount:
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
        await self._settle_task(user_id, salary)
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
        if await self._rules(user_id):  # undone: it is waiting for approval again
            await self._reopen_task(user_id, salary)

    # --- pending approvals -------------------------------------------------------------------

    @staticmethod
    def _splittable(t: Transaction) -> bool:
        """A posted income in the Salary category, in an account: what a split can be made from."""
        return (
            t.type is TransactionType.INCOME
            and t.category_is_salary
            and not t.planned
            and t.account is not None
            and t.refund_of_id is None
            and t.deleted_at is None
        )

    async def _task(self, user_id: uuid.UUID, transaction_id: uuid.UUID) -> SalarySplitTask | None:
        return await self.db.scalar(
            select(SalarySplitTask).where(
                SalarySplitTask.user_id == user_id,
                SalarySplitTask.transaction_id == transaction_id,
            )
        )

    async def _reopen_task(self, user_id: uuid.UUID, salary: Transaction) -> None:
        task = await self._task(user_id, salary.id)
        if task is None:
            task = SalarySplitTask(user_id=user_id, transaction_id=salary.id)
            self.db.add(task)
        task.status = SplitTaskStatus.PENDING
        task.resolved_at = None
        await self.db.flush()

    async def _settle_task(self, user_id: uuid.UUID, salary: Transaction) -> None:
        """After lines were made: the task is done when nothing is left that can be made."""
        task = await self._task(user_id, salary.id)
        if task is None or task.status is SplitTaskStatus.DISMISSED:
            return
        plan = await self.plan(user_id, salary.id)
        left = any(i.ok and not i.done for i in plan.items)
        task.status = SplitTaskStatus.PENDING if left else SplitTaskStatus.DONE
        task.resolved_at = None if left else datetime.now(UTC)
        await self.db.flush()

    async def on_posted(self, user_id: uuid.UUID, salary: Transaction) -> None:
        """A transaction was created, posted or changed. When it is a posted salary and the user has
        rules, queue its split for approval (once per salary), and make at once the lines whose
        rule is set to move automatically. Never raises: a salary must be saved whatever happens
        here."""
        if not self._splittable(salary):
            return
        rules = await self._rules(user_id)
        if not rules or await self._task(user_id, salary.id) is not None:
            return
        self.db.add(SalarySplitTask(user_id=user_id, transaction_id=salary.id))
        # the next look for notifications should not wait out its throttle: this is news
        notification.data_changed(user_id)
        await self.db.flush()
        if not any(r.auto for r in rules):
            return
        try:
            async with self.db.begin_nested():
                plan = await self.plan(user_id, salary.id)
                lines = [
                    SalarySplitLine(
                        target_type=i.target_type, target_id=i.target_id, amount=i.amount
                    )
                    for i in plan.items
                    if i.auto and i.ok and not i.done and i.amount > 0
                ]
                if lines and sum((x.amount for x in lines), ZERO) <= salary.amount:
                    await self.apply(user_id, salary.id, SalarySplitApply(items=lines))
        except (SalarySplitError, SalarySplitAppliedError, TransactionRuleError):
            pass  # what could not be made waits on the Pending screen

    async def list_tasks(self, user_id: uuid.UUID) -> list[SalarySplitTaskResponse]:
        """The salaries waiting for approval, newest first, each with its proposal."""
        tasks = (
            await self.db.scalars(
                select(SalarySplitTask)
                .where(
                    SalarySplitTask.user_id == user_id,
                    SalarySplitTask.status == SplitTaskStatus.PENDING,
                )
                .order_by(SalarySplitTask.created_at.desc())
            )
        ).all()
        out: list[SalarySplitTaskResponse] = []
        for task in tasks:
            try:
                plan = await self.plan(user_id, task.transaction_id)
            except (SalaryRuleNotFoundError, SalarySplitError):
                continue  # trashed or changed since: nothing to approve
            if plan.complete:
                task.status = SplitTaskStatus.DONE
                task.resolved_at = datetime.now(UTC)
                continue
            out.append(SalarySplitTaskResponse(id=task.id, created_at=task.created_at, plan=plan))
        await self.db.flush()
        return out

    async def count_pending(self, user_id: uuid.UUID) -> int:
        stmt = (
            select(func.count(SalarySplitTask.id))
            .join(Transaction, Transaction.id == SalarySplitTask.transaction_id)
            .where(
                SalarySplitTask.user_id == user_id,
                SalarySplitTask.status == SplitTaskStatus.PENDING,
                Transaction.deleted_at.is_(None),
                Transaction.planned.is_(False),
            )
        )
        return (await self.db.scalar(stmt)) or 0

    async def dismiss_task(self, user_id: uuid.UUID, task_id: uuid.UUID) -> None:
        """The user does not want this salary split. It can still be split by hand."""
        task = await self.db.scalar(
            select(SalarySplitTask).where(
                SalarySplitTask.id == task_id, SalarySplitTask.user_id == user_id
            )
        )
        if task is None:
            raise SalaryRuleNotFoundError
        task.status = SplitTaskStatus.DISMISSED
        task.resolved_at = datetime.now(UTC)
        await self.db.flush()
