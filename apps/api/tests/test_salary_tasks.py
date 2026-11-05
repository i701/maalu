from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import Signup

RULES = "/api/v1/salary-rules"
TASKS = "/api/v1/salary-split-tasks"
TX = "/api/v1/transactions"
ACC = "/api/v1/accounts"
GOALS = "/api/v1/goals"


async def account(client: AsyncClient, auth, name: str, **extra) -> dict:
    res = await client.post(
        ACC,
        json={"name": name, "group": "accounts", "currency": "MVR", "opening_amount": "0", **extra},
        headers=auth,
    )
    assert res.status_code == 201, res.text
    return res.json()


async def rule(client: AsyncClient, auth, mode: str, value: str, **extra) -> dict:
    res = await client.post(RULES, json={"mode": mode, "value": value, **extra}, headers=auth)
    assert res.status_code == 201, res.text
    return res.json()


async def pay(client: AsyncClient, auth, account_id: str, amount="10000", **extra) -> dict:
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


async def tasks(client: AsyncClient, auth) -> list[dict]:
    return (await client.get(TASKS, headers=auth)).json()


async def count(client: AsyncClient, auth) -> int:
    return (await client.get(f"{TASKS}/count", headers=auth)).json()["count"]


def split_url(tx_id: str) -> str:
    return f"{TX}/{tx_id}/salary-split"


async def balance(client: AsyncClient, auth, account_id: str) -> Decimal:
    return Decimal((await client.get(f"{ACC}/{account_id}", headers=auth)).json()["balance"])


async def test_a_new_rule_does_not_move_money_by_default(client: AsyncClient, auth):
    savings = await account(client, auth, "Savings")
    made = await rule(client, auth, "percent", "20", account_id=savings["id"])
    assert made["auto"] is False


async def test_a_salary_waits_for_approval_and_nothing_moves(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    await rule(client, auth, "percent", "20", account_id=savings["id"])
    pay_ = await pay(client, auth, main["id"])

    assert await count(client, auth) == 1
    [task] = await tasks(client, auth)
    assert task["plan"]["salary_id"] == pay_["id"]
    assert task["plan"]["title"] == "Salary"
    assert task["plan"]["applied"] is False
    assert [(i["target_name"], i["amount"], i["done"]) for i in task["plan"]["items"]] == [
        ("Savings", "2000.0000", False)
    ]
    assert await balance(client, auth, main["id"]) == Decimal("10000")  # nothing moved
    assert await balance(client, auth, savings["id"]) == Decimal("0")


async def test_approving_makes_the_split_and_clears_the_task(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    await rule(client, auth, "percent", "20", account_id=savings["id"])
    pay_ = await pay(client, auth, main["id"])

    res = await client.post(
        split_url(pay_["id"]),
        json={"items": [{"target_type": "account", "target_id": savings["id"], "amount": "2500"}]},
        headers=auth,
    )
    assert res.status_code == 200, res.text
    assert await balance(client, auth, savings["id"]) == Decimal("2500")
    assert await tasks(client, auth) == []
    assert await count(client, auth) == 0


async def test_no_rules_means_nothing_to_approve(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    await pay(client, auth, main["id"])
    assert await count(client, auth) == 0


async def test_other_income_and_spending_do_not_queue_anything(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    await rule(client, auth, "percent", "20", account_id=savings["id"])
    base = {"payment_method": "cash", "account_id": main["id"], "transaction_date": "2026-03-01"}
    await client.post(
        TX, json={**base, "type": "income", "amount": "50", "category": "Gift"}, headers=auth
    )
    await client.post(
        TX, json={**base, "type": "expense", "amount": "5", "category": "Food"}, headers=auth
    )
    assert await count(client, auth) == 0


async def test_a_planned_salary_queues_only_once_it_is_received(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    await rule(client, auth, "percent", "10", account_id=savings["id"])
    planned = await pay(client, auth, main["id"], planned=True)
    assert await count(client, auth) == 0

    res = await client.post(f"{TX}/{planned['id']}/post", json={"amount": "9000"}, headers=auth)
    assert res.status_code == 200, res.text
    [task] = await tasks(client, auth)
    assert task["plan"]["amount"] == "9000.0000"  # worked out from what really arrived
    assert task["plan"]["items"][0]["amount"] == "900.0000"


async def test_editing_a_planned_salary_to_posted_queues_it(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    await rule(client, auth, "percent", "10", account_id=savings["id"])
    planned = await pay(client, auth, main["id"], planned=True)
    await client.patch(f"{TX}/{planned['id']}", json={"planned": False}, headers=auth)
    assert await count(client, auth) == 1


async def test_dismissing_removes_it_but_it_can_still_be_split_by_hand(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    await rule(client, auth, "percent", "20", account_id=savings["id"])
    pay_ = await pay(client, auth, main["id"])
    [task] = await tasks(client, auth)

    assert (await client.post(f"{TASKS}/{task['id']}/dismiss", headers=auth)).status_code == 204
    assert await tasks(client, auth) == []
    assert await count(client, auth) == 0
    plan = (await client.get(split_url(pay_["id"]), headers=auth)).json()
    assert plan["applied"] is False  # the split is still there to make
    res = await client.post(
        split_url(pay_["id"]),
        json={"items": [{"target_type": "account", "target_id": savings["id"], "amount": "100"}]},
        headers=auth,
    )
    assert res.status_code == 200


async def test_an_automatic_rule_moves_at_once_and_the_others_wait(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    bills = await account(client, auth, "Bills")
    await rule(client, auth, "percent", "20", account_id=savings["id"], auto=True)
    await rule(client, auth, "fixed", "1500", account_id=bills["id"])  # waits

    await pay(client, auth, main["id"])
    assert await balance(client, auth, savings["id"]) == Decimal("2000")  # moved by itself
    assert await balance(client, auth, bills["id"]) == Decimal("0")  # waiting

    [task] = await tasks(client, auth)
    done = {i["target_name"]: i["done"] for i in task["plan"]["items"]}
    assert done == {"Savings": True, "Bills": False}
    assert task["plan"]["applied"] is True
    assert task["plan"]["complete"] is False
    assert [m["target_name"] for m in task["plan"]["made"]] == ["Savings"]
    assert task["plan"]["total"] == "1500.0000"  # only what is still to make
    assert task["plan"]["left"] == "6500.0000"  # 10,000 less the 2,000 made and the 1,500 to come

    # approving the rest completes it
    res = await client.post(
        split_url(task["plan"]["salary_id"]),
        json={"items": [{"target_type": "account", "target_id": bills["id"], "amount": "1500"}]},
        headers=auth,
    )
    assert res.status_code == 200, res.text
    assert await tasks(client, auth) == []
    assert await balance(client, auth, main["id"]) == Decimal("6500")


async def test_when_every_rule_is_automatic_nothing_is_left_to_approve(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    trip = (
        await client.post(GOALS, json={"name": "Trip", "target_amount": "9000"}, headers=auth)
    ).json()
    await rule(client, auth, "percent", "20", account_id=savings["id"], auto=True)
    await rule(client, auth, "fixed", "500", goal_id=trip["id"], auto=True)
    await pay(client, auth, main["id"])
    assert await count(client, auth) == 0
    assert await tasks(client, auth) == []
    assert await balance(client, auth, savings["id"]) == Decimal("2000")
    assert Decimal((await client.get(GOALS, headers=auth)).json()[0]["saved"]) == 500


async def test_an_automatic_line_that_cannot_be_made_waits_instead(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    usd = await account(client, auth, "Dollars", currency="USD", exchange_rate="15.4")
    await rule(client, auth, "fixed", "10", account_id=usd["id"], auto=True)
    await pay(client, auth, main["id"])
    [task] = await tasks(client, auth)
    assert task["plan"]["applied"] is False
    assert task["plan"]["items"][0]["ok"] is False


async def test_automatic_lines_that_pass_the_salary_are_not_made(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    a = await account(client, auth, "A")
    b = await account(client, auth, "B")
    await rule(client, auth, "percent", "70", account_id=a["id"], auto=True)
    await rule(client, auth, "percent", "60", account_id=b["id"], auto=True)
    await pay(client, auth, main["id"])
    assert await balance(client, auth, a["id"]) == Decimal("0")
    [task] = await tasks(client, auth)
    assert task["plan"]["over"] is True


async def test_a_made_line_cannot_be_made_twice(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    other = await account(client, auth, "Other")
    await rule(client, auth, "percent", "10", account_id=savings["id"], auto=True)
    await rule(client, auth, "percent", "10", account_id=other["id"])
    pay_ = await pay(client, auth, main["id"])
    line = {"target_type": "account", "target_id": savings["id"], "amount": "5"}
    # only the line that was already made: it is the same as splitting twice
    res = await client.post(split_url(pay_["id"]), json={"items": [line]}, headers=auth)
    assert res.status_code == 409
    # asked for with a new one: refused, naming it
    new = {"target_type": "account", "target_id": other["id"], "amount": "5"}
    res = await client.post(split_url(pay_["id"]), json={"items": [line, new]}, headers=auth)
    assert res.status_code == 422
    assert "already been made" in res.json()["detail"]
    assert await balance(client, auth, other["id"]) == Decimal("0")  # nothing half-made


async def test_what_is_already_made_counts_against_the_salary(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    other = await account(client, auth, "Other")
    await rule(client, auth, "percent", "70", account_id=savings["id"], auto=True)
    await rule(client, auth, "percent", "10", account_id=other["id"])
    pay_ = await pay(client, auth, main["id"])
    res = await client.post(
        split_url(pay_["id"]),
        json={"items": [{"target_type": "account", "target_id": other["id"], "amount": "3500"}]},
        headers=auth,
    )
    assert res.status_code == 422
    assert "more than the salary" in res.json()["detail"]


async def test_undoing_a_split_puts_it_back_on_the_list(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    await rule(client, auth, "percent", "20", account_id=savings["id"], auto=True)
    pay_ = await pay(client, auth, main["id"])
    assert await count(client, auth) == 0
    assert (await client.delete(split_url(pay_["id"]), headers=auth)).status_code == 204
    assert await balance(client, auth, savings["id"]) == Decimal("0")
    assert await count(client, auth) == 1  # waiting for approval again (not automatic this time)


async def test_a_trashed_salary_leaves_the_list(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    await rule(client, auth, "percent", "20", account_id=savings["id"])
    pay_ = await pay(client, auth, main["id"])
    await client.delete(f"{TX}/{pay_['id']}", headers=auth)
    assert await tasks(client, auth) == []
    assert await count(client, auth) == 0


async def test_a_rule_can_be_switched_to_automatic_and_back(client: AsyncClient, auth):
    savings = await account(client, auth, "Savings")
    made = await rule(client, auth, "percent", "20", account_id=savings["id"])
    res = await client.patch(f"{RULES}/{made['id']}", json={"auto": True}, headers=auth)
    assert res.json()["auto"] is True
    res = await client.patch(f"{RULES}/{made['id']}", json={"auto": False}, headers=auth)
    assert res.json()["auto"] is False


async def test_tasks_are_private(client: AsyncClient, auth, signup: Signup):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    await rule(client, auth, "percent", "20", account_id=savings["id"])
    await pay(client, auth, main["id"])
    [task] = await tasks(client, auth)
    other = await signup("other@example.com")
    assert await tasks(client, other) == []
    assert await count(client, other) == 0
    assert (await client.post(f"{TASKS}/{task['id']}/dismiss", headers=other)).status_code == 404


async def test_tasks_survive_a_backup_and_restore(client: AsyncClient, auth, signup: Signup):
    main = await account(client, auth, "Main")
    savings = await account(client, auth, "Savings")
    await rule(client, auth, "percent", "20", account_id=savings["id"], auto=False)
    await pay(client, auth, main["id"])
    backup = (await client.get("/api/v1/backup", headers=auth)).content
    fresh = await signup("fresh@example.com")
    res = await client.post("/api/v1/backup/restore", content=backup, headers=fresh)
    assert res.status_code == 200, res.text
    assert await count(client, fresh) == 1
