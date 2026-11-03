from datetime import date, timedelta
from decimal import Decimal

from app.services import snapshot as snapshots
from httpx import AsyncClient

from tests.conftest import Signup
from tests.test_stats import ACC, STATS, TX, account, money

TODAY = snapshots._today()
URL = f"{STATS}/net-worth-drivers"


def days_ago(n: int) -> date:
    return TODAY - timedelta(days=n)


async def drivers(client: AsyncClient, auth, start: date, end: date) -> dict:
    resp = await client.get(
        URL, params={"from": start.isoformat(), "to": end.isoformat()}, headers=auth
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    amounts = {d["key"]: Decimal(d["amount"]) for d in body["drivers"]}
    # the drivers explain the change exactly, and the change is end less start
    assert sum(amounts.values()) == Decimal(body["change"])
    assert Decimal(body["end"]) - Decimal(body["start"]) == Decimal(body["change"])
    assert sum(Decimal(a["change"]) for a in body["accounts"]) == Decimal(body["change"])
    body["by"] = amounts
    return body


async def test_income_and_spending_explain_the_change(client: AsyncClient, auth):
    wallet = await account(client, auth, "Wallet", opening_amount="1000")
    await money(client, auth, "income", "500", days_ago(5), account_id=wallet["id"])
    await money(client, auth, "expense", "200", days_ago(3), account_id=wallet["id"])
    body = await drivers(client, auth, days_ago(7), TODAY)
    assert (body["start"], body["end"], body["change"]) == ("1000.0000", "1300.0000", "300.0000")
    assert body["by"] == {
        "income": 500,
        "spending": -200,
        "adjustments": 0,
        "transfers": 0,
        "exchange_rates": 0,
    }
    assert body["currency"] == "MVR"
    assert (body["start_date"], body["end_date"]) == (days_ago(7).isoformat(), TODAY.isoformat())


async def test_the_period_is_whole_days_and_nothing_outside_it_counts(client: AsyncClient, auth):
    wallet = await account(client, auth, "Wallet", opening_amount="100")
    await money(client, auth, "income", "10", days_ago(10), account_id=wallet["id"])  # before
    await money(client, auth, "income", "20", days_ago(6), account_id=wallet["id"])  # first day
    await money(client, auth, "income", "40", days_ago(2), account_id=wallet["id"])  # last day
    await money(client, auth, "income", "80", days_ago(1), account_id=wallet["id"])  # after
    body = await drivers(client, auth, days_ago(6), days_ago(2))
    assert body["start"] == "110.0000"  # opening plus what came in before the period
    assert body["by"]["income"] == 60
    assert body["end"] == "170.0000"


async def test_a_refund_takes_away_from_spending(client: AsyncClient, auth):
    wallet = await account(client, auth, "Wallet", opening_amount="1000")
    resp = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": "100",
            "payment_method": "cash",
            "category": "Misc",
            "transaction_date": days_ago(5).isoformat(),
            "account_id": wallet["id"],
        },
        headers=auth,
    )
    purchase = resp.json()
    await money(
        client,
        auth,
        "income",
        "30",
        days_ago(2),
        account_id=wallet["id"],
        refund_of_id=purchase["id"],
        category="Misc",
    )
    body = await drivers(client, auth, days_ago(7), TODAY)
    assert body["by"]["spending"] == -70
    assert body["by"]["income"] == 0


async def test_a_transfer_between_two_accounts_that_count_changes_nothing(
    client: AsyncClient, auth
):
    a = await account(client, auth, "A", opening_amount="500")
    b = await account(client, auth, "B", opening_amount="0")
    await client.post(
        TX,
        json={
            "type": "transfer",
            "amount": "200",
            "payment_method": "bank_transfer",
            "transaction_date": days_ago(3).isoformat(),
            "account_id": a["id"],
            "to_account_id": b["id"],
        },
        headers=auth,
    )
    body = await drivers(client, auth, days_ago(7), TODAY)
    assert body["change"] == "0.0000"
    assert body["by"]["transfers"] == 0
    rows = {r["name"]: r for r in body["accounts"]}
    assert (rows["A"]["change"], rows["B"]["change"]) == ("-200.0000", "200.0000")


async def test_a_transfer_to_an_account_that_does_not_count_leaves_net_worth(
    client: AsyncClient, auth
):
    a = await account(client, auth, "A", opening_amount="500")
    savings = await account(client, auth, "Outside", opening_amount="0", exclude_from_stats=True)
    await client.post(
        TX,
        json={
            "type": "transfer",
            "amount": "200",
            "payment_method": "bank_transfer",
            "transaction_date": days_ago(3).isoformat(),
            "account_id": a["id"],
            "to_account_id": savings["id"],
        },
        headers=auth,
    )
    body = await drivers(client, auth, days_ago(7), TODAY)
    assert body["by"]["transfers"] == -200
    assert body["change"] == "-200.0000"
    assert [r["name"] for r in body["accounts"]] == ["A"]


async def test_a_balance_adjustment_is_its_own_driver(client: AsyncClient, auth):
    wallet = await account(client, auth, "Wallet", opening_amount="100")
    resp = await client.post(
        f"{ACC}/{wallet['id']}/adjust",
        json={"new_balance": "130", "date": days_ago(3).isoformat()},
        headers=auth,
    )
    assert resp.status_code == 201, resp.text
    body = await drivers(client, auth, days_ago(7), TODAY)
    assert body["by"]["adjustments"] == 30
    assert body["by"]["income"] == 0
    assert body["change"] == "30.0000"


async def test_exchange_rate_changes_are_what_is_left(client: AsyncClient, auth):
    usd = await account(
        client, auth, "USD", opening_amount="100", currency="USD", exchange_rate="15"
    )
    await money(
        client, auth, "income", "50", days_ago(6), account_id=usd["id"],
        currency="USD", exchange_rate="15",
    )  # fmt: skip
    await money(
        client, auth, "expense", "10", days_ago(2), account_id=usd["id"],
        currency="USD", exchange_rate="15",
    )  # fmt: skip
    start = days_ago(4)  # after the account's first snapshot, so the old rate is kept
    first = await drivers(client, auth, start, TODAY)  # also makes the snapshots
    assert first["by"]["exchange_rates"] == 0
    assert (first["start"], first["end"]) == ("2250.0000", "2100.0000")

    resp = await client.patch(f"{ACC}/{usd['id']}", json={"exchange_rate": "16"}, headers=auth)
    assert resp.status_code == 200, resp.text
    after = await drivers(client, auth, start, TODAY)
    # the past kept its old rate; today is worth 140 USD at 16, 140 more than the flows explain
    assert after["start"] == "2250.0000"
    assert after["end"] == "2240.0000"
    assert after["by"]["spending"] == -150
    assert after["by"]["exchange_rates"] == 140
    assert after["accounts"][0]["currency"] == "USD"


async def test_everything_in_the_base_currency_has_no_exchange_effect(client: AsyncClient, auth):
    wallet = await account(client, auth, "Wallet", opening_amount="10.5")
    await money(client, auth, "income", "3.33", days_ago(4), account_id=wallet["id"])
    await money(client, auth, "expense", "1.11", days_ago(2), account_id=wallet["id"])
    body = await drivers(client, auth, days_ago(7), TODAY)
    assert body["by"]["exchange_rates"] == 0


async def test_a_debt_counts_below_zero(client: AsyncClient, auth):
    card = await account(client, auth, "Card", group="card", opening_amount="0")
    await money(client, auth, "expense", "300", days_ago(2), account_id=card["id"])
    body = await drivers(client, auth, days_ago(7), TODAY)
    assert body["end"] == "-300.0000"
    assert body["by"]["spending"] == -300


async def test_archived_excluded_planned_and_trashed_do_not_count(client: AsyncClient, auth):
    wallet = await account(client, auth, "Wallet", opening_amount="100")
    old = await account(client, auth, "Old", opening_amount="900")
    hidden = await account(client, auth, "Hidden", opening_amount="900", exclude_from_stats=True)
    await money(client, auth, "income", "50", days_ago(3), account_id=old["id"])
    await money(client, auth, "income", "50", days_ago(3), account_id=hidden["id"])
    await client.post(f"{ACC}/{old['id']}/archive", headers=auth)
    await money(client, auth, "income", "70", days_ago(3), account_id=wallet["id"], planned=True)
    gone = await client.post(
        TX,
        json={
            "type": "income",
            "amount": "90",
            "payment_method": "cash",
            "category": "Misc",
            "transaction_date": days_ago(3).isoformat(),
            "account_id": wallet["id"],
        },
        headers=auth,
    )
    await client.delete(f"{TX}/{gone.json()['id']}", headers=auth)
    body = await drivers(client, auth, days_ago(7), TODAY)
    assert (body["start"], body["end"], body["change"]) == ("100.0000", "100.0000", "0.0000")
    assert [r["name"] for r in body["accounts"]] == ["Wallet"]


async def test_accounts_are_listed_biggest_change_first_without_the_empty_ones(
    client: AsyncClient, auth
):
    big = await account(client, auth, "Big", opening_amount="0")
    small = await account(client, auth, "Small", opening_amount="0")
    await account(client, auth, "Empty", opening_amount="0")
    await money(client, auth, "income", "10", days_ago(3), account_id=small["id"])
    await money(client, auth, "income", "400", days_ago(3), account_id=big["id"])
    body = await drivers(client, auth, days_ago(7), TODAY)
    assert [r["name"] for r in body["accounts"]] == ["Big", "Small"]


async def test_a_period_wholly_in_the_past_agrees_with_the_balance_trend(client: AsyncClient, auth):
    wallet = await account(client, auth, "Wallet", opening_amount="100")
    await money(client, auth, "income", "40", days_ago(10), account_id=wallet["id"])
    await money(client, auth, "expense", "15", days_ago(8), account_id=wallet["id"])
    body = await drivers(client, auth, days_ago(11), days_ago(7))
    trend = (
        await client.get(
            f"{STATS}/balance-trend",
            params={"from": days_ago(12).isoformat(), "to": days_ago(7).isoformat()},
            headers=auth,
        )
    ).json()["points"]
    by_day = {p["date"]: p["total"] for p in trend}
    assert body["start"] == by_day[days_ago(12).isoformat()]
    assert body["end"] == by_day[days_ago(7).isoformat()]


async def test_one_day_works(client: AsyncClient, auth):
    wallet = await account(client, auth, "Wallet", opening_amount="0")
    await money(client, auth, "income", "25", days_ago(2), account_id=wallet["id"])
    body = await drivers(client, auth, days_ago(2), days_ago(2))
    assert body["change"] == "25.0000"


async def test_no_accounts_is_all_zero(client: AsyncClient, auth):
    body = await drivers(client, auth, days_ago(7), TODAY)
    assert body["change"] == "0.0000"
    assert body["accounts"] == []
    assert [d["key"] for d in body["drivers"]] == [
        "income",
        "spending",
        "adjustments",
        "transfers",
        "exchange_rates",
    ]


async def test_dates_must_be_in_order_and_it_needs_a_session(client: AsyncClient, auth):
    backwards = await client.get(
        URL, params={"from": TODAY.isoformat(), "to": days_ago(3).isoformat()}, headers=auth
    )
    assert backwards.status_code == 422
    assert (
        await client.get(URL, params={"from": TODAY.isoformat(), "to": TODAY.isoformat()})
    ).status_code == 401


async def test_only_your_own_money_counts(client: AsyncClient, signup: Signup):
    mine = await signup("alice@example.com")
    theirs = await signup("bob@example.com")
    a = await account(client, mine, "Mine", opening_amount="100")
    b = await account(client, theirs, "Theirs", opening_amount="9999")
    await money(client, mine, "income", "10", days_ago(2), account_id=a["id"])
    await money(client, theirs, "income", "999", days_ago(2), account_id=b["id"])
    body = await drivers(client, mine, days_ago(7), TODAY)
    assert body["end"] == "110.0000"
    assert [r["name"] for r in body["accounts"]] == ["Mine"]
