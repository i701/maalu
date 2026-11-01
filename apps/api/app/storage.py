"""Where attachment files live: an S3-compatible bucket when one is configured, else a folder.

Files are only ever named by the server (`{user_id}/{attachment_id}`), never by the client, and the
database row is the truth about what exists: a file with no row is an orphan the daily sweep
removes (`app/jobs.py`). The S3 client (boto3) is synchronous, so its calls run in a thread.
"""

import asyncio
import re
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol

from app.config import settings

# What every key this app writes looks like; anything else in the store is not ours to touch.
KEY_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/"
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
)


def storage_key(user_id: uuid.UUID, attachment_id: uuid.UUID) -> str:
    return f"{user_id}/{attachment_id}"


class MissingFileError(Exception):
    """The row exists but the file is not in storage."""


@dataclass(frozen=True)
class StoredObject:
    key: str
    last_modified: datetime


class Storage(Protocol):
    async def put(self, key: str, body: bytes, content_type: str) -> None: ...
    async def get(self, key: str) -> bytes: ...
    async def delete(self, key: str) -> None: ...
    async def list(self) -> list[StoredObject]: ...


class LocalStorage:
    """Files in a folder, one sub-folder per user."""

    def __init__(self, root: str | Path) -> None:
        self.root = Path(root).resolve()

    def _path(self, key: str) -> Path:
        # keys are server-made, but never follow one out of the root anyway
        path = (self.root / key).resolve()
        if not path.is_relative_to(self.root):
            raise ValueError("Invalid storage key")
        return path

    async def put(self, key: str, body: bytes, content_type: str) -> None:
        def write() -> None:
            path = self._path(key)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(body)

        await asyncio.to_thread(write)

    async def get(self, key: str) -> bytes:
        try:
            return await asyncio.to_thread(self._path(key).read_bytes)
        except FileNotFoundError:
            raise MissingFileError(key) from None

    async def delete(self, key: str) -> None:
        await asyncio.to_thread(lambda: self._path(key).unlink(missing_ok=True))

    async def list(self) -> list[StoredObject]:
        def walk() -> list[StoredObject]:
            if not self.root.exists():
                return []
            return [
                StoredObject(
                    f.relative_to(self.root).as_posix(),
                    datetime.fromtimestamp(f.stat().st_mtime, UTC),
                )
                for f in self.root.rglob("*")
                if f.is_file()
            ]

        return await asyncio.to_thread(walk)


class S3Storage:
    """Files in an S3-compatible bucket."""

    def __init__(
        self,
        bucket: str,
        endpoint: str | None,
        region: str,
        access_key_id: str | None,
        secret_access_key: str | None,
    ) -> None:
        import boto3
        from botocore.config import Config

        self.bucket = bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint or None,
            region_name=region,
            aws_access_key_id=access_key_id or None,
            aws_secret_access_key=secret_access_key or None,
            # path-style addressing works on every S3-compatible store, including local ones
            config=Config(s3={"addressing_style": "path"}),
        )

    async def put(self, key: str, body: bytes, content_type: str) -> None:
        await asyncio.to_thread(
            self.client.put_object,
            Bucket=self.bucket,
            Key=key,
            Body=body,
            ContentType=content_type,
        )

    async def get(self, key: str) -> bytes:
        def read() -> bytes:
            try:
                return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()
            except self.client.exceptions.NoSuchKey:
                raise MissingFileError(key) from None

        return await asyncio.to_thread(read)

    async def delete(self, key: str) -> None:
        await asyncio.to_thread(self.client.delete_object, Bucket=self.bucket, Key=key)

    async def list(self) -> list[StoredObject]:
        def walk() -> list[StoredObject]:
            found: list[StoredObject] = []
            pages = self.client.get_paginator("list_objects_v2").paginate(Bucket=self.bucket)
            for page in pages:
                for item in page.get("Contents", []):
                    found.append(StoredObject(item["Key"], item["LastModified"]))
            return found

        return await asyncio.to_thread(walk)

    def ensure_bucket(self) -> bool:
        """Create the bucket if it is missing (development and first setup). True when created."""
        try:
            self.client.head_bucket(Bucket=self.bucket)
            return False
        except self.client.exceptions.ClientError:
            self.client.create_bucket(Bucket=self.bucket)
            return True


_storage: Storage | None = None


def get_storage() -> Storage:
    """The configured store, made once. A test replaces it with `set_storage`."""
    global _storage
    if _storage is None:
        if settings.attachments_s3_bucket:
            _storage = S3Storage(
                settings.attachments_s3_bucket,
                settings.attachments_s3_endpoint,
                settings.attachments_s3_region,
                settings.attachments_s3_access_key_id,
                settings.attachments_s3_secret_access_key,
            )
        else:
            _storage = LocalStorage(settings.attachments_dir)
    return _storage


def set_storage(storage: Storage | None) -> None:
    global _storage
    _storage = storage
