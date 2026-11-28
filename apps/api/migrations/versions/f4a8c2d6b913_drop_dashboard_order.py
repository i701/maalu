"""drop users.dashboard_order: each app keeps its own card order

Revision ID: f4a8c2d6b913
Revises: d3f5a7c9e1b2
Create Date: 2026-11-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f4a8c2d6b913'
down_revision: Union[str, Sequence[str], None] = 'd3f5a7c9e1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('users', 'dashboard_order')


def downgrade() -> None:
    op.add_column('users', sa.Column('dashboard_order', sa.JSON(), nullable=True))
