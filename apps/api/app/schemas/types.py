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

# A place on the map: degrees, six decimals (about 10 cm), and an optional name for it.
Latitude = Annotated[Decimal, Field(ge=-90, le=90, max_digits=9, decimal_places=6)]
Longitude = Annotated[Decimal, Field(ge=-180, le=180, max_digits=9, decimal_places=6)]
PlaceName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]
