"""add transaction type and transfers

Revision ID: 2811096c2799
Revises: d3b9f0bb67c4
Create Date: 2026-10-10 01:06:04.558844

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2811096c2799'
down_revision: Union[str, Sequence[str], None] = 'd3b9f0bb67c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Amounts used to be signed (negative = money out). They are now always positive and the new
    `type` says which way the money moved, so existing rows are converted: positive amounts become
    income, negative (and zero) become expenses.
    """
    op.add_column(
        "transactions",
        sa.Column(
            "type",
            sa.Enum("income", "expense", "transfer", name="transactiontype", native_enum=False, length=32),
            nullable=True,
        ),
    )
    op.execute("UPDATE transactions SET type = CASE WHEN amount > 0 THEN 'income' ELSE 'expense' END")
    op.execute("UPDATE transactions SET amount = ABS(amount), base_amount = ABS(base_amount)")
    op.alter_column("transactions", "type", nullable=False)
    op.create_index(op.f("ix_transactions_type"), "transactions", ["type"], unique=False)

    op.add_column("transactions", sa.Column("to_account_id", sa.Uuid(), nullable=True))
    op.add_column(
        "transactions", sa.Column("to_amount", sa.Numeric(precision=19, scale=4), nullable=True)
    )
    op.create_index(
        op.f("ix_transactions_to_account_id"), "transactions", ["to_account_id"], unique=False
    )
    op.create_foreign_key(
        op.f("fk_transactions_to_account_id_accounts"),
        "transactions",
        "accounts",
        ["to_account_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema. Transfers have no signed-amount equivalent, so they are deleted."""
    op.execute("DELETE FROM transactions WHERE type = 'transfer'")
    op.execute("UPDATE transactions SET amount = -amount, base_amount = -base_amount WHERE type = 'expense'")
    op.drop_constraint(op.f("fk_transactions_to_account_id_accounts"), "transactions", type_="foreignkey")
    op.drop_index(op.f("ix_transactions_to_account_id"), table_name="transactions")
    op.drop_column("transactions", "to_amount")
    op.drop_column("transactions", "to_account_id")
    op.drop_index(op.f("ix_transactions_type"), table_name="transactions")
    op.drop_column("transactions", "type")
