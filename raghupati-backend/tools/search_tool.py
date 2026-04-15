"""Tavily and Exa search integrations for Jambavan."""

from __future__ import annotations

import json
from typing import Any

import httpx
import structlog
from crewai.tools import BaseTool
from tavily import TavilyClient
from tenacity import retry, stop_after_attempt, wait_exponential

from config.settings import get_settings

logger = structlog.get_logger(__name__)


class TavilySearchTool(BaseTool):
    """Web search using Tavily."""

    name: str = "tavily_search"
    description: str = "Search the public web for security advisories and fixes. Input: plain text query."

    def _run(self, query: str) -> str:
        """Execute a Tavily search query.

        Args:
            query: Natural language search string.

        Returns:
            JSON string with ranked results.
        """
        settings = get_settings()
        client = TavilyClient(api_key=settings.tavily_api_key.get_secret_value())

        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=8),
            reraise=True,
        )
        def _search() -> dict[str, Any]:
            return client.search(query=query, search_depth="advanced")

        try:
            data = _search()
        except Exception as exc:
            logger.exception("tavily_search_failed", error=str(exc))
            return json.dumps({"ok": False, "error": "tavily_failed"})
        return json.dumps({"ok": True, "data": data})


class ExaSearchTool(BaseTool):
    """Neural search using Exa when API credentials are configured."""

    name: str = "exa_search"
    description: str = (
        "Neural search via Exa (optional). Input JSON: {\"query\":\"...\",\"num_results\":5}."
    )

    def _run(self, query: str) -> str:
        """Call Exa REST API for semantic search results.

        Args:
            query: JSON string with query and optional num_results.

        Returns:
            JSON string with results or an explanatory error.
        """
        settings = get_settings()
        if not settings.exa_api_key:
            return json.dumps({"ok": False, "error": "exa_not_configured"})
        try:
            payload = json.loads(query)
        except json.JSONDecodeError as exc:
            logger.exception("exa_invalid_json", error=str(exc))
            return json.dumps({"ok": False, "error": "invalid_json"})
        text = str(payload.get("query", ""))
        num_results = int(payload.get("num_results", 5))
        if not text:
            return json.dumps({"ok": False, "error": "query_required"})
        url = "https://api.exa.ai/search"
        headers = {
            "x-api-key": settings.exa_api_key.get_secret_value(),
            "Content-Type": "application/json",
        }
        body = {
            "query": text,
            "numResults": num_results,
            "useAutoprompt": True,
        }

        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=8),
            reraise=True,
        )
        def _request() -> httpx.Response:
            with httpx.Client(timeout=settings.external_api_timeout_seconds) as client:
                return client.post(url, headers=headers, json=body)

        try:
            response = _request()
            response.raise_for_status()
            data = response.json()
        except Exception as exc:
            logger.exception("exa_request_failed", error=str(exc))
            return json.dumps({"ok": False, "error": "exa_failed"})
        return json.dumps({"ok": True, "data": data})
