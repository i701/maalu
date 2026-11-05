"""subscriptions whose amount varies

Revision ID: b3f5e8a1d729
Revises: a7e2d4f6c813
Create Date: 2026-11-05 17:44:09.311275

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3f5e8a1d729'
down_revision: Union[str, Sequence[str], None] = 'a7e2d4f6c813'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('subscriptions', sa.Column('amount_varies', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('subscriptions', 'amount_varies')
