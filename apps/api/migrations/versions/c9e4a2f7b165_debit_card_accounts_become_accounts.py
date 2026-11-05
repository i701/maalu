"""debit card accounts become plain accounts

A debit card has no balance of its own: it spends from its bank account, so the "Debit Card"
account group is gone. Accounts that were in it move to "Accounts".

Revision ID: c9e4a2f7b165
Revises: b3f5e8a1d729
"""

import sqlalchemy as sa
from alembic import op

revision = "c9e4a2f7b165"
down_revision = "b3f5e8a1d729"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("UPDATE accounts SET \"group\" = 'accounts' WHERE \"group\" = 'debit_card'"))


def downgrade() -> None:
    # the group no longer exists, so there is nothing to put them back into
    pass
