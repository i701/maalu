from decimal import ROUND_HALF_EVEN, Decimal


class ExchangeRateRequiredError(Exception):
    pass


BASE_AMOUNT_QUANTUM = Decimal("0.0001")  # matches Numeric(19, 4)


def price_in_base(
    amount: Decimal, currency: str, exchange_rate: Decimal | None, base_currency: str
) -> tuple[Decimal, Decimal]:
    """Return (exchange_rate, base_amount). Same-currency transactions always use rate 1."""
    if currency == base_currency:
        exchange_rate = Decimal(1)
    elif exchange_rate is None:
        raise ExchangeRateRequiredError
    return exchange_rate, (amount * exchange_rate).quantize(BASE_AMOUNT_QUANTUM, ROUND_HALF_EVEN)
