"""category colors and parents

Revision ID: a9d4c7e2b6f1
Revises: f3b8a6d2e1c5
Create Date: 2026-10-31 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9d4c7e2b6f1'
down_revision: Union[str, Sequence[str], None] = 'f3b8a6d2e1c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The palette (app.enums.ACCENT_COLORS), copied so the migration never changes with the app.
COLORS = ("blue", "green", "orange", "violet", "pink", "amber", "lime", "slate")


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('categories', sa.Column('color', sa.String(length=16), nullable=True))
    op.add_column('categories', sa.Column('parent_id', sa.Uuid(), nullable=True))
    op.create_index(op.f('ix_categories_parent_id'), 'categories', ['parent_id'], unique=False)
    op.create_foreign_key(
        op.f('fk_categories_parent_id_categories'),
        'categories', 'categories', ['parent_id'], ['id'], ondelete='SET NULL',
    )
    # Give the categories that exist their colours: each user's, in the order they were made, round
    # the palette, so neighbours differ.
    bind = op.get_bind()
    categories = sa.table(
        'categories', sa.column('id', sa.Uuid()), sa.column('user_id', sa.Uuid()),
        sa.column('created_at', sa.DateTime(timezone=True)), sa.column('color', sa.String()),
    )
    rows = bind.execute(
        sa.select(categories.c.id, categories.c.user_id).order_by(
            categories.c.user_id, categories.c.created_at, categories.c.id
        )
    ).all()
    seen: dict = {}
    for category_id, user_id in rows:
        n = seen.get(user_id, 0)
        seen[user_id] = n + 1
        bind.execute(
            categories.update().where(categories.c.id == category_id).values(color=COLORS[n % len(COLORS)])
        )
    op.alter_column('categories', 'color', existing_type=sa.String(length=16), nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f('fk_categories_parent_id_categories'), 'categories', type_='foreignkey')
    op.drop_index(op.f('ix_categories_parent_id'), table_name='categories')
    op.drop_column('categories', 'parent_id')
    op.drop_column('categories', 'color')
