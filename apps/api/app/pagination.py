"""Shared pagination for list endpoints.

Lists stay plain JSON arrays (so existing clients keep working); the total number of matching
rows, ignoring `limit`/`offset`, is reported in the `X-Total-Count` response header.
`limit` is optional on most lists: leave it out to get every row (for dropdowns).
"""

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Query, Response

TOTAL_COUNT_HEADER = "X-Total-Count"
MAX_LIMIT = 200


@dataclass(frozen=True)
class Page:
    limit: int | None  # None = no limit (all rows)
    offset: int


def page_params(
    limit: Annotated[int | None, Query(ge=1, le=MAX_LIMIT, description="Omit for all rows")] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page:
    return Page(limit=limit, offset=offset)


PageDep = Annotated[Page, Depends(page_params)]


def set_total(response: Response, total: int) -> None:
    response.headers[TOTAL_COUNT_HEADER] = str(total)
