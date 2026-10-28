"""budget line categories cascade

Deleting a user removes its categories and budget lines in one go; without a cascade on the link
table Postgres can refuse that depending on the order it removes the rows.

Revision ID: 6a1f3c9d2b47
Revises: 470eb41d3447
Create Date: 2026-10-28 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '6a1f3c9d2b47'
down_revision: Union[str, Sequence[str], None] = '470eb41d3447'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FK = 'fk_budget_line_categories_category_id_categories'


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(FK, 'budget_line_categories', type_='foreignkey')
    op.create_foreign_key(
        FK, 'budget_line_categories', 'categories', ['category_id'], ['id'], ondelete='CASCADE'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(FK, 'budget_line_categories', type_='foreignkey')
    op.create_foreign_key(FK, 'budget_line_categories', 'categories', ['category_id'], ['id'])
