"""Health and readiness endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from config.settings import get_settings
from health_checks import collect_full_health_report

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, object]:
    """Return service metadata and downstream connectivity status.

    Returns:
        JSON payload with configuration snapshot and agent/provider probes.
    """
    settings = get_settings()
    report = await collect_full_health_report()
    return {
        "service": settings.app_name,
        "environment": settings.environment,
        "config": settings.safe_public_dict(),
        **report,
    }
