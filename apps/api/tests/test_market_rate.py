from datetime import date, timedelta

import pytest
from app.services import exchange_rate
from httpx import AsyncClient

URL = "/api/v1/currencies/rate"
PAST = "2026-03-02"


@pytest.fixture
def source(monkeypatch):
    """Replace the network call: `source.rows` is what the rate source answers, `source.calls` what
    was asked of it."""

    class Source:
        def __init__(self):
            self.calls: list[dict] = []
            self.answer = lambda params: [
                {
                    "date": params.get("date", date.today().isoformat()),
                    "base": params["base"],
                    "quote": params["quotes"],
                    "rate": 15.3992,
                }
            ]

    fake = Source()

    async def _get(params):
        fake.calls.append(params)
        result = fake.answer(params)
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(exchange_rate, "_get", _get)
    return fake


async def rate(client, auth, base="USD", quote="MVR", on=PAST):
    return await client.get(URL, params={"base": base, "quote": quote, "on": on}, headers=auth)


async def test_requires_auth(client: AsyncClient):
    assert (await client.get(URL, params={"base": "USD", "quote": "MVR"})).status_code == 401


async def test_returns_the_rate_for_a_past_day(client: AsyncClient, auth, source):
    body = (await rate(client, auth)).json()
    assert body == {
        "base": "USD",
        "quote": "MVR",
        "rate": "15.39920000",
        "rate_date": PAST,
        "requested_date": PAST,
        "exact": True,
        "source": "Frankfurter",
    }
    assert source.calls == [{"base": "USD", "quotes": "MVR", "date": PAST}]


async def test_a_past_day_is_fetched_once(client: AsyncClient, auth, source):
    for _ in range(3):
        assert (await rate(client, auth)).status_code == 200
    assert len(source.calls) == 1
    # a different pair or day is a different lookup
    await rate(client, auth, base="EUR")
    await rate(client, auth, on="2026-03-03")
    assert len(source.calls) == 3


async def test_today_is_never_cached(client: AsyncClient, auth, source):
    today = date.today().isoformat()
    await rate(client, auth, on=today)
    await rate(client, auth, on=today)
    assert len(source.calls) == 2
    assert all("date" not in call for call in source.calls)  # the latest rate


async def test_a_future_day_gets_the_latest_rate_marked_inexact(client: AsyncClient, auth, source):
    future = (date.today() + timedelta(days=30)).isoformat()
    body = (await rate(client, auth, on=future)).json()
    assert body["requested_date"] == future
    assert body["rate_date"] == date.today().isoformat()
    assert body["exact"] is False


async def test_a_day_without_data_falls_back_to_the_nearest_earlier_one(
    client: AsyncClient, auth, source
):
    def answer(params):
        if "from" in params:
            return [
                {"date": "2026-02-26", "base": "USD", "quote": "MVR", "rate": 15.1},
                {"date": "2026-02-27", "base": "USD", "quote": "MVR", "rate": 15.2},
            ]
        return []

    source.answer = answer
    body = (await rate(client, auth)).json()
    assert (body["rate"], body["rate_date"], body["exact"]) == ("15.20000000", "2026-02-27", False)
    # the fallback is cached too, so asking again doesn't go back to the source
    calls = len(source.calls)
    await rate(client, auth)
    assert len(source.calls) == calls


async def test_the_same_currency_needs_no_lookup(client: AsyncClient, auth, source):
    body = (await rate(client, auth, base="MVR", quote="MVR")).json()
    assert (body["rate"], body["exact"]) == ("1.00000000", True)
    assert source.calls == []


async def test_an_unknown_pair_is_not_found(client: AsyncClient, auth, source):
    source.answer = lambda params: []
    resp = await rate(client, auth, base="USD", quote="MVR", on="1990-01-01")
    assert resp.status_code == 404


async def test_an_unreachable_source_is_a_503(client: AsyncClient, auth, source):
    source.answer = lambda params: exchange_rate.MarketRateUnavailableError()
    assert (await rate(client, auth)).status_code == 503


async def test_validates_the_codes_and_date(client: AsyncClient, auth, source):
    assert (
        await client.get(URL, params={"base": "US", "quote": "MVR"}, headers=auth)
    ).status_code == 422
    assert (await client.get(URL, params={"base": "USD"}, headers=auth)).status_code == 422
    assert (await rate(client, auth, on="not-a-date")).status_code == 422
    assert source.calls == []


async def test_lowercase_codes_are_accepted(client: AsyncClient, auth, source):
    body = (
        await client.get(URL, params={"base": "usd", "quote": "mvr", "on": PAST}, headers=auth)
    ).json()
    assert (body["base"], body["quote"]) == ("USD", "MVR")
