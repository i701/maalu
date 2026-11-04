"""category kind (need or want)

Revision ID: c7d2e9a14b36
Revises: 4f65b7c9b95f
Create Date: 2026-11-04 10:12:41.220117

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7d2e9a14b36'
down_revision: Union[str, Sequence[str], None] = '4f65b7c9b95f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('categories', sa.Column('kind', sa.Enum('need', 'want', name='categorykind', native_enum=False, length=32, create_constraint=False), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('categories', 'kind')
