from fastapi import APIRouter
from pydantic import BaseModel

from app.services.currency import list_currencies

router = APIRouter(prefix="/currencies", tags=["currencies"])


class CurrencyList(BaseModel):
    currencies: list[str]


@router.get("", response_model=CurrencyList)
async def get_currencies():
    """ISO 4217 codes of the world's currencies. Public so sign-up can use it."""
    return CurrencyList(currencies=await list_currencies())
