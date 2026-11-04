from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import Signup

RULES = "/api/v1/salary-rules"
TX = "/api/v1/transactions"
ACC = "/api/v1/accounts"
GOALS = "/api/v1/goals"


async def account(client: AsyncClient, auth, name: str, **extra) -> dict:
    res = await client.post(
        ACC, json={"name": name, "group": "accounts", "currency": "MVR", **extra}, headers=auth
    )
    assert res.status_code == 201, res.text
    return res.json()


async def goal(client: AsyncClient, auth, name: str, **extra) -> dict:
    res = await client.post(
        GOALS, json={"name": name, "target_amount": "10000", **extra}, headers=auth
    )
    assert res.status_code == 201, res.text
    return res.json()


async def rule(client: AsyncClient, auth, mode: str, value: str, **target) -> dict:
    res = await client.post(RULES, json={"mode": mode, "value": value, **target}, headers=auth)
    assert res.status_code == 201, res.text
    return res.json()


async def salary(client: AsyncClient, auth, account_id: str, amount="10000", **extra) -> dict:
    res = await client.post(
        TX,
        json={
            "type": "income",
            "amount": amount,
            "payment_method": "bank_transfer",
            "category": "Salary",
            "account_id": account_id,
            "transaction_date": "2026-03-01",
            **extra,
        },
        headers=auth,
    )
    assert res.status_code == 201, res.text
    return res.json()


def plan_url(tx_id: str) -> str:
    return f"{TX}/{tx_id}/salary-split"


async def balance(client: AsyncClient, auth, account_id: str) -> Decimal:
    res = await client.get(f"{ACC}/{account_id}", headers=auth)
    return Decimal(res.json()["balance"])


# --- rules ---------------------------------------------------------------------------------


async def test_rules_need_exactly_one_target(client: AsyncClient, auth):
    a = await account(client, auth, "Savings")
    g = await goal(client, auth, "Trip")
    for body in ({}, {"account_id": a["id"], "goal_id": g["id"]}):
        res = await client.post(RULES, json={"mode": "fixed", "value": "5", **body}, headers=auth)
        assert res.status_code == 422


async def test_a_share_cannot_pass_100_percent(client: AsyncClient, auth):
    a = await account(client, auth, "Savings")
    res = await client.post(
        RULES, json={"mode": "percent", "value": "101", "account_id": a["id"]}, headers=auth
    )
    assert res.status_code == 422
    made = await rule(client, auth, "fixed", "500", account_id=a["id"])
    res = await client.patch(f"{RULES}/{made['id']}", json={"mode": "percent"}, headers=auth)
    assert res.status_code == 422  # 500% once it is a share


async def test_each_target_has_one_rule_and_rules_are_private(
    client: AsyncClient, auth, signup: Signup
):
    a = await account(client, auth, "Savings")
    made = await rule(client, auth, "percent", "20", account_id=a["id"])
    assert made["target_name"] == "Savings"
    assert made["target_type"] == "account"
    res = await client.post(
        RULES, json={"mode": "fixed", "value": "1", "account_id": a["id"]}, headers=auth
    )
    assert res.status_code == 409

    other = await signup("other@example.com")
    assert (await client.get(RULES, headers=other)).json() == []
    assert (await client.delete(f"{RULES}/{made['id']}", headers=other)).status_code == 404
    res = await client.post(
        RULES, json={"mode": "fixed", "value": "1", "account_id": a["id"]}, headers=other
    )
    assert res.status_code == 422  # not their account


async def test_a_rule_can_be_changed_and_deleted(client: AsyncClient, auth):
    a = await account(client, auth, "Savings")
    made = await rule(client, auth, "percent", "20", account_id=a["id"])
    res = await client.patch(f"{RULES}/{made['id']}", json={"value": "25"}, headers=auth)
    assert Decimal(res.json()["value"]) == 25
    assert (await client.delete(f"{RULES}/{made['id']}", headers=auth)).status_code == 204
    assert (await client.get(RULES, headers=auth)).json() == []


async def test_deleting_the_account_or_goal_deletes_its_rule(client: AsyncClient, auth):
    a = await account(client, auth, "Savings")
    g = await goal(client, auth, "Trip")
    await rule(client, auth, "percent", "10", account_id=a["id"])
    await rule(client, auth, "fixed", "100", goal_id=g["id"])
    await client.delete(f"{GOALS}/{g['id']}", headers=auth)
    assert [r["target_type"] for r in (await client.get(RULES, headers=auth)).json()] == ["account"]


# --- the plan -------------------------------------------------------------------------------


async def test_the_plan_works_out_percentages_and_fixed_amounts(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    trip = await goal(client, auth, "Trip")
    await rule(client, auth, "percent", "10.5", account_id=savings["id"])
    await rule(client, auth, "fixed", "1500", goal_id=trip["id"])
    pay = await salary(client, auth, main["id"], amount="10000")

    plan = (await client.get(plan_url(pay["id"]), headers=auth)).json()
    assert plan["applied"] is False
    assert plan["account_name"] == "Main"
    assert [(i["target_name"], i["amount"], i["ok"]) for i in plan["items"]] == [
        ("Savings", "1050.0000", True),
        ("Trip", "1500.0000", True),
    ]
    assert plan["total"] == "2550.0000"
    assert plan["left"] == "7450.0000"
    assert plan["over"] is False


async def test_a_line_that_cannot_be_made_says_why(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    usd = await account(client, auth, "Dollars", currency="USD", exchange_rate="15.4")
    await rule(client, auth, "fixed", "10", account_id=main["id"])  # the account it arrived in
    await rule(client, auth, "fixed", "10", account_id=usd["id"])
    pay = await salary(client, auth, main["id"])

    items = (await client.get(plan_url(pay["id"]), headers=auth)).json()["items"]
    reasons = {i["target_name"]: i["reason"] for i in items}
    assert all(not i["ok"] for i in items)
    assert "arrived in" in reasons["Main"]
    assert "USD" in reasons["Dollars"]
    plan = (await client.get(plan_url(pay["id"]), headers=auth)).json()
    assert plan["total"] == "0"
    assert plan["left"] == "10000.0000"


async def test_it_warns_when_the_lines_pass_the_salary(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    a = await account(client, auth, "A")
    b = await account(client, auth, "B")
    await rule(client, auth, "percent", "70", account_id=a["id"])
    await rule(client, auth, "percent", "60", account_id=b["id"])
    pay = await salary(client, auth, main["id"])
    plan = (await client.get(plan_url(pay["id"]), headers=auth)).json()
    assert plan["over"] is True
    assert plan["left"] == "-3000.0000"


async def test_only_a_posted_salary_can_be_split(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    other_income = (
        await client.post(
            TX,
            json={
                "type": "income",
                "amount": "50",
                "payment_method": "cash",
                "category": "Gift",
                "account_id": main["id"],
                "transaction_date": "2026-03-01",
            },
            headers=auth,
        )
    ).json()
    assert (await client.get(plan_url(other_income["id"]), headers=auth)).status_code == 422
    planned = await salary(client, auth, main["id"], planned=True)
    assert (await client.get(plan_url(planned["id"]), headers=auth)).status_code == 422


# --- making and undoing the split -------------------------------------------------------------


async def test_applying_moves_money_and_sets_goals_aside(client: AsyncClient, auth):
    main = await account(client, auth, "Main", opening_balance="0")
    savings = await account(client, auth, "Savings")
    trip = await goal(client, auth, "Trip")  # tracked by hand
    pay = await salary(client, auth, main["id"], amount="10000")

    res = await client.post(
        plan_url(pay["id"]),
        json={
            "items": [
                {"target_type": "account", "target_id": savings["id"], "amount": "2000"},
                {"target_type": "goal", "target_id": trip["id"], "amount": "1500"},
            ]
        },
        headers=auth,
    )
    assert res.status_code == 200, res.text
    assert res.json() == {"transfers": 1, "entries": 1}
    assert await balance(client, auth, main["id"]) == Decimal("8000")
    assert await balance(client, auth, savings["id"]) == Decimal("2000")
    got = (await client.get(f"{GOALS}", headers=auth)).json()[0]
    assert Decimal(got["saved"]) == Decimal("1500")

    plan = (await client.get(plan_url(pay["id"]), headers=auth)).json()
    assert plan["applied"] is True
    assert sorted((m["kind"], m["target_name"]) for m in plan["made"]) == [
        ("entry", "Trip"),
        ("transfer", "Savings"),
    ]


async def test_a_goal_that_follows_an_account_gets_a_transfer(client: AsyncClient, auth):
    main = await account(client, auth, "Main", opening_balance="0")
    pot = await client.post(
        ACC, json={"name": "Pot", "group": "savings", "currency": "MVR"}, headers=auth
    )
    trip = await goal(client, auth, "Trip", account_id=pot.json()["id"])
    pay = await salary(client, auth, main["id"])
    res = await client.post(
        plan_url(pay["id"]),
        json={"items": [{"target_type": "goal", "target_id": trip["id"], "amount": "700"}]},
        headers=auth,
    )
    assert res.json() == {"transfers": 1, "entries": 0}
    assert await balance(client, auth, pot.json()["id"]) == Decimal("700")


async def test_it_cannot_be_split_twice_but_can_be_undone_and_redone(client: AsyncClient, auth):
    main = await account(client, auth, "Main", opening_balance="0")
    savings = await account(client, auth, "Savings")
    trip = await goal(client, auth, "Trip")
    pay = await salary(client, auth, main["id"])
    lines = {
        "items": [
            {"target_type": "account", "target_id": savings["id"], "amount": "1000"},
            {"target_type": "goal", "target_id": trip["id"], "amount": "500"},
        ]
    }
    assert (await client.post(plan_url(pay["id"]), json=lines, headers=auth)).status_code == 200
    assert (await client.post(plan_url(pay["id"]), json=lines, headers=auth)).status_code == 409

    assert (await client.delete(plan_url(pay["id"]), headers=auth)).status_code == 204
    assert await balance(client, auth, savings["id"]) == Decimal("0")
    assert await balance(client, auth, main["id"]) == Decimal("10000")
    assert Decimal((await client.get(GOALS, headers=auth)).json()[0]["saved"]) == 0
    assert (await client.get(plan_url(pay["id"]), headers=auth)).json()["applied"] is False
    assert (await client.delete(plan_url(pay["id"]), headers=auth)).status_code == 409

    assert (await client.post(plan_url(pay["id"]), json=lines, headers=auth)).status_code == 200


async def test_the_lines_are_checked_again_when_applied(client: AsyncClient, auth, signup: Signup):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    usd = await account(client, auth, "Dollars", currency="USD", exchange_rate="15.4")
    pay = await salary(client, auth, main["id"], amount="1000")
    other = await signup("other@example.com")
    theirs = await account(client, other, "Theirs")

    def line(target, amount="100", kind="account"):
        return {"items": [{"target_type": kind, "target_id": target, "amount": amount}]}

    for body, text in (
        (line(main["id"]), "arrived in"),
        (line(usd["id"]), "USD"),
        (line(theirs["id"]), "no longer exists"),
        (line(savings["id"], "1000.01"), "more than the salary"),
        (
            {
                "items": [
                    {"target_type": "account", "target_id": savings["id"], "amount": "10"},
                    {"target_type": "account", "target_id": savings["id"], "amount": "10"},
                ]
            },
            "only appear once",
        ),
    ):
        res = await client.post(plan_url(pay["id"]), json=body, headers=auth)
        assert res.status_code == 422, res.text
        assert text in res.json()["detail"]
    assert await balance(client, auth, savings["id"]) == Decimal("0")  # nothing half-made


async def test_a_goal_in_another_currency_than_the_salary_is_refused(client: AsyncClient, auth):
    usd = await account(client, auth, "Dollars", currency="USD", exchange_rate="15.4")
    trip = await goal(client, auth, "Trip")  # goals are in the base currency
    pay = await salary(client, auth, usd["id"], amount="100", exchange_rate="15.4")
    res = await client.post(
        plan_url(pay["id"]),
        json={"items": [{"target_type": "goal", "target_id": trip["id"], "amount": "10"}]},
        headers=auth,
    )
    assert res.status_code == 422
    assert "MVR" in res.json()["detail"]


async def test_the_split_is_private(client: AsyncClient, auth, signup: Signup):
    main = await account(client, auth, "Main")
    pay = await salary(client, auth, main["id"])
    other = await signup("other@example.com")
    assert (await client.get(plan_url(pay["id"]), headers=other)).status_code == 404
    assert (await client.delete(plan_url(pay["id"]), headers=other)).status_code == 404


async def test_rules_survive_a_backup_and_restore(client: AsyncClient, auth, signup: Signup):
    a = await account(client, auth, "Savings")
    await rule(client, auth, "percent", "15", account_id=a["id"])
    backup = (await client.get("/api/v1/backup", headers=auth)).content
    fresh = await signup("fresh@example.com")
    res = await client.post("/api/v1/backup/restore", content=backup, headers=fresh)
    assert res.status_code == 200, res.text
    got = (await client.get(RULES, headers=fresh)).json()
    assert [(r["target_name"], r["value"]) for r in got] == [("Savings", "15.0000")]
