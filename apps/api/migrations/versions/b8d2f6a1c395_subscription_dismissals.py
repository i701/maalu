"""subscription candidate dismissals

Revision ID: b8d2f6a1c395
Revises: a7c3e91d5b24
Create Date: 2026-11-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b8d2f6a1c395'
down_revision: Union[str, Sequence[str], None] = 'a7c3e91d5b24'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('subscription_dismissals',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('vendor_id', sa.Uuid(), nullable=False),
    sa.Column('currency', sa.String(length=3), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_subscription_dismissals_user_id_users'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], name=op.f('fk_subscription_dismissals_vendor_id_vendors'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_subscription_dismissals')),
    sa.UniqueConstraint('user_id', 'vendor_id', 'currency', name='uq_subscription_dismissals_user_vendor')
    )
    op.create_index(op.f('ix_subscription_dismissals_user_id'), 'subscription_dismissals', ['user_id'], unique=False)
    op.create_index(op.f('ix_subscription_dismissals_vendor_id'), 'subscription_dismissals', ['vendor_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_subscription_dismissals_vendor_id'), table_name='subscription_dismissals')
    op.drop_index(op.f('ix_subscription_dismissals_user_id'), table_name='subscription_dismissals')
    op.drop_table('subscription_dismissals')
