from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import pytest

import indexer

FACTORY_C = "CDF4P7N4QGYOH4NYSTJR4SJFE5SQXGD2LXSNBQWMI5MOS35KLCNUGU2S"


class FakePool:
    """Stand-in for asyncpg.Pool. Only the interfaces touched by indexer."""


@pytest.mark.asyncio
async def test_refresh_contract_activity_cold_cache_uses_lookback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pool = FakePool()
    http: Any = object()

    monkeypatch.setattr(indexer, "latest_indexed_ledger", AsyncMock(return_value=None))
    monkeypatch.setattr(indexer, "get_latest_ledger", AsyncMock(return_value=1_000_000))
    get_events = AsyncMock(return_value=[{"id": "evt-1"}])
    monkeypatch.setattr(indexer, "get_contract_events", get_events)
    monkeypatch.setattr(indexer, "upsert_events", AsyncMock(return_value=1))

    result = await indexer.refresh_contract_activity(pool, http, "https://mock", FACTORY_C)

    assert result["fetched"] == 1
    assert result["upserted_rows"] == 1
    assert result["start_ledger"] == 1_000_000 - indexer.DEFAULT_LOOKBACK_LEDGERS
    get_events.assert_awaited_once()


@pytest.mark.asyncio
async def test_refresh_contract_activity_uses_last_indexed_plus_one(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pool = FakePool()
    http: Any = object()

    monkeypatch.setattr(indexer, "latest_indexed_ledger", AsyncMock(return_value=5_000))
    monkeypatch.setattr(indexer, "get_latest_ledger", AsyncMock(return_value=10_000))
    monkeypatch.setattr(indexer, "get_contract_events", AsyncMock(return_value=[]))
    monkeypatch.setattr(indexer, "upsert_events", AsyncMock(return_value=0))

    result = await indexer.refresh_contract_activity(pool, http, "https://mock", FACTORY_C)

    assert result["start_ledger"] == 5_001
    assert result["fetched"] == 0


@pytest.mark.asyncio
async def test_account_activity_returns_cached_events_even_when_refresh_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pool = FakePool()
    http: Any = object()

    async def failing_refresh(*_args: object, **_kwargs: object) -> dict[str, Any]:
        raise RuntimeError("rpc down")

    monkeypatch.setattr(indexer, "refresh_contract_activity", failing_refresh)
    cached = [{"event_id": "cached-1", "contract": FACTORY_C}]
    monkeypatch.setattr(indexer, "fetch_recent_events", AsyncMock(return_value=cached))

    result = await indexer.account_activity(pool, http, "https://mock", FACTORY_C, limit=10)

    assert result["contract"] == FACTORY_C
    assert result["events"] == cached
    assert result["refresh"]["skipped"] is True
    assert "rpc down" in result["refresh"]["reason"]
