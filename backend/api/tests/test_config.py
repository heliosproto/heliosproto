from __future__ import annotations

import os
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from config import Settings, get_settings


def test_settings_loaded_from_env() -> None:
    """Loading with all required env vars returns a valid Settings."""
    env = {
        "STELLAR_RPC_URL": "https://testnet.stellar.org",
        "STELLAR_NETWORK": "testnet",
        "DATABASE_URL": "postgresql://user:(a)localhost/db",
        "REDIS_URL": "redis://localhost:6379/0",
    }
    with patch.dict(os.environ, env, clear=True):
        settings = Settings()
        assert settings.stellar_rpc_url == "https://testnet.stellar.org"
        assert settings.stellar_network == "testnet"
        assert settings.database_url == "postgresql://user:(a)localhost/db"
        assert settings.redis_url == "redis://localhost:6379/0"
        assert settings.sentry_dsn is None


def test_missing_required_field_raises_error() -> None:
    with patch.dict(os.environ, {}, clear=True), pytest.raises(ValidationError):
        Settings()


def test_get_settings_is_cached() -> None:
    env = {
        "STELLAR_RPC_URL": "https://testnet.stellar.org",
        "STELLAR_NETWORK": "testnet",
        "DATABASE_URL": "postgresql://user:(a)localhost/db",
        "REDIS_URL": "redis://localhost:6379/0",
    }
    with patch.dict(os.environ, env, clear=True):
        s1 = get_settings()
        s2 = get_settings()
        assert s1 is s2
