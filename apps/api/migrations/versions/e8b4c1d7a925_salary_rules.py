"""salary rules and the links from a split back to its salary

Revision ID: e8b4c1d7a925
Revises: d5a8f3c2b917
Create Date: 2026-11-04 16:21:07.553310

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8b4c1d7a925'
down_revision: Union[str, Sequence[str], None] = 'd5a8f3c2b917'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('salary_rules',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('account_id', sa.Uuid(), nullable=True),
    sa.Column('goal_id', sa.Uuid(), nullable=True),
    sa.Column('mode', sa.Enum('percent', 'fixed', name='salaryrulemode', native_enum=False, length=32, create_constraint=False), nullable=False),
    sa.Column('value', sa.Numeric(precision=19, scale=4), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('(account_id IS NOT NULL AND goal_id IS NULL) OR (account_id IS NULL AND goal_id IS NOT NULL)', name=op.f('ck_salary_rules_target_is_account_or_goal')),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], name=op.f('fk_salary_rules_account_id_accounts'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], name=op.f('fk_salary_rules_goal_id_goals'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_salary_rules_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_salary_rules')),
    sa.UniqueConstraint('user_id', 'account_id', name='uq_salary_rules_user_id_account_id'),
    sa.UniqueConstraint('user_id', 'goal_id', name='uq_salary_rules_user_id_goal_id')
    )
    op.create_index(op.f('ix_salary_rules_user_id'), 'salary_rules', ['user_id'], unique=False)
    op.add_column('transactions', sa.Column('split_from_id', sa.Uuid(), nullable=True))
    op.create_index(op.f('ix_transactions_split_from_id'), 'transactions', ['split_from_id'], unique=False)
    op.create_foreign_key(op.f('fk_transactions_split_from_id_transactions'), 'transactions', 'transactions', ['split_from_id'], ['id'], ondelete='SET NULL')
    op.add_column('goal_entries', sa.Column('split_from_id', sa.Uuid(), nullable=True))
    op.create_index(op.f('ix_goal_entries_split_from_id'), 'goal_entries', ['split_from_id'], unique=False)
    op.create_foreign_key(op.f('fk_goal_entries_split_from_id_transactions'), 'goal_entries', 'transactions', ['split_from_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f('fk_goal_entries_split_from_id_transactions'), 'goal_entries', type_='foreignkey')
    op.drop_index(op.f('ix_goal_entries_split_from_id'), table_name='goal_entries')
    op.drop_column('goal_entries', 'split_from_id')
    op.drop_constraint(op.f('fk_transactions_split_from_id_transactions'), 'transactions', type_='foreignkey')
    op.drop_index(op.f('ix_transactions_split_from_id'), table_name='transactions')
    op.drop_column('transactions', 'split_from_id')
    op.drop_index(op.f('ix_salary_rules_user_id'), table_name='salary_rules')
    op.drop_table('salary_rules')
