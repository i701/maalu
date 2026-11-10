"""email notifications: users.notify_email, notifications.emailed_at

Revision ID: a7c3e91d5b24
Revises: d4a8c1e7f952
Create Date: 2026-11-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'a7c3e91d5b24'
down_revision: Union[str, Sequence[str], None] = 'd4a8c1e7f952'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('notify_email', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('notifications', sa.Column('emailed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('notifications', 'emailed_at')
    op.drop_column('users', 'notify_email')
