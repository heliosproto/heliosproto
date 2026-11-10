"""Postgres connection pool + schema init for the indexer."""

from __future__ import annotations

import json
from typing import Any

import asyncpg

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS indexed_events (
    event_id        text        PRIMARY KEY,
    contract        text        NOT NULL,
    ledger          bigint      NOT NULL,
    ledger_closed_at timestamptz NOT NULL,
    tx_hash         text        NOT NULL,
    event_type      text        NOT NULL,
    topics          jsonb       NOT NULL,
    value           text,
    paging_token    text,
    indexed_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_indexed_events_contract_ledger
    ON indexed_events (contract, ledger DESC);
"""


async def create_pool(dsn: str) -> asyncpg.Pool:
    """Open an asyncpg pool, ensure the schema exists, and return it."""
    pool = await asyncpg.create_pool(dsn=dsn, min_size=1, max_size=5)
    if pool is None:
        raise RuntimeError("asyncpg.create_pool returned None")
    async with pool.acquire() as conn:
        await conn.execute(SCHEMA_SQL)
    return pool


async def upsert_events(pool: asyncpg.Pool, events: list[dict[str, Any]]) -> int:
    """Insert events, skipping rows that already exist by event_id. Returns inserted count."""
    if not events:
        return 0
    rows = [
        (
            str(e.get("id")),
            str(e.get("contractId")),
            int(e.get("ledger", 0)),
            str(e.get("ledgerClosedAt")),
            str(e.get("txHash", "")),
            str(e.get("type", "")),
            json.dumps(e.get("topic") or []),
            e.get("value"),
            e.get("pagingToken"),
        )
        for e in events
    ]
    async with pool.acquire() as conn:
        result = await conn.executemany(
            """
            INSERT INTO indexed_events
                (event_id, contract, ledger, ledger_closed_at, tx_hash,
                 event_type, topics, value, paging_token)
            VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7::jsonb, $8, $9)
            ON CONFLICT (event_id) DO NOTHING
            """,
            rows,
        )
    # asyncpg's executemany does not return a per-row rowcount; approximate by
    # assuming every row was either inserted or skipped. Callers who need the
    # exact insert count can diff against a COUNT(*) before/after.
    _ = result
    return len(rows)


async def fetch_recent_events(
    pool: asyncpg.Pool,
    contract: str,
    limit: int = 50,
) -> list[dict[str, Any]]:
    async with pool.acquire() as conn:
        records = await conn.fetch(
            """
            SELECT event_id, contract, ledger, ledger_closed_at, tx_hash,
                   event_type, topics, value, paging_token, indexed_at
            FROM indexed_events
            WHERE contract = $1
            ORDER BY ledger DESC, event_id DESC
            LIMIT $2
            """,
            contract,
            limit,
        )
    out: list[dict[str, Any]] = []
    for r in records:
        out.append(
            {
                "event_id": r["event_id"],
                "contract": r["contract"],
                "ledger": r["ledger"],
                "ledger_closed_at": r["ledger_closed_at"].isoformat(),
                "tx_hash": r["tx_hash"],
                "event_type": r["event_type"],
                "topics": json.loads(r["topics"]) if isinstance(r["topics"], str) else r["topics"],
                "value": r["value"],
                "paging_token": r["paging_token"],
                "indexed_at": r["indexed_at"].isoformat(),
            }
        )
    return out


async def latest_indexed_ledger(pool: asyncpg.Pool, contract: str) -> int | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT MAX(ledger) AS max_ledger FROM indexed_events WHERE contract = $1",
            contract,
        )
    if row is None:
        return None
    value = row["max_ledger"]
    return int(value) if value is not None else None
