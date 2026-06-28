from __future__ import annotations

import base64
import os
import time

import pytest
from fastapi.testclient import TestClient
from stellar_sdk import Keypair, Network, TransactionEnvelope

# Provide a server keypair before importing the app so the env var is set
_SERVER_KP = Keypair.random()
_CLIENT_KP = Keypair.random()

os.environ["SEP10_SERVER_SECRET"] = _SERVER_KP.secret
os.environ["STELLAR_NETWORK"] = "testnet"
os.environ["SEP10_HOME_DOMAIN"] = "heliosproto.local"
os.environ["JWT_SECRET"] = "test-secret"

from main import app  # noqa: E402

client = TestClient(app)
NETWORK_PASSPHRASE = Network.TESTNET_NETWORK_PASSPHRASE


# ---------------------------------------------------------------------------
# Challenge tests
# ---------------------------------------------------------------------------


def test_challenge_returns_transaction() -> None:
    resp = client.get(f"/auth?account={_CLIENT_KP.public_key}")
    assert resp.status_code == 200
    data = resp.json()
    assert "transaction" in data
    assert data["network_passphrase"] == NETWORK_PASSPHRASE


def test_challenge_transaction_structure() -> None:
    resp = client.get(f"/auth?account={_CLIENT_KP.public_key}")
    env = TransactionEnvelope.from_xdr(resp.json()["transaction"], NETWORK_PASSPHRASE)
    tx = env.transaction

    # Sequence must be 0
    assert tx.sequence == 0

    # Time bounds present
    assert tx.preconditions is not None
    assert tx.preconditions.time_bounds is not None
    time_bounds = tx.preconditions.time_bounds
    now = int(time.time())
    assert time_bounds.min_time <= now
    assert time_bounds.max_time > now

    # Source is server
    assert tx.source.account_id == _SERVER_KP.public_key

    # First op is ManageData with client as source
    from stellar_sdk import ManageData
    first_op = tx.operations[0]
    assert isinstance(first_op, ManageData)
    assert first_op.source.account_id == _CLIENT_KP.public_key
    assert first_op.data_name == "heliosproto.local auth"
    assert len(base64.b64decode(first_op.data_value)) == 48  # 48 raw bytes


def test_challenge_invalid_account() -> None:
    resp = client.get("/auth?account=notanaccount")
    assert resp.status_code == 400


def test_challenge_missing_account() -> None:
    resp = client.get("/auth")
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Token tests
# ---------------------------------------------------------------------------


def _get_signed_challenge() -> str:
    """Fetch a challenge, sign it with the client key, return XDR."""
    resp = client.get(f"/auth?account={_CLIENT_KP.public_key}")
    xdr = resp.json()["transaction"]
    env = TransactionEnvelope.from_xdr(xdr, NETWORK_PASSPHRASE)
    env.sign(_CLIENT_KP)
    return env.to_xdr()


def test_token_returns_jwt() -> None:
    xdr = _get_signed_challenge()
    resp = client.post("/auth", json={"transaction": xdr})
    assert resp.status_code == 200
    assert "token" in resp.json()


def test_token_jwt_sub_is_client_account() -> None:
    import jwt as pyjwt

    xdr = _get_signed_challenge()
    resp = client.post("/auth", json={"transaction": xdr})
    token = resp.json()["token"]
    payload = pyjwt.decode(token, "test-secret", algorithms=["HS256"])
    assert payload["sub"] == _CLIENT_KP.public_key


def test_token_rejects_unsigned_challenge() -> None:
    resp = client.get(f"/auth?account={_CLIENT_KP.public_key}")
    xdr = resp.json()["transaction"]  # not signed by client
    resp2 = client.post("/auth", json={"transaction": xdr})
    assert resp2.status_code == 400


def test_token_rejects_invalid_xdr() -> None:
    resp = client.post("/auth", json={"transaction": "notvalidxdr"})
    assert resp.status_code == 400


def test_token_rejects_wrong_signer() -> None:
    """A random keypair's signature should not pass for the client account."""
    resp = client.get(f"/auth?account={_CLIENT_KP.public_key}")
    xdr = resp.json()["transaction"]
    env = TransactionEnvelope.from_xdr(xdr, NETWORK_PASSPHRASE)
    env.sign(Keypair.random())  # wrong signer
    resp2 = client.post("/auth", json={"transaction": env.to_xdr()})
    assert resp2.status_code == 400
