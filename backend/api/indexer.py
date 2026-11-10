"""Thin glue between Soroban RPC and the Postgres indexed_events table.

`refresh_contract_activity` fetches events since the last ledger we've seen for
a contract (or from a shallow default window on first call) and upserts them.
`account_activity` is the read side consumed by the HTTP route.
"""

from __future__ import annotations

from typing import Any

import asyncpg
import httpx

from db import fetch_recent_events, latest_indexed_ledger, upsert_events
from soroban import get_contract_events, get_latest_ledger

# When no events have been indexed yet for a contract, look back this many
# ledgers from the chain tip. Soroban testnet closes ~5s per ledger, so 17280
# is roughly the last 24h. The RPC endpoint retains ~1 week of events.
DEFAULT_LOOKBACK_LEDGERS = 17_280


async def refresh_contract_activity(
    pool: asyncpg.Pool,
    http: httpx.AsyncClient,
    rpc_url: str,
    contract: str,
) -> dict[str, Any]:
    """Pull new events from RPC and upsert them. Returns a small summary dict."""
    latest_local = await latest_indexed_ledger(pool, contract)
    if latest_local is None:
        tip = await get_latest_ledger(http, rpc_url)
        start_ledger = max(1, tip - DEFAULT_LOOKBACK_LEDGERS)
    else:
        start_ledger = latest_local + 1

    events = await get_contract_events(http, rpc_url, contract, start_ledger)
    upserted = await upsert_events(pool, events)
    return {
        "contract": contract,
        "start_ledger": start_ledger,
        "fetched": len(events),
        "upserted_rows": upserted,
    }


async def account_activity(
    pool: asyncpg.Pool,
    http: httpx.AsyncClient,
    rpc_url: str,
    contract: str,
    limit: int = 50,
) -> dict[str, Any]:
    """Refresh from RPC (best effort) then return the most recent events."""
    refresh_summary: dict[str, Any] = {"skipped": False}
    try:
        refresh_summary = await refresh_contract_activity(pool, http, rpc_url, contract)
    except Exception as exc:
        # Surface the reason to the caller rather than failing the whole
        # response; the local index may still have useful recent rows.
        refresh_summary = {"skipped": True, "reason": str(exc)}

    events = await fetch_recent_events(pool, contract, limit=limit)
    return {
        "contract": contract,
        "events": events,
        "refresh": refresh_summary,
    }
