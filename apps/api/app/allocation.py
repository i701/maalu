"""Share a transaction's base-currency amount across its split lines. Pure functions."""

from collections.abc import Sequence
from decimal import ROUND_HALF_EVEN, Decimal

_QUANTUM = Decimal("0.0001")  # matches Numeric(19, 4)


def allocate_base(base_amount: Decimal, total: Decimal, lines: Sequence[Decimal]) -> list[Decimal]:
    """Each line's share of `base_amount`, in proportion to its part of `total`.

    Shares are rounded half-even to 4 decimals, and the last line takes whatever is left so the
    shares always add up to `base_amount` exactly (category totals then agree with the transaction
    totals to the last digit).
    """
    if not lines:
        return []
    shares = [
        (base_amount * line / total).quantize(_QUANTUM, ROUND_HALF_EVEN) for line in lines[:-1]
    ]
    shares.append(base_amount - sum(shares, Decimal(0)))
    return shares
