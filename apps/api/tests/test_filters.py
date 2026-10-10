from httpx import AsyncClient

from tests.conftest import Signup

VENDORS = "/api/v1/vendors"
SUBS = "/api/v1/subscriptions"
TOTAL = "x-total-count"


async def vendor(client, auth, name, **extra):
    resp = await client.post(VENDORS, json={"name": name, **extra}, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


def names(resp) -> list[str]:
    return [x["name"] for x in resp.json()]


async def seed_vendors(client, auth):
    await vendor(client, auth, "Ensis Mart", is_local=True, contact="+960 330 1122")
    await vendor(client, auth, "Island Cafe", is_local=True, address="Hulhumale Phase 2")
    await vendor(client, auth, "Amazon", is_local=False, currency="USD")
    await vendor(client, auth, "Netflix", is_local=False)
    await vendor(client, auth, "Corner Shop")  # not classified


async def test_vendor_search_matches_name_contact_and_address(client: AsyncClient, auth):
    await seed_vendors(client, auth)
    assert names(await client.get(VENDORS, params={"q": "amaz"}, headers=auth)) == ["Amazon"]
    assert names(await client.get(VENDORS, params={"q": "330 1122"}, headers=auth)) == [
        "Ensis Mart"
    ]
    assert names(await client.get(VENDORS, params={"q": "phase"}, headers=auth)) == ["Island Cafe"]


async def test_vendor_search_is_case_insensitive_and_trims(client: AsyncClient, auth):
    await seed_vendors(client, auth)
    resp = await client.get(VENDORS, params={"q": "  NETFLIX "}, headers=auth)
    assert names(resp) == ["Netflix"]
    blank = await client.get(VENDORS, params={"q": "   "}, headers=auth)
    assert len(blank.json()) == 5  # whitespace-only means no filter


async def test_vendor_search_treats_wildcards_literally(client: AsyncClient, auth):
    await seed_vendors(client, auth)
    await vendor(client, auth, "50% Off Store")
    # "%" and "_" must not act as match-anything wildcards
    assert names(await client.get(VENDORS, params={"q": "%"}, headers=auth)) == ["50% Off Store"]
    assert (await client.get(VENDORS, params={"q": "_"}, headers=auth)).json() == []


async def test_vendor_locality_filter(client: AsyncClient, auth):
    await seed_vendors(client, auth)
    local = await client.get(VENDORS, params={"locality": "local"}, headers=auth)
    assert names(local) == ["Ensis Mart", "Island Cafe"]
    foreign = await client.get(VENDORS, params={"locality": "foreign"}, headers=auth)
    assert names(foreign) == ["Amazon", "Netflix"]
    unknown = await client.get(VENDORS, params={"locality": "unknown"}, headers=auth)
    assert names(unknown) == ["Corner Shop"]
    bad = await client.get(VENDORS, params={"locality": "nearby"}, headers=auth)
    assert bad.status_code == 422


async def test_vendor_filters_combine_with_paging_and_total(client: AsyncClient, auth):
    await seed_vendors(client, auth)
    page = await client.get(
        VENDORS, params={"locality": "foreign", "limit": 1, "offset": 1}, headers=auth
    )
    assert names(page) == ["Netflix"]
    assert page.headers[TOTAL] == "2"  # total follows the filter, ignores the page

    both = await client.get(VENDORS, params={"locality": "local", "q": "cafe"}, headers=auth)
    assert names(both) == ["Island Cafe"]
    assert both.headers[TOTAL] == "1"
    none = await client.get(VENDORS, params={"q": "zzz"}, headers=auth)
    assert none.json() == []
    assert none.headers[TOTAL] == "0"


def sub(name, **extra) -> dict:
    return {
        "name": name,
        "amount": "10",
        "payment_method": "cash",
        "category": "Fun",
        "interval_unit": "month",
        "start_date": "2026-05-01",
        **extra,
    }


async def seed_subs(client, auth):
    for body in (
        sub("Netflix", vendor_name="Netflix", category="Entertainment"),
        sub("Spotify", vendor_name="Spotify Ltd", category="Entertainment"),
        sub("Gym", category="Health"),
        sub("Fish box", interval_unit="week", category="Groceries"),
        sub("Domain", interval_unit="year", category="Software"),
    ):
        resp = await client.post(SUBS, json=body, headers=auth)
        assert resp.status_code == 201, resp.text
    gym = next(s for s in (await client.get(SUBS, headers=auth)).json() if s["name"] == "Gym")
    await client.patch(f"{SUBS}/{gym['id']}", json={"status": "paused"}, headers=auth)


async def test_subscription_search_covers_name_category_and_vendor(client: AsyncClient, auth):
    await seed_subs(client, auth)
    assert names(await client.get(SUBS, params={"q": "spot"}, headers=auth)) == ["Spotify"]
    by_category = await client.get(SUBS, params={"q": "entertain"}, headers=auth)
    assert names(by_category) == ["Netflix", "Spotify"]
    # matches only through the vendor's name ("Spotify Ltd")
    by_vendor = await client.get(SUBS, params={"q": "ltd"}, headers=auth)
    assert names(by_vendor) == ["Spotify"]
    assert (await client.get(SUBS, params={"q": "%"}, headers=auth)).json() == []


async def test_subscription_status_and_period_filters(client: AsyncClient, auth):
    await seed_subs(client, auth)
    paused = await client.get(SUBS, params={"status_filter": "paused"}, headers=auth)
    assert names(paused) == ["Gym"]
    weekly = await client.get(SUBS, params={"interval_unit": "week"}, headers=auth)
    assert names(weekly) == ["Fish box"]
    yearly = await client.get(SUBS, params={"interval_unit": "year"}, headers=auth)
    assert names(yearly) == ["Domain"]
    monthly = await client.get(SUBS, params={"interval_unit": "month"}, headers=auth)
    assert names(monthly) == ["Gym", "Netflix", "Spotify"]


async def test_subscription_filters_combine_with_paging_and_total(client: AsyncClient, auth):
    await seed_subs(client, auth)
    active_monthly = await client.get(
        SUBS,
        params={"status_filter": "active", "interval_unit": "month", "limit": 1},
        headers=auth,
    )
    assert names(active_monthly) == ["Netflix"]
    assert active_monthly.headers[TOTAL] == "2"  # Netflix + Spotify (Gym is paused)

    narrowed = await client.get(
        SUBS, params={"status_filter": "active", "q": "entertain", "limit": 1}, headers=auth
    )
    assert narrowed.headers[TOTAL] == "2"
    assert len(narrowed.json()) == 1
    nothing = await client.get(SUBS, params={"q": "zzz"}, headers=auth)
    assert nothing.headers[TOTAL] == "0"


async def test_filters_only_see_your_own_rows(client: AsyncClient, auth, signup: Signup):
    await vendor(client, auth, "Shared Name")
    bob = await signup("bob@example.com")
    await vendor(client, bob, "Bobs Private Shop")
    assert names(await client.get(VENDORS, params={"q": "bobs"}, headers=auth)) == []
    assert names(await client.get(VENDORS, params={"q": "shared"}, headers=bob)) == []
    assert (await client.get(SUBS, params={"q": "anything"}, headers=bob)).headers[TOTAL] == "0"
