"""Provider connectivity probes used by the health endpoint."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
import structlog

from config.settings import get_settings

logger = structlog.get_logger(__name__)


async def probe_mistral() -> dict[str, Any]:
    """Check Mistral API authentication by listing models.

    Returns:
        Status dictionary with ``ok`` flag and optional error text.
    """
    settings = get_settings()
    url = "https://api.mistral.ai/v1/models"
    headers = {"Authorization": f"Bearer {settings.mistral_api_key.get_secret_value()}"}
    try:
        async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
    except Exception as exc:
        logger.exception("mistral_health_failed", error=str(exc))
        return {"provider": "mistral", "ok": False, "error": str(exc)}
    return {"provider": "mistral", "ok": True}


async def probe_groq() -> dict[str, Any]:
    """Check Groq API authentication by listing models.

    Returns:
        Status dictionary with ``ok`` flag and optional error text.
    """
    settings = get_settings()
    url = "https://api.groq.com/openai/v1/models"
    headers = {"Authorization": f"Bearer {settings.groq_api_key.get_secret_value()}"}
    try:
        async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
    except Exception as exc:
        logger.exception("groq_health_failed", error=str(exc))
        return {"provider": "groq", "ok": False, "error": str(exc)}
    return {"provider": "groq", "ok": True}


async def probe_supabase() -> dict[str, Any]:
    """Check Supabase reachability with a lightweight REST call.

    Returns:
        Status dictionary with ``ok`` flag and optional error text.
    """
    settings = get_settings()
    base = str(settings.supabase_url).rstrip("/")
    url = f"{base}/rest/v1/"
    headers = {
        "apikey": settings.admin_key.get_secret_value(),
        "Authorization": f"Bearer {settings.admin_key.get_secret_value()}",
    }
    try:
        async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
    except Exception as exc:
        logger.exception("supabase_health_failed", error=str(exc))
        return {"provider": "supabase", "ok": False, "error": str(exc)}
    return {"provider": "supabase", "ok": True}


async def probe_nvd() -> dict[str, Any]:
    """Check NVD API key validity with a minimal query.

    Returns:
        Status dictionary with ``ok`` flag and optional error text.
    """
    settings = get_settings()
    url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
    headers = {"apiKey": settings.nvd_api_key.get_secret_value()}
    params = {"resultsPerPage": 1}
    try:
        async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
    except Exception as exc:
        logger.exception("nvd_health_failed", error=str(exc))
        return {"provider": "nvd", "ok": False, "error": str(exc)}
    return {"provider": "nvd", "ok": True}


async def probe_tavily() -> dict[str, Any]:
    """Check Tavily API key validity.

    Returns:
        Status dictionary with ``ok`` flag and optional error text.
    """
    settings = get_settings()
    url = "https://api.tavily.com/search"
    body = {"api_key": settings.tavily_api_key.get_secret_value(), "query": "healthcheck", "max_results": 1}
    try:
        async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
            response = await client.post(url, json=body)
            response.raise_for_status()
    except Exception as exc:
        logger.exception("tavily_health_failed", error=str(exc))
        return {"provider": "tavily", "ok": False, "error": str(exc)}
    return {"provider": "tavily", "ok": True}


async def probe_discord() -> dict[str, Any]:
    """Check Discord webhook URL reachability.

    Returns:
        Status dictionary with ``ok`` flag and optional error text.
    """
    settings = get_settings()
    if not settings.discord_webhook_url:
        return {"provider": "discord", "ok": True, "error": "not configured"}
    url = settings.discord_webhook_url.get_secret_value()
    try:
        async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
            response = await client.get(url)
            if response.status_code >= 500:
                return {"provider": "discord", "ok": False, "error": f"http_{response.status_code}"}
    except Exception as exc:
        logger.exception("discord_health_failed", error=str(exc))
        return {"provider": "discord", "ok": False, "error": str(exc)}
    return {"provider": "discord", "ok": True}


async def probe_resend() -> dict[str, Any]:
    """Check Resend API key validity.

    Returns:
        Status dictionary with ``ok`` flag and optional error text.
    """
    settings = get_settings()
    if not settings.resend_api_key:
        return {"provider": "resend", "ok": True, "error": "not configured"}
    url = "https://api.resend.com/emails"
    headers = {"Authorization": f"Bearer {settings.resend_api_key.get_secret_value()}"}
    try:
        async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
            # a simple GET to check auth; might 405 on /emails but at least checks reachability without sending
            response = await client.get(url, headers=headers)
            if response.status_code == 401:
                return {"provider": "resend", "ok": False, "error": "Unauthorized"}
    except Exception as exc:
        logger.exception("resend_health_failed", error=str(exc))
        return {"provider": "resend", "ok": False, "error": str(exc)}
    return {"provider": "resend", "ok": True}


async def probe_ollama() -> dict[str, Any]:
    """Check local Ollama availability.

    Returns:
        Status dictionary with ``ok`` flag and optional error text.
    """
    settings = get_settings()
    base = str(settings.ollama_base_url).rstrip("/")
    url = f"{base}/api/tags"
    try:
        async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
            response = await client.get(url)
            response.raise_for_status()
    except Exception as exc:
        logger.exception("ollama_health_failed", error=str(exc))
        return {"provider": "ollama", "ok": False, "error": str(exc)}
    return {"provider": "ollama", "ok": True}


async def collect_full_health_report() -> dict[str, Any]:
    """Aggregate connectivity checks for all integrated providers.

    Returns:
        Nested dictionary suitable for JSON responses.
    """
    mistral, groq, supabase, nvd, tavily, discord, resend, ollama = await asyncio.gather(
        probe_mistral(),
        probe_groq(),
        probe_supabase(),
        probe_nvd(),
        probe_tavily(),
        probe_discord(),
        probe_resend(),
        probe_ollama(),
    )
    agents = {
        "rama_mistral": mistral,
        "groq_family": groq,
        "supabase_db": supabase,
        "angada_nvd": nvd,
        "jambavan_tavily": tavily,
        "vibhishana_discord": discord,
        "vibhishana_resend": resend,
        "ollama_local": ollama,
    }
    overall_ok = all(item.get("ok") is True for item in agents.values())
    return {"status": "ok" if overall_ok else "degraded", "agents": agents}
