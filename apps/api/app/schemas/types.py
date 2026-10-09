from decimal import Decimal
from typing import Annotated

from pydantic import AfterValidator, Field, StringConstraints

CurrencyCode = Annotated[
    str,
    StringConstraints(strip_whitespace=True, pattern=r"^[A-Za-z]{3}$"),
    AfterValidator(str.upper),
]

# Base-currency units per 1 unit of the foreign currency, entered manually by the user.
ExchangeRate = Annotated[Decimal, Field(gt=0, max_digits=19, decimal_places=8)]
