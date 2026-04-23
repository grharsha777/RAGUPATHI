"""Agent status surface for operations dashboards."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from config.settings import get_settings

router = APIRouter(prefix="/agents", tags=["agents"])

# Agent definitions — matches core/pipeline.py execution order
AGENT_DEFS = {
    "hanuman": {
        "role": "Watcher",
        "description": "Monitors GitHub webhooks, push events, and repository changes. Detects what needs scanning or re-analysis.",
        "provider": "groq",
    },
    "rama": {
        "role": "Commander",
        "description": "Orchestrates the entire scan flow. Classifies severity, assigns tasks, manages retry logic and escalation.",
        "provider": "mistral",
    },
    "angada": {
        "role": "Security Analyst",
        "description": "Performs code, dependency, CI, and secrets analysis. Queries NVD and OSV for known CVEs.",
        "provider": "groq",
    },
    "jambavan": {
        "role": "Research Analyst",
        "description": "Enriches findings with safer fix approaches, migration guidance, and web research via Tavily.",
        "provider": "mistral",
    },
    "nala": {
        "role": "Patch Engineer",
        "description": "Writes code and config changes to fix vulnerabilities. Generates minimal diffs. Supports autonomous and manual modes.",
        "provider": "mistral",
    },
    "sugreeva": {
        "role": "QA Engineer",
        "description": "Runs tests, build checks, lint, and CI validation via GitHub Actions. Reports failures for retry loops.",
        "provider": "groq",
    },
    "vibhishana": {
        "role": "Comms",
        "description": "Writes PR bodies, summaries, audit trails. Sends notifications via Slack, Discord, and email.",
        "provider": "groq",
    },
}


@router.get("/status")
async def agents_status() -> dict[str, object]:
    """Return agent roster metadata with models and roles.

    Returns:
        JSON payload describing each Vanar Sena agent.
    """
    settings = get_settings()
    models = settings.safe_public_dict()["models"]

    roster: dict[str, object] = {}
    for name, defn in AGENT_DEFS.items():
        roster[name] = {
            "ok": True,
            "role": defn["role"],
            "description": defn["description"],
            "provider": defn["provider"],
            "model": models.get(name, "unknown"),
        }

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "models": models,
        "agents": roster,
    }
