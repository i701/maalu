"""add refunds

Revision ID: f3b8a6d2e1c5
Revises: e7a25b91c3d4
Create Date: 2026-10-31 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3b8a6d2e1c5'
down_revision: Union[str, Sequence[str], None] = 'e7a25b91c3d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('transactions', sa.Column('refund_of_id', sa.Uuid(), nullable=True))
    op.create_index(op.f('ix_transactions_refund_of_id'), 'transactions', ['refund_of_id'], unique=False)
    op.create_foreign_key(
        op.f('fk_transactions_refund_of_id_transactions'),
        'transactions', 'transactions', ['refund_of_id'], ['id'], ondelete='SET NULL',
    )
    op.add_column('transaction_splits', sa.Column('refund_of_split_id', sa.Uuid(), nullable=True))
    op.create_index(op.f('ix_transaction_splits_refund_of_split_id'), 'transaction_splits', ['refund_of_split_id'], unique=False)
    op.create_foreign_key(
        op.f('fk_transaction_splits_refund_of_split_id_transaction_splits'),
        'transaction_splits', 'transaction_splits', ['refund_of_split_id'], ['id'], ondelete='SET NULL',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f('fk_transaction_splits_refund_of_split_id_transaction_splits'), 'transaction_splits', type_='foreignkey')
    op.drop_index(op.f('ix_transaction_splits_refund_of_split_id'), table_name='transaction_splits')
    op.drop_column('transaction_splits', 'refund_of_split_id')
    op.drop_constraint(op.f('fk_transactions_refund_of_id_transactions'), 'transactions', type_='foreignkey')
    op.drop_index(op.f('ix_transactions_refund_of_id'), table_name='transactions')
    op.drop_column('transactions', 'refund_of_id')
