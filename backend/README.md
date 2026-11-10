# Backend

The services pillar of `heliosproto`. Python 3.12, FastAPI, Postgres, Redis, Celery.

See the [Pillar 3 section of ARCHITECTURE.md](../ARCHITECTURE.md#5-pillar-3--backend-python-312--fastapi) for the full design.

## Layout

| Path | Purpose |
|---|---|
| `indexer/` | Soroban event indexer (RPC → Postgres) |
| `relayer/` | G→C funding bridge + paymaster off-chain sponsor |
| `recovery/` | Guardian coordination for social recovery |
| `notifications/` | WebSocket + push (FCM/APNS) + email fan-out |
| `anchors/` | SEP-24 / SEP-31 / SEP-10 adapter framework |
| `prices/` | Reflector and oracle adapters, normalized USD prices |
| `api/` | REST + GraphQL gateway |
| `workers/` | Celery workers for backfills, fan-out, polling |

## Prerequisites

- Python 3.12+
- Postgres 16+ (Docker Compose ships one)
- Redis 7+ (Docker Compose ships one)

## Working in this pillar

Each service is its own package with its own `pyproject.toml`. From inside any service directory:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
ruff check
mypy --strict
pytest
uvicorn main:app --reload   # for HTTP services
```

A `docker-compose.yml` at the pillar root boots Postgres + Redis + the `api` service together:

```bash
cd backend
docker compose up --build
```

## Live endpoints

### `GET /accounts/{address}/activity`

Returns recent Soroban events for a smart-account contract. On each call the service refreshes its local Postgres index from Soroban RPC (starting at the last ledger it saw for that contract, or ~24h back for a cold cache), persists the fetched events, then returns the most recent rows.

```bash
curl http://localhost:8000/accounts/CBDDMZ2QIMYB2GGMAVYCLVQ4INGLGS5F4KHRPMIXSNAMRSUQCLCNL6K4/activity?limit=50
```

Response shape:

```jsonc
{
  "contract": "CBDDMZ2Q...",
  "events": [
    {
      "event_id": "...",
      "contract": "CBDDMZ2Q...",
      "ledger": 5613314,
      "ledger_closed_at": "2026-11-07T22:00:00Z",
      "tx_hash": "e2b758c7...",
      "event_type": "contract",
      "topics": ["..."],
      "value": "...",
      "paging_token": "...",
      "indexed_at": "..."
    }
  ],
  "refresh": {
    "contract": "CBDDMZ2Q...",
    "start_ledger": 5612000,
    "fetched": 3,
    "upserted_rows": 3
  }
}
```

The indexer module (`backend/api/indexer.py`) is consolidated into the `api` service for the MVP. Splitting it into a standalone `backend/indexer/` worker (continuous polling, no HTTP surface) is the planned follow-up; the `.gitkeep` directory holds that slot.

## Notes for Python contributors

The architecture deliberately keeps Python here so contributors comfortable with Django/Flask/FastAPI can be productive without touching Rust or the smart contract layer. The on-chain logic lives in `contracts/`; backend services interact with it via the Soroban RPC HTTP API — no Rust required.
