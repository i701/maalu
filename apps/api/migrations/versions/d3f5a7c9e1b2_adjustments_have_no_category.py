"""Balance adjustments no longer have a category

A balance adjustment used to be filed under an auto-created category ("Balance adjustment"), which
then showed up in the category list, the pickers and the "not sorted" prompt although it is never
counted anywhere. An adjustment now has no category (its `category` still reads "Balance
adjustment"). This clears the category on every existing adjustment and deletes the category they
were in once nothing else uses it. The category is found through the adjustments, not by its name,
so a rename (an emoji, say) makes no difference.

Revision ID: d3f5a7c9e1b2
Revises: c8e2f4a6b1d3
Create Date: 2026-11-24

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d3f5a7c9e1b2"
down_revision: Union[str, Sequence[str], None] = "c8e2f4a6b1d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Every place that can still point at a category once the adjustments are cleared. A category any
# of them uses is kept: that is somebody's real category, only the adjustments' link is removed.
USERS_OF_A_CATEGORY = (
    ("transactions", "category_id"),
    ("transaction_splits", "category_id"),
    ("subscriptions", "category_id"),
    ("budget_line_categories", "category_id"),
    ("transaction_templates", "category_id"),
    ("vendors", "default_category_id"),
    ("categories", "parent_id"),
)


def upgrade() -> None:
    bind = op.get_bind()
    filed = [
        row[0]
        for row in bind.execute(
            sa.text(
                "SELECT DISTINCT category_id FROM transactions"
                " WHERE adjustment AND category_id IS NOT NULL"
            )
        )
    ]
    bind.execute(sa.text("UPDATE transactions SET category_id = NULL WHERE adjustment"))
    unused = " AND ".join(
        f"NOT EXISTS (SELECT 1 FROM {table} WHERE {column} = :id)"
        for table, column in USERS_OF_A_CATEGORY
    )
    for category_id in filed:
        bind.execute(
            sa.text(f"DELETE FROM categories WHERE id = :id AND {unused}"), {"id": category_id}
        )


def downgrade() -> None:
    # The old category and which adjustments were in it are not kept: nothing to put back.
    pass
