from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient

from tests.conftest import Signup

TX = "/api/v1/transactions"
VENDORS = "/api/v1/vendors"
PLACES = f"{TX}/places"
TODAY = date.today()
MALE = {"latitude": "4.175500", "longitude": "73.509300"}


async def spend(client, auth, amount="100", **extra) -> dict:
    body = {
        "type": "expense",
        "amount": amount,
        "payment_method": "cash",
        "category": "Food",
        "transaction_date": TODAY.isoformat(),
        **extra,
    }
    resp = await client.post(TX, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def places(client, auth, **params) -> dict:
    resp = await client.get(PLACES, params=params, headers=auth)
    assert resp.status_code == 200, resp.text
    return resp.json()


# --- a location on a transaction --------------------------------------------------------------


async def test_a_transaction_has_no_location_by_default(client: AsyncClient, auth):
    t = await spend(client, auth)
    assert (t["latitude"], t["longitude"], t["place"]) == (None, None, None)


async def test_a_transaction_can_be_marked_on_the_map(client: AsyncClient, auth):
    t = await spend(client, auth, **MALE, place="Fish market")
    assert Decimal(t["latitude"]) == Decimal("4.1755")
    assert Decimal(t["longitude"]) == Decimal("73.5093")
    assert t["place"] == "Fish market"


async def test_the_place_name_is_trimmed_and_optional(client: AsyncClient, auth):
    named = await spend(client, auth, **MALE, place="  Fish market  ")
    assert named["place"] == "Fish market"
    bare = await spend(client, auth, **MALE)
    assert bare["place"] is None


@pytest.mark.parametrize(
    "bad",
    [
        {"latitude": "4.1"},  # one coordinate only
        {"longitude": "73.5"},
        {"place": "Shop"},  # a name with no spot
        {"latitude": "91", "longitude": "10"},  # off the planet
        {"latitude": "10", "longitude": "181"},
        {"latitude": "-90.5", "longitude": "10"},
    ],
)
async def test_a_bad_location_is_refused(client: AsyncClient, auth, bad):
    body = {
        "type": "expense",
        "amount": "1",
        "payment_method": "cash",
        "category": "Food",
        "transaction_date": TODAY.isoformat(),
        **bad,
    }
    assert (await client.post(TX, json=body, headers=auth)).status_code == 422


async def test_the_edges_of_the_map_are_allowed(client: AsyncClient, auth):
    t = await spend(client, auth, latitude="-90", longitude="180")
    assert Decimal(t["latitude"]) == -90
    assert Decimal(t["longitude"]) == 180


async def test_a_location_can_be_added_changed_and_removed(client: AsyncClient, auth):
    t = await spend(client, auth)
    added = await client.patch(f"{TX}/{t['id']}", json={**MALE, "place": "Cafe"}, headers=auth)
    assert added.status_code == 200
    assert added.json()["place"] == "Cafe"

    moved = await client.patch(
        f"{TX}/{t['id']}", json={"latitude": "4.2", "longitude": "73.6"}, headers=auth
    )
    assert Decimal(moved.json()["latitude"]) == Decimal("4.2")
    assert moved.json()["place"] == "Cafe"  # the name stays unless changed

    gone = await client.patch(
        f"{TX}/{t['id']}",
        json={"latitude": None, "longitude": None, "place": None},
        headers=auth,
    )
    assert gone.status_code == 200
    assert (gone.json()["latitude"], gone.json()["longitude"], gone.json()["place"]) == (
        None,
        None,
        None,
    )


async def test_changing_only_one_coordinate_on_an_unmarked_transaction_is_refused(
    client: AsyncClient, auth
):
    t = await spend(client, auth)
    resp = await client.patch(f"{TX}/{t['id']}", json={"latitude": "4.2"}, headers=auth)
    assert resp.status_code == 422
    assert (await client.get(f"{TX}/{t['id']}", headers=auth)).json()["latitude"] is None


async def test_removing_one_coordinate_alone_is_refused(client: AsyncClient, auth):
    t = await spend(client, auth, **MALE)
    resp = await client.patch(f"{TX}/{t['id']}", json={"latitude": None}, headers=auth)
    assert resp.status_code == 422


async def test_a_blank_place_name_clears_the_name(client: AsyncClient, auth):
    t = await spend(client, auth, **MALE, place="Cafe")
    resp = await client.patch(f"{TX}/{t['id']}", json={"place": "   "}, headers=auth)
    assert resp.status_code == 200
    assert resp.json()["place"] is None
    assert Decimal(resp.json()["latitude"]) == Decimal("4.1755")


async def test_the_location_is_in_the_list_and_survives_a_backup(
    client: AsyncClient, auth, signup: Signup
):
    await spend(client, auth, **MALE, place="Cafe")
    listed = (await client.get(TX, headers=auth)).json()
    assert listed[0]["place"] == "Cafe"
    backup = (await client.get("/api/v1/backup", headers=auth)).content
    fresh = await signup("restore@example.com")
    assert (
        await client.post("/api/v1/backup/restore", content=backup, headers=fresh)
    ).status_code == 200
    restored = (await client.get(TX, headers=fresh)).json()
    assert (restored[0]["place"], Decimal(restored[0]["longitude"])) == ("Cafe", Decimal("73.5093"))


# --- where the spending went ----------------------------------------------------------------


async def test_places_group_spending_by_spot(client: AsyncClient, auth):
    await spend(client, auth, "100", **MALE, place="Fish market")
    await spend(client, auth, "50", latitude="4.175600", longitude="73.509400", place="Fish market")
    await spend(client, auth, "30", latitude="4.3", longitude="73.7", place="Far away")
    await spend(client, auth, "999")  # not marked: never on the map
    body = await places(client, auth)
    assert body["currency"] == "MVR"
    first, second = body["places"]
    assert (first["place"], first["count"], Decimal(first["spent"])) == (
        "Fish market",
        2,
        Decimal("150"),
    )
    assert Decimal(first["latitude"]) == Decimal("4.1756") - Decimal("0.00005")  # the middle
    assert first["last_date"] == TODAY.isoformat()
    assert (second["place"], second["count"]) == ("Far away", 1)


async def test_places_are_biggest_first(client: AsyncClient, auth):
    await spend(client, auth, "10", latitude="1", longitude="1", place="Small")
    await spend(client, auth, "500", latitude="2", longitude="2", place="Big")
    assert [p["place"] for p in (await places(client, auth))["places"]] == ["Big", "Small"]


async def test_a_spot_takes_the_name_most_of_them_gave(client: AsyncClient, auth):
    await spend(client, auth, "1", **MALE, place="Cafe")
    await spend(client, auth, "1", **MALE, place="Cafe")
    await spend(client, auth, "1", **MALE, place="Restaurant")
    await spend(client, auth, "1", **MALE)
    assert (await places(client, auth))["places"][0]["place"] == "Cafe"


async def test_places_have_no_name_when_none_was_given(client: AsyncClient, auth):
    await spend(client, auth, "1", **MALE)
    assert (await places(client, auth))["places"][0]["place"] is None


async def test_income_and_transfers_are_not_spending(client: AsyncClient, auth):
    await spend(client, auth, "10", **MALE)
    income = {
        "type": "income",
        "amount": "5000",
        "payment_method": "bank_transfer",
        "category": "Salary",
        "transaction_date": TODAY.isoformat(),
        **MALE,
    }
    assert (await client.post(TX, json=income, headers=auth)).status_code == 201
    only = (await places(client, auth))["places"]
    assert [Decimal(p["spent"]) for p in only] == [Decimal("10")]


async def test_a_refund_takes_its_amount_off_the_spot(client: AsyncClient, auth):
    purchase = await spend(client, auth, "100", **MALE)
    refund = {
        "type": "income",
        "amount": "30",
        "transaction_date": TODAY.isoformat(),
        "refund_of_id": purchase["id"],
        **MALE,
    }
    assert (await client.post(TX, json=refund, headers=auth)).status_code == 201
    spot = (await places(client, auth))["places"][0]
    assert Decimal(spot["spent"]) == Decimal("70")
    assert spot["count"] == 2


async def test_places_respect_the_dates_and_what_is_not_counted(client: AsyncClient, auth):
    old = (TODAY - timedelta(days=40)).isoformat()
    await spend(client, auth, "10", **MALE, transaction_date=old)
    await spend(client, auth, "20", **MALE)
    await spend(client, auth, "40", **MALE, planned=True)  # not happened yet
    trashed = await spend(client, auth, "80", **MALE)
    await client.delete(f"{TX}/{trashed['id']}", headers=auth)
    month = (TODAY - timedelta(days=30)).isoformat()
    recent = (await places(client, auth, date_from=month))["places"]
    assert [Decimal(p["spent"]) for p in recent] == [Decimal("20")]
    everything = (await places(client, auth))["places"]
    assert Decimal(everything[0]["spent"]) == Decimal("30")  # the old one and today's
    none = await places(client, auth, date_to=(TODAY - timedelta(days=100)).isoformat())
    assert none["places"] == []


async def test_places_leave_out_an_account_excluded_from_stats(client: AsyncClient, auth):
    account = (
        await client.post(
            "/api/v1/accounts",
            json={"group": "cash", "name": "Not mine", "exclude_from_stats": True},
            headers=auth,
        )
    ).json()
    await spend(client, auth, "10", **MALE, account_id=account["id"])
    assert (await places(client, auth))["places"] == []


async def test_places_are_private(client: AsyncClient, auth, signup: Signup):
    await spend(client, auth, "10", **MALE)
    other = await signup("bob@example.com")
    assert (await places(client, other))["places"] == []


async def test_places_need_a_login_and_sensible_dates(client: AsyncClient, auth):
    assert (await client.get(PLACES)).status_code == 401
    bad = await client.get(
        PLACES, params={"date_from": "2026-05-02", "date_to": "2026-05-01"}, headers=auth
    )
    assert bad.status_code == 422


# --- a vendor's usual place -----------------------------------------------------------------


async def vendor(client, auth, **extra) -> dict:
    resp = await client.post(VENDORS, json={"name": "Corner Shop", **extra}, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_a_vendor_can_have_a_usual_place(client: AsyncClient, auth):
    v = await vendor(client, auth, **MALE, place="Main street")
    assert Decimal(v["latitude"]) == Decimal("4.1755")
    assert v["place"] == "Main street"
    again = (await client.get(f"{VENDORS}/{v['id']}", headers=auth)).json()
    assert (again["place"], Decimal(again["longitude"])) == ("Main street", Decimal("73.5093"))


async def test_a_vendor_without_one_says_so(client: AsyncClient, auth):
    v = await vendor(client, auth)
    assert (v["latitude"], v["longitude"], v["place"]) == (None, None, None)


@pytest.mark.parametrize(
    "bad", [{"latitude": "4.1"}, {"place": "Shop"}, {"latitude": "200", "longitude": "1"}]
)
async def test_a_vendor_location_must_be_whole(client: AsyncClient, auth, bad):
    resp = await client.post(VENDORS, json={"name": "X", **bad}, headers=auth)
    assert resp.status_code == 422


async def test_a_vendor_place_can_be_changed_and_cleared(client: AsyncClient, auth):
    v = await vendor(client, auth, **MALE, place="Main street")
    moved = await client.patch(
        f"{VENDORS}/{v['id']}", json={"latitude": "4.2", "longitude": "73.6"}, headers=auth
    )
    assert Decimal(moved.json()["latitude"]) == Decimal("4.2")
    assert moved.json()["place"] == "Main street"
    # clearing one coordinate clears the whole spot, name and all
    cleared = await client.patch(f"{VENDORS}/{v['id']}", json={"latitude": None}, headers=auth)
    assert cleared.status_code == 200
    assert (cleared.json()["latitude"], cleared.json()["longitude"], cleared.json()["place"]) == (
        None,
        None,
        None,
    )


async def test_the_api_never_applies_a_vendor_place_by_itself(client: AsyncClient, auth):
    await vendor(client, auth, **MALE, place="Main street")
    t = await spend(client, auth, vendor_name="Corner Shop")
    assert t["latitude"] is None  # a convenience for the form, like the other defaults


async def test_merging_vendors_keeps_a_place_the_target_lacks(client: AsyncClient, auth):
    source = await vendor(client, auth, **MALE, place="Main street")
    target = (await client.post(VENDORS, json={"name": "Other"}, headers=auth)).json()
    merged = await client.post(
        f"{VENDORS}/{source['id']}/merge", json={"into_id": target["id"]}, headers=auth
    )
    assert merged.status_code == 200, merged.text
    assert merged.json()["place"] == "Main street"
    assert Decimal(merged.json()["longitude"]) == Decimal("73.5093")


async def test_merging_does_not_overwrite_the_targets_own_place(client: AsyncClient, auth):
    source = await vendor(client, auth, **MALE, place="Source spot")
    target = (
        await client.post(
            VENDORS,
            json={"name": "Other", "latitude": "1", "longitude": "2", "place": "Target spot"},
            headers=auth,
        )
    ).json()
    merged = await client.post(
        f"{VENDORS}/{source['id']}/merge", json={"into_id": target["id"]}, headers=auth
    )
    assert merged.json()["place"] == "Target spot"


async def test_a_spot_that_straddles_a_grid_edge_is_still_one_spot(client: AsyncClient, auth):
    # 4.1750 is a rounding edge at three decimals: the points either side are 40 m apart
    await spend(client, auth, "10", latitude="4.174900", longitude="73.5", place="Edge")
    await spend(client, auth, "10", latitude="4.175100", longitude="73.5", place="Edge")
    await spend(client, auth, "10", latitude="4.175300", longitude="73.5003", place="Edge")
    only = (await places(client, auth))["places"]
    assert len(only) == 1
    assert (only[0]["count"], Decimal(only[0]["spent"])) == (3, Decimal("30"))


async def test_spots_far_apart_stay_apart_whatever_the_order(client: AsyncClient, auth):
    for lat in ("4.1", "4.3", "4.1001", "4.3001"):
        await spend(client, auth, "5", latitude=lat, longitude="73.5")
    spots = (await places(client, auth))["places"]
    assert sorted(p["count"] for p in spots) == [2, 2]
