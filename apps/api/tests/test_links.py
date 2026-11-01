import uuid

import pytest
from app.services.attachment import AttachmentRuleError
from app.services.link import normalize_url

TX = "/api/v1/transactions"
LINKS = "/api/v1/links"


async def make_transaction(client, headers) -> str:
    resp = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": "10",
            "payment_method": "cash",
            "category": "Misc",
            "transaction_date": "2026-03-01",
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def add(client, headers, tx, url="https://shop.example.com/orders/42", title=None):
    body = {"url": url}
    if title is not None:
        body["title"] = title
    return await client.post(f"{TX}/{tx}/links", json=body, headers=headers)


@pytest.mark.parametrize(
    ("typed", "stored"),
    [
        ("https://shop.example.com/o/1?x=1#top", "https://shop.example.com/o/1?x=1#top"),
        ("  http://example.com  ", "http://example.com"),
        ("example.com/receipt", "https://example.com/receipt"),
        ("localhost:8000/x", "https://localhost:8000/x"),
        ("HTTPS://Example.COM/A", "HTTPS://Example.COM/A"),
    ],
)
def test_addresses_are_normalised(typed, stored):
    assert normalize_url(typed) == stored


@pytest.mark.parametrize(
    "typed",
    [
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "mailto:me@example.com",
        "ftp://example.com/file",
        "file:///etc/passwd",
        "https://user:secret@example.com",
        "https://",
        "not a url",
        "https://nodot",
        "http://example.com:99999",
        "",
    ],
)
def test_other_things_are_refused(typed):
    with pytest.raises(AttachmentRuleError):
        normalize_url(typed)


def test_a_very_long_address_is_refused():
    with pytest.raises(AttachmentRuleError, match="too long"):
        normalize_url("https://example.com/" + "a" * 2000)


async def test_add_list_delete(client, auth):
    tx = await make_transaction(client, auth)
    resp = await add(client, auth, tx, "example.com/order/7", "  Order 7  ")
    assert resp.status_code == 201, resp.text
    link = resp.json()
    assert link["url"] == "https://example.com/order/7"
    assert link["title"] == "Order 7"

    second = (await add(client, auth, tx)).json()
    listed = (await client.get(f"{TX}/{tx}/links", headers=auth)).json()
    assert [x["id"] for x in listed] == [link["id"], second["id"]]

    assert (await client.delete(f"{LINKS}/{link['id']}", headers=auth)).status_code == 204
    assert (await client.delete(f"{LINKS}/{link['id']}", headers=auth)).status_code == 404
    assert len((await client.get(f"{TX}/{tx}/links", headers=auth)).json()) == 1


async def test_a_blank_title_is_none(client, auth):
    tx = await make_transaction(client, auth)
    assert (await add(client, auth, tx, title="   ")).json()["title"] is None


async def test_bad_addresses_are_a_422(client, auth):
    tx = await make_transaction(client, auth)
    resp = await add(client, auth, tx, "javascript:alert(1)")
    assert resp.status_code == 422
    assert "http" in resp.json()["detail"]
    assert (await client.get(f"{TX}/{tx}/links", headers=auth)).json() == []


async def test_at_most_ten_links(client, auth):
    tx = await make_transaction(client, auth)
    for i in range(10):
        assert (await add(client, auth, tx, f"https://example.com/{i}")).status_code == 201
    over = await add(client, auth, tx, "https://example.com/11")
    assert over.status_code == 422
    assert "at most 10" in over.json()["detail"]


async def test_the_transaction_counts_its_links(client, auth):
    tx = await make_transaction(client, auth)
    assert (await client.get(f"{TX}/{tx}", headers=auth)).json()["link_count"] == 0
    await add(client, auth, tx)
    await add(client, auth, tx)
    assert (await client.get(f"{TX}/{tx}", headers=auth)).json()["link_count"] == 2
    assert (await client.get(TX, headers=auth)).json()[0]["link_count"] == 2


async def test_other_users_get_not_found(client, auth, signup):
    tx = await make_transaction(client, auth)
    link = (await add(client, auth, tx)).json()
    other = await signup("other@example.com")
    assert (await client.get(f"{TX}/{tx}/links", headers=other)).status_code == 404
    assert (await add(client, other, tx)).status_code == 404
    assert (await client.delete(f"{LINKS}/{link['id']}", headers=other)).status_code == 404
    assert len((await client.get(f"{TX}/{tx}/links", headers=auth)).json()) == 1


async def test_requires_a_login(client, auth):
    tx = await make_transaction(client, auth)
    assert (await client.get(f"{TX}/{tx}/links")).status_code == 401
    assert (await client.delete(f"{LINKS}/{uuid.uuid4()}")).status_code == 401


async def test_a_trashed_transaction_keeps_its_links_but_takes_no_new_ones(client, auth):
    tx = await make_transaction(client, auth)
    await add(client, auth, tx)
    await client.delete(f"{TX}/{tx}", headers=auth)
    assert (await add(client, auth, tx)).status_code == 404
    assert len((await client.get(f"{TX}/{tx}/links", headers=auth)).json()) == 1
    await client.post(f"{TX}/{tx}/restore", headers=auth)
    assert (await add(client, auth, tx)).status_code == 201


async def test_links_are_in_the_backup_and_come_back_on_restore(client, auth, signup):
    tx = await make_transaction(client, auth)
    await add(client, auth, tx, "https://example.com/a", "First")
    backup = (await client.get("/api/v1/backup", headers=auth)).content

    fresh = await signup("fresh@example.com")
    resp = await client.post(
        "/api/v1/backup/restore",
        content=backup,
        headers={**fresh, "content-type": "application/json"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["restored"]["transaction_links"] == 1
    restored = (await client.get(TX, headers=fresh)).json()[0]
    links = (await client.get(f"{TX}/{restored['id']}/links", headers=fresh)).json()
    assert [(x["url"], x["title"]) for x in links] == [("https://example.com/a", "First")]
