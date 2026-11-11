"""users.notify_login

Revision ID: d7a3e5b9c142
Revises: c4e8a1b7d369
Create Date: 2026-11-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'd7a3e5b9c142'
down_revision: Union[str, Sequence[str], None] = 'c4e8a1b7d369'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('notify_login', sa.Boolean(), server_default='true', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'notify_login')
