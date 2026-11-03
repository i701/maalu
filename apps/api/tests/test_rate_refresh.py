import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from app import jobs
from app.models import Account, ExchangeRate
from app.services import exchange_rate
from app.services.exchange_rate import MarketRateUnavailableError
from httpx import AsyncClient
from sqlalchemy import select, update

from tests.conftest import Signup

ACCOUNTS = "/api/v1/accounts"
HISTORY = "/api/v1/currencies/rate-history"
TODAY = date.today()


@pytest.fixture
def source(monkeypatch):
    """The rate source: `rates` maps a quote currency to its latest rate; a request with a range
    answers one row per weekday in it; `down` makes every call fail."""

    class Source:
        def __init__(self):
            self.calls: list[dict] = []
            self.rates = {"MVR": Decimal("15.40"), "EUR": Decimal("0.92")}
            self.down = False

    fake = Source()

    async def _get(params):
        fake.calls.append(dict(params))
        if fake.down:
            raise MarketRateUnavailableError
        quote = params["quotes"]
        if quote not in fake.rates:
            return []
        if "from" in params:
            first = date.fromisoformat(params["from"])
            last = date.fromisoformat(params["to"])
            days = [first + timedelta(days=i) for i in range((last - first).days + 1)]
            return [
                {
                    "date": d.isoformat(),
                    "base": params["base"],
                    "quote": quote,
                    "rate": float(fake.rates[quote]) + d.toordinal() % 7 / 100,
                }
                for d in days
                if d.weekday() < 5
            ]
        return [
            {
                "date": params.get("date", TODAY.isoformat()),
                "base": params["base"],
                "quote": quote,
                "rate": float(fake.rates[quote]),
            }
        ]

    monkeypatch.setattr(exchange_rate, "_get", _get)
    return fake


async def make_account(client, auth, **extra) -> dict:
    body = {"group": "accounts", "name": "USD Account", "currency": "USD", **extra}
    resp = await client.post(ACCOUNTS, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def stored_rate(client, account_id: str) -> Decimal:
    async with client.session_factory() as db:
        acc = await db.get(Account, uuid.UUID(account_id))
        return acc.exchange_rate


# --- the switch ----------------------------------------------------------------------------


async def test_auto_rate_is_off_by_default(client: AsyncClient, auth, source):
    account = await make_account(client, auth, exchange_rate="15")
    assert account["auto_rate"] is False
    assert Decimal(account["exchange_rate"]) == 15
    assert source.calls == []  # nothing is looked up for an account that does not follow it


async def test_turning_it_on_takes_the_market_rate_straight_away(client: AsyncClient, auth, source):
    account = await make_account(client, auth, exchange_rate="15")
    resp = await client.patch(f"{ACCOUNTS}/{account['id']}", json={"auto_rate": True}, headers=auth)
    assert resp.status_code == 200
    assert resp.json()["auto_rate"] is True
    assert Decimal(resp.json()["exchange_rate"]) == Decimal("15.4")


async def test_creating_it_on_takes_the_market_rate(client: AsyncClient, auth, source):
    account = await make_account(client, auth, exchange_rate="15", auto_rate=True)
    assert Decimal(account["exchange_rate"]) == Decimal("15.4")


async def test_if_the_source_is_down_the_rate_stays_and_the_switch_still_saves(
    client: AsyncClient, auth, source
):
    source.down = True
    account = await make_account(client, auth, exchange_rate="15", auto_rate=True)
    assert account["auto_rate"] is True
    assert Decimal(account["exchange_rate"]) == 15  # the typed rate, until the job gets one


async def test_an_account_in_the_base_currency_has_nothing_to_follow(
    client: AsyncClient, auth, source
):
    resp = await client.post(
        ACCOUNTS,
        json={"group": "cash", "name": "Wallet", "auto_rate": True},
        headers=auth,
    )
    assert resp.status_code == 422
    wallet = (
        await client.post(ACCOUNTS, json={"group": "cash", "name": "Wallet"}, headers=auth)
    ).json()
    resp = await client.patch(f"{ACCOUNTS}/{wallet['id']}", json={"auto_rate": True}, headers=auth)
    assert resp.status_code == 422


async def test_editing_the_rate_by_hand_is_still_possible_but_the_job_replaces_it(
    client: AsyncClient, auth, source
):
    account = await make_account(client, auth, exchange_rate="15", auto_rate=True)
    await client.patch(f"{ACCOUNTS}/{account['id']}", json={"exchange_rate": "16"}, headers=auth)
    assert await stored_rate(client, account["id"]) == 16
    await jobs.refresh_exchange_rates(client.session_factory)
    assert await stored_rate(client, account["id"]) == Decimal("15.4")


# --- the daily job -------------------------------------------------------------------------


async def test_the_job_updates_only_accounts_that_follow_the_market(
    client: AsyncClient, auth, source
):
    follows = await make_account(client, auth, name="Follows", exchange_rate="15", auto_rate=True)
    own = await make_account(client, auth, name="Own", exchange_rate="15")
    source.rates["MVR"] = Decimal("15.55")
    pairs, updated = await jobs.refresh_exchange_rates(client.session_factory)
    assert (pairs, updated) == (1, 1)  # one pair looked up, one account changed
    assert await stored_rate(client, follows["id"]) == Decimal("15.55")
    assert await stored_rate(client, own["id"]) == 15  # a rate you chose stays


async def test_the_job_keeps_the_rate_under_its_own_day(client: AsyncClient, auth, source):
    await make_account(client, auth, exchange_rate="15")
    await jobs.refresh_exchange_rates(client.session_factory)
    async with client.session_factory() as db:
        rows = (await db.scalars(select(ExchangeRate))).all()
    assert [(r.base, r.quote, r.requested_on, r.rate) for r in rows] == [
        ("USD", "MVR", TODAY, Decimal("15.4"))
    ]
    await jobs.refresh_exchange_rates(client.session_factory)  # again the same day: nothing doubles
    async with client.session_factory() as db:
        assert len((await db.scalars(select(ExchangeRate))).all()) == 1


async def test_one_lookup_serves_every_account_in_the_same_currency(
    client: AsyncClient, auth, source
):
    await make_account(client, auth, name="A", exchange_rate="15", auto_rate=True)
    await make_account(client, auth, name="B", exchange_rate="15", auto_rate=True)
    source.calls.clear()
    pairs, updated = await jobs.refresh_exchange_rates(client.session_factory)
    assert (pairs, updated) == (1, 0)  # already at the market rate from when they were made
    assert len(source.calls) == 1


async def test_the_job_skips_archived_accounts_and_the_base_currency(
    client: AsyncClient, auth, source
):
    old = await make_account(client, auth, name="Old", exchange_rate="15", auto_rate=True)
    await client.post(f"{ACCOUNTS}/{old['id']}/archive", headers=auth)
    await client.post(ACCOUNTS, json={"group": "cash", "name": "Wallet"}, headers=auth)
    source.calls.clear()
    assert await jobs.refresh_exchange_rates(client.session_factory) == (0, 0)
    assert source.calls == []


async def test_a_pair_the_source_does_not_know_is_skipped(client: AsyncClient, auth, source):
    source.rates = {}  # it knows no currency
    account = await make_account(client, auth, exchange_rate="15", auto_rate=True)
    assert Decimal(account["exchange_rate"]) == 15
    assert await jobs.refresh_exchange_rates(client.session_factory) == (0, 0)


async def test_a_source_that_is_down_changes_nothing_and_the_job_does_not_fail(
    client: AsyncClient, auth, source
):
    account = await make_account(client, auth, exchange_rate="15", auto_rate=True)
    await client.patch(f"{ACCOUNTS}/{account['id']}", json={"exchange_rate": "16"}, headers=auth)
    source.down = True
    assert await jobs.refresh_exchange_rates(client.session_factory) == (0, 0)
    assert await stored_rate(client, account["id"]) == 16


async def test_each_user_is_valued_in_their_own_base_currency(
    client: AsyncClient, auth, signup: Signup, source
):
    await make_account(client, auth, exchange_rate="15", auto_rate=True)  # USD, base MVR
    async with client.session_factory() as db:  # a second user whose base is EUR
        from app.models import User

        await db.execute(
            update(User).where(User.email == "alice@example.com").values(base_currency="MVR")
        )
        await db.commit()
    bob = await signup("bob@example.com")
    async with client.session_factory() as db:
        await db.execute(
            update(User).where(User.email == "bob@example.com").values(base_currency="EUR")
        )
        await db.commit()
    await client.post(
        ACCOUNTS,
        json={"group": "accounts", "name": "Dollars", "currency": "USD", "exchange_rate": "0.9"},
        headers=bob,
    )
    source.calls.clear()
    pairs, _ = await jobs.refresh_exchange_rates(client.session_factory)
    assert pairs == 2
    assert {c["quotes"] for c in source.calls} == {"MVR", "EUR"}


def test_the_job_is_scheduled():
    assert any(task.name == "refresh_exchange_rates" for task in jobs.app.tasks.values())


# --- history -------------------------------------------------------------------------------


async def history(client, auth, **params):
    params = {"base": "USD", "quote": "MVR", "days": 30, **params}
    return await client.get(HISTORY, params=params, headers=auth)


async def test_the_history_is_the_rate_on_the_days_the_source_had_one(
    client: AsyncClient, auth, source
):
    resp = await history(client, auth)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert (body["base"], body["quote"], body["source"]) == ("USD", "MVR", "Frankfurter")
    days = [p["date"] for p in body["points"]]
    assert days == sorted(days)
    assert len(days) >= 20  # weekdays in 30 days
    assert all(date.fromisoformat(d).weekday() < 5 for d in days)
    assert all(Decimal(p["rate"]) > 15 for p in body["points"])


async def test_history_is_kept_so_asking_again_does_not_ask_the_source(
    client: AsyncClient, auth, source
):
    first = (await history(client, auth)).json()
    source.calls.clear()
    again = (await history(client, auth)).json()
    assert again == first
    assert source.calls == []


async def test_a_short_stretch_is_served_from_what_a_longer_one_kept(
    client: AsyncClient, auth, source
):
    await history(client, auth, days=90)
    source.calls.clear()
    resp = await history(client, auth, days=30)
    assert resp.status_code == 200
    assert source.calls == []


async def test_history_falls_back_to_what_is_kept_when_the_source_is_down(
    client: AsyncClient, auth, source
):
    await history(client, auth, days=30)
    source.down = True
    resp = await history(client, auth, days=60)  # more than is kept: asks, fails, serves the kept
    assert resp.status_code == 200
    assert len(resp.json()["points"]) >= 20


async def test_history_with_nothing_kept_and_no_source_is_a_503(client: AsyncClient, auth, source):
    source.down = True
    assert (await history(client, auth)).status_code == 503


async def test_history_for_an_unknown_pair_is_a_404(client: AsyncClient, auth, source):
    assert (await history(client, auth, quote="XXX")).status_code == 404


@pytest.mark.parametrize("days", [3, 366, 0])
async def test_the_span_must_be_sensible(client: AsyncClient, auth, source, days):
    assert (await history(client, auth, days=days)).status_code == 422


async def test_history_needs_a_login(client: AsyncClient, source):
    resp = await client.get(HISTORY, params={"base": "USD", "quote": "MVR"})
    assert resp.status_code == 401


async def test_the_jobs_daily_rate_shows_in_the_history(client: AsyncClient, auth, source):
    await make_account(client, auth, exchange_rate="15")
    await jobs.refresh_exchange_rates(client.session_factory)
    source.calls.clear()
    # one kept point is too few for 30 days, so the stretch is fetched and the kept one joins it
    points = (await history(client, auth)).json()["points"]
    assert len(points) >= 20
