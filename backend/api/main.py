from __future__ import annotations

from fastapi import Depends, FastAPI
from pydantic import BaseModel

from config import Settings, get_settings

app = FastAPI(
    title="Helios Protocol API",
    description="REST + GraphQL gateway for the Helios wallet stack",
    version="0.1.0",
)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    network: str


@app.get("/health", response_model=HealthResponse)
async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="heliosproto-api",
        version="0.1.0",
        network=settings.stellar_network,
    )
