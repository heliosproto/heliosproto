from __future__ import annotations

from collections.abc import Iterator
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

FACTORY_C = "CDF4P7N4QGYOH4NYSTJR4SJFE5SQXGD2LXSNBQWMI5MOS35KLCNUGU2S"


@pytest.fixture
def client_without_pool() -> Iterator[TestClient]:
    with patch("main.create_pool", AsyncMock(side_effect=OSError("postgres down"))):
        from main import app

        with TestClient(app) as c:
            yield c


def test_activity_rejects_non_contract_address(client_without_pool: TestClient) -> None:
    resp = client_without_pool.get(
        "/accounts/GBWUF6VB7ZLK5EZI46SSPNNVWOM4X3X64KQYN6BCVILFD3AQMAIETKMC/activity"
    )
    assert resp.status_code == 400
    assert "Soroban contract" in resp.json()["detail"]


def test_activity_returns_503_when_pool_is_unavailable(
    client_without_pool: TestClient,
) -> None:
    resp = client_without_pool.get(f"/accounts/{FACTORY_C}/activity")
    assert resp.status_code == 503
    assert "postgres down" in resp.json()["detail"]
