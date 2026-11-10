"""users.compact_numbers

Revision ID: c4e8a1b7d369
Revises: aa6959bae1c1
Create Date: 2026-11-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c4e8a1b7d369'
down_revision: Union[str, Sequence[str], None] = 'aa6959bae1c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('compact_numbers', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'compact_numbers')
