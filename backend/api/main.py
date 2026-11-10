from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import asyncpg
import httpx
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

from db import create_pool
from indexer import account_activity
from soroban import is_valid_contract_strkey


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://helios:helios@localhost:5432/helios"
    stellar_rpc_url: str = "https://soroban-testnet.stellar.org"
    stellar_network: str = "testnet"


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class EventRow(BaseModel):
    event_id: str
    contract: str
    ledger: int
    ledger_closed_at: str
    tx_hash: str
    event_type: str
    topics: list[Any]
    value: str | None
    paging_token: str | None
    indexed_at: str


class RefreshSummary(BaseModel):
    skipped: bool | None = None
    reason: str | None = None
    contract: str | None = None
    start_ledger: int | None = None
    fetched: int | None = None
    upserted_rows: int | None = None


class ActivityResponse(BaseModel):
    contract: str
    events: list[EventRow]
    refresh: RefreshSummary


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = Settings()
    pool: asyncpg.Pool | None = None
    try:
        pool = await create_pool(settings.database_url)
    except OSError as exc:
        # In environments without Postgres (pure unit tests, offline CI), start
        # anyway and let endpoints that need the pool 503. Health stays up.
        app.state.pool_error = str(exc)
    else:
        app.state.pool_error = None
    app.state.pool = pool
    app.state.http = httpx.AsyncClient()
    app.state.settings = settings
    try:
        yield
    finally:
        await app.state.http.aclose()
        if pool is not None:
            await pool.close()


app = FastAPI(
    title="Helios Protocol API",
    description="REST + GraphQL gateway for the Helios wallet stack",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="heliosproto-api", version="0.1.0")


@app.get("/accounts/{address}/activity", response_model=ActivityResponse)
async def account_activity_route(
    address: str,
    limit: int = Query(default=50, ge=1, le=200),
) -> ActivityResponse:
    """Return recent Soroban events for a smart-account contract.

    On each call, the route refreshes the local index from Soroban RPC
    (starting at the last ledger we've seen for this contract, or ~24h back
    for a cold cache), persists the fetched events to Postgres, then returns
    the most recent `limit` rows.
    """
    if not is_valid_contract_strkey(address):
        raise HTTPException(status_code=400, detail="Address must be a Soroban contract (C...)")
    pool: asyncpg.Pool | None = app.state.pool
    if pool is None:
        reason = app.state.pool_error or "Postgres pool is unavailable"
        raise HTTPException(status_code=503, detail=f"Index unavailable: {reason}")
    result = await account_activity(
        pool,
        app.state.http,
        app.state.settings.stellar_rpc_url,
        address,
        limit=limit,
    )
    return ActivityResponse(**result)
