import pytest
from app.schemas.account import normalize_account_number

ACC = "/api/v1/accounts"
TX = "/api/v1/transactions"


async def make(client, headers, name="Savings", **extra):
    resp = await client.post(
        ACC,
        json={"group": "savings", "name": name, "opening_amount": "10", **extra},
        headers=headers,
    )
    return resp


@pytest.mark.parametrize(
    ("typed", "stored"),
    [
        ("7730000486374", "7730000486374"),
        (" 7730 0004 86374 ", "7730000486374"),
        ("533294xxxxxx4164", "533294XXXXXX4164"),
        ("DE89 3704 0044 0532 0130 00", "DE89370400440532013000"),
        ("   ", None),
        ("", None),
        (None, None),
    ],
)
def test_numbers_are_normalised(typed, stored):
    assert normalize_account_number(typed) == stored


@pytest.mark.parametrize("typed", ["77/30", "abc def!", "7" * 35, "1.5"])
def test_odd_numbers_are_refused(typed):
    with pytest.raises(ValueError, match="digits only"):
        normalize_account_number(typed)


async def test_bank_and_number_are_saved_and_returned(client, auth):
    resp = await make(client, auth, bank="  BML ", account_number="7730 0004 86374")
    assert resp.status_code == 201, resp.text
    account = resp.json()
    assert account["bank"] == "BML"
    assert account["account_number"] == "7730000486374"
    fetched = (await client.get(f"{ACC}/{account['id']}", headers=auth)).json()
    assert fetched["account_number"] == "7730000486374"


async def test_both_are_optional(client, auth):
    first = (await make(client, auth, "One")).json()
    second = (await make(client, auth, "Two")).json()
    assert first["bank"] is None
    assert first["account_number"] is None
    assert second["account_number"] is None  # several accounts may have no number


async def test_the_same_number_cannot_be_used_twice(client, auth):
    await make(client, auth, "BML Savings", account_number="7730000486374")
    clash = await make(client, auth, "Other", account_number="7730 000486374")
    assert clash.status_code == 409
    assert "BML Savings" in clash.json()["detail"]
    assert len((await client.get(ACC, headers=auth)).json()) == 1


async def test_an_account_can_keep_its_own_number_when_edited(client, auth):
    account = (await make(client, auth, account_number="7730000486374")).json()
    same = await client.patch(
        f"{ACC}/{account['id']}",
        json={"name": "Renamed", "account_number": "7730000486374"},
        headers=auth,
    )
    assert same.status_code == 200
    assert same.json()["name"] == "Renamed"


async def test_changing_to_a_taken_number_is_a_409(client, auth):
    await make(client, auth, "A", account_number="111")
    other = (await make(client, auth, "B", account_number="222")).json()
    resp = await client.patch(f"{ACC}/{other['id']}", json={"account_number": "111"}, headers=auth)
    assert resp.status_code == 409
    assert (await client.get(f"{ACC}/{other['id']}", headers=auth)).json()[
        "account_number"
    ] == "222"


async def test_the_number_and_bank_can_be_cleared(client, auth):
    account = (await make(client, auth, bank="MIB", account_number="999")).json()
    cleared = await client.patch(
        f"{ACC}/{account['id']}", json={"bank": None, "account_number": None}, headers=auth
    )
    assert cleared.status_code == 200
    assert cleared.json()["bank"] is None
    assert cleared.json()["account_number"] is None
    # and the number can be used by another account now
    assert (await make(client, auth, "Next", account_number="999")).status_code == 201


async def test_another_user_may_have_the_same_number(client, auth, signup):
    await make(client, auth, account_number="7730000486374")
    other = await signup("other@example.com")
    assert (await make(client, other, account_number="7730000486374")).status_code == 201


async def test_bad_numbers_are_a_422(client, auth):
    assert (await make(client, auth, account_number="12/34")).status_code == 422
    assert (await make(client, auth, account_number="1" * 35)).status_code == 422
    assert (await client.get(ACC, headers=auth)).json() == []


async def test_search_finds_by_bank_and_number(client, auth):
    await make(client, auth, "Savings one", bank="BML", account_number="7730000486374")
    await make(client, auth, "Savings two", bank="MIB", account_number="90503101289701000")

    async def names(q):
        return [a["name"] for a in (await client.get(ACC, params={"q": q}, headers=auth)).json()]

    assert await names("mib") == ["Savings two"]
    assert await names("486374") == ["Savings one"]
    assert await names("90503 1012") == ["Savings two"]  # spaces in the search are ignored
    assert await names("zzz") == []


async def test_transactions_carry_their_accounts_bank_and_number(client, auth):
    account = (await make(client, auth, bank="BML", account_number="7730000486374")).json()
    resp = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": "5",
            "payment_method": "cash",
            "category": "Misc",
            "transaction_date": "2026-03-01",
            "account_id": account["id"],
        },
        headers=auth,
    )
    assert resp.status_code == 201, resp.text
    ref = resp.json()["account"]
    assert ref["bank"] == "BML"
    assert ref["account_number"] == "7730000486374"


async def test_backup_keeps_the_bank_and_number(client, auth, signup):
    await make(client, auth, bank="BML", account_number="7730000486374")
    backup = (await client.get("/api/v1/backup", headers=auth)).content
    fresh = await signup("fresh@example.com")
    resp = await client.post(
        "/api/v1/backup/restore",
        content=backup,
        headers={**fresh, "content-type": "application/json"},
    )
    assert resp.status_code == 200, resp.text
    restored = (await client.get(ACC, headers=fresh)).json()[0]
    assert restored["bank"] == "BML"
    assert restored["account_number"] == "7730000486374"
