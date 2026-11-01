from datetime import timedelta
from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import Signup
from tests.test_refunds import DAY, ITEMS, TODAY, TX, buy, buy_items, by_category, get, summary


async def deposit(client, auth, amount="30", **extra) -> dict:
    body = {
        "type": "income",
        "amount": amount,
        "payment_method": "bank_transfer",
        "category": "Other income",
        "transaction_date": DAY,
        "description": "Money back from the shop",
        **extra,
    }
    resp = await client.post(TX, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


def line(item: dict) -> dict:
    """One refunded item, as the API wants it: the item it gives back, and how much."""
    return {
        "refund_of_split_id": item["id"],
        "name": item["name"],
        "category": item["category"],
        "amount": item["amount"],
    }


async def link(client, auth, income: dict, purchase: dict, **extra):
    return await client.patch(
        f"{TX}/{income['id']}", json={"refund_of_id": purchase["id"], **extra}, headers=auth
    )


async def candidates(client, auth, income: dict, **params):
    return await client.get(f"{TX}/{income['id']}/refund-candidates", params=params, headers=auth)


async def test_linking_income_makes_it_a_refund(client: AsyncClient, auth):
    purchase = await buy(client, auth, "100")
    income = await deposit(client, auth, "30")
    resp = await link(client, auth, income, purchase)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["refund_of"]["id"] == purchase["id"]
    assert body["type"] == "income"
    assert body["category"] == "Groceries"  # taken from the purchase now
    assert body["description"] == "Money back from the shop"  # its own notes stay
    assert body["payment_method"] == "bank_transfer"  # and its own method
    assert Decimal((await get(client, auth, purchase))["refunded_amount"]) == Decimal("30")


async def test_a_linked_refund_is_spending_taken_back_not_income(client: AsyncClient, auth):
    purchase = await buy(client, auth, "100")
    income = await deposit(client, auth, "30")
    before = await summary(client, auth)
    assert Decimal(before["income"]) == Decimal("30")
    assert Decimal(before["expense"]) == Decimal("100")

    await link(client, auth, income, purchase)
    after = await summary(client, auth)
    assert Decimal(after["income"]) == Decimal("0")
    assert Decimal(after["expense"]) == Decimal("70")  # net of the refund
    assert Decimal(after["refunded"]) == Decimal("30")
    cats = await by_category(client, auth)
    assert Decimal(cats[("expense", "Groceries")]) == Decimal("70")
    assert ("income", "Other income") not in cats


async def test_a_different_category_is_refused(client: AsyncClient, auth):
    purchase = await buy(client, auth, "100")
    income = await deposit(client, auth, "30")
    resp = await link(client, auth, income, purchase, category="Gadgets")
    assert resp.status_code == 422
    same = await link(client, auth, income, purchase, category="groceries")
    assert same.status_code == 200  # the purchase's own category, however it is spelled


async def test_it_cannot_give_back_more_than_is_left(client: AsyncClient, auth):
    purchase = await buy(client, auth, "100")
    first = await deposit(client, auth, "70")
    assert (await link(client, auth, first, purchase)).status_code == 200
    second = await deposit(client, auth, "40")
    resp = await link(client, auth, second, purchase)
    assert resp.status_code == 422
    assert "30.00" in resp.text
    assert (await get(client, auth, second))["refund_of"] is None  # nothing changed


async def test_the_currency_must_match_the_purchase(client: AsyncClient, auth):
    purchase = await buy(client, auth, "100")  # MVR
    income = await deposit(client, auth, "10", currency="USD", exchange_rate="15")
    resp = await link(client, auth, income, purchase)
    assert resp.status_code == 422
    assert "MVR" in resp.text


async def test_a_purchase_with_items_is_refunded_item_by_item(client: AsyncClient, auth):
    purchase = await buy_items(client, auth)
    eggs = next(s for s in purchase["splits"] if s["name"] == "Eggs")
    income = await deposit(client, auth, "25")

    without = await link(client, auth, income, purchase)
    assert without.status_code == 422  # it must say which items

    wrong_sum = await link(client, auth, income, purchase, splits=[{**line(eggs), "amount": "20"}])
    assert wrong_sum.status_code == 422  # the items must add up to what came back

    ok = await link(client, auth, income, purchase, splits=[{**line(eggs), "amount": "25"}])
    assert ok.status_code == 200, ok.text
    body = ok.json()
    assert [(s["name"], s["category"], s["amount"]) for s in body["splits"]] == [
        ("Eggs", "Groceries", "25.0000")
    ]
    cats = await by_category(client, auth)
    assert Decimal(cats[("expense", "Groceries")]) == Decimal("35")  # 60 - 25
    assert Decimal(cats[("expense", "Gadgets")]) == Decimal("40")


async def test_linking_replaces_the_income_own_items(client: AsyncClient, auth):
    purchase = await buy(client, auth, "100")
    income = await deposit(
        client,
        auth,
        "30",
        splits=[
            {"name": "A", "category": "Other income", "amount": "10"},
            {"name": "B", "category": "Other income", "amount": "20"},
        ],
    )
    assert len(income["splits"]) == 2
    body = (await link(client, auth, income, purchase)).json()
    assert body["splits"] == []
    assert body["category"] == "Groceries"


async def test_only_plain_income_of_yours_can_be_linked(client: AsyncClient, auth, signup: Signup):
    purchase = await buy(client, auth, "100")
    another = await buy(client, auth, "100", vendor_name="Other Shop")
    assert (await link(client, auth, purchase, another)).status_code == 422  # an expense

    income = await deposit(client, auth, "10")
    assert (await link(client, auth, income, income)).status_code == 422  # itself

    bob = await signup("bob@example.com")
    theirs = await buy(client, bob, "100")
    assert (await link(client, auth, income, theirs)).status_code == 422  # not yours

    trashed = await buy(client, auth, "50", vendor_name="Gone")
    await client.delete(f"{TX}/{trashed['id']}", headers=auth)
    assert (await link(client, auth, income, trashed)).status_code == 422

    planned = await buy(client, auth, "50", planned=True)
    assert (await link(client, auth, income, planned)).status_code == 422


async def test_a_refund_cannot_be_moved_but_can_be_unlinked(client: AsyncClient, auth):
    purchase = await buy(client, auth, "100")
    other = await buy(client, auth, "100", vendor_name="Other Shop")
    income = await deposit(client, auth, "30")
    await link(client, auth, income, purchase)
    assert (await link(client, auth, income, other)).status_code == 422

    back = await client.patch(f"{TX}/{income['id']}", json={"refund_of_id": None}, headers=auth)
    assert back.status_code == 200
    assert back.json()["refund_of"] is None
    assert Decimal((await summary(client, auth))["income"]) == Decimal("30")


async def test_candidates_are_the_purchases_it_could_be_a_refund_of(client: AsyncClient, auth):
    exact = await buy(client, auth, "30", vendor_name="Exact Shop")
    bigger = await buy(client, auth, "100", vendor_name="Big Shop")
    await buy(client, auth, "10", vendor_name="Too Small")  # less than the deposit
    income = await deposit(client, auth, "30")
    found = (await candidates(client, auth, income)).json()
    assert [p["id"] for p in found] == [exact["id"], bigger["id"]]  # the same amount first


async def test_candidates_leave_out_what_cannot_take_the_refund(client: AsyncClient, auth):
    used = await buy(client, auth, "100", vendor_name="Used Up")
    first = await deposit(client, auth, "80")
    await link(client, auth, first, used)  # only 20 is left of it
    old = await buy(
        client,
        auth,
        "50",
        vendor_name="Later",
        transaction_date=(TODAY + timedelta(days=5)).isoformat(),
    )
    foreign = await buy(
        client, auth, "50", vendor_name="Abroad", currency="USD", exchange_rate="15"
    )
    income = await deposit(client, auth, "30")
    ids = [p["id"] for p in (await candidates(client, auth, income)).json()]
    assert used["id"] not in ids  # not enough left
    assert old["id"] not in ids  # after the deposit
    assert foreign["id"] not in ids  # another currency


async def test_candidates_can_be_searched_and_prefer_the_same_vendor(client: AsyncClient, auth):
    await buy(client, auth, "60", vendor_name="Alpha Store")
    beta = await buy(client, auth, "70", vendor_name="Beta Store")
    income = await deposit(client, auth, "30", vendor_name="Beta Store")
    found = (await candidates(client, auth, income)).json()
    assert found[0]["id"] == beta["id"]  # same vendor first
    only = (await candidates(client, auth, income, q="alpha")).json()
    assert [p["vendor"]["name"] for p in only] == ["Alpha Store"]


async def test_candidates_only_for_plain_income(client: AsyncClient, auth, signup: Signup):
    purchase = await buy(client, auth, "100")
    assert (await candidates(client, auth, purchase)).status_code == 422
    income = await deposit(client, auth, "30")
    await link(client, auth, income, purchase)
    assert (await candidates(client, auth, income)).status_code == 422  # already a refund
    bob = await signup("bob@example.com")
    assert (await candidates(client, bob, income)).status_code == 404


async def test_items_still_listed_for_a_candidate_with_items(client: AsyncClient, auth):
    purchase = await buy_items(client, auth)
    income = await deposit(client, auth, "40")
    found = (await candidates(client, auth, income)).json()
    assert found[0]["id"] == purchase["id"]
    assert len(found[0]["splits"]) == len(ITEMS)
