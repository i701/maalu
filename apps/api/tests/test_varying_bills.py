from datetime import date
from decimal import Decimal

from httpx import AsyncClient

SUB = "/api/v1/subscriptions"
TX = "/api/v1/transactions"
ACC = "/api/v1/accounts"
AVAIL = "/api/v1/stats/available-to-spend"
TODAY = date.today().isoformat()


async def account(client: AsyncClient, auth, name: str, **extra) -> dict:
    res = await client.post(
        ACC,
        json={
            "name": name,
            "group": "accounts",
            "currency": "MVR",
            "opening_amount": "5000",
            **extra,
        },
        headers=auth,
    )
    assert res.status_code == 201, res.text
    return res.json()


async def subscription(client: AsyncClient, auth, **extra) -> dict:
    res = await client.post(
        SUB,
        json={
            "name": "Digital Ocean",
            "amount": "10",
            "payment_method": "bank_transfer",
            "category": "Servers",
            "interval_unit": "month",
            "start_date": TODAY,
            **extra,
        },
        headers=auth,
    )
    assert res.status_code == 201, res.text
    return res.json()


async def planned(client: AsyncClient, auth) -> list[dict]:
    await client.get(SUB, headers=auth)  # plans the next payment
    return (await client.get(TX, params={"planned": "true"}, headers=auth)).json()


async def test_a_subscription_does_not_vary_unless_marked(client: AsyncClient, auth):
    sub = await subscription(client, auth)
    assert sub["amount_varies"] is False
    res = await client.patch(f"{SUB}/{sub['id']}", json={"amount_varies": True}, headers=auth)
    assert res.json()["amount_varies"] is True
    res = await client.patch(f"{SUB}/{sub['id']}", json={"amount_varies": None}, headers=auth)
    assert res.status_code == 422
    assert (await subscription(client, auth, name="VPS", amount_varies=True))["amount_varies"]


async def test_a_varying_bill_is_an_estimate_on_the_plan(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    await subscription(client, auth, account_id=main["id"], amount_varies=True, amount="100")
    await subscription(client, auth, name="Rent", account_id=main["id"], amount="200")
    await client.get(SUB, headers=auth)
    bills = (await client.get(AVAIL, headers=auth)).json()["bills"]
    assert {b["subscription"]: b["estimate"] for b in bills} == {
        "Digital Ocean": True,
        "Rent": False,
    }


async def test_paying_a_bill_for_a_different_amount(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    await subscription(client, auth, account_id=main["id"], amount="100", amount_varies=True)
    [bill] = await planned(client, auth)
    res = await client.post(f"{TX}/{bill['id']}/post", json={"amount": "123.45"}, headers=auth)
    assert res.status_code == 200, res.text
    assert Decimal(res.json()["amount"]) == Decimal("123.45")
    assert res.json()["planned"] is False
    # the next payment is estimated at what this one really came to
    [next_one] = await planned(client, auth)
    assert Decimal(next_one["amount"]) == Decimal("123.45")


async def test_a_bill_that_does_not_vary_is_planned_at_its_amount_again(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    await subscription(client, auth, account_id=main["id"], amount="100")
    [bill] = await planned(client, auth)
    await client.post(f"{TX}/{bill['id']}/post", json={"amount": "123.45"}, headers=auth)
    [next_one] = await planned(client, auth)
    assert Decimal(next_one["amount"]) == 100


async def test_a_varying_dollar_bill_is_estimated_at_the_last_amount_and_rate(
    client: AsyncClient, auth
):
    usd = await account(client, auth, "Dollars", currency="USD", exchange_rate="15.4")
    await subscription(
        client,
        auth,
        account_id=usd["id"],
        currency="USD",
        exchange_rate="15.4",
        amount="10",
        amount_varies=True,
    )
    [bill] = await planned(client, auth)
    await client.post(
        f"{TX}/{bill['id']}/post", json={"amount": "12", "exchange_rate": "15.6"}, headers=auth
    )
    [next_one] = await planned(client, auth)
    assert Decimal(next_one["amount"]) == 12
    assert Decimal(next_one["exchange_rate"]) == Decimal("15.6")
    assert Decimal(next_one["base_amount"]) == Decimal("187.2")


async def usd_bill(client: AsyncClient, auth) -> dict:
    usd = await account(client, auth, "Dollars", currency="USD", exchange_rate="15.4")
    await subscription(
        client, auth, account_id=usd["id"], currency="USD", exchange_rate="15.4", amount="10"
    )
    [bill] = await planned(client, auth)
    assert Decimal(bill["exchange_rate"]) == Decimal("15.4")
    return bill


async def test_the_real_exchange_rate_can_be_given_when_paying(client: AsyncClient, auth):
    bill = await usd_bill(client, auth)
    res = await client.post(
        f"{TX}/{bill['id']}/post", json={"amount": "12", "exchange_rate": "15.6"}, headers=auth
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert Decimal(body["exchange_rate"]) == Decimal("15.6")
    assert Decimal(body["base_amount"]) == Decimal("187.2")  # 12 * 15.6


async def test_what_it_really_cost_gives_the_rate(client: AsyncClient, auth):
    bill = await usd_bill(client, auth)
    res = await client.post(
        f"{TX}/{bill['id']}/post", json={"amount": "12", "base_amount": "186"}, headers=auth
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert Decimal(body["exchange_rate"]) == Decimal("15.5")  # 186 / 12
    assert Decimal(body["base_amount"]) == Decimal("186")


async def test_what_it_really_cost_alone_uses_the_planned_amount(client: AsyncClient, auth):
    bill = await usd_bill(client, auth)
    res = await client.post(f"{TX}/{bill['id']}/post", json={"base_amount": "160"}, headers=auth)
    assert Decimal(res.json()["amount"]) == 10
    assert Decimal(res.json()["exchange_rate"]) == Decimal("16")


async def test_the_rate_and_the_cost_are_not_both_accepted(client: AsyncClient, auth):
    bill = await usd_bill(client, auth)
    res = await client.post(
        f"{TX}/{bill['id']}/post", json={"exchange_rate": "15", "base_amount": "150"}, headers=auth
    )
    assert res.status_code == 422


async def test_a_bill_in_the_base_currency_has_no_rate_to_set(client: AsyncClient, auth):
    main = await account(client, auth, "Main")
    await subscription(client, auth, account_id=main["id"], amount="100")
    [bill] = await planned(client, auth)
    res = await client.post(f"{TX}/{bill['id']}/post", json={"exchange_rate": "2"}, headers=auth)
    assert res.status_code == 422
    assert "base currency" in res.json()["detail"]
    # still planned: nothing was half done
    assert (await client.get(f"{TX}/{bill['id']}", headers=auth)).json()["planned"] is True
