import uuid
from datetime import date, timedelta
from decimal import Decimal

TX = "/api/v1/transactions"
ACC = "/api/v1/accounts"
STATS = "/api/v1/stats"
BUDGET = "/api/v1/budget"
TODAY = date.today()


async def account(client, headers, name="Wallet", group="cash", opening="100", **extra):
    resp = await client.post(
        ACC,
        json={"group": group, "name": name, "opening_amount": opening, **extra},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def spend(client, headers, amount, acc=None, category="Food", kind="expense", day=TODAY):
    body = {
        "type": kind,
        "amount": amount,
        "payment_method": "cash",
        "category": category,
        "transaction_date": day.isoformat(),
    }
    if acc:
        body["account_id"] = acc["id"]
    resp = await client.post(TX, json=body, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def balance(client, headers, acc) -> Decimal:
    return Decimal((await client.get(f"{ACC}/{acc['id']}", headers=headers)).json()["balance"])


async def adjust(client, headers, acc, **body):
    return await client.post(f"{ACC}/{acc['id']}/adjust", json=body, headers=headers)


async def month_expense(client, headers) -> Decimal:
    resp = await client.get(
        f"{STATS}/monthly", params={"months": 1, "to": TODAY.isoformat()}, headers=headers
    )
    return Decimal(resp.json()["months"][0]["expense"])


async def month_income(client, headers) -> Decimal:
    resp = await client.get(
        f"{STATS}/monthly", params={"months": 1, "to": TODAY.isoformat()}, headers=headers
    )
    return Decimal(resp.json()["months"][0]["income"])


# ── Credit limit ────────────────────────────────────────────────────────────────────────────


async def test_a_card_can_have_a_credit_limit(client, auth):
    card = await account(client, auth, "Visa", "card", "-300", credit_limit="10000")
    assert Decimal(card["credit_limit"]) == 10000
    assert Decimal(card["balance"]) == -300  # the limit changes no balance
    overdraft = await account(client, auth, "Overdraft", "overdrafts", "0", credit_limit="500")
    assert Decimal(overdraft["credit_limit"]) == 500


async def test_other_accounts_have_no_limit(client, auth):
    resp = await client.post(
        ACC,
        json={"group": "savings", "name": "Savings", "credit_limit": "100"},
        headers=auth,
    )
    assert resp.status_code == 422
    assert "credit limit" in resp.json()["detail"]
    savings = await account(client, auth, "Savings", "savings")
    assert savings["credit_limit"] is None


async def test_a_limit_is_not_negative(client, auth):
    resp = await client.post(
        ACC, json={"group": "card", "name": "Visa", "credit_limit": "-1"}, headers=auth
    )
    assert resp.status_code == 422


async def test_the_limit_can_be_changed_and_cleared(client, auth):
    card = await account(client, auth, "Visa", "card", "0", credit_limit="1000")
    raised = await client.patch(f"{ACC}/{card['id']}", json={"credit_limit": "2000"}, headers=auth)
    assert Decimal(raised.json()["credit_limit"]) == 2000
    cleared = await client.patch(f"{ACC}/{card['id']}", json={"credit_limit": None}, headers=auth)
    assert cleared.json()["credit_limit"] is None


async def test_moving_a_card_out_of_cards_drops_its_limit(client, auth):
    card = await account(client, auth, "Visa", "card", "0", credit_limit="1000")
    moved = await client.patch(f"{ACC}/{card['id']}", json={"group": "savings"}, headers=auth)
    assert moved.status_code == 200
    assert moved.json()["credit_limit"] is None
    refused = await client.patch(f"{ACC}/{card['id']}", json={"credit_limit": "5"}, headers=auth)
    assert refused.status_code == 422


# ── Exclude from stats ──────────────────────────────────────────────────────────────────────


async def test_the_flag_is_saved_and_shown(client, auth):
    acc = await account(client, auth, "Old", exclude_from_stats=True)
    assert acc["exclude_from_stats"] is True
    plain = await account(client, auth, "Plain")
    assert plain["exclude_from_stats"] is False
    tx = await spend(client, auth, "5", acc)
    assert tx["account"]["exclude_from_stats"] is True


async def test_an_excluded_account_is_out_of_the_overview_and_net_worth(client, auth):
    kept = await account(client, auth, "Kept", opening="100")
    await account(client, auth, "Relative card", opening="900", exclude_from_stats=True)
    summary = (await client.get(f"{ACC}/summary", headers=auth)).json()
    assert Decimal(summary["assets"]) == 100
    trend = (
        await client.get(
            f"{STATS}/balance-trend",
            params={"from": (TODAY - timedelta(days=1)).isoformat(), "to": TODAY.isoformat()},
            headers=auth,
        )
    ).json()
    assert Decimal(trend["points"][-1]["total"]) == 100
    # but its own balance is still right, and it is still listed
    listed = {a["name"]: a for a in (await client.get(ACC, headers=auth)).json()}
    assert Decimal(listed["Relative card"]["balance"]) == 900
    assert kept["name"] in listed


async def test_an_excluded_account_is_out_of_the_reports(client, auth):
    kept = await account(client, auth, "Kept")
    other = await account(client, auth, "Relative card", exclude_from_stats=True)
    await spend(client, auth, "10", kept)
    await spend(client, auth, "300", other)
    await spend(client, auth, "40", other, category="Salary", kind="income")

    assert await month_expense(client, auth) == 10
    assert await month_income(client, auth) == 0
    # the rows are all still listed
    assert len((await client.get(TX, headers=auth)).json()) == 3
    # list totals and category totals leave it out too
    # (they are given when a filter is on: a date range here)
    params = {"date_from": TODAY.isoformat()}
    categories = (await client.get(f"{TX}/categories", params=params, headers=auth)).json()
    assert {c["category"] for c in categories["categories"]} == {"Food"}


async def test_looking_at_the_excluded_account_itself_still_shows_its_totals(client, auth):
    other = await account(client, auth, "Relative card", exclude_from_stats=True)
    await spend(client, auth, "300", other)
    categories = (
        await client.get(f"{TX}/categories", params={"account_id": other["id"]}, headers=auth)
    ).json()
    assert Decimal(categories["categories"][0]["total"]) == 300


async def test_an_excluded_account_is_out_of_the_budget(client, auth):
    other = await account(client, auth, "Relative card", exclude_from_stats=True)
    await spend(client, auth, "300", other, category="Food")
    mine = await account(client, auth, "Mine")
    await spend(client, auth, "20", mine, category="Food")
    cats = (await client.get("/api/v1/categories", headers=auth)).json()
    food = next(c["id"] for c in cats if c["name"] == "Food")
    made = await client.post(
        f"{BUDGET}/lines",
        json={"name": "Food", "category_ids": [food], "amount": "1000"},
        headers=auth,
    )
    assert made.status_code in (200, 201), made.text
    budget = (await client.get(BUDGET, headers=auth)).json()
    assert Decimal(budget["lines"][0]["activity"]) == 20


async def test_the_flag_can_be_turned_off_again(client, auth):
    acc = await account(client, auth, "Card", exclude_from_stats=True)
    await spend(client, auth, "50", acc)
    assert await month_expense(client, auth) == 0
    resp = await client.patch(
        f"{ACC}/{acc['id']}", json={"exclude_from_stats": False}, headers=auth
    )
    assert resp.json()["exclude_from_stats"] is False
    assert await month_expense(client, auth) == 50


async def test_the_flag_cannot_be_null(client, auth):
    acc = await account(client, auth)
    resp = await client.patch(f"{ACC}/{acc['id']}", json={"exclude_from_stats": None}, headers=auth)
    assert resp.status_code == 422


# ── Balance adjustment ──────────────────────────────────────────────────────────────────────


async def test_adjusting_to_a_new_balance_up(client, auth):
    acc = await account(client, auth, opening="100")
    resp = await adjust(client, auth, acc, new_balance="140")
    assert resp.status_code == 201, resp.text
    made = resp.json()
    assert made["adjustment"] is True
    assert made["type"] == "income"
    assert Decimal(made["amount"]) == 40
    assert made["category"] == "Balance adjustment"
    assert made["description"] == "Balance adjustment"
    assert made["account"]["id"] == acc["id"]
    assert await balance(client, auth, acc) == 140


async def test_adjusting_to_a_new_balance_down(client, auth):
    acc = await account(client, auth, opening="100")
    resp = await adjust(client, auth, acc, new_balance="60.5", note="Cash I forgot")
    assert resp.json()["type"] == "expense"
    assert Decimal(resp.json()["amount"]) == Decimal("39.5")
    assert resp.json()["description"] == "Cash I forgot"
    assert await balance(client, auth, acc) == Decimal("60.5")


async def test_adjusting_by_an_amount(client, auth):
    acc = await account(client, auth, opening="100")
    await adjust(client, auth, acc, amount="25")
    await adjust(client, auth, acc, amount="-5")
    assert await balance(client, auth, acc) == 120


async def test_new_balance_works_from_the_balance_now(client, auth):
    acc = await account(client, auth, opening="100")
    await spend(client, auth, "30", acc)
    await adjust(client, auth, acc, new_balance="100")
    assert await balance(client, auth, acc) == 100


async def test_send_one_of_the_two(client, auth):
    acc = await account(client, auth)
    assert (await adjust(client, auth, acc)).status_code == 422
    assert (await adjust(client, auth, acc, new_balance="1", amount="1")).status_code == 422


async def test_nothing_to_adjust_is_a_422(client, auth):
    acc = await account(client, auth, opening="100")
    resp = await adjust(client, auth, acc, new_balance="100")
    assert resp.status_code == 422
    assert "already matches" in resp.json()["detail"]
    assert (await adjust(client, auth, acc, amount="0")).status_code == 422


async def test_an_adjustment_is_not_income_or_spending(client, auth):
    acc = await account(client, auth, opening="100")
    await spend(client, auth, "10", acc)
    await adjust(client, auth, acc, amount="500")  # an "income" of 500
    await adjust(client, auth, acc, amount="-70")  # an "expense" of 70
    assert await balance(client, auth, acc) == 520
    assert await month_expense(client, auth) == 10
    assert await month_income(client, auth) == 0
    categories = (
        await client.get(f"{TX}/categories", params={"date_from": TODAY.isoformat()}, headers=auth)
    ).json()
    assert {c["category"] for c in categories["categories"]} == {"Food"}
    # but the rows are listed, marked
    rows = (await client.get(TX, headers=auth)).json()
    assert sum(1 for r in rows if r["adjustment"]) == 2


async def test_an_adjustment_is_not_in_the_budget(client, auth):
    acc = await account(client, auth, opening="100")
    await adjust(client, auth, acc, amount="-70")
    cats = (await client.get("/api/v1/categories", headers=auth)).json()
    adj = next(c["id"] for c in cats if c["name"] == "Balance adjustment")
    made = await client.post(
        f"{BUDGET}/lines",
        json={"name": "Adj", "category_ids": [adj], "amount": "1000"},
        headers=auth,
    )
    assert made.status_code in (200, 201), made.text
    budget = (await client.get(BUDGET, headers=auth)).json()
    assert Decimal(budget["lines"][0]["activity"]) == 0


async def test_deleting_an_adjustment_undoes_it(client, auth):
    acc = await account(client, auth, opening="100")
    made = (await adjust(client, auth, acc, amount="40")).json()
    assert await balance(client, auth, acc) == 140
    assert (await client.delete(f"{TX}/{made['id']}", headers=auth)).status_code == 204
    assert await balance(client, auth, acc) == 100


async def test_an_adjustment_is_not_edited(client, auth):
    acc = await account(client, auth, opening="100")
    made = (await adjust(client, auth, acc, amount="40")).json()
    resp = await client.patch(f"{TX}/{made['id']}", json={"amount": "50"}, headers=auth)
    assert resp.status_code == 422
    assert "Delete it" in resp.json()["detail"]
    bulk = await client.patch(
        f"{TX}/bulk", json={"ids": [made["id"]], "category": "Food"}, headers=auth
    )
    assert bulk.json()["updated"] == 0
    assert "can't be changed" in bulk.json()["skipped"][0]["reason"]


async def test_an_adjustment_cannot_be_refunded_or_grouped(client, auth):
    acc = await account(client, auth, opening="100")
    expense = (await adjust(client, auth, acc, amount="-20")).json()
    refund = await client.post(
        TX,
        json={
            "type": "income",
            "amount": "5",
            "transaction_date": TODAY.isoformat(),
            "refund_of_id": expense["id"],
        },
        headers=auth,
    )
    assert refund.status_code == 422
    plain = await spend(client, auth, "5", acc)
    group = await client.post(
        "/api/v1/groups",
        json={"name": "G", "transaction_ids": [expense["id"], plain["id"]]},
        headers=auth,
    )
    assert group.status_code == 422
    assert "adjustment" in group.json()["detail"]


async def test_an_adjustment_can_be_backdated_and_changes_the_history(client, auth):
    acc = await account(client, auth, opening="100")
    start = TODAY - timedelta(days=5)
    resp = await adjust(
        client, auth, acc, amount="50", date=(TODAY - timedelta(days=3)).isoformat()
    )
    assert resp.status_code == 201
    trend = (
        await client.get(
            f"{STATS}/balance-trend",
            params={"from": start.isoformat(), "to": TODAY.isoformat()},
            headers=auth,
        )
    ).json()
    totals = {p["date"]: Decimal(p["total"]) for p in trend["points"]}
    assert totals[(TODAY - timedelta(days=4)).isoformat()] == 100
    assert totals[(TODAY - timedelta(days=3)).isoformat()] == 150
    assert totals[TODAY.isoformat()] == 150


async def test_a_foreign_account_is_adjusted_in_its_own_currency(client, auth):
    usd = await account(client, auth, "USD", "accounts", "10", currency="USD", exchange_rate="15")
    made = (await adjust(client, auth, usd, new_balance="12")).json()
    assert made["currency"] == "USD"
    assert Decimal(made["amount"]) == 2
    assert Decimal(made["base_amount"]) == 30
    assert await balance(client, auth, usd) == 12


async def test_not_on_an_archived_or_someone_elses_account(client, auth, signup):
    acc = await account(client, auth, opening="100")
    other = await signup("other@example.com")
    assert (await adjust(client, other, acc, amount="1")).status_code == 404
    assert (await adjust(client, auth, {"id": str(uuid.uuid4())}, amount="1")).status_code == 404
    await client.post(f"{ACC}/{acc['id']}/archive", headers=auth)
    assert (await adjust(client, auth, acc, amount="1")).status_code == 422


async def test_requires_a_login(client, auth):
    acc = await account(client, auth)
    resp = await client.post(f"{ACC}/{acc['id']}/adjust", json={"amount": "1"})
    assert resp.status_code == 401


async def test_adjustments_and_limits_survive_a_backup_and_restore(client, auth, signup):
    card = await account(
        client, auth, "Visa", "card", "-100", credit_limit="5000", exclude_from_stats=True
    )
    await adjust(client, auth, card, amount="-30")
    backup = (await client.get("/api/v1/backup", headers=auth)).content
    fresh = await signup("fresh@example.com")
    resp = await client.post(
        "/api/v1/backup/restore",
        content=backup,
        headers={**fresh, "content-type": "application/json"},
    )
    assert resp.status_code == 200, resp.text
    restored = (await client.get(ACC, headers=fresh)).json()[0]
    assert Decimal(restored["credit_limit"]) == 5000
    assert restored["exclude_from_stats"] is True
    rows = (await client.get(TX, headers=fresh)).json()
    assert [r["adjustment"] for r in rows] == [True]
