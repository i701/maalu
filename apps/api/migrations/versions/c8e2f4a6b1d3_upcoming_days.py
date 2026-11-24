"""users.upcoming_days

Revision ID: c8e2f4a6b1d3
Revises: b4d7e2a9c613
Create Date: 2026-11-24

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c8e2f4a6b1d3'
down_revision: Union[str, Sequence[str], None] = 'b4d7e2a9c613'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users', sa.Column('upcoming_days', sa.Integer(), server_default='10', nullable=False)
    )


def downgrade() -> None:
    op.drop_column('users', 'upcoming_days')
