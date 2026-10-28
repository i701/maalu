from datetime import date, timedelta

from app.budget_period import period_bounds
from httpx import AsyncClient

from tests.conftest import Signup

GOALS = "/api/v1/goals"
ACC = "/api/v1/accounts"
TX = "/api/v1/transactions"
TODAY = date.today()


async def goal(client: AsyncClient, auth, **extra):
    body = {"name": "Trip fund", "target_amount": "10000", **extra}
    resp = await client.post(GOALS, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def entry(client: AsyncClient, auth, goal_id: str, amount: str, **extra):
    return await client.post(
        f"{GOALS}/{goal_id}/entries", json={"amount": amount, **extra}, headers=auth
    )


async def account(client: AsyncClient, auth, name: str, group="savings", **extra) -> dict:
    resp = await client.post(ACC, json={"name": name, "group": group, **extra}, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def transfer(client: AsyncClient, auth, src: str, dst: str, amount: str, day=TODAY):
    body = {
        "type": "transfer",
        "amount": amount,
        "transaction_date": day.isoformat(),
        "account_id": src,
        "to_account_id": dst,
    }
    resp = await client.post(TX, json=body, headers=auth)
    assert resp.status_code == 201, resp.text


async def test_requires_auth(client: AsyncClient):
    assert (await client.get(GOALS)).status_code == 401


async def test_new_manual_goal_starts_empty(client: AsyncClient, auth):
    g = await goal(client, auth)
    assert g["mode"] == "manual"
    assert (g["saved"], g["remaining"], g["percent"], g["reached"]) == (
        "0.0000",
        "10000.0000",
        0,
        False,
    )
    assert g["currency"] == "MVR"
    assert g["entries"] == []
    assert (g["months_left"], g["needed_per_month"], g["period_status"]) == (None, None, None)


async def test_setting_money_aside_and_taking_it_out(client: AsyncClient, auth):
    g = await goal(client, auth)
    await entry(client, auth, g["id"], "2500")
    await entry(client, auth, g["id"], "500", note="bonus")
    out = await entry(client, auth, g["id"], "-1000")
    assert out.status_code == 201, out.text
    body = out.json()
    assert (body["saved"], body["remaining"], body["percent"]) == ("2000.0000", "8000.0000", 20)
    assert len(body["entries"]) == 3
    assert any(e["note"] == "bonus" for e in body["entries"])

    too_much = await entry(client, auth, g["id"], "-5000")
    assert too_much.status_code == 422
    assert (await entry(client, auth, g["id"], "0")).status_code == 422


async def test_goal_is_reached(client: AsyncClient, auth):
    g = await goal(client, auth, target_amount="1000")
    body = (await entry(client, auth, g["id"], "1200")).json()
    assert (body["reached"], body["remaining"], body["percent"]) == (True, "0.0000", 120)
    assert body["needed_per_month"] is None


async def test_target_date_gives_months_left_and_what_to_save_each_month(client: AsyncClient, auth):
    g = await goal(
        client, auth, target_amount="9000", target_date=(TODAY + timedelta(days=100)).isoformat()
    )
    assert g["months_left"] == 4  # 100 days = 3.3 months, rounded up
    assert g["needed_per_month"] == "2250.0000"

    after = (await entry(client, auth, g["id"], "3000")).json()
    assert after["needed_per_month"] == "1500.0000"

    passed = await goal(
        client, auth, name="Old", target_date=(TODAY - timedelta(days=1)).isoformat()
    )
    assert (passed["months_left"], passed["needed_per_month"]) == (0, None)


async def test_goal_following_an_account_uses_its_balance(client: AsyncClient, auth):
    main = await account(client, auth, "Main", group="accounts", opening_amount="5000")
    fund = await account(client, auth, "Trip savings", opening_amount="1000")
    g = await goal(client, auth, account_id=fund["id"], target_amount="4000")
    assert (g["mode"], g["saved"], g["percent"]) == ("account", "1000.0000", 25)
    assert g["account"]["name"] == "Trip savings"

    await transfer(client, auth, main["id"], fund["id"], "1500")
    now = (await client.get(f"{GOALS}/{g['id']}", headers=auth)).json()
    assert (now["saved"], now["percent"]) == ("2500.0000", 62)

    manual = await entry(client, auth, g["id"], "10")
    assert manual.status_code == 422  # it follows the account, not a log


async def test_account_rules(client: AsyncClient, auth, signup: Signup):
    fund = await account(client, auth, "Savings")
    card = await account(client, auth, "Visa", group="card")
    await goal(client, auth, account_id=fund["id"])

    taken = await client.post(
        GOALS, json={"name": "B", "target_amount": "1", "account_id": fund["id"]}, headers=auth
    )
    assert taken.status_code == 409
    liability = await client.post(
        GOALS, json={"name": "B", "target_amount": "1", "account_id": card["id"]}, headers=auth
    )
    assert liability.status_code == 422
    nothing = await client.post(
        GOALS,
        json={
            "name": "B",
            "target_amount": "1",
            "account_id": "00000000-0000-0000-0000-000000000000",
        },
        headers=auth,
    )
    assert nothing.status_code == 422

    bob = await signup("bob@example.com")
    others = await client.post(
        GOALS, json={"name": "B", "target_amount": "1", "account_id": fund["id"]}, headers=bob
    )
    assert others.status_code == 422  # not his account


async def test_switching_between_account_and_log(client: AsyncClient, auth):
    fund = await account(client, auth, "Savings", opening_amount="700")
    g = await goal(client, auth)
    await entry(client, auth, g["id"], "100")

    linked = await client.patch(f"{GOALS}/{g['id']}", json={"account_id": fund["id"]}, headers=auth)
    assert (linked.json()["mode"], linked.json()["saved"]) == ("account", "700.0000")
    unlinked = await client.patch(f"{GOALS}/{g['id']}", json={"account_id": None}, headers=auth)
    assert (unlinked.json()["mode"], unlinked.json()["saved"]) == ("manual", "100.0000")


async def test_deleting_the_account_falls_back_to_the_log(client: AsyncClient, auth):
    fund = await account(client, auth, "Savings", opening_amount="700")
    g = await goal(client, auth, account_id=fund["id"])
    assert (await client.delete(f"{ACC}/{fund['id']}", headers=auth)).status_code == 204
    after = (await client.get(f"{GOALS}/{g['id']}", headers=auth)).json()
    assert (after["mode"], after["saved"]) == ("manual", "0.0000")


async def test_monthly_plan_is_checked_against_this_periods_contributions(
    client: AsyncClient, auth
):
    g = await goal(client, auth, monthly_amount="1000")
    assert (g["period_status"], g["period_contributed"]) == ("pending", "0.0000")

    start, end = period_bounds(TODAY, 1)
    await entry(client, auth, g["id"], "400")
    await entry(client, auth, g["id"], "5000", entry_date=(start - timedelta(days=1)).isoformat())
    half = (await client.get(f"{GOALS}/{g['id']}", headers=auth)).json()
    assert (half["period_contributed"], half["period_status"]) == ("400.0000", "pending")

    await entry(client, auth, g["id"], "600")
    full = (await client.get(f"{GOALS}/{g['id']}", headers=auth)).json()
    assert (full["period_contributed"], full["period_status"]) == ("1000.0000", "funded")

    # asking about last period finds only what was set aside then
    earlier = (
        await client.get(
            GOALS, params={"on": (start - timedelta(days=1)).isoformat()}, headers=auth
        )
    ).json()[0]
    assert earlier["period_contributed"] == "5000.0000"
    assert end >= TODAY  # the entries above really fall in the current period


async def test_account_goal_counts_transfers_into_the_account_as_contributions(
    client: AsyncClient, auth
):
    main = await account(client, auth, "Main", group="accounts", opening_amount="9000")
    fund = await account(client, auth, "Trip savings")
    g = await goal(client, auth, account_id=fund["id"], monthly_amount="1000")
    await transfer(client, auth, main["id"], fund["id"], "1200")
    await transfer(client, auth, fund["id"], main["id"], "200")  # taken back out
    # an expense or income on the account is not a contribution
    income = {
        "type": "income",
        "amount": "50",
        "payment_method": "other",
        "category": "Interest",
        "transaction_date": TODAY.isoformat(),
        "account_id": fund["id"],
    }
    assert (await client.post(TX, json=income, headers=auth)).status_code == 201
    got = (await client.get(f"{GOALS}/{g['id']}", headers=auth)).json()
    assert (got["period_contributed"], got["period_status"]) == ("1000.0000", "funded")
    assert got["saved"] == "1050.0000"  # the balance still includes the interest


async def test_update_delete_and_isolation(client: AsyncClient, auth, signup: Signup):
    g = await goal(client, auth, target_date=(TODAY + timedelta(days=30)).isoformat())
    patched = await client.patch(
        f"{GOALS}/{g['id']}",
        json={
            "name": "Holiday",
            "target_amount": "5000",
            "target_date": None,
            "monthly_amount": "250",
        },
        headers=auth,
    )
    body = patched.json()
    assert (body["name"], body["target_amount"], body["target_date"]) == (
        "Holiday",
        "5000.0000",
        None,
    )
    assert body["monthly_amount"] == "250.0000"
    assert (
        await client.patch(f"{GOALS}/{g['id']}", json={"name": None}, headers=auth)
    ).status_code == 422

    bob = await signup("bob@example.com")
    assert (await client.get(GOALS, headers=bob)).json() == []
    assert (await client.get(f"{GOALS}/{g['id']}", headers=bob)).status_code == 404
    assert (await client.delete(f"{GOALS}/{g['id']}", headers=bob)).status_code == 404

    assert (await client.delete(f"{GOALS}/{g['id']}", headers=auth)).status_code == 204
    assert (await client.get(GOALS, headers=auth)).json() == []


async def test_removing_an_entry(client: AsyncClient, auth):
    g = await goal(client, auth)
    first = (await entry(client, auth, g["id"], "300")).json()
    second = (await entry(client, auth, g["id"], "-100")).json()
    deposit = next(e for e in second["entries"] if e["amount"] == "300.0000")
    # removing the deposit would leave -100 set aside
    blocked = await client.delete(f"{GOALS}/{g['id']}/entries/{deposit['id']}", headers=auth)
    assert blocked.status_code == 422
    withdrawal = next(e for e in second["entries"] if e["amount"] == "-100.0000")
    ok = await client.delete(f"{GOALS}/{g['id']}/entries/{withdrawal['id']}", headers=auth)
    assert ok.status_code == 200
    assert ok.json()["saved"] == "300.0000"
    missing = await client.delete(
        f"{GOALS}/{g['id']}/entries/00000000-0000-0000-0000-000000000000", headers=auth
    )
    assert missing.status_code == 404
    assert first["saved"] == "300.0000"
