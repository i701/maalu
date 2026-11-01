import uuid
from decimal import Decimal

from app.services.group import GroupService
from sqlalchemy import select

TX = "/api/v1/transactions"
GROUPS = "/api/v1/groups"


async def tx(client, headers, kind="expense", amount="10", day="2026-03-01", **extra) -> str:
    body = {
        "type": kind,
        "amount": amount,
        "payment_method": "cash",
        "category": "Misc",
        "transaction_date": day,
        **extra,
    }
    resp = await client.post(TX, json=body, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def make_group(client, headers, ids, name="Trip", note=None):
    return await client.post(
        GROUPS, json={"name": name, "note": note, "transaction_ids": ids}, headers=headers
    )


async def pair(client, headers):
    return [await tx(client, headers), await tx(client, headers, amount="5")]


async def get_group(client, headers, group_id):
    resp = await client.get(f"{GROUPS}/{group_id}", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


async def test_create_and_summarise(client, auth):
    ids = [
        await tx(client, auth, "expense", "40", "2026-03-01"),
        await tx(client, auth, "expense", "60", "2026-03-05"),
        await tx(client, auth, "income", "30", "2026-03-09"),
    ]
    resp = await make_group(client, auth, ids, "  Treatment plan  ", "Dr. Smith")
    assert resp.status_code == 201, resp.text
    group = resp.json()
    assert group["name"] == "Treatment plan"
    assert group["note"] == "Dr. Smith"
    assert group["transaction_count"] == 3
    assert group["date_from"] == "2026-03-01"
    assert group["date_to"] == "2026-03-09"
    assert Decimal(group["money_in"]) == 30
    assert Decimal(group["money_out"]) == 100
    assert Decimal(group["net"]) == -70
    assert group["currency"] == "MVR"


async def test_the_group_changes_nothing_about_the_transactions(client, auth):
    ids = await pair(client, auth)
    before = (await client.get(f"{TX}/{ids[0]}", headers=auth)).json()
    stats = (
        await client.get(
            "/api/v1/stats/monthly", params={"months": 1, "to": "2026-03-15"}, headers=auth
        )
    ).json()["months"][0]
    assert Decimal(stats["expense"]) == 15
    group = (await make_group(client, auth, ids)).json()
    after = (await client.get(f"{TX}/{ids[0]}", headers=auth)).json()
    assert after["group"] == {"id": group["id"], "name": "Trip"}
    for key in ("amount", "category", "base_amount", "tags", "transaction_date"):
        assert after[key] == before[key]
    month = (
        await client.get(
            "/api/v1/stats/monthly", params={"months": 1, "to": "2026-03-15"}, headers=auth
        )
    ).json()["months"][0]
    assert Decimal(month["expense"]) == 15  # grouping did not move any money out of the stats


async def test_foreign_currency_is_summed_in_the_base_currency(client, auth):
    first = await tx(client, auth, "expense", "10", currency="USD", exchange_rate="15")
    second = await tx(client, auth, "expense", "100")
    group = (await make_group(client, auth, [first, second])).json()
    assert Decimal(group["money_out"]) == 250  # 10 USD at 15, plus 100 MVR


async def test_planned_and_trashed_transactions_count_for_nothing(client, auth):
    a = await tx(client, auth, "expense", "10")
    b = await tx(client, auth, "expense", "20")
    planned = await tx(client, auth, "expense", "500", planned=True)
    group = (await make_group(client, auth, [a, b, planned])).json()
    assert group["transaction_count"] == 3
    assert Decimal(group["money_out"]) == 30  # the planned one is not counted

    await client.delete(f"{TX}/{b}", headers=auth)
    detail = await get_group(client, auth, group["id"])
    assert detail["transaction_count"] == 2
    assert Decimal(detail["money_out"]) == 10
    assert {t["id"] for t in detail["transactions"]} == {a, planned}

    await client.post(f"{TX}/{b}/restore", headers=auth)
    assert (await get_group(client, auth, group["id"]))["transaction_count"] == 3


async def test_a_group_needs_two_to_fifty_transactions(client, auth):
    one = await tx(client, auth)
    assert (await make_group(client, auth, [one])).status_code == 422
    many = [str(uuid.uuid4()) for _ in range(51)]
    assert (await make_group(client, auth, many)).status_code == 422
    assert (await make_group(client, auth, [one, one])).status_code == 422
    assert (await client.get(GROUPS, headers=auth)).json() == []


async def test_name_is_required(client, auth):
    ids = await pair(client, auth)
    assert (await make_group(client, auth, ids, "   ")).status_code == 422


async def test_what_cannot_be_grouped(client, auth, signup):
    a, b = await pair(client, auth)
    # someone else's, and ones that do not exist
    other = await signup("other@example.com")
    theirs = await tx(client, other)
    assert (await make_group(client, auth, [a, theirs])).status_code == 422
    assert (await make_group(client, auth, [a, str(uuid.uuid4())])).status_code == 422
    # a transfer
    one = (
        await client.post(
            "/api/v1/accounts",
            json={"group": "cash", "name": "A", "opening_amount": "100"},
            headers=auth,
        )
    ).json()
    two = (
        await client.post(
            "/api/v1/accounts",
            json={"group": "cash", "name": "B", "opening_amount": "0"},
            headers=auth,
        )
    ).json()
    transfer = await client.post(
        TX,
        json={
            "type": "transfer",
            "amount": "5",
            "account_id": one["id"],
            "to_account_id": two["id"],
            "transaction_date": "2026-03-01",
        },
        headers=auth,
    )
    assert transfer.status_code == 201, transfer.text
    resp = await make_group(client, auth, [a, transfer.json()["id"]])
    assert resp.status_code == 422
    assert "transfer" in resp.json()["detail"]
    # one in the trash
    await client.delete(f"{TX}/{b}", headers=auth)
    assert (await make_group(client, auth, [a, b])).status_code == 422


async def test_a_transaction_is_in_one_group_only(client, auth):
    a, b = await pair(client, auth)
    c = await tx(client, auth)
    assert (await make_group(client, auth, [a, b])).status_code == 201
    clash = await make_group(client, auth, [b, c], "Second")
    assert clash.status_code == 422
    assert "already in a group" in clash.json()["detail"]


async def test_detail_lists_its_transactions_newest_first(client, auth):
    old = await tx(client, auth, day="2026-01-01")
    new = await tx(client, auth, day="2026-02-01")
    group = (await make_group(client, auth, [old, new])).json()
    detail = await get_group(client, auth, group["id"])
    assert [t["id"] for t in detail["transactions"]] == [new, old]
    assert detail["transactions"][0]["group"]["id"] == group["id"]


async def test_list_search_and_paging(client, auth):
    first = (await make_group(client, auth, await pair(client, auth), "Old trip")).json()
    second_ids = [
        await tx(client, auth, day="2026-06-01"),
        await tx(client, auth, day="2026-06-02"),
    ]
    second = (await make_group(client, auth, second_ids, "New trip", "Lisbon")).json()
    listed = (await client.get(GROUPS, headers=auth)).json()
    assert [g["id"] for g in listed] == [second["id"], first["id"]]  # latest activity first

    found = await client.get(GROUPS, params={"q": "lisbon"}, headers=auth)
    assert [g["id"] for g in found.json()] == [second["id"]]
    assert found.headers["x-total-count"] == "1"
    page = await client.get(GROUPS, params={"limit": 1, "offset": 1}, headers=auth)
    assert [g["id"] for g in page.json()] == [first["id"]]
    assert page.headers["x-total-count"] == "2"


async def test_rename_and_clear_the_note(client, auth):
    group = (await make_group(client, auth, await pair(client, auth), "Trip", "note")).json()
    resp = await client.patch(
        f"{GROUPS}/{group['id']}", json={"name": "Holiday", "note": None}, headers=auth
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Holiday"
    assert resp.json()["note"] is None
    assert (
        await client.patch(f"{GROUPS}/{group['id']}", json={"name": None}, headers=auth)
    ).status_code == 422


async def test_deleting_a_group_keeps_its_transactions(client, auth):
    ids = await pair(client, auth)
    group = (await make_group(client, auth, ids)).json()
    assert (await client.delete(f"{GROUPS}/{group['id']}", headers=auth)).status_code == 204
    assert (await client.get(f"{GROUPS}/{group['id']}", headers=auth)).status_code == 404
    for t in ids:
        assert (await client.get(f"{TX}/{t}", headers=auth)).json()["group"] is None


async def test_adding_to_a_group(client, auth):
    a, b = await pair(client, auth)
    group = (await make_group(client, auth, [a, b])).json()
    c = await tx(client, auth, amount="7")
    resp = await client.post(
        f"{GROUPS}/{group['id']}/transactions", json={"transaction_ids": [c]}, headers=auth
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["transaction_count"] == 3
    # adding one that is already in it is harmless
    again = await client.post(
        f"{GROUPS}/{group['id']}/transactions", json={"transaction_ids": [c]}, headers=auth
    )
    assert again.status_code == 200
    assert again.json()["transaction_count"] == 3


async def test_adding_one_from_another_group_is_refused(client, auth):
    a, b = await pair(client, auth)
    c, d = await pair(client, auth)
    first = (await make_group(client, auth, [a, b], "One")).json()
    await make_group(client, auth, [c, d], "Two")
    resp = await client.post(
        f"{GROUPS}/{first['id']}/transactions", json={"transaction_ids": [c]}, headers=auth
    )
    assert resp.status_code == 422


async def test_a_group_holds_at_most_fifty(client, auth):
    ids = [await tx(client, auth) for _ in range(50)]
    group = (await make_group(client, auth, ids)).json()
    extra = await tx(client, auth)
    resp = await client.post(
        f"{GROUPS}/{group['id']}/transactions", json={"transaction_ids": [extra]}, headers=auth
    )
    assert resp.status_code == 422
    assert "at most 50" in resp.json()["detail"]


async def test_removing_keeps_the_group_until_too_few_are_left(client, auth):
    ids = [await tx(client, auth) for _ in range(3)]
    group = (await make_group(client, auth, ids)).json()
    first = await client.post(
        f"{GROUPS}/{group['id']}/transactions/remove",
        json={"transaction_ids": [ids[0]]},
        headers=auth,
    )
    assert first.json() == {"removed": 1, "dissolved": False}
    assert (await client.get(f"{TX}/{ids[0]}", headers=auth)).json()["group"] is None

    last = await client.post(
        f"{GROUPS}/{group['id']}/transactions/remove",
        json={"transaction_ids": [ids[1]]},
        headers=auth,
    )
    assert last.json() == {"removed": 1, "dissolved": True}
    assert (await client.get(f"{GROUPS}/{group['id']}", headers=auth)).status_code == 404
    assert (await client.get(f"{TX}/{ids[2]}", headers=auth)).json()["group"] is None


async def test_deleting_a_member_for_good_can_dissolve_the_group(client, auth):
    a, b = await pair(client, auth)
    group = (await make_group(client, auth, [a, b])).json()
    await client.delete(f"{TX}/{a}", headers=auth)
    assert (await client.delete(f"{TX}/{a}/permanent", headers=auth)).status_code == 204
    assert (await client.get(f"{GROUPS}/{group['id']}", headers=auth)).status_code == 404
    assert (await client.get(f"{TX}/{b}", headers=auth)).json()["group"] is None


async def test_bulk_purge_can_dissolve_the_group(client, auth):
    a, b = await pair(client, auth)
    group = (await make_group(client, auth, [a, b])).json()
    await client.post(f"{TX}/bulk/trash", json={"ids": [a]}, headers=auth)
    resp = await client.post(f"{TX}/bulk/purge", json={"ids": [a]}, headers=auth)
    assert resp.json()["updated"] == 1
    assert (await client.get(f"{GROUPS}/{group['id']}", headers=auth)).status_code == 404


async def test_turning_a_member_into_a_transfer_takes_it_out(client, auth):
    a, b = await pair(client, auth)
    c = await tx(client, auth)
    group = (await make_group(client, auth, [a, b, c])).json()
    accounts = [
        (
            await client.post(
                "/api/v1/accounts",
                json={"group": "cash", "name": n, "opening_amount": "100"},
                headers=auth,
            )
        ).json()
        for n in ("A", "B")
    ]
    resp = await client.patch(
        f"{TX}/{a}",
        json={
            "type": "transfer",
            "account_id": accounts[0]["id"],
            "to_account_id": accounts[1]["id"],
        },
        headers=auth,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["group"] is None
    assert (await get_group(client, auth, group["id"]))["transaction_count"] == 2


async def test_other_users_get_not_found(client, auth, signup):
    group = (await make_group(client, auth, await pair(client, auth))).json()
    other = await signup("other@example.com")
    assert (await client.get(GROUPS, headers=other)).json() == []
    for call in (
        client.get(f"{GROUPS}/{group['id']}", headers=other),
        client.patch(f"{GROUPS}/{group['id']}", json={"name": "x"}, headers=other),
        client.delete(f"{GROUPS}/{group['id']}", headers=other),
        client.post(
            f"{GROUPS}/{group['id']}/transactions",
            json={"transaction_ids": [str(uuid.uuid4())]},
            headers=other,
        ),
    ):
        assert (await call).status_code == 404


async def test_requires_a_login(client):
    assert (await client.get(GROUPS)).status_code == 401


async def test_groups_are_in_the_backup_and_come_back_on_restore(client, auth, signup):
    ids = await pair(client, auth)
    await make_group(client, auth, ids, "Trip", "Lisbon")
    backup = (await client.get("/api/v1/backup", headers=auth)).content

    fresh = await signup("fresh@example.com")
    resp = await client.post(
        "/api/v1/backup/restore",
        content=backup,
        headers={**fresh, "content-type": "application/json"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["restored"]["transaction_groups"] == 1
    groups = (await client.get(GROUPS, headers=fresh)).json()
    assert [(g["name"], g["note"], g["transaction_count"]) for g in groups] == [
        ("Trip", "Lisbon", 2)
    ]


async def test_a_group_small_enough_to_dissolve_is_cleaned_by_the_service(client, auth):
    """`dissolve_undersized` leaves groups with two or more alone and ignores unknown ids."""
    ids = await pair(client, auth)
    group = (await make_group(client, auth, ids)).json()
    async with client.session_factory() as db:
        from app.models import User

        user = await db.scalar(select(User).where(User.email == "alice@example.com"))
        await GroupService(db).dissolve_undersized(
            user.id, {uuid.UUID(group["id"]), uuid.uuid4(), None}
        )
        await db.commit()
    assert (await client.get(f"{GROUPS}/{group['id']}", headers=auth)).status_code == 200
