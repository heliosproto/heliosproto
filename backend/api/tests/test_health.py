from __future__ import annotations

import os
from unittest.mock import patch

from fastapi.testclient import TestClient

from config import get_settings
from main import app


def test_health_endpoint_returns_ok() -> None:
    # Reset the cached settings so the test env vars take effect
    get_settings.cache_clear()

    env = {
        "STELLAR_RPC_URL": "https://testnet.stellar.org",
        "STELLAR_NETWORK": "futurenet",
        "DATABASE_URL": "postgresql://user:(a)localhost/db",
        "REDIS_URL": "redis://localhost:6379/0",
    }
    with patch.dict(os.environ, env, clear=True):
        client = TestClient(app)
        response = client.get("/health")

    payload = response.json()
    assert response.status_code == 200
    assert payload["network"] == "futurenet"
    assert payload["status"] == "ok"
    assert payload["service"] == "heliosproto-api"
