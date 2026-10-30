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


settings = Settings()  # type: ignore[call-arg]  # secret_key comes from env
