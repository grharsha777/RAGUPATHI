"""NVD and OSV vulnerability intelligence tools with bounded in-memory caching."""

from __future__ import annotations

import json
import time
from typing import Any

import httpx
import structlog
from crewai.tools import BaseTool
from tenacity import retry, stop_after_attempt, wait_exponential

from config.settings import get_settings

logger = structlog.get_logger(__name__)

_NVD_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_OSV_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_CACHE_TTL_SECONDS = 600.0


def _cache_get(store: dict[str, tuple[float, dict[str, Any]]], key: str) -> dict[str, Any] | None:
    """Return a cached JSON payload if still valid.

    Args:
        store: Cache dictionary keyed by request identity.
        key: Cache key.

    Returns:
        Cached value or ``None`` when missing/expired.
    """
    now = time.monotonic()
    item = store.get(key)
    if not item:
        return None
    expires_at, value = item
    if now > expires_at:
        store.pop(key, None)
        return None
    return value


def _cache_set(
    store: dict[str, tuple[float, dict[str, Any]]],
    key: str,
    value: dict[str, Any],
    ttl_seconds: float = _CACHE_TTL_SECONDS,
) -> None:
    """Insert a cache entry with TTL.

    Args:
        store: Target cache map.
        key: Cache key.
        value: JSON-serializable payload.
        ttl_seconds: Time-to-live in seconds.
    """
    store[key] = (time.monotonic() + ttl_seconds, value)


class NvdCveLookupTool(BaseTool):
    """Query the NVD CVE 2.0 API for CVE details."""

    name: str = "nvd_cve_lookup"
    description: str = (
        "Look up CVE metadata from the NIST NVD. "
        "Input JSON: {\"cve_id\":\"CVE-2024-1234\"} or {\"keyword\":\"openssl\"}."
    )

    def _run(self, query: str) -> str:
        """Query NVD with optional keyword or CVE id filters.

        Args:
            query: JSON string with ``cve_id`` or ``keyword``.

        Returns:
            JSON string with vulnerability records or an error object.
        """
        settings = get_settings()
        try:
            payload = json.loads(query)
        except json.JSONDecodeError as exc:
            logger.exception("nvd_tool_invalid_json", error=str(exc))
            return json.dumps({"ok": False, "error": "invalid_json"})
        cve_id = payload.get("cve_id")
        keyword = payload.get("keyword")
        cache_key = json.dumps({"cve_id": cve_id, "keyword": keyword}, sort_keys=True)
        cached = _cache_get(_NVD_CACHE, cache_key)
        if cached is not None:
            return json.dumps({"ok": True, "cached": True, "data": cached})
        api_key = settings.nvd_api_key.get_secret_value()
        headers = {"apiKey": api_key}
        params: dict[str, Any] = {}
        if cve_id:
            params["cveId"] = str(cve_id)
        if keyword:
            params["keywordSearch"] = str(keyword)
        if not params:
            return json.dumps({"ok": False, "error": "cve_id_or_keyword_required"})
        url = "https://services.nvd.nist.gov/rest/json/cves/2.0"

        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=8),
            reraise=True,
        )
        def _request() -> httpx.Response:
            with httpx.Client(timeout=settings.external_api_timeout_seconds) as client:
                return client.get(url, headers=headers, params=params)

        try:
            response = _request()
            response.raise_for_status()
            data = response.json()
        except Exception as exc:
            logger.exception("nvd_request_failed", error=str(exc))
            return json.dumps({"ok": False, "error": "nvd_request_failed"})
        _cache_set(_NVD_CACHE, cache_key, data)
        return json.dumps({"ok": True, "cached": False, "data": data})


class OsvQueryTool(BaseTool):
    """Query OSV for ecosystem package vulnerabilities."""

    name: str = "osv_query"
    description: str = (
        "Query OSV.dev for a package vulnerability listing. "
        "Input JSON: {\"package\":{\"name\":\"lodash\",\"ecosystem\":\"npm\"},\"version\":\"4.17.20\"}."
    )

    def _run(self, query: str) -> str:
        """POST to OSV query API with structured package coordinates.

        Args:
            query: JSON string describing package and version.

        Returns:
            JSON string with OSV response or error.
        """
        settings = get_settings()
        try:
            payload = json.loads(query)
        except json.JSONDecodeError as exc:
            logger.exception("osv_tool_invalid_json", error=str(exc))
            return json.dumps({"ok": False, "error": "invalid_json"})
        cache_key = json.dumps(payload, sort_keys=True)
        cached = _cache_get(_OSV_CACHE, cache_key)
        if cached is not None:
            return json.dumps({"ok": True, "cached": True, "data": cached})
        url = f"{str(settings.osv_base_url).rstrip('/')}/v1/query"

        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=8),
            reraise=True,
        )
        def _request() -> httpx.Response:
            with httpx.Client(timeout=settings.external_api_timeout_seconds) as client:
                return client.post(url, json=payload)

        try:
            response = _request()
            response.raise_for_status()
            data = response.json()
        except Exception as exc:
            logger.exception("osv_request_failed", error=str(exc))
            return json.dumps({"ok": False, "error": "osv_request_failed"})
        _cache_set(_OSV_CACHE, cache_key, data)
        return json.dumps({"ok": True, "cached": False, "data": data})
