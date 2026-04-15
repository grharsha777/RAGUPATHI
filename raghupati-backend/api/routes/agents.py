"""Agent status surface for operations dashboards."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from agents import (
    build_angada_agent,
    build_hanuman_agent,
    build_jambavan_agent,
    build_nala_agent,
    build_rama_agent,
    build_sugreeva_agent,
    build_vibhishana_agent,
)
from config.settings import get_settings

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/status")
async def agents_status() -> dict[str, object]:
    """Return static agent roster metadata (models, roles, and construction health).

    Returns:
        JSON payload describing each Vanar Sena agent.
    """
    settings = get_settings()
    builders = {
        "rama": build_rama_agent,
        "hanuman": build_hanuman_agent,
        "angada": build_angada_agent,
        "jambavan": build_jambavan_agent,
        "nala": build_nala_agent,
        "sugreeva": build_sugreeva_agent,
        "vibhishana": build_vibhishana_agent,
    }
    roster: dict[str, object] = {}
    for name, builder in builders.items():
        try:
            agent = builder()
            roster[name] = {
                "ok": True,
                "role": agent.role,
                "goal": agent.goal,
                "tools": [t.name for t in agent.tools],
            }
        except Exception as exc:
            roster[name] = {"ok": False, "error": str(exc)}
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "models": settings.safe_public_dict()["models"],
        "agents": roster,
    }
