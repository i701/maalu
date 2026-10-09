import pytest
from app.services import currency
from httpx import AsyncClient

URL = "/api/v1/currencies"


@pytest.fixture(autouse=True)
def _reset_cache(monkeypatch):
    monkeypatch.setattr(currency, "_cache", None)


def fake_fetch(codes=None, error=None):
    async def _fetch(_url):
        if error:
            raise error
        return codes

    return _fetch


async def test_public_and_lists_codes(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(currency, "_fetch", fake_fetch(["AED", "EUR", "USD"]))
    resp = await client.get(URL)  # no auth header
    assert resp.status_code == 200
    assert resp.json() == {"currencies": ["AED", "EUR", "USD"]}


async def test_fetch_keeps_base_and_quotes_but_drops_rates(monkeypatch):
    rows = [
        {"date": "2026-10-09", "base": "EUR", "quote": "AED", "rate": 4.1192},
        {"date": "2026-10-09", "base": "EUR", "quote": "USD", "rate": 1.1216},
        {"date": "2026-10-09", "base": "EUR", "quote": "bad!", "rate": 1},
    ]

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return rows

    class FakeClient:
        def __init__(self, **_):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            pass

        async def get(self, _url):
            return FakeResponse()

    monkeypatch.setattr(currency.httpx, "AsyncClient", FakeClient)
    assert await currency._fetch("http://x") == ["AED", "EUR", "USD"]


async def test_cached_between_calls(client: AsyncClient, monkeypatch):
    calls = 0

    async def counting(_url):
        nonlocal calls
        calls += 1
        return ["EUR"]

    monkeypatch.setattr(currency, "_fetch", counting)
    await client.get(URL)
    await client.get(URL)
    assert calls == 1


async def test_falls_back_when_source_down(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(currency, "_fetch", fake_fetch(error=RuntimeError("down")))
    codes = (await client.get(URL)).json()["currencies"]
    assert "MVR" in codes
    assert "USD" in codes


async def test_serves_stale_cache_when_refresh_fails(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(currency, "_fetch", fake_fetch(["EUR", "JPY"]))
    await client.get(URL)
    monkeypatch.setattr(currency.settings, "currency_cache_ttl_seconds", 0)  # expire cache
    monkeypatch.setattr(currency, "_fetch", fake_fetch(error=RuntimeError("down")))
    assert (await client.get(URL)).json() == {"currencies": ["EUR", "JPY"]}
