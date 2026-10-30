"""add two factor

Revision ID: c41d8e2f7a90
Revises: 9b3c1f7a42de
Create Date: 2026-10-30 22:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c41d8e2f7a90'
down_revision: Union[str, Sequence[str], None] = '9b3c1f7a42de'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('two_factor_secret', sa.String(length=255), nullable=True))
    op.add_column(
        'users',
        sa.Column('two_factor_enabled', sa.Boolean(), server_default='false', nullable=False),
    )
    op.add_column('users', sa.Column('two_factor_last_step', sa.BigInteger(), nullable=True))
    op.add_column(
        'users', sa.Column('two_factor_failures', sa.Integer(), server_default='0', nullable=False)
    )
    op.add_column(
        'users', sa.Column('two_factor_locked_until', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_table(
        'recovery_codes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('code_hash', sa.String(length=64), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_recovery_codes_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_recovery_codes')),
    )
    op.create_index(op.f('ix_recovery_codes_user_id'), 'recovery_codes', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_recovery_codes_user_id'), table_name='recovery_codes')
    op.drop_table('recovery_codes')
    op.drop_column('users', 'two_factor_locked_until')
    op.drop_column('users', 'two_factor_failures')
    op.drop_column('users', 'two_factor_last_step')
    op.drop_column('users', 'two_factor_enabled')
    op.drop_column('users', 'two_factor_secret')
