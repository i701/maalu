from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Maalu API"
    debug: bool = False
    database_url: str = "postgresql+asyncpg://maalu:maalu@localhost:5432/maalu"
    # Required, no default: generate with `openssl rand -hex 32`.
    secret_key: str
    # How long a sign-in lasts after its last use. Each use (at most once an hour) pushes the end
    # out again, so a device you use now and then stays signed in and a lost one expires.
    session_days: int = 30
    # Who may create an account. "auto" (default): only while no account exists, so the first person
    # to open a new instance becomes its owner and sign-up then closes. "open": anyone. "closed": no
    # one (accounts are created another way, for example `just seed`).
    registration: Literal["auto", "open", "closed"] = "auto"
    # Slows down password guessing, code guessing and sign-up spam (`app/rate_limit.py`). Only turn
    # it off for local experiments.
    rate_limit: bool = True
    # Source of the list of world currencies (only the codes are read from it) and of the market
    # exchange rates offered as a suggestion when entering a foreign-currency amount. The rate a
    # user saves is always the one they confirm, never one fetched on their behalf.
    currency_source_url: str = "https://api.frankfurter.dev/v2/rates"
    exchange_rate_timeout_seconds: float = 5.0
    currency_cache_ttl_seconds: int = 24 * 60 * 60
    # Searching for a place by name when marking a location on the map. It asks a geocoder
    # (Nominatim by default: its public server wants light personal use, an identifying
    # User-Agent and at most one request a second, all of which `services/geocode.py` keeps to).
    # What a user types into that search box is sent to it; nothing else is. Set it empty to turn
    # place search off (the map still works by clicking), or point it at your own Nominatim.
    geocoder_url: str = "https://nominatim.openstreetmap.org/search"
    geocoder_user_agent: str = "Maalu (self-hosted personal finance; https://github.com/i701/maalu)"
    geocoder_timeout_seconds: float = 8.0
    # Where transaction attachments (receipts) are kept. With a bucket set they go to any
    # S3-compatible store (AWS S3, Cloudflare R2, MinIO, floci in development); without one they go
    # to a folder on disk, which is the default and needs nothing set up (mount a volume on it).
    attachments_s3_bucket: str | None = None
    # Leave out for AWS S3; set for R2 (https://<account>.r2.cloudflarestorage.com), MinIO, floci...
    attachments_s3_endpoint: str | None = None
    attachments_s3_region: str = "auto"
    attachments_s3_access_key_id: str | None = None
    attachments_s3_secret_access_key: str | None = None
    attachments_dir: str = "data/attachments"
    attachment_max_bytes: int = 10 * 1024 * 1024
    attachments_per_transaction: int = 10
    links_per_transaction: int = 10


settings = Settings()  # type: ignore[call-arg]  # secret_key comes from env
