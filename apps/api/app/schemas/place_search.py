from decimal import Decimal

from pydantic import BaseModel, Field


class PlaceSearchHit(BaseModel):
    name: str = Field(description="What the place is called (a shop's name, a street, a town)")
    address: str = Field(description="The full address as the geocoder gives it")
    latitude: Decimal
    longitude: Decimal


class PlaceSearchResponse(BaseModel):
    results: list[PlaceSearchHit]
    source: str = Field(description="The service that answered")
