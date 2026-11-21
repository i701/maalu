"""users.name

Revision ID: b4d7e2a9c613
Revises: e5b1c7a2f904
Create Date: 2026-11-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b4d7e2a9c613'
down_revision: Union[str, Sequence[str], None] = 'e5b1c7a2f904'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('name', sa.String(length=80), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'name')
