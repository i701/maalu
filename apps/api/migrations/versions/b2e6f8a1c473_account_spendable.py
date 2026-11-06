"""accounts can say whether they are everyday money

Revision ID: b2e6f8a1c473
Revises: a7d3c5e9b214
Create Date: 2026-11-06 20:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2e6f8a1c473'
down_revision: Union[str, Sequence[str], None] = 'a7d3c5e9b214'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('accounts', sa.Column('spendable', sa.Boolean(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('accounts', 'spendable')
