"""pending salary splits and automatic salary rules

Revision ID: a7e2d4f6c813
Revises: f1c6a9d3e840
Create Date: 2026-11-05 14:08:31.904412

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7e2d4f6c813'
down_revision: Union[str, Sequence[str], None] = 'f1c6a9d3e840'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('salary_rules', sa.Column('auto', sa.Boolean(), server_default='false', nullable=False))
    op.create_table('salary_split_tasks',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('transaction_id', sa.Uuid(), nullable=False),
    sa.Column('status', sa.Enum('pending', 'done', 'dismissed', name='splittaskstatus', native_enum=False, length=32, create_constraint=False), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], name=op.f('fk_salary_split_tasks_transaction_id_transactions'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_salary_split_tasks_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_salary_split_tasks')),
    sa.UniqueConstraint('transaction_id', name='uq_salary_split_tasks_transaction_id')
    )
    op.create_index(op.f('ix_salary_split_tasks_user_id'), 'salary_split_tasks', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_salary_split_tasks_user_id'), table_name='salary_split_tasks')
    op.drop_table('salary_split_tasks')
    op.drop_column('salary_rules', 'auto')
