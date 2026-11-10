"""Thin Soroban RPC client used by the indexer.

Only the `getEvents` method is implemented; the API gateway does not need the
full RPC surface. Response objects are intentionally left as plain dicts rather
than pydantic models so the indexer can store the raw topics/data JSON verbatim
and let callers decode scvals downstream.
"""

from __future__ import annotations

from typing import Any

import httpx

DEFAULT_RPC_URL = "https://soroban-testnet.stellar.org"
DEFAULT_PAGE_SIZE = 100

_STRKEY_ALPHABET = frozenset("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567")
_STRKEY_LENGTH = 56


def is_valid_contract_strkey(address: str) -> bool:
    """Loose StrKey sanity check for a Soroban contract (`C...`) address.

    Full CRC16-XModem validation lives in the stellar-sdk which is a heavier
    dependency than this gateway currently carries. Prefix + length + alphabet
    is enough to reject obvious garbage before an RPC call.
    """
    if len(address) != _STRKEY_LENGTH:
        return False
    if address[0] != "C":
        return False
    return all(c in _STRKEY_ALPHABET for c in address)


class SorobanRpcError(RuntimeError):
    """Raised when the RPC endpoint returns a JSON-RPC error or non-200."""


async def get_latest_ledger(client: httpx.AsyncClient, rpc_url: str) -> int:
    payload = {"jsonrpc": "2.0", "id": 1, "method": "getLatestLedger", "params": {}}
    resp = await client.post(rpc_url, json=payload, timeout=10.0)
    resp.raise_for_status()
    body = resp.json()
    if "error" in body:
        raise SorobanRpcError(f"getLatestLedger: {body['error']}")
    return int(body["result"]["sequence"])


async def get_contract_events(
    client: httpx.AsyncClient,
    rpc_url: str,
    contract_id: str,
    start_ledger: int,
    limit: int = DEFAULT_PAGE_SIZE,
) -> list[dict[str, Any]]:
    """Fetch contract events for a single contract starting at `start_ledger`.

    Returns a list of raw event dicts as returned by Soroban RPC:
    `type`, `ledger`, `ledgerClosedAt`, `contractId`, `id`, `pagingToken`,
    `topic` (base64 scval array), `value` (base64 scval), `txHash`.
    """
    if not is_valid_contract_strkey(contract_id):
        raise SorobanRpcError(f"Invalid contract StrKey: {contract_id!r}")
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getEvents",
        "params": {
            "startLedger": start_ledger,
            "filters": [{"type": "contract", "contractIds": [contract_id]}],
            "pagination": {"limit": limit},
        },
    }
    resp = await client.post(rpc_url, json=payload, timeout=15.0)
    resp.raise_for_status()
    body = resp.json()
    if "error" in body:
        raise SorobanRpcError(f"getEvents: {body['error']}")
    result = body.get("result") or {}
    events = result.get("events") or []
    if not isinstance(events, list):
        raise SorobanRpcError("getEvents: unexpected response shape; events is not a list")
    return events
