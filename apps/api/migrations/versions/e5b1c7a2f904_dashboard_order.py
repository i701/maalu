"""users.dashboard_order

Revision ID: e5b1c7a2f904
Revises: d7a3e5b9c142
Create Date: 2026-11-19

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e5b1c7a2f904'
down_revision: Union[str, Sequence[str], None] = 'd7a3e5b9c142'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('dashboard_order', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'dashboard_order')
