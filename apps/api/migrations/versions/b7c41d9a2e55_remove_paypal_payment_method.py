"""remove the paypal payment method

PayPal is a checkout, not where the money came from: the charge lands on a card or a bank
account. Existing rows become credit card payments.

Revision ID: b7c41d9a2e55
Revises: e8a29ea9de87
Create Date: 2026-10-28 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b7c41d9a2e55'
down_revision: Union[str, Sequence[str], None] = 'e8a29ea9de87'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    for table in ("transactions", "subscriptions"):
        op.execute(f"UPDATE {table} SET payment_method = 'credit_card' WHERE payment_method = 'paypal'")


def downgrade() -> None:
    """Downgrade schema. The converted rows can't be told apart from real credit card ones."""
