from __future__ import annotations

import httpx
import pytest

from soroban import (
    SorobanRpcError,
    get_contract_events,
    get_latest_ledger,
    is_valid_contract_strkey,
)

# Real testnet contract addresses so we know validation accepts them.
FACTORY_C = "CDF4P7N4QGYOH4NYSTJR4SJFE5SQXGD2LXSNBQWMI5MOS35KLCNUGU2S"
SAMPLE_SA = "CBDDMZ2QIMYB2GGMAVYCLVQ4INGLGS5F4KHRPMIXSNAMRSUQCLCNL6K4"


def test_valid_contract_strkey_accepts_real_contracts() -> None:
    assert is_valid_contract_strkey(FACTORY_C)
    assert is_valid_contract_strkey(SAMPLE_SA)


def test_valid_contract_strkey_rejects_g_address() -> None:
    assert not is_valid_contract_strkey("GBWUF6VB7ZLK5EZI46SSPNNVWOM4X3X64KQYN6BCVILFD3AQMAIETKMC")


def test_valid_contract_strkey_rejects_wrong_length() -> None:
    assert not is_valid_contract_strkey(FACTORY_C[:-1])
    assert not is_valid_contract_strkey(FACTORY_C + "A")


def test_valid_contract_strkey_rejects_lowercase() -> None:
    assert not is_valid_contract_strkey(FACTORY_C.lower())


def test_valid_contract_strkey_rejects_non_base32_chars() -> None:
    bad = "C0" + FACTORY_C[2:]
    assert not is_valid_contract_strkey(bad)


@pytest.mark.asyncio
async def test_get_latest_ledger_parses_sequence() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        body = request.read()
        assert b'"getLatestLedger"' in body
        return httpx.Response(200, json={"jsonrpc": "2.0", "id": 1, "result": {"sequence": 5000}})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        seq = await get_latest_ledger(client, "https://mock")
    assert seq == 5000


@pytest.mark.asyncio
async def test_get_latest_ledger_surfaces_rpc_error() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"jsonrpc": "2.0", "id": 1, "error": {"message": "boom"}})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(SorobanRpcError):
            await get_latest_ledger(client, "https://mock")


@pytest.mark.asyncio
async def test_get_contract_events_builds_filter_and_parses_events() -> None:
    captured: dict[str, object] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        import json

        body = json.loads(request.read())
        captured["payload"] = body
        return httpx.Response(
            200,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {
                    "events": [
                        {
                            "id": "evt-1",
                            "contractId": FACTORY_C,
                            "ledger": 42,
                            "ledgerClosedAt": "2026-11-07T20:00:00Z",
                            "txHash": "abc",
                            "type": "contract",
                            "topic": ["AAAA"],
                            "value": "BBBB",
                            "pagingToken": "tok-1",
                        }
                    ],
                },
            },
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        events = await get_contract_events(client, "https://mock", FACTORY_C, start_ledger=10)

    assert len(events) == 1
    assert events[0]["contractId"] == FACTORY_C
    payload = captured["payload"]
    assert isinstance(payload, dict)
    params = payload.get("params")
    assert isinstance(params, dict)
    assert params["startLedger"] == 10
    assert params["filters"][0]["contractIds"] == [FACTORY_C]


@pytest.mark.asyncio
async def test_get_contract_events_rejects_bad_strkey() -> None:
    async with httpx.AsyncClient() as client:
        with pytest.raises(SorobanRpcError):
            await get_contract_events(client, "https://mock", "not-a-contract", start_ledger=1)
