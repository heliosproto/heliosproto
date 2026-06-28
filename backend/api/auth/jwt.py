from __future__ import annotations

import os
import time
from typing import Any

import jwt

_ALGORITHM = "HS256"


def _secret() -> str:
    return os.environ.get("JWT_SECRET", "change-me-in-production")


def _ttl() -> int:
    return int(os.environ.get("JWT_TTL_SECONDS", "86400"))


def issue_jwt(sub: str, extra: dict[str, Any] | None = None) -> str:
    now = int(time.time())
    payload: dict[str, Any] = {
        "iss": os.environ.get("JWT_ISSUER", "heliosproto-api"),
        "sub": sub,
        "iat": now,
        "exp": now + _ttl(),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, _secret(), algorithm=_ALGORITHM)


def verify_jwt(token: str) -> dict[str, Any]:
    """Decode and verify a JWT. Raises jwt.PyJWTError on failure."""
    return jwt.decode(token, _secret(), algorithms=[_ALGORITHM])
