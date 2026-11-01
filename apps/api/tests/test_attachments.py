import os
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app import jobs, storage
from app.config import settings
from app.models import TransactionAttachment
from app.services.attachment import ORPHAN_MIN_AGE, detect_mime_type
from app.storage import KEY_PATTERN, LocalStorage, S3Storage, set_storage
from sqlalchemy import func, select

TX = "/api/v1/transactions"
ATT = "/api/v1/attachments"

JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
PDF = b"%PDF-1.7\n" + b"\x00" * 64
WEBP = b"RIFF\x00\x00\x00\x00WEBP" + b"\x00" * 64


@pytest.fixture(autouse=True)
def folder_storage(tmp_path):
    """Every test keeps its files in its own temporary folder."""
    store = LocalStorage(tmp_path / "files")
    set_storage(store)
    yield store
    set_storage(None)


async def make_transaction(client, headers) -> str:
    resp = await client.post(
        TX,
        json={
            "type": "expense",
            "amount": "10",
            "payment_method": "cash",
            "category": "Misc",
            "transaction_date": "2026-03-01",
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def upload(client, headers, tx_id, body=JPEG, name="receipt.jpg"):
    return await client.post(
        f"{TX}/{tx_id}/attachments",
        params={"filename": name},
        content=body,
        headers={**headers, "content-type": "application/octet-stream"},
    )


async def stored_count(client) -> int:
    async with client.session_factory() as db:
        return await db.scalar(select(func.count()).select_from(TransactionAttachment))


def test_the_type_comes_from_the_bytes():
    assert detect_mime_type(JPEG) == "image/jpeg"
    assert detect_mime_type(PNG) == "image/png"
    assert detect_mime_type(PDF) == "application/pdf"
    assert detect_mime_type(WEBP) == "image/webp"
    assert detect_mime_type(b"<html><script>alert(1)</script>") is None
    assert detect_mime_type(b'<svg xmlns="http://www.w3.org/2000/svg"/>') is None
    assert detect_mime_type(b"") is None


async def test_upload_list_download_delete(client, auth, folder_storage):
    tx = await make_transaction(client, auth)
    resp = await upload(client, auth, tx, PNG, "photo of receipt.png")
    assert resp.status_code == 201, resp.text
    item = resp.json()
    assert item["filename"] == "photo of receipt.png"
    assert item["mime_type"] == "image/png"
    assert item["size"] == len(PNG)

    listed = (await client.get(f"{TX}/{tx}/attachments", headers=auth)).json()
    assert [a["id"] for a in listed] == [item["id"]]

    file = await client.get(f"{ATT}/{item['id']}", headers=auth)
    assert file.status_code == 200
    assert file.content == PNG
    assert file.headers["content-type"] == "image/png"
    assert file.headers["content-disposition"].startswith("inline;")
    assert file.headers["x-content-type-options"] == "nosniff"
    forced = await client.get(f"{ATT}/{item['id']}", params={"download": "true"}, headers=auth)
    assert forced.headers["content-disposition"].startswith("attachment;")

    assert (await client.delete(f"{ATT}/{item['id']}", headers=auth)).status_code == 204
    assert (await client.get(f"{ATT}/{item['id']}", headers=auth)).status_code == 404
    assert await stored_count(client) == 0
    assert await folder_storage.list() == []


async def test_the_transaction_says_how_many_files_it_has(client, auth):
    tx = await make_transaction(client, auth)
    assert (await client.get(f"{TX}/{tx}", headers=auth)).json()["attachment_count"] == 0
    await upload(client, auth, tx)
    await upload(client, auth, tx, PDF, "invoice.pdf")
    assert (await client.get(f"{TX}/{tx}", headers=auth)).json()["attachment_count"] == 2
    listed = (await client.get(TX, headers=auth)).json()
    assert listed[0]["attachment_count"] == 2


async def test_files_that_are_not_receipts_are_refused(client, auth, folder_storage):
    tx = await make_transaction(client, auth)
    for body, name in [(b"<svg/>", "x.svg"), (b"hello", "notes.txt"), (b"MZ\x90\x00", "a.png")]:
        resp = await upload(client, auth, tx, body, name)
        assert resp.status_code == 422, name
    assert (await upload(client, auth, tx, b"", "empty.jpg")).status_code == 422
    assert await stored_count(client) == 0
    assert await folder_storage.list() == []


async def test_size_and_count_limits(client, auth, monkeypatch):
    tx = await make_transaction(client, auth)
    monkeypatch.setattr(settings, "attachment_max_bytes", 100)
    big = await upload(client, auth, tx, JPEG + b"\x00" * 100)
    assert big.status_code == 413
    monkeypatch.setattr(settings, "attachment_max_bytes", 10 * 1024 * 1024)

    monkeypatch.setattr(settings, "attachments_per_transaction", 2)
    assert (await upload(client, auth, tx)).status_code == 201
    assert (await upload(client, auth, tx)).status_code == 201
    third = await upload(client, auth, tx)
    assert third.status_code == 422
    assert "at most 2" in third.json()["detail"]


async def test_filenames_are_cleaned(client, auth):
    tx = await make_transaction(client, auth)
    resp = await upload(client, auth, tx, JPEG, "../../etc/passwd\x00.jpg")
    assert resp.status_code == 201
    assert "/" not in resp.json()["filename"]
    assert "\x00" not in resp.json()["filename"]


async def test_other_users_get_not_found(client, auth, signup):
    tx = await make_transaction(client, auth)
    item = (await upload(client, auth, tx)).json()
    other = await signup("other@example.com")
    assert (await client.get(f"{TX}/{tx}/attachments", headers=other)).status_code == 404
    assert (await upload(client, other, tx)).status_code == 404
    assert (await client.get(f"{ATT}/{item['id']}", headers=other)).status_code == 404
    assert (await client.delete(f"{ATT}/{item['id']}", headers=other)).status_code == 404
    assert (await client.get(f"{ATT}/{item['id']}", headers=auth)).status_code == 200


async def test_requires_a_login(client, auth):
    tx = await make_transaction(client, auth)
    assert (await client.get(f"{TX}/{tx}/attachments")).status_code == 401
    assert (await client.get(f"{ATT}/{uuid.uuid4()}")).status_code == 401


async def test_a_trashed_transaction_keeps_its_files_but_takes_no_new_ones(client, auth):
    tx = await make_transaction(client, auth)
    item = (await upload(client, auth, tx)).json()
    await client.delete(f"{TX}/{tx}", headers=auth)
    assert (await upload(client, auth, tx)).status_code == 404
    assert [a["id"] for a in (await client.get(f"{TX}/{tx}/attachments", headers=auth)).json()] == [
        item["id"]
    ]
    await client.post(f"{TX}/{tx}/restore", headers=auth)
    assert (await upload(client, auth, tx)).status_code == 201


async def test_a_failed_row_insert_does_not_leave_the_file(
    client, auth, folder_storage, monkeypatch
):
    tx = await make_transaction(client, auth)
    from sqlalchemy.ext.asyncio import AsyncSession

    async def boom(self, *a, **k):
        raise RuntimeError("database down")

    monkeypatch.setattr(AsyncSession, "flush", boom)
    with pytest.raises(RuntimeError):
        await upload(client, auth, tx)
    assert await folder_storage.list() == []


async def test_a_missing_file_is_a_404_not_a_crash(client, auth, folder_storage):
    tx = await make_transaction(client, auth)
    item = (await upload(client, auth, tx)).json()
    for stored in await folder_storage.list():
        await folder_storage.delete(stored.key)
    assert (await client.get(f"{ATT}/{item['id']}", headers=auth)).status_code == 404


async def test_the_sweep_removes_only_old_orphans(client, auth, folder_storage):
    tx = await make_transaction(client, auth)
    kept = (await upload(client, auth, tx)).json()

    user = uuid.uuid4()
    old_orphan = storage.storage_key(user, uuid.uuid4())
    fresh_orphan = storage.storage_key(user, uuid.uuid4())
    await folder_storage.put(old_orphan, JPEG, "image/jpeg")
    await folder_storage.put(fresh_orphan, JPEG, "image/jpeg")
    await folder_storage.put("not-ours.txt", b"x", "text/plain")
    long_ago = (datetime.now(UTC) - ORPHAN_MIN_AGE - timedelta(hours=1)).timestamp()
    os.utime(folder_storage._path(old_orphan), (long_ago, long_ago))
    os.utime(folder_storage._path("not-ours.txt"), (long_ago, long_ago))

    async with client.session_factory() as db:
        from app.services import AttachmentService

        assert await AttachmentService(db, folder_storage).purge_orphans() == 1

    left = {o.key for o in await folder_storage.list()}
    assert old_orphan not in left
    assert fresh_orphan in left  # young: maybe mid-upload
    assert "not-ours.txt" in left  # not named like one of our files
    assert any(k.endswith(kept["id"]) for k in left)  # has a row


async def test_the_sweep_job_runs_against_the_configured_storage(client, auth):
    tx = await make_transaction(client, auth)
    await upload(client, auth, tx)
    assert await jobs.purge_orphan_attachments(client.session_factory) == 0


def test_the_sweep_is_scheduled():
    names = {p.task.name for p in jobs.app.periodic_registry.periodic_tasks.values()}
    assert "purge_orphan_attachments" in names


def test_keys_have_the_shape_the_sweep_expects():
    assert KEY_PATTERN.match(storage.storage_key(uuid.uuid4(), uuid.uuid4()))
    assert not KEY_PATTERN.match("../../etc/passwd")
    assert not KEY_PATTERN.match("a/b")


def test_local_storage_will_not_leave_its_folder(tmp_path):
    store = LocalStorage(tmp_path / "files")
    with pytest.raises(ValueError, match="Invalid storage key"):
        store._path("../outside")


async def test_the_s3_backend_works_like_the_folder_one():
    from moto import mock_aws

    with mock_aws():
        s3 = S3Storage("receipts", None, "us-east-1", "test", "test")
        assert s3.ensure_bucket() is True
        assert s3.ensure_bucket() is False
        key = storage.storage_key(uuid.uuid4(), uuid.uuid4())
        await s3.put(key, PDF, "application/pdf")
        assert await s3.get(key) == PDF
        assert [o.key for o in await s3.list()] == [key]
        await s3.delete(key)
        assert await s3.list() == []
        with pytest.raises(storage.MissingFileError):
            await s3.get(key)
