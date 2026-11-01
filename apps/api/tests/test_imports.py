from decimal import Decimal
from pathlib import Path

from httpx import AsyncClient

from tests.conftest import Signup

URL = "/api/v1/imports"
ACCOUNTS = "/api/v1/accounts"
TX = "/api/v1/transactions"
DATA = Path(__file__).parent / "data"


def statement(name: str = "bml_statement.csv") -> bytes:
    return (DATA / name).read_bytes()


async def make_account(client, auth, **overrides) -> dict:
    body = {"group": "accounts", "name": "BML Current", "opening_amount": "337.38", **overrides}
    resp = await client.post(ACCOUNTS, json=body, headers=auth)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def preview(client, auth, account, content: bytes | None = None, expect=200) -> dict:
    resp = await client.post(
        URL + "/preview",
        params={"account_id": account["id"]},
        content=content if content is not None else statement(),
        headers=auth,
    )
    assert resp.status_code == expect, resp.text
    return resp.json()


def rows_from(preview_data: dict, **override) -> list[dict]:
    """What the web sends back: every previewed row as it is, unless overridden."""
    keys = ("date", "time", "type", "amount", "description", "reference", "counterparty")
    out = []
    for r in preview_data["rows"]:
        row = {k: r[k] for k in keys}
        row["payment_method"] = r["payment_method"]
        out.append({**row, **override})
    return out


async def commit(client, auth, account, rows, expect=201, **extra) -> dict:
    body = {"account_id": account["id"], "filename": "s.csv", "profile": "bml", "rows": rows}
    resp = await client.post(URL, json={**body, **extra}, headers=auth)
    assert resp.status_code == expect, resp.text
    return resp.json()


async def test_preview_reads_the_statement_and_saves_nothing(client: AsyncClient, auth):
    account = await make_account(client, auth)
    data = await preview(client, auth, account)
    assert data["profile"] == "bml"
    assert data["new_count"] == 4
    assert data["duplicate_count"] == 0
    assert Decimal(data["rows"][0]["amount"]) == Decimal("30")
    assert (await client.get(TX, headers=auth)).json() == []


async def test_the_balance_check_compares_with_the_statement(client: AsyncClient, auth):
    account = await make_account(client, auth)  # opens with the statement's opening balance
    data = await preview(client, auth, account)
    assert Decimal(data["balance_now"]) == Decimal("337.38")
    assert Decimal(data["balance_after"]) == Decimal("468.8")
    assert Decimal(data["closing_balance"]) == Decimal("468.8")
    assert data["balance_matches"] is True

    wrong = await make_account(client, auth, name="Other", opening_amount="1000")
    assert (await preview(client, auth, wrong))["balance_matches"] is False


async def test_import_creates_the_transactions_as_one_batch(client: AsyncClient, auth):
    account = await make_account(client, auth)
    data = await preview(client, auth, account)
    result = await commit(client, auth, account, rows_from(data))

    batch = result["batch"]
    assert batch["imported_count"] == 4
    assert batch["skipped_count"] == 0
    assert batch["transaction_count"] == 4
    assert result["skipped"] == []

    listed = (await client.get(TX, params={"account_id": account["id"]}, headers=auth)).json()
    assert len(listed) == 4
    assert {t["category"] for t in listed} == {"Uncategorized"}
    after = (await client.get(f"{ACCOUNTS}/{account['id']}", headers=auth)).json()
    assert Decimal(after["balance"]) == Decimal("468.8")  # the statement's closing balance


async def test_importing_the_same_statement_again_adds_nothing(client: AsyncClient, auth):
    account = await make_account(client, auth)
    await commit(client, auth, account, rows_from(await preview(client, auth, account)))

    again = await preview(client, auth, account)
    assert again["new_count"] == 0
    assert {r["duplicate"] for r in again["rows"]} == {"reference"}

    # even sending the rows anyway cannot make them twice
    result = await commit(client, auth, account, rows_from(again))
    assert result["batch"]["imported_count"] == 0
    assert {s["reason"] for s in result["skipped"]} == {"Already imported"}
    assert len((await client.get(TX, headers=auth)).json()) == 4


async def test_the_same_reference_twice_in_one_file_counts_once(client: AsyncClient, auth):
    account = await make_account(client, auth)
    rows = rows_from(await preview(client, auth, account))[:1] * 2
    result = await commit(client, auth, account, rows)
    assert result["batch"]["imported_count"] == 1
    assert len(result["skipped"]) == 1


async def test_a_transaction_entered_by_hand_is_flagged_as_possible(client: AsyncClient, auth):
    account = await make_account(client, auth)
    by_hand = {
        "type": "expense",
        "amount": "30",
        "payment_method": "cash",
        "category": "Misc",
        "transaction_date": "2026-10-02",
        "account_id": account["id"],
    }
    await client.post(TX, json=by_hand, headers=auth)
    rows = (await preview(client, auth, account))["rows"]
    assert rows[0]["duplicate"] == "possible"
    assert [r["duplicate"] for r in rows[1:]] == [None, None, None]


async def test_undo_trashes_the_batch_and_it_can_be_imported_again(client: AsyncClient, auth):
    account = await make_account(client, auth)
    result = await commit(client, auth, account, rows_from(await preview(client, auth, account)))
    batch_id = result["batch"]["id"]

    undone = await client.delete(f"{URL}/{batch_id}", headers=auth)
    assert undone.status_code == 200
    assert undone.json()["updated"] == 4
    assert (await client.get(TX, headers=auth)).json() == []
    assert len((await client.get(f"{TX}/trash", headers=auth)).json()) == 4

    listed = (await client.get(URL, headers=auth)).json()
    assert listed[0]["transaction_count"] == 0
    assert listed[0]["imported_count"] == 4

    # trashed rows do not count as already imported
    assert (await preview(client, auth, account))["new_count"] == 4


async def test_undo_leaves_alone_what_you_already_deleted(client: AsyncClient, auth):
    account = await make_account(client, auth)
    result = await commit(client, auth, account, rows_from(await preview(client, auth, account)))
    first = (await client.get(TX, headers=auth)).json()[0]
    await client.delete(f"{TX}/{first['id']}", headers=auth)
    undone = await client.delete(f"{URL}/{result['batch']['id']}", headers=auth)
    assert undone.json()["updated"] == 3


async def test_a_vendor_choice_is_remembered_for_the_next_statement(client: AsyncClient, auth):
    account = await make_account(client, auth)
    data = await preview(client, auth, account)
    rows = rows_from(data)
    rows[3]["vendor_name"] = "Power Co"  # POWER COMPANY LTD
    rows[3]["category"] = "Utilities"
    await commit(client, auth, account, rows)
    await client.patch(
        f"/api/v1/vendors/{(await client.get('/api/v1/vendors', headers=auth)).json()[0]['id']}",
        json={"default_category": "Utilities"},
        headers=auth,
    )

    another = await make_account(client, auth, name="Second", opening_amount="0")
    again = await preview(client, auth, another)
    row = again["rows"][3]
    assert row["vendor"] == "Power Co"
    assert row["category"] == "Utilities"
    assert again["rows"][0]["vendor"] is None


async def test_a_vendor_whose_name_matches_is_found_without_an_alias(client: AsyncClient, auth):
    account = await make_account(client, auth)
    await client.post("/api/v1/vendors", json={"name": "power company ltd"}, headers=auth)
    assert (await preview(client, auth, account))["rows"][3]["vendor"] == "power company ltd"


async def test_an_own_account_transfer_is_made_and_remembered(client: AsyncClient, auth):
    account = await make_account(client, auth)
    mib = await make_account(client, auth, name="MIB Savings", opening_amount="1000")
    rows = rows_from(await preview(client, auth, account))
    rows[2]["transfer_account_id"] = mib["id"]  # "MIB - Own.Person": a credit of 162
    result = await commit(client, auth, account, rows)
    assert result["batch"]["imported_count"] == 4

    transfers = (await client.get(TX, params={"type": "transfer"}, headers=auth)).json()
    assert len(transfers) == 1
    t = transfers[0]
    assert t["account"]["id"] == mib["id"]  # a credit: the money came from the other account
    assert t["to_account"]["id"] == account["id"]
    assert Decimal(t["amount"]) == Decimal("162")

    next_time = await preview(client, auth, mib)
    assert next_time["rows"][0]["transfer_account_id"] is None  # the alias is for BML's text
    again = await preview(client, auth, await make_account(client, auth, name="Third"))
    assert again["rows"][2]["transfer_account_id"] == mib["id"]


async def test_the_other_side_of_a_transfer_is_recognised(client: AsyncClient, auth):
    bml = await make_account(client, auth)
    mib = await make_account(client, auth, name="MIB Savings", opening_amount="1000")
    rows = rows_from(await preview(client, auth, bml))
    rows[2]["transfer_account_id"] = mib["id"]
    await commit(client, auth, bml, rows)

    # MIB's statement for the same money: a debit of 162 on the same day
    csv = (
        b'"POSTED DATE","VALUE DATE","TRANSACTION TYPE",REFERENCE,DESCRIPTION,AMOUNT,'
        b'"RUNNING BALANCE"\n'
        b'"2026-10-04 00:00:00","2026-10-04 00:00:00","Favara Transfer Web",1-5,'
        b'"04-10-2026 13-33-41 | MADVIPS1 abc | BML - OWN.PERSON, -",-162,838\n'
    )
    data = await preview(client, auth, mib, csv)
    assert data["profile"] == "mib"
    assert data["rows"][0]["duplicate"] == "transfer"
    assert data["new_count"] == 0


async def test_transfers_in_another_currency_are_skipped_with_a_reason(client: AsyncClient, auth):
    account = await make_account(client, auth)
    usd = await make_account(client, auth, name="USD", currency="USD", exchange_rate="15.4")
    rows = rows_from(await preview(client, auth, account))
    rows[0]["transfer_account_id"] = usd["id"]
    result = await commit(client, auth, account, rows)
    assert result["batch"]["imported_count"] == 3
    assert "USD" in result["skipped"][0]["reason"]


async def test_rows_left_out_are_counted_and_not_made(client: AsyncClient, auth):
    account = await make_account(client, auth)
    rows = rows_from(await preview(client, auth, account))
    rows[3]["skip"] = True
    result = await commit(client, auth, account, rows)
    assert result["batch"]["imported_count"] == 3
    assert result["batch"]["skipped_count"] == 1
    assert result["skipped"] == []  # a choice is not a problem
    assert len((await client.get(TX, headers=auth)).json()) == 3


async def test_the_report_lists_every_row_and_what_became_of_it(client: AsyncClient, auth):
    account = await make_account(client, auth)
    usd = await make_account(client, auth, name="USD", currency="USD", exchange_rate="15.4")
    rows = rows_from(await preview(client, auth, account))
    rows[0]["transfer_account_id"] = usd["id"]  # fails: another currency
    rows[3]["skip"] = True  # left out
    first = await commit(client, auth, account, rows)

    resp = await client.get(f"{URL}/{first['batch']['id']}/report", headers=auth)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert 'filename="s-report.csv"' in resp.headers["content-disposition"]
    lines = resp.text.strip().split("\n")
    assert lines[0] == "Row,Date,Time,Type,Amount,Counterparty,Description,Reference,Result,Reason"
    assert len(lines) == 5  # the header and every row sent
    results = [line.split(",")[8] for line in lines[1:]]
    assert results == ["Failed", "Imported", "Imported", "Left out"]
    assert "USD" in lines[1]  # the reason is in the file

    # a second import of the same rows: the ones that were made are now "Skipped"
    again = await commit(client, auth, account, rows_from(await preview(client, auth, account)))
    text = (await client.get(f"{URL}/{again['batch']['id']}/report", headers=auth)).text
    assert text.count("Skipped") == 2
    assert text.count("Imported") == 2  # the two that had failed or been left out


async def test_the_report_makes_formula_looking_text_safe(client: AsyncClient, auth):
    account = await make_account(client, auth)
    row = {
        "date": "2026-10-01",
        "type": "expense",
        "amount": "5",
        "counterparty": "=HYPERLINK(1)",
        "description": "+cmd",
        "reference": "R1",
    }
    result = await commit(client, auth, account, [row])
    text = (await client.get(f"{URL}/{result['batch']['id']}/report", headers=auth)).text
    assert "'=HYPERLINK(1)" in text
    assert "'+cmd" in text


async def test_a_row_that_blows_up_fails_alone_and_the_import_goes_on(
    client: AsyncClient, auth, monkeypatch
):
    from app.services.transaction import TransactionService

    account = await make_account(client, auth)
    real = TransactionService.create
    calls = {"n": 0}

    async def flaky(self, user_id, data):
        calls["n"] += 1
        if calls["n"] == 2:
            raise RuntimeError("boom")
        return await real(self, user_id, data)

    monkeypatch.setattr(TransactionService, "create", flaky)
    result = await commit(client, auth, account, rows_from(await preview(client, auth, account)))
    assert result["batch"]["imported_count"] == 3
    assert [(s["index"], s["outcome"]) for s in result["skipped"]] == [(1, "failed")]
    assert result["skipped"][0]["reason"] == "Something went wrong with this row"
    assert len((await client.get(TX, headers=auth)).json()) == 3
    report = (await client.get(f"{URL}/{result['batch']['id']}/report", headers=auth)).text
    assert report.count("Failed") == 1


async def test_the_report_is_private(client: AsyncClient, auth, signup: Signup):
    account = await make_account(client, auth)
    result = await commit(client, auth, account, rows_from(await preview(client, auth, account)))
    other = await signup("bob@example.com")
    resp = await client.get(f"{URL}/{result['batch']['id']}/report", headers=other)
    assert resp.status_code == 404


async def test_a_file_that_is_not_a_statement_is_a_422_in_plain_words(client: AsyncClient, auth):
    account = await make_account(client, auth)
    resp = await client.post(
        URL + "/preview", params={"account_id": account["id"]}, content=b"a,b\n1,2\n", headers=auth
    )
    assert resp.status_code == 422
    assert "BML or MIB" in resp.json()["detail"]


async def test_archived_and_other_peoples_accounts_are_refused(
    client: AsyncClient, auth, signup: Signup
):
    account = await make_account(client, auth)
    other = await signup("bob@example.com")
    theirs = await make_account(client, other, name="Theirs")
    await preview(client, auth, theirs, expect=404)

    await client.post(f"{ACCOUNTS}/{account['id']}/archive", headers=auth)
    await preview(client, auth, account, expect=422)


async def test_history_is_private_and_undo_of_someone_elses_is_404(
    client: AsyncClient, auth, signup: Signup
):
    account = await make_account(client, auth)
    result = await commit(client, auth, account, rows_from(await preview(client, auth, account)))
    other = await signup("bob@example.com")
    assert (await client.get(URL, headers=other)).json() == []
    resp = await client.delete(f"{URL}/{result['batch']['id']}", headers=other)
    assert resp.status_code == 404


async def test_history_lists_newest_first_with_the_account(client: AsyncClient, auth):
    account = await make_account(client, auth)
    await commit(client, auth, account, rows_from(await preview(client, auth, account))[:1])
    listed = await client.get(URL, headers=auth)
    assert listed.headers["x-total-count"] == "1"
    assert listed.json()[0]["account"]["id"] == account["id"]
    assert listed.json()[0]["filename"] == "s.csv"


async def test_imports_survive_a_backup_and_restore(client: AsyncClient, auth, signup: Signup):
    account = await make_account(client, auth)
    await commit(client, auth, account, rows_from(await preview(client, auth, account)))
    backup = (await client.get("/api/v1/backup", headers=auth)).content
    fresh = await signup("restore@example.com")
    resp = await client.post("/api/v1/backup/restore", content=backup, headers=fresh)
    assert resp.status_code == 200, resp.text
    listed = (await client.get(URL, headers=fresh)).json()
    assert len(listed) == 1
    assert listed[0]["transaction_count"] == 4
