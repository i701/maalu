import uuid

from pydantic import BaseModel, Field

from app.schemas.transaction import TransactionResponse


class TransferPair(BaseModel):
    """An expense and an income that are the two sides of one move of your own money."""

    expense_id: uuid.UUID = Field(description="The money leaving one account")
    income_id: uuid.UUID = Field(description="The same money arriving in another")


class TransferSuggestion(BaseModel):
    expense: TransactionResponse
    income: TransactionResponse
    days_apart: int = Field(description="How many days between the two, 0 for the same day")
