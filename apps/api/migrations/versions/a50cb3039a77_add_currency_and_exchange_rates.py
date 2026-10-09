"""add currency and exchange rates

Revision ID: a50cb3039a77
Revises: e2bd867ee26c
Create Date: 2026-10-09 23:23:44.997736

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a50cb3039a77'
down_revision: Union[str, Sequence[str], None] = 'e2bd867ee26c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Backfill: existing users get USD as base currency (they never chose one), and existing
    transactions are treated as being in their user's base currency at rate 1.
    """
    op.add_column(
        "users",
        sa.Column("base_currency", sa.String(length=3), nullable=False, server_default="USD"),
    )
    op.alter_column("users", "base_currency", server_default=None)

    op.add_column("transactions", sa.Column("currency", sa.String(length=3), nullable=True))
    op.add_column(
        "transactions", sa.Column("exchange_rate", sa.Numeric(precision=19, scale=8), nullable=True)
    )
    op.add_column(
        "transactions", sa.Column("base_amount", sa.Numeric(precision=19, scale=4), nullable=True)
    )
    op.execute(
        """
        UPDATE transactions t
        SET currency = u.base_currency, exchange_rate = 1, base_amount = t.amount
        FROM users u WHERE u.id = t.user_id
        """
    )
    op.alter_column("transactions", "currency", nullable=False)
    op.alter_column("transactions", "exchange_rate", nullable=False)
    op.alter_column("transactions", "base_amount", nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("transactions", "base_amount")
    op.drop_column("transactions", "exchange_rate")
    op.drop_column("transactions", "currency")
    op.drop_column("users", "base_currency")
