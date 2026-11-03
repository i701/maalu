from decimal import Decimal

import pytest
from app import rate_limit
from app.config import settings
from app.services import geocode
from app.services.geocode import GeocoderUnavailableError
from httpx import AsyncClient

URL = "/api/v1/places/search"

ROWS = [
    {
        "name": "Male Fish Market",
        "display_name": "Male Fish Market, Boduthakurufaanu Magu, Male, Maldives",
        "lat": "4.1766012",
        "lon": "73.5163456",
    },
    {
        "name": "",
        "display_name": "Fish Road, Hulhumale, Maldives",
        "lat": "4.2147",
        "lon": "73.54",
    },
]


@pytest.fixture(autouse=True)
def fresh_cache():
    geocode._cache.clear()
    yield
    geocode._cache.clear()


@pytest.fixture
def source(monkeypatch):
    """Replace the network call: `source.rows` is the answer, `source.calls` what was asked."""

    class Source:
        def __init__(self):
            self.calls: list[dict] = []
            self.rows: list[dict] = list(ROWS)
            self.down = False

    fake = Source()

    async def _get(params):
        fake.calls.append(dict(params))
        if fake.down:
            raise GeocoderUnavailableError
        return fake.rows

    monkeypatch.setattr(geocode, "_get", _get)
    return fake


async def search(client, auth, q="fish market", **params):
    return await client.get(URL, params={"q": q, **params}, headers=auth)


async def test_it_needs_a_login(client: AsyncClient, source):
    assert (await client.get(URL, params={"q": "fish"})).status_code == 401


async def test_it_finds_places_by_name(client: AsyncClient, auth, source):
    resp = await search(client, auth)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["source"] == "nominatim.openstreetmap.org"
    first, second = body["results"]
    assert first["name"] == "Male Fish Market"
    assert first["address"].startswith("Male Fish Market, Boduthakurufaanu Magu")
    assert Decimal(first["latitude"]) == Decimal("4.176601")  # six decimals
    assert Decimal(first["longitude"]) == Decimal("73.516346")
    # no short name: the first part of the address stands in
    assert second["name"] == "Fish Road"


async def test_only_the_typed_text_is_sent_and_it_is_tidied(client: AsyncClient, auth, source):
    await search(client, auth, q="  fish    market  ")
    assert source.calls == [{"q": "fish market", "format": "jsonv2", "limit": "5"}]


async def test_where_the_map_is_only_prefers_nearby_places(client: AsyncClient, auth, source):
    await search(client, auth, near_lat=4.17, near_lng=73.5)
    sent = source.calls[0]
    assert sent["bounded"] == "0"  # a preference, not a filter
    west, north, east, south = (float(v) for v in sent["viewbox"].split(","))
    assert (west, east) == (72.5, 74.5)
    assert (north, south) == (5.17, 3.17)


async def test_one_of_the_two_near_values_is_refused(client: AsyncClient, auth, source):
    assert (await search(client, auth, near_lat=4.17)).status_code == 422
    assert (await search(client, auth, near_lng=73.5)).status_code == 422
    assert source.calls == []


async def test_the_number_of_results_is_bounded(client: AsyncClient, auth, source):
    await search(client, auth, limit=3)
    assert source.calls[0]["limit"] == "3"
    assert (await search(client, auth, limit=9)).status_code == 422
    assert (await search(client, auth, limit=0)).status_code == 422


@pytest.mark.parametrize("q", ["", "a", "x" * 201])
async def test_the_search_text_must_be_sensible(client: AsyncClient, auth, source, q):
    assert (await search(client, auth, q=q)).status_code == 422
    assert source.calls == []


async def test_the_same_search_is_not_repeated(client: AsyncClient, auth, source):
    first = (await search(client, auth)).json()
    again = (await search(client, auth, q="FISH  market")).json()  # same words, other spelling
    assert again == first
    assert len(source.calls) == 1
    await search(client, auth, q="cafe")  # another search does go out
    assert len(source.calls) == 2


async def test_a_different_area_is_a_different_search(client: AsyncClient, auth, source):
    await search(client, auth, near_lat=4.17, near_lng=73.5)
    await search(client, auth, near_lat=40.7, near_lng=-74.0)
    assert len(source.calls) == 2


async def test_no_match_is_an_empty_list(client: AsyncClient, auth, source):
    source.rows = []
    resp = await search(client, auth, q="nowhere at all")
    assert resp.status_code == 200
    assert resp.json()["results"] == []


async def test_rows_that_are_not_places_are_skipped(client: AsyncClient, auth, source):
    source.rows = [
        {"display_name": "No coordinates"},
        {"display_name": "Off the planet", "lat": "95", "lon": "10"},
        {"display_name": "Not numbers", "lat": "north", "lon": "east"},
        ROWS[0],
    ]
    results = (await search(client, auth)).json()["results"]
    assert [r["name"] for r in results] == ["Male Fish Market"]


async def test_an_unreachable_geocoder_is_a_503(client: AsyncClient, auth, source):
    source.down = True
    resp = await search(client, auth)
    assert resp.status_code == 503
    assert "not reachable" in resp.json()["detail"]


async def test_a_failure_is_not_remembered(client: AsyncClient, auth, source):
    source.down = True
    await search(client, auth)
    source.down = False
    assert (await search(client, auth)).status_code == 200


async def test_it_can_be_turned_off(client: AsyncClient, auth, source, monkeypatch):
    monkeypatch.setattr(settings, "geocoder_url", "")
    resp = await search(client, auth)
    assert resp.status_code == 404
    assert "not set up" in resp.json()["detail"]
    assert source.calls == []


async def test_searches_are_limited_per_person(client: AsyncClient, auth, source, monkeypatch):
    monkeypatch.setattr(settings, "rate_limit", True)
    rate_limit.limiter.clear()
    try:
        for i in range(rate_limit.PLACE_SEARCH_PER_USER):
            assert (await search(client, auth, q=f"place {i}")).status_code == 200
        resp = await search(client, auth, q="one too many")
        assert resp.status_code == 429
        assert "Retry-After" in resp.headers
    finally:
        rate_limit.limiter.clear()


async def test_the_limit_is_for_each_person(client: AsyncClient, auth, source, monkeypatch, signup):
    monkeypatch.setattr(settings, "rate_limit", True)
    rate_limit.limiter.clear()
    try:
        for i in range(rate_limit.PLACE_SEARCH_PER_USER):
            await search(client, auth, q=f"place {i}")
        other = await signup("bob@example.com")
        assert (await search(client, other, q="my own search")).status_code == 200
    finally:
        rate_limit.limiter.clear()


# --- the policy kept towards the geocoder ---------------------------------------------------


async def test_requests_are_spaced_out(monkeypatch):
    slept: list[float] = []
    now = {"t": 1000.0}

    async def fake_sleep(seconds):
        slept.append(seconds)
        now["t"] += seconds

    monkeypatch.setattr(geocode.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(geocode.time, "monotonic", lambda: now["t"])
    monkeypatch.setattr(geocode, "_last_request", 0.0)
    await geocode._pace()  # the first goes straight away
    assert slept == []
    now["t"] += 0.2
    await geocode._pace()  # the next waits out the rest of the interval
    assert slept == [pytest.approx(geocode.MIN_INTERVAL - 0.2)]
    now["t"] += 5
    await geocode._pace()  # after a long gap there is nothing to wait for
    assert len(slept) == 1


def test_the_geocoder_is_told_who_is_asking():
    assert "Maalu" in settings.geocoder_user_agent
