from typing import Annotated
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Query, status

from app import rate_limit
from app.config import settings
from app.dependencies import CurrentUserId
from app.schemas.place_search import PlaceSearchHit, PlaceSearchResponse
from app.services.geocode import GeocoderDisabledError, GeocoderUnavailableError, search_places

router = APIRouter(prefix="/places", tags=["places"])


@router.get("/search", response_model=PlaceSearchResponse)
async def search_for_places(
    user_id: CurrentUserId,
    q: Annotated[str, Query(min_length=2, max_length=200, description="What to look for")],
    near_lat: Annotated[
        float | None, Query(ge=-90, le=90, description="Where the map is: prefers nearby places")
    ] = None,
    near_lng: Annotated[float | None, Query(ge=-180, le=180)] = None,
    limit: Annotated[int, Query(ge=1, le=8)] = 5,
):
    """Find places by name, to put a pin on the map. Only the text you typed (and roughly where the
    map is) is sent to the geocoder, only when you search, and never to anyone else. 404 when the
    server has place search turned off; 429 past 20 searches a minute."""
    if not settings.geocoder_url:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Place search is not set up on this server")
    if (near_lat is None) != (near_lng is None):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "Send both near_lat and near_lng, or neither"
        )
    rate_limit.check_place_search(user_id)
    try:
        hits = await search_places(
            q,
            None if near_lat is None or near_lng is None else (near_lat, near_lng),
            limit,
        )
    except GeocoderDisabledError:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Place search is not set up on this server"
        ) from None
    except GeocoderUnavailableError:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "The place search service is not reachable"
        ) from None
    return PlaceSearchResponse(
        results=[
            PlaceSearchHit(
                name=h.name, address=h.address, latitude=h.latitude, longitude=h.longitude
            )
            for h in hits
        ],
        source=urlparse(settings.geocoder_url).hostname or "geocoder",
    )
