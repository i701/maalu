import json
import random
from datetime import date

from app.models import Account, Base, SnapshotDirty, User
from app.seed import DEMO_EMAIL, DEMO_PASSWORD, seed
from app.services import BackupService
from app.services.backup import CHILDREN, EXCLUDED, INCLUDED, OWNED, _checksum
from sqlalchemy import func, select

BACKUP = "/api/v1/backup"
RESTORE = f"{BACKUP}/restore"
ACCOUNTS = "/api/v1/accounts"


async def seeded_backup(client) -> bytes:
    """A backup of the seeded demo user's data."""
    async with client.session_factory() as db:
        await seed(db, transactions=80, rng=random.Random(7), today=date.today())
        await db.commit()
    async with client.session_factory() as db:
        demo = await db.scalar(select(User).where(User.email == DEMO_EMAIL))
        return await BackupService(db).export(demo)


def with_tables(raw: bytes, change) -> bytes:
    """The file with its tables changed by `change`, and its checksum made right again."""
    payload = json.loads(raw)
    change(payload["tables"])
    payload["checksum"] = _checksum(payload["tables"])
    return json.dumps(payload).encode()


async def restore(client, headers, raw: bytes):
    return await client.post(
        RESTORE, content=raw, headers={**headers, "content-type": "application/json"}
    )


def test_every_table_is_either_backed_up_or_left_out_on_purpose():
    decided = set(OWNED) | set(CHILDREN) | set(EXCLUDED)
    assert set(Base.metadata.tables) == decided
    assert {t.name for t in INCLUDED} == set(OWNED) | set(CHILDREN)


async def test_download_needs_a_login_and_holds_no_credentials(client, auth):
    assert (await client.get(BACKUP)).status_code == 401
    resp = await client.get(BACKUP, headers=auth)
    assert resp.status_code == 200
    assert "maalu-backup-" in resp.headers["content-disposition"]
    body = resp.json()
    assert body["format"] == "maalu-backup"
    assert body["version"] == 1
    assert body["settings"]["base_currency"] == "MVR"
    assert "hashed_password" not in resp.text
    assert "alice@example.com" not in resp.text


async def test_a_restore_brings_back_everything(client, signup):
    raw = await seeded_backup(client)
    original = json.loads(raw)
    assert original["counts"]["transactions"] > 50

    headers = await signup("fresh@example.com")
    resp = await restore(client, headers, raw)
    assert resp.status_code == 200, resp.text
    assert resp.json()["restored"] == original["counts"]

    # the restored account backs up to the same numbers of rows, with new ids
    again = (await client.get(BACKUP, headers=headers)).json()
    assert again["counts"] == original["counts"]
    old_ids = {r["id"] for r in original["tables"]["transactions"]}
    assert not old_ids & {r["id"] for r in again["tables"]["transactions"]}

    # and it adds up: every account has the same balance as the demo user's
    login = await client.post(
        "/api/v1/auth/login", data={"username": DEMO_EMAIL, "password": DEMO_PASSWORD}
    )
    demo = {"Authorization": f"Bearer {login.json()['access_token']}"}

    async def balances(h):
        rows = (await client.get(ACCOUNTS, headers=h)).json()
        return {r["name"]: (r["balance"], r["currency"]) for r in rows}

    assert await balances(headers) == await balances(demo)


async def test_links_survive_the_new_ids(client, signup):
    raw = await seeded_backup(client)
    headers = await signup("links@example.com")
    assert (await restore(client, headers, raw)).status_code == 200
    again = json.loads((await client.get(BACKUP, headers=headers)).content)["tables"]

    ids = {
        name: {r["id"] for r in rows} for name, rows in again.items() if rows and "id" in rows[0]
    }
    for table, column, target in [
        ("transactions", "account_id", "accounts"),
        ("transactions", "category_id", "categories"),
        ("transactions", "refund_of_id", "transactions"),
        ("transaction_splits", "transaction_id", "transactions"),
        ("transaction_splits", "refund_of_split_id", "transaction_splits"),
        ("categories", "parent_id", "categories"),
        ("vendor_tags", "tag_id", "tags"),
        ("budget_line_categories", "category_id", "categories"),
    ]:
        linked = [r[column] for r in again[table] if r.get(column)]
        assert all(link in ids[target] for link in linked), (table, column)
    # the seed makes refunds and sub-categories, so those links were really exercised
    assert any(r["refund_of_id"] for r in again["transactions"])
    assert any(r["parent_id"] for r in again["categories"])


async def test_the_same_file_can_go_into_two_accounts(client, signup):
    raw = await seeded_backup(client)
    for email in ("one@example.com", "two@example.com"):
        assert (await restore(client, await signup(email), raw)).status_code == 200


async def test_only_an_empty_account_can_restore(client, signup):
    raw = await seeded_backup(client)
    headers = await signup("busy@example.com")
    assert (await restore(client, headers, raw)).status_code == 200
    again = await restore(client, headers, raw)
    assert again.status_code == 409
    assert "empty" in again.json()["detail"]


async def test_an_account_with_any_data_is_not_empty(client, auth):
    raw = await client.get(BACKUP, headers=auth)
    await client.post(
        ACCOUNTS, json={"group": "cash", "name": "Wallet", "opening_amount": "1"}, headers=auth
    )
    assert (await restore(client, auth, raw.content)).status_code == 409


async def test_bad_files_are_refused_and_nothing_is_restored(client, signup):
    raw = await seeded_backup(client)
    headers = await signup("picky@example.com")

    assert (await restore(client, headers, b"not json")).status_code == 422
    assert (await restore(client, headers, b'{"format": "other"}')).status_code == 422

    damaged = json.loads(raw)
    damaged["tables"]["transactions"][0]["amount"] = "999999"
    resp = await restore(client, headers, json.dumps(damaged).encode())
    assert resp.status_code == 422
    assert "damaged" in resp.json()["detail"]

    newer = json.loads(raw)
    newer["version"] = 99
    assert (await restore(client, headers, json.dumps(newer).encode())).status_code == 422

    # a row that points at something missing, with the checksum made right again
    def break_link(tables):
        tables["transactions"][0]["category_id"] = "00000000-0000-0000-0000-000000000000"

    resp = await restore(client, headers, with_tables(raw, break_link))
    assert resp.status_code == 422

    # a column this version does not have
    def extra_column(tables):
        tables["accounts"][0]["bogus"] = 1

    assert (await restore(client, headers, with_tables(raw, extra_column))).status_code == 422

    # after all that failing, the account is still empty and a good file still goes in
    assert (await client.get(ACCOUNTS, headers=headers)).json() == []
    assert (await restore(client, headers, raw)).status_code == 200


async def test_restore_takes_the_backups_base_currency_and_settings(client, signup):
    raw = await seeded_backup(client)
    headers = await signup("currency@example.com")
    payload = json.loads(raw)
    payload["settings"]["base_currency"] = "usd"
    payload["settings"]["start_from_template"] = False
    assert (await restore(client, headers, json.dumps(payload).encode())).status_code == 200
    me = (await client.get("/api/v1/users/me", headers=headers)).json()
    assert me["base_currency"] == "USD"
    assert me["start_from_template"] is False
    # the default account was remapped to one of the new accounts
    default = json.loads(raw)["settings"]["default_account_id"]
    if default:
        accounts = {a["id"] for a in (await client.get(ACCOUNTS, headers=headers)).json()}
        assert me["default_account_id"] in accounts


async def test_a_restored_account_gets_its_balance_history_rebuilt(client, signup):
    raw = await seeded_backup(client)
    headers = await signup("history@example.com")
    assert (await restore(client, headers, raw)).status_code == 200

    async def stale() -> int:
        async with client.session_factory() as db:
            return await db.scalar(
                select(func.count())
                .select_from(SnapshotDirty)
                .join(Account, Account.id == SnapshotDirty.account_id)
                .join(User, User.id == Account.user_id)
                .where(User.email == "history@example.com")
            )

    assert await stale() > 0
    resp = await client.get(
        "/api/v1/stats/balance-trend",
        params={"from": "2026-01-01", "to": date.today().isoformat()},
        headers=headers,
    )
    assert resp.status_code == 200
    assert await stale() == 0
