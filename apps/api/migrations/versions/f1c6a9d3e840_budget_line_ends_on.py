"""budget limits for set dates

Revision ID: f1c6a9d3e840
Revises: e8b4c1d7a925
Create Date: 2026-11-05 09:30:12.118842

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1c6a9d3e840'
down_revision: Union[str, Sequence[str], None] = 'e8b4c1d7a925'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('budget_lines', sa.Column('ends_on', sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('budget_lines', 'ends_on')
