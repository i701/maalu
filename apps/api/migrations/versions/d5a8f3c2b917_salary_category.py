"""the default Salary category

Revision ID: d5a8f3c2b917
Revises: c7d2e9a14b36
Create Date: 2026-11-04 14:02:18.447201

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5a8f3c2b917'
down_revision: Union[str, Sequence[str], None] = 'c7d2e9a14b36'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('categories', sa.Column('is_salary', sa.Boolean(), server_default='false', nullable=False))
    # A category people already called Salary becomes the default one. Accounts without one get it
    # the next time their categories are listed.
    op.execute("UPDATE categories SET is_salary = true WHERE normalized_name = 'salary'")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('categories', 'is_salary')
