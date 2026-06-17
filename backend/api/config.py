from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment / .env.

    Every backend service will use this pattern — landing it here
    gives the indexer, prices, and SEP-10 auth issues a clean template.
    """

    stellar_rpc_url: str
    stellar_network: Literal["testnet", "futurenet", "mainnet"]
    database_url: str
    redis_url: str
    sentry_dsn: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings singleton.

    Instantiated once per process thanks to ``@lru_cache``.
    """
    return Settings()  # type: ignore[call-arg]  # loaded from environment variables
