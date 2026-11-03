from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient

from tests.conftest import Signup

TX = "/api/v1/transactions"
SUGGEST = f"{TX}/transfer-suggestions"
LINK = f"{TX}/link-transfer"
ACCOUNTS = "/api/v1/accounts"
TODAY = date.today()


async def account(client, auth, name, **extra) -> dict:
    body = {"group": "accounts", "name": name, "opening_amount": "1000", **extra}
    resp = await client.post(ACCOUNTS, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def entry(client, auth, kind, amount, acc, days_ago=0, **extra) -> dict:
    body = {
        "type": kind,
        "amount": str(amount),
        "payment_method": "bank_transfer",
        "category": "Misc",
        "transaction_date": (TODAY - timedelta(days=days_ago)).isoformat(),
        "account_id": acc["id"],
        **({"exchange_rate": "15.4"} if acc["currency"] != "MVR" else {}),
        **extra,
    }
    resp = await client.post(TX, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def pair(client, auth, amount=700, gap=0):
    bml = await account(client, auth, "BML Current")
    mib = await account(client, auth, "MIB Savings")
    out = await entry(client, auth, "expense", amount, bml, days_ago=1 + gap)
    inn = await entry(client, auth, "income", amount, mib, days_ago=1)
    return bml, mib, out, inn


async def suggestions(client, auth) -> list[dict]:
    resp = await client.get(SUGGEST, headers=auth)
    assert resp.status_code == 200, resp.text
    return resp.json()


async def link(client, auth, out, inn):
    return await client.post(
        LINK, json={"expense_id": out["id"], "income_id": inn["id"]}, headers=auth
    )


async def summary(client, auth) -> dict:
    return (await client.get(f"{TX}/summary", headers=auth)).json()


# --- suggestions -------------------------------------------------------------------------------


async def test_the_two_sides_of_one_move_are_suggested(client: AsyncClient, auth):
    _bml, _mib, out, inn = await pair(client, auth)
    found = await suggestions(client, auth)
    assert len(found) == 1
    assert found[0]["expense"]["id"] == out["id"]
    assert found[0]["income"]["id"] == inn["id"]
    assert found[0]["days_apart"] == 0


async def test_a_day_or_two_apart_is_still_a_pair_but_not_a_week(client: AsyncClient, auth):
    await pair(client, auth, gap=2)
    assert (await suggestions(client, auth))[0]["days_apart"] == 2
    bml = await account(client, auth, "Other BML")
    mib = await account(client, auth, "Other MIB")
    await entry(client, auth, "expense", 333, bml, days_ago=10)
    await entry(client, auth, "income", 333, mib, days_ago=1)
    assert len(await suggestions(client, auth)) == 1  # the 9-day gap is no pair


async def test_the_amounts_must_match_exactly(client: AsyncClient, auth):
    bml = await account(client, auth, "BML")
    mib = await account(client, auth, "MIB")
    await entry(client, auth, "expense", 700, bml)
    await entry(client, auth, "income", "700.01", mib)
    assert await suggestions(client, auth) == []


async def test_within_one_account_is_not_a_transfer(client: AsyncClient, auth):
    bml = await account(client, auth, "BML")
    await entry(client, auth, "expense", 50, bml)
    await entry(client, auth, "income", 50, bml)
    assert await suggestions(client, auth) == []


async def test_rows_without_an_account_are_not_suggested(client: AsyncClient, auth):
    bml = await account(client, auth, "BML")
    await entry(client, auth, "expense", 50, bml)
    body = {
        "type": "income",
        "amount": "50",
        "payment_method": "cash",
        "category": "Misc",
        "transaction_date": TODAY.isoformat(),
    }
    await client.post(TX, json=body, headers=auth)
    assert await suggestions(client, auth) == []


async def test_what_cannot_be_a_transfer_is_never_suggested(client: AsyncClient, auth):
    bml = await account(client, auth, "BML")
    mib = await account(client, auth, "MIB")
    # a purchase with items
    await entry(
        client,
        auth,
        "expense",
        100,
        bml,
        splits=[
            {"name": "A", "category": "X", "amount": "60"},
            {"name": "B", "category": "Y", "amount": "40"},
        ],
    )
    await entry(client, auth, "income", 100, mib)
    # a purchase with a refund
    bought = await entry(client, auth, "expense", 80, bml)
    refund = {
        "type": "income",
        "amount": "10",
        "transaction_date": TODAY.isoformat(),
        "refund_of_id": bought["id"],
    }
    await client.post(TX, json=refund, headers=auth)
    await entry(client, auth, "income", 80, mib)
    # a planned one
    await entry(client, auth, "expense", 60, bml, planned=True)
    await entry(client, auth, "income", 60, mib)
    assert await suggestions(client, auth) == []


async def test_a_refund_is_not_the_income_side(client: AsyncClient, auth):
    bml = await account(client, auth, "BML")
    mib = await account(client, auth, "MIB")
    bought = await entry(client, auth, "expense", 200, bml, days_ago=3)
    await entry(client, auth, "expense", 50, bml)
    refund = {
        "type": "income",
        "amount": "50",
        "transaction_date": TODAY.isoformat(),
        "refund_of_id": bought["id"],
        "account_id": mib["id"],
    }
    assert (await client.post(TX, json=refund, headers=auth)).status_code == 201
    assert await suggestions(client, auth) == []


async def test_a_transaction_is_in_at_most_one_pair_and_the_closest_wins(client: AsyncClient, auth):
    bml = await account(client, auth, "BML")
    mib = await account(client, auth, "MIB")
    far = await entry(client, auth, "expense", 100, bml, days_ago=2)
    near = await entry(client, auth, "expense", 100, bml, days_ago=1)
    await entry(client, auth, "income", 100, mib, days_ago=1)
    found = await suggestions(client, auth)
    assert len(found) == 1
    assert found[0]["expense"]["id"] == near["id"]  # the same day beats a day earlier
    assert far["id"] != near["id"]


async def test_other_currencies_are_not_matched_by_number(client: AsyncClient, auth):
    bml = await account(client, auth, "BML")
    usd = await account(client, auth, "Dollars", currency="USD", exchange_rate="15.4")
    await entry(client, auth, "expense", 100, bml)
    await entry(client, auth, "income", 100, usd)
    assert await suggestions(client, auth) == []  # MVR 100 is not USD 100


async def test_a_dismissed_pair_is_not_suggested_again(client: AsyncClient, auth):
    _bml, _mib, out, inn = await pair(client, auth)
    resp = await client.post(
        f"{SUGGEST}/dismiss", json={"expense_id": out["id"], "income_id": inn["id"]}, headers=auth
    )
    assert resp.status_code == 204
    assert await suggestions(client, auth) == []
    again = await client.post(  # dismissing twice is fine
        f"{SUGGEST}/dismiss", json={"expense_id": out["id"], "income_id": inn["id"]}, headers=auth
    )
    assert again.status_code == 204


async def test_dismissing_one_pair_leaves_the_others(client: AsyncClient, auth):
    _b, _m, out, inn = await pair(client, auth, amount=700)
    bml = await account(client, auth, "BML 2")
    mib = await account(client, auth, "MIB 2")
    await entry(client, auth, "expense", 90, bml)
    await entry(client, auth, "income", 90, mib)
    await client.post(
        f"{SUGGEST}/dismiss", json={"expense_id": out["id"], "income_id": inn["id"]}, headers=auth
    )
    assert [Decimal(s["expense"]["amount"]) for s in await suggestions(client, auth)] == [90]


async def test_suggestions_are_private(client: AsyncClient, auth, signup: Signup):
    await pair(client, auth)
    other = await signup("bob@example.com")
    assert await suggestions(client, other) == []
    resp = await client.post(
        f"{SUGGEST}/dismiss",
        json={
            "expense_id": "00000000-0000-0000-0000-000000000000",
            "income_id": "00000000-0000-0000-0000-000000000001",
        },
        headers=other,
    )
    assert resp.status_code == 404


async def test_they_need_a_login(client: AsyncClient):
    assert (await client.get(SUGGEST)).status_code == 401
    assert (await client.post(LINK, json={})).status_code == 401


# --- linking -----------------------------------------------------------------------------------


async def test_linking_makes_one_transfer_and_trashes_the_income(client: AsyncClient, auth):
    bml, mib, out, inn = await pair(client, auth)
    resp = await link(client, auth, out, inn)
    assert resp.status_code == 200, resp.text
    t = resp.json()
    assert t["id"] == out["id"]  # the expense row is the one that stays
    assert t["type"] == "transfer"
    assert t["account"]["id"] == bml["id"]
    assert t["to_account"]["id"] == mib["id"]
    assert Decimal(t["amount"]) == 700
    assert Decimal(t["to_amount"]) == 700
    assert t["category"] == "Transfer"
    assert t["vendor"] is None
    listed = (await client.get(TX, headers=auth)).json()
    assert [x["id"] for x in listed] == [out["id"]]
    assert [x["id"] for x in (await client.get(f"{TX}/trash", headers=auth)).json()] == [inn["id"]]


async def test_balances_do_not_change_but_the_reports_do(client: AsyncClient, auth):
    _bml, _mib, out, inn = await pair(client, auth)
    before = {
        a["id"]: Decimal(a["balance"]) for a in (await client.get(ACCOUNTS, headers=auth)).json()
    }
    totals = await summary(client, auth)
    assert Decimal(totals["income"]) == 700
    assert Decimal(totals["expense"]) == 700

    await link(client, auth, out, inn)
    after = {
        a["id"]: Decimal(a["balance"]) for a in (await client.get(ACCOUNTS, headers=auth)).json()
    }
    assert after == before  # the money is exactly where it was
    totals = await summary(client, auth)
    assert Decimal(totals["income"]) == 0  # nothing was earned or spent
    assert Decimal(totals["expense"]) == 0


async def test_the_pair_stops_being_suggested_once_linked(client: AsyncClient, auth):
    _b, _m, out, inn = await pair(client, auth)
    await link(client, auth, out, inn)
    assert await suggestions(client, auth) == []


async def test_notes_and_tags_of_both_are_kept(client: AsyncClient, auth):
    bml = await account(client, auth, "BML")
    mib = await account(client, auth, "MIB")
    out = await entry(client, auth, "expense", 40, bml, tags=["cash", "shared"])
    inn = await entry(
        client, auth, "income", 40, mib, tags=["shared", "savings"], description="From BML"
    )
    t = (await link(client, auth, out, inn)).json()
    assert [x["name"] for x in t["tags"]] == ["cash", "savings", "shared"]
    assert t["description"] == "From BML"  # the expense had none, so the income's note stays


async def test_the_expenses_own_note_wins(client: AsyncClient, auth):
    bml = await account(client, auth, "BML")
    mib = await account(client, auth, "MIB")
    out = await entry(client, auth, "expense", 40, bml, description="Top up")
    inn = await entry(client, auth, "income", 40, mib, description="Received")
    assert (await link(client, auth, out, inn)).json()["description"] == "Top up"


async def test_the_vendor_and_subscription_of_the_expense_are_dropped(client: AsyncClient, auth):
    bml = await account(client, auth, "BML")
    mib = await account(client, auth, "MIB")
    out = await entry(client, auth, "expense", 40, bml, vendor_name="Some Shop")
    inn = await entry(client, auth, "income", 40, mib)
    t = (await link(client, auth, out, inn)).json()
    assert t["vendor"] is None
    assert t["subscription"] is None


async def test_two_sides_in_different_currencies_become_one_cross_currency_transfer(
    client: AsyncClient, auth
):
    bml = await account(client, auth, "BML")
    usd = await account(client, auth, "Dollars", currency="USD", exchange_rate="15.4")
    out = await entry(client, auth, "expense", 154, bml)
    inn = await entry(client, auth, "income", 10, usd)
    resp = await link(client, auth, out, inn)  # you can still link them by hand
    assert resp.status_code == 200, resp.text
    t = resp.json()
    assert (Decimal(t["amount"]), Decimal(t["to_amount"])) == (154, 10)
    assert t["to_account"]["id"] == usd["id"]


async def test_a_pair_in_the_wrong_order_is_refused(client: AsyncClient, auth):
    _b, _m, out, inn = await pair(client, auth)
    resp = await client.post(
        LINK, json={"expense_id": inn["id"], "income_id": out["id"]}, headers=auth
    )
    assert resp.status_code == 422


async def test_the_same_account_cannot_be_linked(client: AsyncClient, auth):
    bml = await account(client, auth, "BML")
    out = await entry(client, auth, "expense", 30, bml)
    inn = await entry(client, auth, "income", 30, bml)
    resp = await link(client, auth, out, inn)
    assert resp.status_code == 422
    assert "one account" in resp.text


@pytest.mark.parametrize("what", ["items", "refunds", "planned", "refund_income", "no_account"])
async def test_what_cannot_be_linked_is_refused_and_nothing_changes(
    client: AsyncClient, auth, what
):
    bml = await account(client, auth, "BML")
    mib = await account(client, auth, "MIB")
    extra: dict = {}
    if what == "items":
        extra = {
            "splits": [
                {"name": "A", "category": "X", "amount": "20"},
                {"name": "B", "category": "Y", "amount": "20"},
            ]
        }
    if what == "planned":
        extra = {"planned": True}
    out = await entry(client, auth, "expense", 40, bml, **extra)
    inn_body = {"account": mib}
    if what == "no_account":
        body = {
            "type": "income",
            "amount": "40",
            "payment_method": "cash",
            "category": "Misc",
            "transaction_date": TODAY.isoformat(),
        }
        inn = (await client.post(TX, json=body, headers=auth)).json()
    elif what == "refund_income":
        refund = {
            "type": "income",
            "amount": "40",
            "transaction_date": TODAY.isoformat(),
            "refund_of_id": out["id"],
            "account_id": mib["id"],
        }
        inn = (await client.post(TX, json=refund, headers=auth)).json()
        out = await entry(client, auth, "expense", 40, bml)
    else:
        inn = await entry(client, auth, "income", 40, inn_body["account"])
    if what == "refunds":
        refund = {
            "type": "income",
            "amount": "5",
            "transaction_date": TODAY.isoformat(),
            "refund_of_id": out["id"],
        }
        await client.post(TX, json=refund, headers=auth)
    resp = await link(client, auth, out, inn)
    assert resp.status_code == 422, resp.text
    still = (await client.get(f"{TX}/{out['id']}", headers=auth)).json()
    assert still["type"] == "expense"
    assert (await client.get(f"{TX}/{inn['id']}", headers=auth)).json()["type"] == "income"
    assert (await client.get(f"{TX}/trash", headers=auth)).json() == []


async def test_an_adjustment_or_a_trashed_row_cannot_be_linked(client: AsyncClient, auth):
    bml = await account(client, auth, "BML")
    mib = await account(client, auth, "MIB")
    adj = (
        await client.post(f"{ACCOUNTS}/{mib['id']}/adjust", json={"amount": "40"}, headers=auth)
    ).json()
    out = await entry(client, auth, "expense", 40, bml)
    assert (await link(client, auth, out, adj)).status_code == 422
    inn = await entry(client, auth, "income", 40, mib)
    await client.delete(f"{TX}/{inn['id']}", headers=auth)
    assert (await link(client, auth, out, inn)).status_code == 422


async def test_someone_elses_transactions_are_a_404(client: AsyncClient, auth, signup: Signup):
    _b, _m, out, inn = await pair(client, auth)
    other = await signup("bob@example.com")
    assert (await link(client, other, out, inn)).status_code == 404


async def test_a_linked_row_in_a_group_leaves_it_and_a_small_group_is_dissolved(
    client: AsyncClient, auth
):
    bml, _mib, out, inn = await pair(client, auth)
    extra = await entry(client, auth, "expense", 12, bml)
    group = await client.post(
        "/api/v1/groups",
        json={"name": "Trip", "transaction_ids": [out["id"], extra["id"]]},
        headers=auth,
    )
    assert group.status_code == 201, group.text
    assert (await link(client, auth, out, inn)).status_code == 200
    assert (await client.get("/api/v1/groups", headers=auth)).json() == []  # one left: dissolved


async def test_a_link_survives_a_backup_and_so_do_dismissals(
    client: AsyncClient, auth, signup: Signup
):
    _b, _m, out, inn = await pair(client, auth)
    other_b = await account(client, auth, "BML 2")
    other_m = await account(client, auth, "MIB 2")
    x = await entry(client, auth, "expense", 90, other_b)
    y = await entry(client, auth, "income", 90, other_m)
    await link(client, auth, out, inn)
    await client.post(
        f"{SUGGEST}/dismiss", json={"expense_id": x["id"], "income_id": y["id"]}, headers=auth
    )
    backup = (await client.get("/api/v1/backup", headers=auth)).content
    fresh = await signup("restore@example.com")
    assert (
        await client.post("/api/v1/backup/restore", content=backup, headers=fresh)
    ).status_code == 200
    assert await suggestions(client, fresh) == []  # the dismissal came across
    kinds = sorted(t["type"] for t in (await client.get(TX, headers=fresh)).json())
    assert kinds == ["expense", "income", "transfer"]  # the merged one, and the two dismissed
