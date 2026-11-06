from datetime import date

from app.budget_period import next_period_start, period_bounds
from httpx import AsyncClient

from tests.conftest import Signup
from tests.test_budget import BUDGET, TODAY, add_line, line_of, spend

MOVES = f"{BUDGET}/moves"


async def two_limits(client: AsyncClient, auth) -> tuple[str, str]:
    """Groceries 4,000 with 3,600 spent, and Dining 2,000 with 200 spent, this period."""
    await spend(client, auth, "Groceries", "3600")
    await spend(client, auth, "Dining", "200")
    groceries = await add_line(client, auth, "Groceries", ["Groceries"], "4000")
    dining = await add_line(client, auth, "Dining", ["Dining"], "2000")
    budget = dining.json()
    assert groceries.status_code == dining.status_code == 201
    return line_of(budget, "Groceries")["id"], line_of(budget, "Dining")["id"]


async def move(client: AsyncClient, auth, **body):
    return await client.post(MOVES, json=body, headers=auth)


async def test_moving_money_between_two_limits(client: AsyncClient, auth):
    groceries, dining = await two_limits(client, auth)
    before = (await client.get(BUDGET, headers=auth)).json()
    assert line_of(before, "Groceries")["status"] == "warning"

    res = await move(
        client, auth, from_line_id=dining, to_line_id=groceries, amount="600", note="Guests"
    )
    assert res.status_code == 201, res.text
    budget = res.json()

    g, d = line_of(budget, "Groceries"), line_of(budget, "Dining")
    assert g["amount"] == "4000.0000"  # the usual amount is kept
    assert (g["moved_in"], g["moved_out"], g["available"]) == ("600.0000", "0.0000", "1000.0000")
    assert (d["moved_in"], d["moved_out"], d["available"]) == ("0.0000", "600.0000", "1200.0000")
    assert g["status"] == "ok"  # 3,600 of 4,600 is below the 80% warning level
    # moving between limits changes nothing overall
    assert budget["totals"]["amount"] == before["totals"]["amount"] == "6000.0000"
    [m] = budget["moves"]
    assert m["from_line"]["name"] == "Dining"
    assert m["to_line"]["name"] == "Groceries"
    assert (m["amount"], m["note"]) == ("600.0000", "Guests")


async def test_a_top_up_has_no_source_and_raises_the_total(client: AsyncClient, auth):
    groceries, _ = await two_limits(client, auth)
    res = await move(client, auth, to_line_id=groceries, amount="10000")  # no cap without a source
    assert res.status_code == 201, res.text
    budget = res.json()
    assert line_of(budget, "Groceries")["available"] == "10400.0000"
    assert budget["totals"]["amount"] == "16000.0000"
    assert budget["moves"][0]["from_line"] is None


async def test_a_limit_gives_at_most_what_it_has_left(client: AsyncClient, auth):
    groceries, dining = await two_limits(client, auth)
    res = await move(client, auth, from_line_id=dining, to_line_id=groceries, amount="1800.01")
    assert res.status_code == 422
    assert "has only MVR 1,800.00 left" in res.text

    # all of what is left is fine, and then there is nothing more to give
    assert (
        await move(client, auth, from_line_id=dining, to_line_id=groceries, amount="1800")
    ).status_code == 201
    res = await move(client, auth, from_line_id=dining, to_line_id=groceries, amount="1")
    assert res.status_code == 422
    assert "has nothing left" in res.text


async def test_a_move_is_for_its_period_only(client: AsyncClient, auth):
    groceries, dining = await two_limits(client, auth)
    await move(client, auth, from_line_id=dining, to_line_id=groceries, amount="500")
    next_day = next_period_start(period_bounds(TODAY, 1)[0], 1)
    later = (await client.get(BUDGET, params={"on": next_day.isoformat()}, headers=auth)).json()
    assert later["moves"] == []
    assert line_of(later, "Groceries")["moved_in"] == "0.0000"
    assert line_of(later, "Groceries")["available"] == "4000.0000"


async def test_rollover_carries_what_was_left_after_a_move(client: AsyncClient, auth):
    await spend(client, auth, "Groceries", "200")
    res = await add_line(client, auth, "Groceries", ["Groceries"], "1000", rollover=True)
    groceries = line_of(res.json(), "Groceries")["id"]
    await move(client, auth, to_line_id=groceries, amount="300")
    next_day = next_period_start(period_bounds(TODAY, 1)[0], 1)
    later = (await client.get(BUDGET, params={"on": next_day.isoformat()}, headers=auth)).json()
    # 1,000 + 300 added - 200 spent
    assert line_of(later, "Groceries")["carried"] == "1100.0000"


async def test_a_move_can_be_undone(client: AsyncClient, auth):
    groceries, dining = await two_limits(client, auth)
    made = (
        await move(client, auth, from_line_id=dining, to_line_id=groceries, amount="500")
    ).json()
    res = await client.post(f"{MOVES}/{made['moves'][0]['id']}/undo", headers=auth)
    assert res.status_code == 200, res.text
    assert res.json()["moves"] == []
    assert line_of(res.json(), "Groceries")["available"] == "400.0000"
    assert (
        await client.post(f"{MOVES}/{made['moves'][0]['id']}/undo", headers=auth)
    ).status_code == 404


async def test_moves_are_refused_when_they_make_no_sense(client: AsyncClient, auth):
    groceries, dining = await two_limits(client, auth)
    same = await move(client, auth, from_line_id=groceries, to_line_id=groceries, amount="1")
    assert same.status_code == 422
    nothing = await move(client, auth, to_line_id=groceries, amount="0")
    assert nothing.status_code == 422
    missing = await move(
        client, auth, to_line_id="00000000-0000-0000-0000-000000000000", amount="5"
    )
    assert missing.status_code == 422

    trip = await add_line(
        client,
        auth,
        "Trip",
        ["Dining"],  # a limit for set dates may share a monthly limit's category
        "900",
        start_date=TODAY.isoformat(),
        end_date=TODAY.isoformat(),
    )
    assert trip.status_code == 201, trip.text
    trip_id = trip.json()["fixed_lines"][0]["id"]
    res = await move(client, auth, from_line_id=dining, to_line_id=trip_id, amount="5")
    assert res.status_code == 422
    assert "monthly limits" in res.text


async def test_deleting_a_limit_or_giving_it_dates_removes_its_moves(client: AsyncClient, auth):
    groceries, dining = await two_limits(client, auth)
    await move(client, auth, from_line_id=dining, to_line_id=groceries, amount="500")
    res = await client.patch(
        f"{BUDGET}/lines/{dining}",
        json={"start_date": TODAY.isoformat(), "end_date": TODAY.isoformat()},
        headers=auth,
    )
    assert res.status_code == 200, res.text
    assert res.json()["moves"] == []
    assert line_of(res.json(), "Groceries")["moved_in"] == "0.0000"

    await move(client, auth, to_line_id=groceries, amount="50")
    assert (await client.delete(f"{BUDGET}/lines/{groceries}", headers=auth)).status_code == 204
    assert (await client.get(BUDGET, headers=auth)).json()["moves"] == []


async def test_moves_are_private(client: AsyncClient, auth, signup: Signup):
    groceries, dining = await two_limits(client, auth)
    made = (await move(client, auth, from_line_id=dining, to_line_id=groceries, amount="5")).json()
    other = await signup("other@example.com")
    assert (await client.get(BUDGET, headers=other)).json()["moves"] == []
    assert (await move(client, other, to_line_id=groceries, amount="5")).status_code == 422
    res = await client.post(f"{MOVES}/{made['moves'][0]['id']}/undo", headers=other)
    assert res.status_code == 404


async def test_a_move_on_another_day_goes_to_that_period(client: AsyncClient, auth):
    groceries, _ = await two_limits(client, auth)
    first_of_next = next_period_start(period_bounds(TODAY, 1)[0], 1)
    res = await move(client, auth, to_line_id=groceries, amount="100", on=first_of_next.isoformat())
    assert res.status_code == 201
    assert res.json()["period"]["start"] == first_of_next.isoformat()
    assert (await client.get(BUDGET, headers=auth)).json()["moves"] == []
    assert date.fromisoformat(res.json()["period"]["start"]) > TODAY


async def test_a_limits_history_lists_every_move_undone_ones_too(client: AsyncClient, auth):
    groceries, dining = await two_limits(client, auth)
    first = await move(client, auth, from_line_id=dining, to_line_id=groceries, amount="100")
    await move(client, auth, to_line_id=groceries, amount="50", note="Party")
    first_id = next(m["id"] for m in first.json()["moves"])
    await client.post(f"{MOVES}/{first_id}/undo", headers=auth)
    next_day = next_period_start(period_bounds(TODAY, 1)[0], 1)
    await move(
        client, auth, from_line_id=groceries, to_line_id=dining, amount="20", on=str(next_day)
    )

    res = await client.get(f"{BUDGET}/lines/{groceries}/moves", headers=auth)
    assert res.status_code == 200, res.text
    history = res.json()
    # newest first, every period, both directions, undone ones kept and marked
    assert [(h["amount"], h["from_line"] and h["from_line"]["name"]) for h in history] == [
        ("20.0000", "Groceries"),
        ("50.0000", None),
        ("100.0000", "Dining"),
    ]
    assert history[0]["period_start"] == next_day.isoformat()
    assert history[1]["note"] == "Party"
    assert history[1]["undone_at"] is None
    assert history[2]["undone_at"] is not None
    start, end = period_bounds(TODAY, 1)
    assert (history[2]["period_start"], history[2]["period_end"]) == (str(start), str(end))

    # the budget no longer counts the undone move
    budget = (await client.get(BUDGET, headers=auth)).json()
    assert line_of(budget, "Groceries")["moved_in"] == "50.0000"
    assert len(budget["moves"]) == 1


async def test_a_history_is_private(client: AsyncClient, auth, signup: Signup):
    groceries, _ = await two_limits(client, auth)
    other = await signup("nosy@example.com")
    res = await client.get(f"{BUDGET}/lines/{groceries}/moves", headers=other)
    assert res.status_code == 404
