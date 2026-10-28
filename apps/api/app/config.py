from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Maalu API"
    debug: bool = False
    database_url: str = "postgresql+asyncpg://maalu:maalu@localhost:5432/maalu"
    # Required, no default: generate with `openssl rand -hex 32`.
    secret_key: str
    access_token_expire_minutes: int = 30
    # Source of the list of world currencies (only the codes are read from it) and of the market
    # exchange rates offered as a suggestion when entering a foreign-currency amount. The rate a
    # user saves is always the one they confirm, never one fetched on their behalf.
    currency_source_url: str = "https://api.frankfurter.dev/v2/rates"
    exchange_rate_timeout_seconds: float = 5.0
    currency_cache_ttl_seconds: int = 24 * 60 * 60


settings = Settings()  # type: ignore[call-arg]  # secret_key comes from env
