from decimal import Decimal
from pathlib import Path

import pytest
from app.enums import PaymentMethod, TransactionType
from app.statements import StatementError, detect, parse_statement

DATA = Path(__file__).parent / "data"


def load(name: str):
    return parse_statement((DATA / name).read_bytes())


def test_the_profile_comes_from_the_header():
    assert load("bml_statement.csv").profile == "bml"
    assert load("mib_statement.csv").profile == "mib"
    assert detect(["Date", "Memo", "Amount"]) is None


def test_bml_rows_have_a_positive_amount_and_a_direction():
    rows = load("bml_statement.csv").rows
    assert [(r.type, r.amount) for r in rows] == [
        (TransactionType.EXPENSE, Decimal("30")),
        (TransactionType.INCOME, Decimal("2171")),
        (TransactionType.INCOME, Decimal("162")),
        (TransactionType.EXPENSE, Decimal("2171.58")),
    ]


def test_bml_takes_the_date_and_time_from_the_description_not_the_posting_date():
    first = load("bml_statement.csv").rows[0]
    assert str(first.date) == "2026-10-02"  # posted on the 4th, made on the 2nd
    assert str(first.time) == "14:55:42"


def test_bml_counterparty_by_kind():
    transfer, _, favara, purchase = load("bml_statement.csv").rows
    assert transfer.counterparty == "PERSON ONE"
    assert favara.counterparty == "MIB - Own.Person"  # a credit names the sender first
    assert purchase.counterparty == "POWER COMPANY LTD"
    assert str(purchase.date) == "2026-10-04"  # a date without a time still beats the posting date
    assert purchase.time is None


def test_bml_payment_method_and_reference():
    transfer, *_, purchase = load("bml_statement.csv").rows
    assert transfer.payment_method is PaymentMethod.BANK_TRANSFER
    assert purchase.payment_method is PaymentMethod.DEBIT_CARD
    assert transfer.reference == "BLAZ000000000001"


def test_bml_description_keeps_the_kind_and_drops_noise():
    transfer, *_ = load("bml_statement.csv").rows
    assert transfer.description == "Transfer Debit · PERSON ONE"  # "Internet Banking" is noise


def test_bml_balances():
    statement = load("bml_statement.csv")
    assert statement.opening_balance == Decimal("337.38")  # 307.38 plus the 30 that left
    assert statement.closing_balance == Decimal("468.8")


def test_mib_signed_amounts_and_the_brought_forward_row():
    statement = load("mib_statement.csv")
    assert statement.opening_balance == Decimal("70")
    assert statement.closing_balance == Decimal("771.85")
    rows = statement.rows
    assert len(rows) == 3  # the B/F line is not a transaction
    assert [(r.type, r.amount) for r in rows] == [
        (TransactionType.EXPENSE, Decimal("0.15")),
        (TransactionType.INCOME, Decimal("2")),
        (TransactionType.INCOME, Decimal("700")),
    ]


def test_mib_counterparty_cleans_the_dangling_dash():
    rows = load("mib_statement.csv").rows
    assert rows[0].counterparty == "BML - OWN.PERSON"
    assert rows[1].counterparty == "One Code / Own Person"  # a lone "-" is not a name
    assert rows[2].counterparty == "One Code / Own Person"
    assert str(rows[0].date) == "2026-05-05"
    assert str(rows[0].time) == "07:41:55"
    assert rows[0].reference == "1-000000001"


def test_a_newest_first_file_is_read_oldest_first():
    text = (DATA / "mib_statement.csv").read_text().splitlines()
    flipped = "\n".join([text[0], *reversed(text[2:])]).encode()
    statement = parse_statement(flipped)
    assert [str(r.date) for r in statement.rows] == sorted(str(r.date) for r in statement.rows)
    assert statement.closing_balance == Decimal("771.85")


@pytest.mark.parametrize(
    "content",
    [b"", b"just some text", b"a,b,c\n1,2,3\n", b"\xff\xfe\x00bad"],
)
def test_unknown_files_are_refused_in_plain_words(content):
    with pytest.raises(StatementError):
        parse_statement(content)


def test_a_bad_date_names_the_line():
    bad = (DATA / "bml_statement.csv").read_text().replace("2026/10/05", "05/10/2026").encode()
    with pytest.raises(StatementError, match="Line 5"):
        parse_statement(bad)
