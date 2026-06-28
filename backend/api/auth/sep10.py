from __future__ import annotations

import base64
import os
import time
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from stellar_sdk import (
    Keypair,
    ManageData,
    Network,
    TransactionBuilder,
    TransactionEnvelope,
)
from stellar_sdk.account import Account
from stellar_sdk.exceptions import BadSignatureError

from auth.jwt import issue_jwt

router = APIRouter(prefix="/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Configuration (override via environment variables)
# ---------------------------------------------------------------------------
_HOME_DOMAIN = os.environ.get("SEP10_HOME_DOMAIN", "heliosproto.local")
_WEB_AUTH_DOMAIN = os.environ.get("SEP10_WEB_AUTH_DOMAIN", _HOME_DOMAIN)
_NETWORK = os.environ.get("STELLAR_NETWORK", "testnet").lower()

_NETWORK_PASSPHRASE = (
    Network.TESTNET_NETWORK_PASSPHRASE
    if _NETWORK == "testnet"
    else Network.PUBLIC_NETWORK_PASSPHRASE
)

_CHALLENGE_TTL = 900  # 15 minutes per SEP-10 spec


def _server_keypair() -> Keypair:
    secret = os.environ.get("SEP10_SERVER_SECRET", "")
    if not secret:
        raise RuntimeError("SEP10_SERVER_SECRET env var is not set")
    return Keypair.from_secret(secret)


# ---------------------------------------------------------------------------
# Challenge endpoint  GET /auth
# ---------------------------------------------------------------------------


class ChallengeResponse(BaseModel):
    transaction: str
    network_passphrase: str


@router.get("", response_model=ChallengeResponse)
async def challenge(
    account: Annotated[str, Query(description="Client Stellar account (G…)")],
) -> ChallengeResponse:
    """Return a SEP-10 challenge transaction for the given account."""
    try:
        Keypair.from_public_key(account)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid account address")

    server_kp = _server_keypair()

    # Nonce: 48 random bytes → 64-byte base64 string
    nonce = base64.b64encode(os.urandom(48))

    now = int(time.time())
    server_account = Account(server_kp.public_key, sequence=-1)  # seq = 0 after build

    tx = (
        TransactionBuilder(
            source_account=server_account,
            network_passphrase=_NETWORK_PASSPHRASE,
            base_fee=100,
        )
        .add_time_bounds(now, now + _CHALLENGE_TTL)
        # First op: home domain auth keyed on client account
        .append_manage_data_op(
            data_name=f"{_HOME_DOMAIN} auth",
            data_value=nonce,
            source=account,
        )
        # Second op: web_auth_domain keyed on server account
        .append_manage_data_op(
            data_name="web_auth_domain",
            data_value=_WEB_AUTH_DOMAIN.encode(),
            source=server_kp.public_key,
        )
        .build()
    )
    tx.sign(server_kp)

    return ChallengeResponse(
        transaction=tx.to_xdr(),
        network_passphrase=_NETWORK_PASSPHRASE,
    )


# ---------------------------------------------------------------------------
# Token endpoint  POST /auth
# ---------------------------------------------------------------------------


class TokenRequest(BaseModel):
    transaction: str


class TokenResponse(BaseModel):
    token: str


@router.post("", response_model=TokenResponse)
async def token(body: TokenRequest) -> TokenResponse:
    """Validate a signed SEP-10 challenge and return a JWT."""
    server_kp = _server_keypair()

    try:
        envelope = TransactionEnvelope.from_xdr(body.transaction, _NETWORK_PASSPHRASE)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid transaction XDR")

    tx = envelope.transaction

    # Sequence must be 0
    if tx.sequence != 0:
        raise HTTPException(status_code=400, detail="Transaction sequence must be 0")

    # Time bounds must exist and be valid
    now = int(time.time())
    time_bounds = tx.preconditions.time_bounds if tx.preconditions else None
    if not time_bounds:
        raise HTTPException(status_code=400, detail="Missing time bounds")
    if now < time_bounds.min_time or now > time_bounds.max_time:
        raise HTTPException(status_code=400, detail="Challenge transaction expired or not yet valid")

    # Source account must be server account
    if tx.source.account_id != server_kp.public_key:
        raise HTTPException(status_code=400, detail="Transaction source is not the server account")

    # Must have at least one operation
    if not tx.operations:
        raise HTTPException(status_code=400, detail="No operations in transaction")

    # First operation must be ManageData from the client account
    first_op = tx.operations[0]
    if not isinstance(first_op, ManageData):
        raise HTTPException(status_code=400, detail="First operation must be ManageData")
    if first_op.source is None:
        raise HTTPException(status_code=400, detail="First operation must have a source account")

    client_account_id: str = first_op.source.account_id

    tx_hash = envelope.hash()

    # Verify server signature
    try:
        server_kp.verify(tx_hash, _find_signature(envelope, server_kp.public_key))
    except (BadSignatureError, ValueError, KeyError):
        raise HTTPException(status_code=400, detail="Invalid server signature")

    # Verify client signature
    client_kp = Keypair.from_public_key(client_account_id)
    try:
        client_sig = _find_signature(envelope, client_account_id)
        client_kp.verify(tx_hash, client_sig)
    except (BadSignatureError, ValueError, KeyError):
        raise HTTPException(status_code=400, detail="Missing or invalid client signature")

    return TokenResponse(token=issue_jwt(sub=client_account_id))


def _find_signature(envelope: TransactionEnvelope, public_key: str) -> bytes:
    """Return the raw signature bytes from the envelope for the given key hint."""
    hint = Keypair.from_public_key(public_key).signature_hint()
    for sig in envelope.signatures:
        if sig.signature_hint == hint:
            return sig.signature  # type: ignore[return-value]
    raise KeyError(f"No signature found for {public_key}")
