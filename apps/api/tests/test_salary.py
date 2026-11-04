from httpx import AsyncClient

from tests.conftest import Signup

CAT = "/api/v1/categories"
TX = "/api/v1/transactions"
SUB = "/api/v1/subscriptions"
TPL = "/api/v1/templates"


async def salary(client: AsyncClient, auth) -> dict:
    found = [c for c in (await client.get(CAT, headers=auth)).json() if c["is_salary"]]
    assert len(found) == 1
    return found[0]


def tx(kind: str, category: str, amount: str = "100", **extra) -> dict:
    return {
        "type": kind,
        "amount": amount,
        "payment_method": "bank_transfer",
        "category": category,
        "transaction_date": "2026-03-01",
        **extra,
    }


async def test_every_account_has_a_salary_category(client: AsyncClient, auth, signup: Signup):
    s = await salary(client, auth)
    assert s["name"] == "Salary"
    assert s["is_salary"] is True
    other = await signup("other@example.com")
    assert (await salary(client, other))["id"] != s["id"]


async def test_typing_salary_on_a_transaction_uses_the_default_one(client: AsyncClient, auth):
    s = await salary(client, auth)
    res = await client.post(TX, json=tx("income", " salary "), headers=auth)
    assert res.status_code == 201, res.text
    assert res.json()["category_id"] == s["id"]
    assert res.json()["category_is_salary"] is True
    assert len([c for c in (await client.get(CAT, headers=auth)).json() if c["is_salary"]]) == 1


async def test_only_income_goes_in_salary(client: AsyncClient, auth):
    res = await client.post(TX, json=tx("expense", "Salary"), headers=auth)
    assert res.status_code == 422
    assert "only for income" in res.json()["detail"]


async def test_an_expense_cannot_be_moved_into_salary(client: AsyncClient, auth):
    made = (await client.post(TX, json=tx("expense", "Food"), headers=auth)).json()
    res = await client.patch(f"{TX}/{made['id']}", json={"category": "Salary"}, headers=auth)
    assert res.status_code == 422
    # nor by changing an income into an expense while it is in Salary
    pay = (await client.post(TX, json=tx("income", "Salary"), headers=auth)).json()
    res = await client.patch(f"{TX}/{pay['id']}", json={"type": "expense"}, headers=auth)
    assert res.status_code == 422


async def test_split_items_of_an_expense_cannot_be_salary(client: AsyncClient, auth):
    body = tx("expense", "Food", amount="100")
    body.pop("category")
    body["splits"] = [
        {"name": "A", "category": "Food", "amount": "60"},
        {"name": "B", "category": "Salary", "amount": "40"},
    ]
    assert (await client.post(TX, json=body, headers=auth)).status_code == 422


async def test_bulk_edit_skips_salary_on_spending(client: AsyncClient, auth):
    spend = (await client.post(TX, json=tx("expense", "Food"), headers=auth)).json()
    pay = (await client.post(TX, json=tx("income", "Bonus"), headers=auth)).json()
    res = await client.patch(
        f"{TX}/bulk", json={"ids": [spend["id"], pay["id"]], "category": "Salary"}, headers=auth
    )
    body = res.json()
    assert body["updated"] == 1
    assert [s["id"] for s in body["skipped"]] == [spend["id"]]
    assert "only for income" in body["skipped"][0]["reason"]


async def test_salary_cannot_be_linked_to_a_purchase(client: AsyncClient, auth):
    purchase = (await client.post(TX, json=tx("expense", "Food", "100"), headers=auth)).json()
    pay = (await client.post(TX, json=tx("income", "Salary", "100"), headers=auth)).json()

    res = await client.get(f"{TX}/{pay['id']}/refund-candidates", headers=auth)
    assert res.status_code == 422
    assert "not a refund" in res.json()["detail"]

    res = await client.patch(
        f"{TX}/{pay['id']}", json={"refund_of_id": purchase["id"]}, headers=auth
    )
    assert res.status_code == 422
    assert "Salary" in res.json()["detail"]

    # other income can still be linked
    bonus = (await client.post(TX, json=tx("income", "Cashback", "100"), headers=auth)).json()
    res = await client.get(f"{TX}/{bonus['id']}/refund-candidates", headers=auth)
    assert res.status_code == 200


async def test_income_changed_to_salary_cannot_then_be_linked(client: AsyncClient, auth):
    purchase = (await client.post(TX, json=tx("expense", "Food", "100"), headers=auth)).json()
    pay = (await client.post(TX, json=tx("income", "Cashback", "100"), headers=auth)).json()
    await client.patch(f"{TX}/{pay['id']}", json={"category": "Salary"}, headers=auth)
    res = await client.patch(
        f"{TX}/{pay['id']}", json={"refund_of_id": purchase["id"]}, headers=auth
    )
    assert res.status_code == 422


async def test_salary_is_not_suggested_as_half_of_a_transfer(client: AsyncClient, auth):
    a = (
        await client.post("/api/v1/accounts", json={"name": "A", "group": "accounts"}, headers=auth)
    ).json()
    b = (
        await client.post("/api/v1/accounts", json={"name": "B", "group": "accounts"}, headers=auth)
    ).json()
    await client.post(TX, json=tx("expense", "Food", "500", account_id=a["id"]), headers=auth)
    pay = (
        await client.post(TX, json=tx("income", "Salary", "500", account_id=b["id"]), headers=auth)
    ).json()
    suggestions = (await client.get(f"{TX}/transfer-suggestions", headers=auth)).json()
    assert suggestions == []
    expense_id = (await client.get(TX, params={"type": "expense"}, headers=auth)).json()[0]["id"]
    res = await client.post(
        f"{TX}/link-transfer", json={"expense_id": expense_id, "income_id": pay["id"]}, headers=auth
    )
    assert res.status_code == 422


async def test_a_subscription_and_an_expense_template_cannot_use_salary(client: AsyncClient, auth):
    sub = {
        "name": "Pay me",
        "amount": "10",
        "payment_method": "cash",
        "category": "Salary",
        "interval_unit": "month",
        "start_date": "2026-03-01",
    }
    assert (await client.post(SUB, json=sub, headers=auth)).status_code == 422
    res = await client.post(
        TPL, json={"name": "T", "type": "expense", "category": "Salary"}, headers=auth
    )
    assert res.status_code == 422
    res = await client.post(
        TPL, json={"name": "Pay", "type": "income", "category": "Salary"}, headers=auth
    )
    assert res.status_code == 201


async def test_the_salary_category_is_protected(client: AsyncClient, auth):
    s = await salary(client, auth)
    other = (await client.post(CAT, json={"name": "Wages"}, headers=auth)).json()

    res = await client.patch(f"{CAT}/{s['id']}", json={"name": "Pay"}, headers=auth)
    assert res.status_code == 422
    # a colour, a kind or the same name are fine
    res = await client.patch(
        f"{CAT}/{s['id']}", json={"color": "violet", "name": "salary"}, headers=auth
    )
    assert res.status_code == 200
    assert res.json()["color"] == "violet"

    res = await client.patch(f"{CAT}/{s['id']}", json={"parent_id": other["id"]}, headers=auth)
    assert res.status_code == 422
    res = await client.patch(f"{CAT}/{other['id']}", json={"parent_id": s["id"]}, headers=auth)
    assert res.status_code == 422

    res = await client.post(f"{CAT}/{s['id']}/merge", json={"into_id": other["id"]}, headers=auth)
    assert res.status_code == 422
    assert (await client.delete(f"{CAT}/{s['id']}", headers=auth)).status_code == 409

    # but another category can be merged into it
    res = await client.post(f"{CAT}/{other['id']}/merge", json={"into_id": s["id"]}, headers=auth)
    assert res.status_code == 200
    assert res.json()["is_salary"] is True


async def test_a_backup_restores_into_a_fresh_account_that_already_has_salary(
    client: AsyncClient, auth, signup: Signup
):
    await client.post(TX, json=tx("income", "Salary"), headers=auth)
    backup = (await client.get("/api/v1/backup", headers=auth)).content
    other = await signup("fresh@example.com")  # has its own Salary category already
    res = await client.post("/api/v1/backup/restore", content=backup, headers=other)
    assert res.status_code == 200, res.text
    got = [c for c in (await client.get(CAT, headers=other)).json() if c["name"] == "Salary"]
    assert len(got) == 1
    assert got[0]["is_salary"] is True
    assert got[0]["transaction_count"] == 1
