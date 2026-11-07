"""credit cards can say when the statement closes and when it is due

Revision ID: d4a8c1e7f952
Revises: b2e6f8a1c473
Create Date: 2026-11-07 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4a8c1e7f952'
down_revision: Union[str, Sequence[str], None] = 'b2e6f8a1c473'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('accounts', sa.Column('statement_day', sa.Integer(), nullable=True))
    op.add_column('accounts', sa.Column('due_day', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('accounts', 'due_day')
    op.drop_column('accounts', 'statement_day')
