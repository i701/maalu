"""categories table

Turns the free-text category on transactions, split lines and subscriptions into a table: one
category per user and (case-insensitive) name, linked by id. Existing text is carried over, and
transfers (which had the placeholder text "Transfer") end up with no category.

Revision ID: 15627051e401
Revises: 89019111fc8e
Create Date: 2026-10-27 22:10:00.000000

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '15627051e401'
down_revision: Union[str, Sequence[str], None] = '89019111fc8e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# table -> whether category_id stays required afterwards (transfers have none)
TABLES = {"transactions": False, "transaction_splits": True, "subscriptions": True}


def _normalize(name: str) -> str:
    return " ".join(name.split()).casefold()


def upgrade() -> None:
    """Upgrade schema."""
    categories = op.create_table(
        'categories',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('normalized_name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_categories_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_categories')),
        sa.UniqueConstraint('user_id', 'normalized_name', name='uq_categories_user_id_normalized_name'),
    )
    op.create_index(op.f('ix_categories_user_id'), 'categories', ['user_id'], unique=False)

    for table in TABLES:
        op.add_column(table, sa.Column('category_id', sa.Uuid(), nullable=True))

    bind = op.get_bind()

    # One category per user and normalised name, named as first seen. Transfers are left out.
    found: dict[tuple, tuple] = {}
    queries = [
        "SELECT user_id, category FROM transactions WHERE type <> 'transfer' ORDER BY transaction_date, created_at",
        "SELECT t.user_id, s.category FROM transaction_splits s JOIN transactions t ON t.id = s.transaction_id",
        "SELECT user_id, category FROM subscriptions ORDER BY created_at",
    ]
    for query in queries:
        for user_id, name in bind.execute(sa.text(query)):
            key = (user_id, _normalize(name))
            if key not in found:
                found[key] = (uuid.uuid4(), " ".join(name.split()))
    if found:
        op.bulk_insert(
            categories,
            [
                {"id": cid, "user_id": user_id, "name": name, "normalized_name": normalized}
                for (user_id, normalized), (cid, name) in found.items()
            ],
        )

    # Point every row at its category.
    link = {
        "transactions": "SELECT id, user_id, category FROM transactions WHERE type <> 'transfer'",
        "transaction_splits": "SELECT s.id, t.user_id, s.category FROM transaction_splits s JOIN transactions t ON t.id = s.transaction_id",
        "subscriptions": "SELECT id, user_id, category FROM subscriptions",
    }
    for table, query in link.items():
        update = sa.text(f"UPDATE {table} SET category_id = :cid WHERE id = :id")
        for row_id, user_id, name in bind.execute(sa.text(query)).fetchall():
            bind.execute(update, {"cid": found[(user_id, _normalize(name))][0], "id": row_id})

    for table, required in TABLES.items():
        if required:
            op.alter_column(table, 'category_id', nullable=False)
        op.create_index(op.f(f'ix_{table}_category_id'), table, ['category_id'], unique=False)
        op.create_foreign_key(
            op.f(f'fk_{table}_category_id_categories'), table, 'categories', ['category_id'], ['id']
        )

    op.drop_index(op.f('ix_transactions_category'), table_name='transactions')
    for table in TABLES:
        op.drop_column(table, 'category')


def downgrade() -> None:
    """Downgrade schema."""
    for table in TABLES:
        op.add_column(table, sa.Column('category', sa.String(length=100), nullable=True))
        op.execute(
            f"UPDATE {table} SET category = c.name FROM categories c WHERE c.id = {table}.category_id"
        )
    op.execute("UPDATE transactions SET category = 'Transfer' WHERE category IS NULL")
    for table in TABLES:
        op.alter_column(table, 'category', nullable=False)
        op.drop_constraint(op.f(f'fk_{table}_category_id_categories'), table, type_='foreignkey')
        op.drop_index(op.f(f'ix_{table}_category_id'), table_name=table)
        op.drop_column(table, 'category_id')
    op.create_index(op.f('ix_transactions_category'), 'transactions', ['category'], unique=False)
    op.drop_index(op.f('ix_categories_user_id'), table_name='categories')
    op.drop_table('categories')
