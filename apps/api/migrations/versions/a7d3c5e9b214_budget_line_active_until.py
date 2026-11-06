"""budget limits that run between two dates every period

Revision ID: a7d3c5e9b214
Revises: 5481a6b80f9a
Create Date: 2026-11-06 19:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7d3c5e9b214'
down_revision: Union[str, Sequence[str], None] = '5481a6b80f9a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('budget_lines', sa.Column('active_until', sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('budget_lines', 'active_until')
