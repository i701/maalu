"""cards only on expenses

Only an expense is paid with a card now. Incomes (and any transfer) saved with a card before the
rule keep their account and amount; only the card link is cleared.

Revision ID: 1b51a26a987c
Revises: 583fdeadf20e
"""

import sqlalchemy as sa
from alembic import op

revision = "1b51a26a987c"
down_revision = "583fdeadf20e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE transactions SET card_id = NULL WHERE card_id IS NOT NULL AND type <> 'expense'"
        )
    )


def downgrade() -> None:
    # which incomes had a card is not kept, so there is nothing to put back
    pass
