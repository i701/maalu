"""add start from template setting

Revision ID: 9b3c1f7a42de
Revises: 400efce15aca
Create Date: 2026-10-30 20:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b3c1f7a42de'
down_revision: Union[str, Sequence[str], None] = '400efce15aca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'users',
        sa.Column('start_from_template', sa.Boolean(), server_default='true', nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'start_from_template')
