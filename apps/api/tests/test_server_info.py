from app.config import settings
from httpx import AsyncClient


async def test_server_info_needs_no_sign_in(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "registration", "closed")
    r = await client.get("/api/v1/server")
    assert r.status_code == 200
    body = r.json()
    assert body["app"] == "maalu"
    assert body["version"]
    assert body["registration_open"] is False


async def test_server_info_follows_registration(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "registration", "open")
    assert (await client.get("/api/v1/server")).json()["registration_open"] is True
